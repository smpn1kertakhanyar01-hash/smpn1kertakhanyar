"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import {
  bacaAntreanIjazah,
  bacaPengaturanIjazahLokal,
  berlanggananPerubahanIjazah,
  tambahIjazahLokal,
} from "@/lib/ijazah-store";
import type { PengambilanIjazah } from "@/lib/types";

interface FormAjuan {
  namaSiswa: string;
  nisn: string;
  kelas: string;
  tahunLulus: string;
  namaWali: string;
  catatan: string;
}

const FORM_KOSONG: FormAjuan = {
  namaSiswa: "",
  nisn: "",
  kelas: "",
  tahunLulus: String(new Date().getFullYear()),
  namaWali: "",
  catatan: "",
};

function formatTanggal(nilai: string | null | undefined): string {
  if (!nilai) return "-";
  const normal = nilai.includes("T") ? nilai : `${nilai.replace(" ", "T")}Z`;
  const parsed = new Date(normal);
  if (Number.isNaN(parsed.getTime())) return nilai;
  return parsed.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function PengambilanIjazahPage() {
  const [poinSyarat, setPoinSyarat] = useState<string[]>([]);
  const [informasi, setInformasi] = useState({
    updatedBy: "Sistem",
    updatedAt: "",
  });
  const [antrean, setAntrean] = useState<PengambilanIjazah[]>([]);
  const [form, setForm] = useState<FormAjuan>(FORM_KOSONG);
  const [pencarian, setPencarian] = useState("");
  const [sudahCari, setSudahCari] = useState(false);
  const [tiketBaru, setTiketBaru] = useState<number | null>(null);
  const [pesanError, setPesanError] = useState("");

  useEffect(() => {
    const muatDariLokal = () => {
      const pengaturan = bacaPengaturanIjazahLokal();
      setPoinSyarat(
        pengaturan.isiPersyaratan
          .split(/\r?\n/)
          .map((poin) => poin.trim())
          .filter(Boolean)
      );
      setInformasi({
        updatedBy: pengaturan.updatedBy || "Sistem",
        updatedAt: pengaturan.updatedAt,
      });
      setAntrean(bacaAntreanIjazah());
    };

    muatDariLokal();
    return berlanggananPerubahanIjazah(muatDariLokal);
  }, []);

  const hasilCari = useMemo(() => {
    const kunci = pencarian.trim().toLowerCase();
    if (!kunci) return [];
    return antrean.filter((item) =>
      [item.namaSiswa, item.nisn]
        .filter(Boolean)
        .some((nilai) => String(nilai).toLowerCase().includes(kunci))
    );
  }, [antrean, pencarian]);

  const handleAjukan = (e: React.FormEvent) => {
    e.preventDefault();
    setPesanError("");

    if (!form.namaSiswa.trim()) {
      setPesanError("Nama siswa wajib diisi.");
      return;
    }

    const catatan = [
      form.namaWali.trim()
        ? `Wali pengambil: ${form.namaWali.trim()}`
        : "",
      form.catatan.trim(),
    ]
      .filter(Boolean)
      .join(" | ");

    const baru = tambahIjazahLokal({
      namaSiswa: form.namaSiswa.trim(),
      nisn: form.nisn.trim() || null,
      kelas: form.kelas.trim() || null,
      tahunLulus: form.tahunLulus.trim() || null,
      status: "Belum Diambil",
      catatan: catatan || "Menunggu verifikasi berkas di Tata Usaha.",
    });

    setTiketBaru(baru.id);
    setPencarian(form.nisn.trim() || form.namaSiswa.trim());
    setSudahCari(true);
    setForm(FORM_KOSONG);
    setAntrean(bacaAntreanIjazah());
  };

  return (
    <main className="min-h-screen bg-[#fafbfc] text-slate-800 font-sans pb-16">
      <PageHeader
        title="LAYANAN PENGAMBILAN IJAZAH"
        subtitle="Syarat, Ketentuan, dan Antrean Verifikasi"
      >
        <Link
          href="/"
          className="text-xs font-semibold text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 border border-slate-200 px-3.5 py-2 rounded-xl transition"
        >
          ← Beranda
        </Link>
      </PageHeader>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-3xl p-6 sm:p-8 mb-6">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
            Tata Usaha SMP Negeri 1 Kertak Hanyar
          </p>
          <h1 className="mt-2 text-xl sm:text-2xl font-black text-slate-900">
            Pengambilan Ijazah Alumni
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
            Siapkan berkas sesuai ketentuan di bawah ini, lalu daftarkan antrean
            pengambilan ijazah. Status verifikasi dapat dicek kapan saja melalui
            halaman ini.
          </p>
        </div>

        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Syarat &amp; Ketentuan
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Ketentuan resmi yang diperbarui langsung oleh petugas Tata
                Usaha.
              </p>
            </div>
            <span className="text-[10px] text-slate-400">
              Diperbarui {formatTanggal(informasi.updatedAt)} oleh{" "}
              {informasi.updatedBy || "Admin TU"}
            </span>
          </div>

          {poinSyarat.length === 0 ? (
            <p className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-500">
              Persyaratan belum tersedia. Silakan hubungi Tata Usaha.
            </p>
          ) : (
            <ol className="mt-4 ml-5 list-decimal space-y-2 text-xs sm:text-sm leading-relaxed text-slate-700">
              {poinSyarat.map((poin, indeks) => (
                <li key={`${indeks}-${poin}`} className="pl-1">
                  {poin}
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6">
            <h2 className="text-sm font-bold text-slate-900">
              Ajukan Antrean Pengambilan
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5 mb-4">
              Data langsung tersimpan di perangkat dan muncul di panel Tata
              Usaha.
            </p>

            {tiketBaru && (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] font-semibold text-emerald-700">
                ✅ Antrean berhasil dibuat. Nomor tiket Anda:{" "}
                <span className="font-black">#{tiketBaru}</span>
              </div>
            )}
            {pesanError && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] font-semibold text-rose-700">
                ⛔ {pesanError}
              </div>
            )}

            <form onSubmit={handleAjukan} className="grid grid-cols-1 gap-3">
              {(
                [
                  ["Nama Lengkap Siswa", "namaSiswa", "Nama sesuai ijazah", true],
                  ["NISN", "nisn", "Nomor induk siswa", false],
                  ["Kelas / Jurusan", "kelas", "Contoh: 9A", false],
                  ["Tahun Lulus", "tahunLulus", "Contoh: 2026", false],
                  ["Nama Wali / Pengambil", "namaWali", "Opsional", false],
                ] as const
              ).map(([label, kunci, placeholder, wajib]) => (
                <label key={kunci} className="block">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    {label}
                  </span>
                  <input
                    type="text"
                    required={wajib}
                    value={form[kunci]}
                    onChange={(e) =>
                      setForm((sebelumnya) => ({
                        ...sebelumnya,
                        [kunci]: e.target.value,
                      }))
                    }
                    placeholder={placeholder}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </label>
              ))}
              <label className="block">
                <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Catatan Tambahan
                </span>
                <textarea
                  rows={3}
                  value={form.catatan}
                  onChange={(e) =>
                    setForm((sebelumnya) => ({
                      ...sebelumnya,
                      catatan: e.target.value,
                    }))
                  }
                  placeholder="Contoh: pengambilan diwakilkan oleh orang tua"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </label>
              <button
                type="submit"
                className="mt-1 rounded-xl bg-amber-600 hover:bg-amber-700 px-5 py-2.5 text-xs font-bold text-white transition"
              >
                Kirim Antrean
              </button>
            </form>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6">
            <h2 className="text-sm font-bold text-slate-900">
              Cek Status Antrean
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5 mb-4">
              Masukkan NISN atau nama siswa untuk melihat status verifikasi.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSudahCari(true);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={pencarian}
                onChange={(e) => {
                  setPencarian(e.target.value);
                  setSudahCari(false);
                }}
                placeholder="NISN atau nama siswa"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white transition"
              >
                Cek
              </button>
            </form>

            <div className="mt-4">
              {!sudahCari ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-400">
                  Hasil pengecekan akan ditampilkan di sini.
                </div>
              ) : hasilCari.length === 0 ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-center text-xs font-semibold text-rose-700">
                  Antrean dengan NISN atau nama tersebut belum ditemukan.
                </div>
              ) : (
                <div className="space-y-3">
                  {hasilCari.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 p-4 bg-slate-50/60"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-slate-900">
                          {item.namaSiswa}
                        </p>
                        <span
                          className={`px-2 py-0.5 rounded border text-[10px] font-bold ${
                            item.status === "Diambil"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Tiket #{item.id} • NISN {item.nisn || "-"} • Tahun{" "}
                        {item.tahunLulus || "-"}
                      </p>
                      <p className="mt-2 text-[11px] text-slate-600">
                        {item.status === "Diambil"
                          ? `Ijazah diambil pada ${formatTanggal(item.tanggalAmbil)} oleh ${item.diambilOleh || "wali"}.`
                          : "Berkas sedang diverifikasi petugas Tata Usaha."}
                      </p>
                      {item.catatan && (
                        <p className="mt-1 text-[10px] text-slate-400 italic">
                          Catatan: {item.catatan}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
