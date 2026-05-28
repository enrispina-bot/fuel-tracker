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

  const [showConfig, setShowConfig] = useState(false);

  // Carica dati
  useEffect(() => {
    const saved = localStorage.getItem("fuel-data");
    if (saved) setEntries(JSON.parse(saved));
  }, []);

  // Salva dati
  useEffect(() => {
    localStorage.setItem("fuel-data", JSON.stringify(entries));
  }, [entries]);

  // ✅ Inserimento con controllo KM
  const addEntry = () => {
    if (!form.km || !form.liters || !form.euro) return;

    const maxKm = Math.max(...entries.map(e => e.km), 0);

    if (form.km < maxKm) {
      alert("Errore: i Km sono inferiori al massimo registrato.");
      return;
    }

    const newEntry: Entry = {
      ...form,
      date: new Date().toISOString().split("T")[0],
    };

    setEntries([...entries, newEntry]);

    setForm({ km: 0, liters: 0, euro: 0 });
  };

const updateEntry = (index: number, field: keyof Entry, value: number | string) => {
  const updated = [...entries];

  updated[index] = {
    ...updated[index],
    [field]: value,
  };

  setEntries(updated);
};
  
  // ✅ Export
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(entries);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fuel");
    XLSX.writeFile(wb, "fuel_data.xlsx");
  };

  // ✅ Import
  const importExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<any>(sheet);

    const imported: Entry[] = json
      .map((row) => {
        const parseDate = (d: string) => {
          if (!d || typeof d !== "string") return null;

          const parts = d.split("/");
          if (parts.length !== 3) return null;

          const year = parts[2].length === 2 ? "20" + parts[2] : parts[2];

          return `${year}-${parts[1]}-${parts[0]}`;
        };

        const date = parseDate(row.Data);
        if (!date) return null;

        return {
          date,
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

    setEntries([...entries, ...imported]);
  };

  // ✅ Statistiche
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const filtered = entries.filter(
    (e) => new Date(e.date) >= sixMonthsAgo
  );

  const total = filtered.reduce((acc, e) => acc + e.euro, 0);

  const weeklyAvg = total / 26;
  const monthlyAvg = total / 6;
  const lastFive = entries.slice(-5);

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">🚗 Fuel Tracker</h1>

      {/* DATA */}
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
          Media settimanale: € {weeklyAvg.toFixed(2)}
        </p>
        <p className="font-semibold">
          Media mensile: € {monthlyAvg.toFixed(2)}
        </p>
      </div>

      {/* CONFIG */}
      <button
        onClick={() => setShowConfig(!showConfig)}
        className="bg-gray-500 text-white p-2 rounded w-full mb-4"
      >
        ⚙️ {showConfig ? "Chiudi configurazione" : "Configurazione"}
      </button>

      {/* AREA CONFIGURAZIONE */}
      {showConfig && (
        <div className="mt-4 p-3 border rounded bg-gray-100">
          <button
            onClick={exportExcel}
            className="bg-green-500 text-white p-2 rounded w-full mb-3"
          >
            Esporta Excel
          </button>

          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={importExcel}
            className="w-full"
          />
        </div>


<h2 className="font-bold mt-4 mb-2">Ultimi 5 inserimenti</h2>

<div className="overflow-x-auto">
  <table className="w-full text-sm border">
    <thead>
      <tr className="bg-gray-300">
        <th className="border p-1">Data</th>
        <th className="border p-1">Km</th>
        <th className="border p-1">Litri</th>
        <th className="border p-1">€</th>
      </tr>
    </thead>
    <tbody>
      {lastFive.map((entry, i) => {
        const realIndex = entries.length - lastFive.length + i;

        return (
          <tr key={realIndex}>
            <td className="border p-1">{entry.date}</td>

            <td className="border p-1">
              <input
                type="number"
                value={entry.km}
                onChange={(e) =>
                  updateEntry(realIndex, "km", Number(e.target.value))
                }
                className="w-full"
              />
            </td>

            <td className="border p-1">
              <input
                type="number"
                value={entry.liters}
                onChange={(e) =>
                  updateEntry(realIndex, "liters", Number(e.target.value))
                }
                className="w-full"
              />
            </td>

            <td className="border p-1">
              <input
                type="number"
                value={entry.euro}
                onChange={(e) =>
                  updateEntry(realIndex, "euro", Number(e.target.value))
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
  );
}
