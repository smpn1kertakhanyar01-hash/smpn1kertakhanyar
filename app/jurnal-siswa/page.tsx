"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { api } from "@/lib/api-client";
import {
  hapusSesiSiswa,
  STORAGE_KEYS,
} from "@/lib/storage";
import type { CatatanKejadianItem } from "@/lib/types";
import { maskStudentIdentity } from "@/lib/utils";

export default function JurnalSiswaPage() {
  const router = useRouter();
  const [daftarKejadian, setDaftarKejadian] = useState<CatatanKejadianItem[]>([]);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterKategori, setFilterKategori] = useState<string>("Semua");

  useEffect(() => {
    // Verifikasi sesi siswa
    const isLoggedIn = localStorage.getItem(STORAGE_KEYS.isLoggedIn);
    const userRole = localStorage.getItem(STORAGE_KEYS.userRole);

    if (isLoggedIn !== "true" || (userRole !== "siswa" && userRole !== "guru")) {
      setIsAuthorized(false);
      setLoading(false);
      router.replace("/login-siswa");
      return;
    }

    setIsAuthorized(true);

    let masihAktif = true;
    api
      .getIncidents()
      .then((data) => {
        if (masihAktif) setDaftarKejadian(data);
      })
      .catch((error) => {
        console.error("Gagal memuat jurnal kejadian:", error);
      })
      .finally(() => {
        if (masihAktif) setLoading(false);
      });

    return () => {
      masihAktif = false;
    };
  }, [router]);

  if (loading || !isAuthorized) {
    return (
      <main className="min-h-screen bg-[#f8fbff] flex flex-col items-center justify-center p-4 font-sans text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center text-xl mb-3 shadow-sm animate-pulse">
          🔒
        </div>
        <h2 className="text-sm font-bold text-slate-800">Area Terbatas</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          Memeriksa hak akses akun siswa...
        </p>
      </main>
    );
  }

  const kejadianFiltered =
    filterKategori === "Semua"
      ? daftarKejadian
      : daftarKejadian.filter((k) => k.kategori === filterKategori);

  return (
    <main className="min-h-screen bg-[#f8fbff] text-slate-800 font-sans pb-16">
      {/* Header */}
      <PageHeader
        title="PAPAN JURNAL KESISWAAN"
        subtitle="Catatan Pengawasan Harian SMPN 1 Kertak Hanyar"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="text-xs text-slate-600 hover:text-blue-600 font-semibold px-2 sm:px-3 py-1.5 transition"
          >
            ← Beranda
          </Link>
          <Link
            href="/pengaturan-akun"
            className="text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 font-semibold px-2 sm:px-3 py-1.5 rounded-lg transition"
          >
            ⚙️ Akun
          </Link>
          <button
            onClick={async () => {
              try {
                await api.logout();
              } catch {
                // Abaikan kegagalan jaringan; sesi lokal tetap dibersihkan.
              }
              hapusSesiSiswa();
              router.push("/login-siswa");
            }}
            className="text-xs bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 font-semibold px-3 py-1.5 rounded-lg border border-slate-200 transition"
          >
            Keluar Akun
          </button>
        </div>
      </PageHeader>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Banner Informasi */}
        <div className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-2.5 shadow-sm">
          <span className="text-base">📢</span>
          <span>
            Papan catatan kejadian dan pengawasan harian sekolah. Identitas siswa
            ditampilkan dalam bentuk inisial dan kelas tanpa paralel untuk
            menjaga privasi.
          </span>
        </div>

        {/* Filter Kategori */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <span className="text-xs font-bold text-slate-700 uppercase">
            Filter Kategori Kejadian
          </span>
          <select
            value={filterKategori}
            onChange={(e) => setFilterKategori(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-600"
          >
            <option value="Semua">Semua Kategori</option>
            <option value="Kedisiplinan">Kedisiplinan / Tata Tertib</option>
            <option value="Kesehatan / UKS">Kesehatan / UKS</option>
            <option value="Fasilitas / Sarpras">Fasilitas Sekolah</option>
            <option value="Lainnya">Kejadian Khusus Lainnya</option>
          </select>
        </div>

        {/* List Catatan Kejadian */}
        <div className="space-y-4">
          {kejadianFiltered.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs text-slate-400">
              Belum ada catatan kejadian hari ini yang tersimpan.
            </div>
          ) : (
            kejadianFiltered.map((item) => {
              const identitas = maskStudentIdentity(
                item.namaSiswaTerlibat,
                item.kelasSiswa
              );

              return (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 hover:border-blue-200 transition"
              >
                {/* Header Kartu: Tanggal, Waktu & Kategori */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{item.tanggal}</span>
                    <span className="text-[11px] font-mono text-blue-600 font-semibold">
                      • {item.waktu}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {item.kategori}
                  </span>
                </div>

                {/* Info Siswa & Kelas (Disamarkan) */}
                <div className="flex items-center gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                    👤
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {identitas.nama || "Umum / Seluruh Siswa"}
                      </span>
                      {identitas.kelas && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                          {identitas.kelas}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Identitas siswa disamarkan untuk menjaga privasi.
                    </p>
                  </div>
                </div>

                {/* Kronologi Kejadian */}
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase mb-0.5">
                    Kronologi / Peristiwa:
                  </p>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {item.deskripsi}
                  </p>
                </div>

                {/* Tindakan Penanganan & Guru Piket */}
                <div className="pt-2 text-[11px] text-slate-600 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 flex flex-col sm:flex-row justify-between gap-2">
                  <div>
                    <span className="font-bold text-emerald-800">Tindakan Penanganan: </span>
                    <span className="text-slate-700">{item.tindakanPenanganan}</span>
                  </div>
                  <span className="text-slate-400 italic text-right whitespace-nowrap">
                    Piket: {item.guruPiket}
                  </span>
                </div>
              </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
