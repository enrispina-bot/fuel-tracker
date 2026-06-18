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
  <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">🚗 Fuel Tracker</h1>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>

        <button onClick={logout} className="text-sm text-red-500">
          Logout
        </button>
      </div>

        {/* FORM */}
      <div className="flex flex-col gap-4 mb-6">
       
<input
  type="number"
  placeholder="Km"
  value={form.km || ""}
  onChange={(e) =>
    setForm({ ...form, km: Number(e.target.value) })
  }
  className="border border-gray-300 p-4 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
/>


        <input
          type="number"
          placeholder="Litri"
          value={form.liters || ""}
          onChange={(e) =>
            setForm({ ...form, liters: Number(e.target.value) })
          }
           className="border border-gray-300 p-4 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <input
          type="number"
          placeholder="Euro"
          value={form.euro || ""}
          onChange={(e) =>
            setForm({ ...form, euro: Number(e.target.value) })
          }
           className="border border-gray-300 p-4 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

    <button
  onClick={addEntry}
  className="bg-blue-500 text-white p-4 rounded-xl text-lg font-bold shadow-md active:scale-95 transition"
>
  Salva
</button>
      </div>

   <div className="bg-gray-50 rounded-xl p-4 mb-6 shadow-sm">
  <p className="font-semibold">
    Settimanale: € {weeklyAvg.toFixed(2)}
  </p>
  <p className="font-semibold">
    Mensile: € {monthlyAvg.toFixed(2)}
  </p>
</div>

      {/* CONFIG */}
<button
  onClick={() => setShowConfig(!showConfig)}
  className="w-full bg-gray-800 text-white p-4 rounded-xl font-semibold mb-4"
>
  ⚙️ Configurazione
</button>

      {showConfig && (
        <div className="bg-gray-50 rounded-xl p-4">
          <button onClick={exportExcel}>Export</button>
          <input type="file" onChange={importExcel} />

          <h2>Ultimi 5</h2>


<table className="w-full text-sm border mt-4">
  <thead>
    <tr>
      <th className="border p-2">Data</th>
      <th className="border p-2">Km</th>
      <th className="border p-2">Litri</th>
      <th className="border p-2">€</th>
    </tr>
  </thead>

  <tbody>
    {lastFive.map((entry) => {
      const realIndex = entries.findIndex(
        (e) => e.id === entry.id
      );

      return (
        <tr key={entry.id}>
          <td className="border p-2">{entry.date}</td>

          <td className="border p-2">
            <input
              value={entry.km ?? ""}
              onChange={(e) =>
                updateEntry(realIndex, "km", e.target.value)
              }
              className="w-full"
            />
          </td>

          <td className="border p-2">
            <input
              value={entry.liters ?? ""}
              onChange={(e) =>
                updateEntry(realIndex, "liters", e.target.value)
              }
              className="w-full"
            />
          </td>

          <td className="border p-2">
            <input
              value={entry.euro ?? ""}
              onChange={(e) =>
                updateEntry(realIndex, "euro", e.target.value)
              }
              className="w-full"
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
     </div>  
  );
}
