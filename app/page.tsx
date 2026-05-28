"use client";

import { useState, useEffect } from "react";
import * as XLSX from "xlsx";

type Entry = {
  date: string;
  km: number;
  liters: number;
  euro: number;
};

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [form, setForm] = useState({
    km: 0,
    liters: 0,
    euro: 0,
  });

  // Carica dati da localStorage
  useEffect(() => {
    const saved = localStorage.getItem("fuel-data");
    if (saved) setEntries(JSON.parse(saved));
  }, []);

  // Salva dati
  useEffect(() => {
    localStorage.setItem("fuel-data", JSON.stringify(entries));
  }, [entries]);

  // Aggiunta entry con data automatica
  const addEntry = () => {
    if (!form.km || !form.liters || !form.euro) return;

    const newEntry: Entry = {
      ...form,
      date: new Date().toISOString().split("T")[0],
    };

    setEntries([...entries, newEntry]);

    setForm({
      km: 0,
      liters: 0,
      euro: 0,
    });
  };

  // Export Excel
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(entries);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fuel");
    XLSX.writeFile(wb, "fuel_data.xlsx");
  };

  // Statistiche ultimi 6 mesi
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const filtered = entries.filter(
    (e) => new Date(e.date) >= sixMonthsAgo
  );

  const total = filtered.reduce((acc, e) => acc + e.euro, 0);

  const weeklyAvg = total / 26; // settimane in 6 mesi
  const monthlyAvg = total / 6;

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">🚗 Fuel Tracker</h1>

      {/* DATA AUTOMATICA */}
      <p className="text-sm text-gray-500 mb-2">
        Data: {new Date().toLocaleDateString("it-IT")}
      </p>

      {/* FORM */}
      <div className="flex flex-col gap-2 mb-4">
        <input
          type="number"
          placeholder="Km"
          value={form.km || ""}
          onChange={(e) =>
            setForm({ ...form, km: Number(e.target.value) })
          }
          className="border p-2 rounded"
        />

        <input
          type="number"
          placeholder="Litri"
          value={form.liters || ""}
          onChange={(e) =>
            setForm({ ...form, liters: Number(e.target.value) })
          }
          className="border p-2 rounded"
        />

        <input
          type="number"
          placeholder="Euro"
          value={form.euro || ""}
          onChange={(e) =>
            setForm({ ...form, euro: Number(e.target.value) })
          }
          className="border p-2 rounded"
        />

        <button
          onClick={addEntry}
          className="bg-blue-500 text-white p-2 rounded"
        >
          Salva
        </button>
      </div>

      {/* STATISTICHE */}
      <div className="mb-4">
        <p className="font-semibold">
          Media settimanale (6 mesi): € {weeklyAvg.toFixed(2)}
        </p>
        <p className="font-semibold">
          Media mensile (6 mesi): € {monthlyAvg.toFixed(2)}
        </p>
      </div>

      {/* EXPORT */}
      <button
        onClick={exportExcel}
        className="bg-green-500 text-white p-2 rounded w-full"
      >
        Esporta Excel
      </button>
    </div>
  );
}
