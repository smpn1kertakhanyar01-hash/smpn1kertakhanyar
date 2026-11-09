"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import type { AgendaAkademik } from "@/lib/types";

export default function KalenderAkademikPage() {
  const [semesterAktif, setSemesterAktif] = useState<"Semua" | "Ganjil" | "Genap">("Semua");
  const [daftarAgenda, setDaftarAgenda] = useState<AgendaAkademik[]>([]);

  useEffect(() => {
    let masihAktif = true;
    api
      .getAgenda()
      .then((data) => {
        if (masihAktif) setDaftarAgenda(data);
      })
      .catch((error) => {
        console.error("Gagal memuat agenda akademik:", error);
      });

    return () => {
      masihAktif = false;
    };
  }, []);

  const agendaFiltered = daftarAgenda.filter((item) => {
    return semesterAktif === "Semua" || item.semester === semesterAktif;
  });

  const getBadge = (kategori: string) => {
    switch (kategori) {
      case "Libur":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "Ujian":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Rapor":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 font-sans py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Navigasi Balik */}
        <div className="mb-4">
          <Link href="/" className="text-xs font-semibold text-blue-600 hover:text-blue-800">
            ← Kembali ke Beranda
          </Link>
        </div>

        {/* Kontainer Utama */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          {/* Header Ringkas */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Kalender Akademik</h1>
              <p className="text-xs text-slate-500">Tahun Ajaran 2026/2027 • SMPN 1 Kertak Hanyar</p>
            </div>

            {/* Filter Sederhana */}
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1 self-start sm:self-auto">
              {(["Semua", "Ganjil", "Genap"] as const).map((sem) => (
                <button
                  key={sem}
                  onClick={() => setSemesterAktif(sem)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                    semesterAktif === sem
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {sem}
                </button>
              ))}
            </div>
          </div>

          {/* Tabel Agenda Minimalis */}
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">Agenda / Kegiatan</th>
                  <th className="py-2.5 px-3 text-right">Kategori</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agendaFiltered.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-medium text-blue-700 whitespace-nowrap">
                      {row.tanggal}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {row.kegiatan}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getBadge(row.kategori)}`}>
                        {row.kategori}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
