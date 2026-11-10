"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { api } from "@/lib/api-client";
import {
  KELAS_REKAP_PRESENSI,
  bacaPresensiLokal,
  berlanggananPerubahanPresensi,
  buatPresensiFallback,
  gabungPresensi,
} from "@/lib/presensi-store";
import type { CatatanAbsen, StatusPresensi } from "@/lib/types";
import { ambilTanggalHariIni } from "@/lib/utils";

export default function RekapPresensiPublikPage() {
  const [daftarPresensi, setDaftarPresensi] = useState<CatatanAbsen[]>([]);
  const [dariServer, setDariServer] = useState<CatatanAbsen[]>([]);
  const [kelasPilihan, setKelasPilihan] = useState<string>("Semua");
  const [tanggalPilihan, setTanggalPilihan] = useState<string>("");
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    const tanggalHariIni = ambilTanggalHariIni();
    setTanggalPilihan(tanggalHariIni);

    let masihAktif = true;

    api
      .getAttendance()
      .then((data) => {
        if (masihAktif) setDariServer(data);
      })
      .catch((error) => {
        // Tetap tampilkan input guru yang tersimpan di browser.
        console.error("Gagal memuat data presensi server:", error);
      })
      .finally(() => {
        if (masihAktif) setMemuat(false);
      });

    return () => {
      masihAktif = false;
    };
  }, []);

  // Gabungkan data server dengan localStorage dan ikuti perubahan store agar
  // input presensi terbaru langsung tampil tanpa reload.
  useEffect(() => {
    const muat = () =>
      setDaftarPresensi(gabungPresensi(dariServer, bacaPresensiLokal()));

    muat();
    return berlanggananPerubahanPresensi(muat);
  }, [dariServer]);

  // Data untuk tanggal terpilih; fallback dipakai hanya bila API dan
  // localStorage sama-sama tidak memiliki presensi pada tanggal tersebut.
  const dataTanggal = useMemo(
    () =>
      daftarPresensi.filter(
        (item) => !tanggalPilihan || item.tanggal === tanggalPilihan
      ),
    [daftarPresensi, tanggalPilihan]
  );

  const memakaiFallback =
    Boolean(tanggalPilihan) && !memuat && dataTanggal.length === 0;

  const sumberTampil = useMemo(
    () =>
      memakaiFallback
        ? buatPresensiFallback(tanggalPilihan)
        : daftarPresensi,
    [memakaiFallback, tanggalPilihan, daftarPresensi]
  );

  // Filter data sesuai kelas & tanggal yang dipilih siswa
  const hasilFilter = useMemo(() => {
    return sumberTampil
      .filter((item) => {
        const cocokKelas =
          kelasPilihan === "Semua" || item.kelas === kelasPilihan;
        const cocokTanggal = !tanggalPilihan || item.tanggal === tanggalPilihan;
        return cocokKelas && cocokTanggal;
      })
      .sort(
        (a, b) =>
          a.kelas.localeCompare(b.kelas, "id", { numeric: true }) ||
          a.nama.localeCompare(b.nama, "id")
      );
  }, [sumberTampil, kelasPilihan, tanggalPilihan]);

  // Hitung ringkasan status
  const ringkasan = hasilFilter.reduce<Record<StatusPresensi, number>>(
    (total, item) => {
      if (item.status in total) {
        total[item.status] += 1;
      }
      return total;
    },
    { Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0 }
  );

  return (
    <main className="min-h-screen bg-[#f8fbff] text-slate-800 font-sans pb-16">
      {/* Header */}
      <PageHeader
        title="PAPAN KEHADIRAN KELAS"
        subtitle="Transparansi Data Presensi Resmi SMPN 1 Kertak Hanyar"
        subtitleClassName="text-[11px] font-medium text-emerald-600"
      >
        <Link
          href="/"
          className="text-xs text-slate-600 hover:text-blue-600 font-semibold px-3 py-1.5 transition"
        >
          ← Kembali ke Beranda
        </Link>
      </PageHeader>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Banner Keterangan Read-Only */}
        <div className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-100 text-blue-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>ℹ️</span>
            <span>
              Halaman ini hanya untuk <strong>melihat hasil presensi</strong>. Pengisian data absensi dilakukan langsung oleh Guru/Wali Kelas di sekolah.
            </span>
          </div>
        </div>

        {/* Filter Kelas & Tanggal */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Pilih Kelas
              </label>
              <select
                value={kelasPilihan}
                onChange={(e) => setKelasPilihan(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600"
              >
                <option value="Semua">Semua Kelas</option>
                {KELAS_REKAP_PRESENSI.map((kelas) => (
                  <option key={kelas} value={kelas}>
                    Kelas {kelas}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Tanggal
              </label>
              <input
                type="date"
                value={tanggalPilihan}
                onChange={(e) => setTanggalPilihan(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* Rangkuman Cepat */}
          <div className="flex items-center gap-2 text-[11px] font-bold">
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
              Hadir: {ringkasan.Hadir}
            </span>
            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg">
              Sakit: {ringkasan.Sakit}
            </span>
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg">
              Izin: {ringkasan.Izin}
            </span>
            <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
              Alpa: {ringkasan.Alpa}
            </span>
          </div>
        </div>

        {/* Tabel Data (Tidak Bisa Diedit Siswa) */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-xs font-bold text-slate-700 uppercase">
              Rekapitulasi Kehadiran ({hasilFilter.length} Siswa Terdata)
            </h2>
            <span className="text-[11px] text-slate-400">
              {memuat
                ? "Memuat data..."
                : memakaiFallback
                  ? "Data contoh (belum ada input)"
                  : "Mode Lihat (Read-Only)"}
            </span>
          </div>

          {memuat ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <p className="font-semibold text-slate-600 mb-1">Memuat data presensi...</p>
              <p>Menggabungkan data server dan presensi yang tersimpan di browser.</p>
            </div>
          ) : hasilFilter.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <p className="font-semibold text-slate-600 mb-1">Belum ada data presensi.</p>
              <p>Belum ada presensi yang diinput guru untuk tanggal atau kelas yang dipilih.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5 w-12 text-center">No</th>
                    <th className="p-3.5">Nama Siswa</th>
                    <th className="p-3.5">Kelas</th>
                    <th className="p-3.5 text-center">Status Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {hasilFilter.map((item, idx) => {
                    let badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                    if (item.status === "Sakit") badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
                    if (item.status === "Izin") badgeClass = "bg-blue-50 text-blue-700 border-blue-200";
                    if (item.status === "Alpa") badgeClass = "bg-rose-50 text-rose-700 border-rose-200";

                    return (
                      <tr key={`${item.nisn}-${item.tanggal}`} className="hover:bg-slate-50/70 transition">
                        <td className="p-3.5 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3.5">
                          <span className="font-bold text-slate-900">{item.nama}</span>
                          <span className="block font-mono text-[11px] text-slate-400">
                            NISN {item.nisn}
                          </span>
                        </td>
                        <td className="p-3.5 font-semibold text-slate-600">{item.kelas}</td>
                        <td className="p-3.5 text-center">
                          <span className={`px-3 py-1 rounded-full border text-xs font-bold inline-block ${badgeClass}`}>
                            {item.status}
                          </span>
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
    </main>
  );
}
