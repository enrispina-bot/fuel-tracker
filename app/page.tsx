"use client";

import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { auth, provider, db } from "../lib/firebase";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { collection, addDoc, getDocs, updateDoc, doc } from "firebase/firestore";

type Entry = {
  id?: string;
  date: string;
  km: number;
  liters: number;
  euro: number;
};

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [form, setForm] = useState({ km: 0, liters: 0, euro: 0 });
  const [showConfig, setShowConfig] = useState(false);
  const [user, setUser] = useState<any>(null);

  // ✅ AUTH
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  // ✅ LOAD DATA
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      const snapshot = await getDocs(
        collection(db, "users", user.uid, "entries")
      );

      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Entry[];

      setEntries(data);
    };

    loadData();
  }, [user]);

  const login = async () => {
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  // ✅ ADD ENTRY
  const addEntry = async () => {
    if (!form.km || !form.liters || !form.euro || !user) return;

    const maxKm = Math.max(...entries.map((e) => e.km), 0);
    if (form.km < maxKm) {
      alert("Errore: Km inferiori al massimo registrato");
      return;
    }

    const newEntry: Entry = {
      ...form,
      date: new Date().toISOString().split("T")[0],
    };

    await addDoc(collection(db, "users", user.uid, "entries"), newEntry);
    setEntries([...entries, newEntry]);
  };

  // ✅ UPDATE ENTRY (fix input edit)
  const updateEntry = async (
    index: number,
    field: keyof Entry,
    value: string
  ) => {
    const entry = entries[index];
    if (!entry.id || !user) return;

    const numericValue = value === "" ? "" : Number(value);

    const updated = [...entries];
    updated[index] = {
      ...entry,
      [field]: numericValue,
    };

    setEntries(updated);

    if (value !== "") {
      const ref = doc(db, "users", user.uid, "entries", entry.id);
      await updateDoc(ref, { [field]: Number(value) });
    }
  };

  // ✅ IMPORT Excel
  const importExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<any>(sheet);

    const imported: Entry[] = json
      .map((row) => {
        if (!row.Data) return null;

        const parts = row.Data.split("/");
        if (parts.length !== 3) return null;

        const year =
          parts[2].length === 2 ? "20" + parts[2] : parts[2];

        return {
          date: `${year}-${parts[1]}-${parts[0]}`,
          km: Number(row.Km),
          liters: Number(row.Litri),
          euro: Number(row.Euro),
        };
      })
      .filter(
        (e): e is Entry =>
          e !== null &&
          !isNaN(e.km) &&
          !isNaN(e.liters) &&
          !isNaN(e.euro)
      );

    for (const entry of imported) {
      await addDoc(
        collection(db, "users", user.uid, "entries"),
        entry
      );
    }

    setEntries([...entries, ...imported]);
  };

  // ✅ EXPORT
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(entries);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fuel");
    XLSX.writeFile(wb, "fuel_data.xlsx");
  };

  // ✅ STATS
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const filtered = entries.filter(
    (e) => new Date(e.date) >= sixMonthsAgo
  );

  const total = filtered.reduce((acc, e) => acc + e.euro, 0);

  const weeklyAvg = total / 26;
  const monthlyAvg = total / 6;

  // ✅ SORT ultimi 5 corretti
  const lastFive = [...entries]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // ✅ LOGIN BLOCK
  if (!user) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        <button onClick={login}>
          Accedi con Google
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-xl mx-auto text-xl">
      <p>{user.email}</p>
      <button onClick={logout}>Logout</button>

      <h1 className="text-3xl font-bold mb-6 text-center">
        🚗 Fuel Tracker
      </h1>

      {/* FORM */}
      <div className="flex flex-col gap-4 mb-6">
        <input
          type="number"
          placeholder="Km"
          value={form.km || ""}
          onChange={(e) =>
            setForm({ ...form, km: Number(e.target.value) })
          }
        />

        <input
          type="number"
          placeholder="Litri"
          value={form.liters || ""}
          onChange={(e) =>
            setForm({ ...form, liters: Number(e.target.value) })
          }
        />

        <input
          type="number"
          placeholder="Euro"
          value={form.euro || ""}
          onChange={(e) =>
            setForm({ ...form, euro: Number(e.target.value) })
          }
        />

        <button onClick={addEntry}>Salva</button>
      </div>

      <p>Settimanale: € {weeklyAvg.toFixed(2)}</p>
      <p>Mensile: € {monthlyAvg.toFixed(2)}</p>

      {/* CONFIG */}
      <button onClick={() => setShowConfig(!showConfig)}>
        ⚙️ Configurazione
      </button>

      {showConfig && (
        <div>
          <button onClick={exportExcel}>Export</button>
          <input type="file" onChange={importExcel} />

          <h2>Ultimi 5</h2>

          <table>
            <tbody>
              {lastFive.map((entry, i) => {
                const realIndex =
                  entries.findIndex((e) => e.id === entry.id);

                return (
                  <tr key={entry.id}>
                    <td>{entry.date}</td>
                    <td>
                      <input
                        value={entry.km ?? ""}
                        onChange={(e) =>
                          updateEntry(realIndex, "km", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        value={entry.liters ?? ""}
                        onChange={(e) =>
                          updateEntry(realIndex, "liters", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        value={entry.euro ?? ""}
                        onChange={(e) =>
                          updateEntry(realIndex, "euro", e.target.value)
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
