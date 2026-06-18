"use client";

import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { auth, provider, db } from "../lib/firebase";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { collection, addDoc, getDocs, updateDoc, doc } from "firebase/firestore";

type Entry = {
  id?: string;
  date: string;
  
km: number | string;
liters: number | string;
euro: number | string;

};

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);

const [form, setForm] = useState({
  km: "",
  liters: "",
  euro: "",
});

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

  const km = Number(form.km.replace(",", "."));
  const liters = Number(form.liters.replace(",", "."));
  const euro = Number(form.euro.replace(",", "."));

  if (isNaN(km) || isNaN(liters) || isNaN(euro)) {
    alert("Inserisci valori validi");
    return;
  }

  const maxKm = Math.max(...entries.map((e) => Number(e.km)), 0);

  if (km < maxKm) {
    alert("Errore: Km inferiori al massimo registrato");
    return;
  }

  const newEntry: Entry = {
    date: new Date().toISOString().split("T")[0],
    km,
    liters,
    euro,
  };

  await addDoc(collection(db, "users", user.uid, "entries"), newEntry);

  setEntries([...entries, newEntry]);

  // reset form
  setForm({ km: "", liters: "", euro: "" });
};

  // ✅ UPDATE ENTRY (fix input edit)
const updateEntry = async (
  index: number,
  field: keyof Entry,
  value: string
) => {
  const entry = entries[index];
  if (!entry.id || !user) return;

  // ✅ aggiorna UI SEMPRE come stringa
  const updated = [...entries];
  updated[index] = {
    ...entry,
    [field]: value,
  };

  setEntries(updated);

  // ✅ salva su Firebase SOLO se numero valido
  const normalized = value.replace(",", ".");

  if (normalized !== "" && !isNaN(Number(normalized))) {
    const ref = doc(db, "users", user.uid, "entries", entry.id);

  await updateDoc(ref, {
  [field]: Number(normalized),
});
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

const imported = json
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
  .filter((e) => e !== null) as Entry[];

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

const total = filtered.reduce((acc, e) => {
  const normalized = String(e.euro).replace(",", ".");
  const value = Number(normalized);
  return acc + (isNaN(value) ? 0 : value);
}, 0);

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
    type="text"
    inputMode="decimal"
    placeholder="Km"
    value={form.km}
    onChange={(e) =>
      setForm({
        ...form,
        km: e.target.value,
      })
    }
    className="border border-gray-300 p-4 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
  />

  <input
    type="text"
    inputMode="decimal"
    placeholder="Litri"
    value={form.liters}
    onChange={(e) =>
      setForm({
        ...form,
        liters: e.target.value,
      })
    }
    className="border border-gray-300 p-4 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
  />

  <input
    type="text"
    inputMode="decimal"
    placeholder="Euro"
    value={form.euro}
    onChange={(e) =>
      setForm({
        ...form,
        euro: e.target.value,
      })
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
    Media settimanale: € {weeklyAvg.toFixed(2)}
  </p>
  <p className="font-semibold">
    Media mensile: € {monthlyAvg.toFixed(2)}
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
