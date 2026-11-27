"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { api } from "@/lib/api-client";
import {
  bacaAntreanIjazah,
  bacaDataIjazahLokal,
  berlanggananPerubahanIjazah,
  hapusIjazahLokal,
  perbaruiIjazahLokal,
  simpanDaftarSyaratIjazah,
  tambahIjazahLokal,
} from "@/lib/ijazah-store";
import {
  apakahAdminTu,
  apakahLogin,
  bacaNamaGuru,
  bacaPeranPenggunaLokal,
  hapusSesiGuru,
  PERAN_PENGGUNA_LOKAL_KEY,
} from "@/lib/storage";
import type { PengambilanIjazah } from "@/lib/types";

interface FormAntrean {
  namaSiswa: string;
  nisn: string;
  kelas: string;
  tahunLulus: string;
  catatan: string;
}

const FORM_KOSONG: FormAntrean = {
  namaSiswa: "",
  nisn: "",
  kelas: "",
  tahunLulus: String(new Date().getFullYear()),
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

export default function AdminTuIjazahPage() {
  const router = useRouter();
  const [siap, setSiap] = useState(false);
  const [namaPetugas, setNamaPetugas] = useState("Admin TU");
  const [draftSyarat, setDraftSyarat] = useState("");
  const [informasiSyarat, setInformasiSyarat] = useState({
    updatedBy: "Sistem",
    updatedAt: "",
  });
  const [antrean, setAntrean] = useState<PengambilanIjazah[]>([]);
  const [tampilForm, setTampilForm] = useState(false);
  const [form, setForm] = useState<FormAntrean>(FORM_KOSONG);
  const [pencarian, setPencarian] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "SEMUA" | "Belum Diambil" | "Diambil"
  >("SEMUA");
  const [pesanSukses, setPesanSukses] = useState("");
  const [pesanError, setPesanError] = useState("");
  const [memproses, setMemproses] = useState<number | null>(null);

  function sinkronisasiDariLokal() {
    const data = bacaDataIjazahLokal();
    setDraftSyarat(data.daftarSyarat.join("\n"));
    setInformasiSyarat({
      updatedBy: data.updatedBy || "Sistem",
      updatedAt: data.updatedAt,
    });
    setAntrean(bacaAntreanIjazah());
  }

  useEffect(() => {
    bacaPeranPenggunaLokal();
    const peranLokal = window.localStorage.getItem(PERAN_PENGGUNA_LOKAL_KEY);
    if (
      peranLokal !== "tu" ||
      !apakahLogin("guru") ||
      !apakahAdminTu()
    ) {
      router.replace("/dashboard-guru?akses=ditolak");
      return;
    }

    const petugas = bacaNamaGuru() || "Admin TU";
    setNamaPetugas(petugas);

    sinkronisasiDariLokal();
    setSiap(true);

    // Perubahan dari halaman publik langsung tercermin di panel TU.
    const berhenti = berlanggananPerubahanIjazah(() => {
      sinkronisasiDariLokal();
    });
    return berhenti;
  }, [router]);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Sesi lokal tetap dibersihkan meski API gagal.
    }
    hapusSesiGuru();
    router.replace("/login-guru");
  };

  const handleSimpanSyarat = (e: React.FormEvent) => {
    e.preventDefault();
    setPesanSukses("");
    setPesanError("");

    try {
      const hasil = simpanDaftarSyaratIjazah(
        draftSyarat.split(/\r?\n/),
        namaPetugas
      );
      setDraftSyarat(hasil.daftarSyarat.join("\n"));
      setInformasiSyarat({
        updatedBy: hasil.updatedBy || namaPetugas,
        updatedAt: hasil.updatedAt,
      });
      setPesanSukses(
        "Syarat & ketentuan berhasil disimpan dan langsung aktif di halaman publik."
      );
    } catch (error) {
      setPesanError(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan syarat & ketentuan ijazah."
      );
    }
  };

  const handleTambahAntrean = (e: React.FormEvent) => {
    e.preventDefault();
    setPesanSukses("");
    setPesanError("");

    if (!form.namaSiswa.trim()) {
      setPesanError("Nama siswa wajib diisi.");
      return;
    }

    const baru = tambahIjazahLokal({
      namaSiswa: form.namaSiswa.trim(),
      nisn: form.nisn.trim() || null,
      kelas: form.kelas.trim() || null,
      tahunLulus: form.tahunLulus.trim() || null,
      status: "Belum Diambil",
      catatan: form.catatan.trim() || null,
    });
    setAntrean(bacaAntreanIjazah());
    setForm(FORM_KOSONG);
    setTampilForm(false);
    setPesanSukses(
      `Antrean ijazah ${baru.namaSiswa} ditambahkan (ticket #${baru.id}).`
    );
  };

  const handleTandaiDiambil = (item: PengambilanIjazah) => {
    const namaPengambil = window.prompt(
      `Nama orang tua/wali yang mengambil ijazah ${item.namaSiswa}:`,
      item.diambilOleh ?? ""
    );
    if (namaPengambil === null) return;
    if (!namaPengambil.trim()) {
      setPesanError("Nama pengambil ijazah wajib diisi.");
      return;
    }

    setMemproses(item.id);
    perbaruiIjazahLokal(item.id, {
      status: "Diambil",
      tanggalAmbil: new Date().toISOString().slice(0, 10),
      diambilOleh: namaPengambil.trim(),
      petugas: namaPetugas,
    });
    setAntrean(bacaAntreanIjazah());
    setMemproses(null);
    setPesanSukses(`Ijazah ${item.namaSiswa} telah diserahkan.`);
  };

  const handleBatalkan = (item: PengambilanIjazah) => {
    if (!window.confirm(`Batalkan status pengambilan ijazah ${item.namaSiswa}?`)) {
      return;
    }

    setMemproses(item.id);
    perbaruiIjazahLokal(item.id, {
      status: "Belum Diambil",
      tanggalAmbil: null,
      diambilOleh: null,
      petugas: null,
    });
    setAntrean(bacaAntreanIjazah());
    setMemproses(null);
    setPesanSukses(`Status ijazah ${item.namaSiswa} dikembalikan ke antrean.`);
  };

  const handleHapus = (item: PengambilanIjazah) => {
    if (!window.confirm(`Hapus arsip antrean ijazah ${item.namaSiswa}?`)) return;

    setMemproses(item.id);
    setAntrean(hapusIjazahLokal(item.id));
    setMemproses(null);
    setPesanSukses(`Arsip ijazah ${item.namaSiswa} dihapus.`);
  };

  const antreanTampil = useMemo(() => {
    const kunci = pencarian.trim().toLowerCase();
    return antrean.filter((item) => {
      if (filterStatus !== "SEMUA" && item.status !== filterStatus) {
        return false;
      }
      if (!kunci) return true;
      return [item.namaSiswa, item.nisn, item.kelas, item.tahunLulus]
        .filter(Boolean)
        .some((nilai) => String(nilai).toLowerCase().includes(kunci));
    });
  }, [antrean, filterStatus, pencarian]);

  const jumlah = useMemo(
    () => ({
      menunggu: antrean.filter((item) => item.status === "Belum Diambil")
        .length,
      diambil: antrean.filter((item) => item.status === "Diambil").length,
    }),
    [antrean]
  );

  if (!siap) {
    return (
      <main className="min-h-screen bg-[#f8fbff] flex items-center justify-center text-xs font-semibold text-slate-500">
        Memeriksa akses Tata Usaha...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fbff] text-slate-800 font-sans pb-16">
      <PageHeader
        title="ADMINISTRASI PENGAMBILAN IJAZAH"
        subtitle="Syarat & Ketentuan serta Antrean Verifikasi"
      >
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            href="/admin-tu"
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
          >
            ← Kembali ke Dashboard TU
          </Link>
          <Link
            href="/"
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-blue-700"
          >
            Beranda
          </Link>
          <button
            onClick={handleLogout}
            className="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-100"
          >
            Keluar
          </button>
        </div>
      </PageHeader>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 mb-6 flex items-start gap-3">
          <span className="shrink-0 w-9 h-9 rounded-xl bg-white/70 border border-amber-200 flex items-center justify-center text-lg">
            🎓
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
              Akses Khusus Tata Usaha
            </p>
            <p className="text-[11px] sm:text-xs text-amber-800 mt-1 leading-relaxed">
              Setiap perubahan syarat dan status antrean langsung tersimpan di
              perangkat (SMPN1KH_SYARAT_IJAZAH) serta tampil di halaman layanan
              publik ijazah tanpa bergantung pada SQLite.
            </p>
          </div>
        </div>

        {pesanSukses && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
            ✅ {pesanSukses}
          </div>
        )}
        {pesanError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            ⛔ {pesanError}
          </div>
        )}

        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <p className="text-[10px] font-semibold text-slate-500 uppercase">
              Belum Diambil / Verifikasi
            </p>
            <h3 className="text-xl font-black text-amber-600 mt-1">
              {jumlah.menunggu}
            </h3>
          </div>
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <p className="text-[10px] font-semibold text-slate-500 uppercase">
              Ijazah Diserahkan
            </p>
            <h3 className="text-xl font-black text-emerald-600 mt-1">
              {jumlah.diambil}
            </h3>
          </div>
        </div>

        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Syarat &amp; Ketentuan Pengambilan Ijazah
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Satu poin per baris. Perubahan langsung aktif di beranda dan
                halaman publik ijazah.
              </p>
            </div>
            <Link
              href="/pengambilan-ijazah"
              target="_blank"
              className="text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition text-center"
            >
              Lihat Halaman Publik ↗
            </Link>
          </div>
          <form onSubmit={handleSimpanSyarat} className="mt-4">
            <textarea
              rows={9}
              value={draftSyarat}
              onChange={(e) => setDraftSyarat(e.target.value)}
              className="w-full px-3.5 py-3 rounded-xl border border-slate-200 text-xs leading-relaxed focus:outline-none focus:border-blue-500"
              placeholder="Tulis setiap syarat pada baris tersendiri"
            />
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-[10px] text-slate-400">
                Terakhir diperbarui {formatTanggal(informasiSyarat.updatedAt)}{" "}
                oleh {informasiSyarat.updatedBy || "Admin TU"}
              </p>
              <button
                type="submit"
                className="rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-xs font-bold text-white transition"
              >
                Simpan Syarat &amp; Ketentuan
              </button>
            </div>
          </form>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Antrean &amp; Status Verifikasi Ijazah
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Verifikasi berkas dan catat penyerahan ijazah kepada alumni.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTampilForm((nilai) => !nilai)}
              className="rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2.5 text-xs font-bold text-white transition"
            >
              {tampilForm ? "− Tutup" : "+ Tambah Antrean"}
            </button>
          </div>

          {tampilForm && (
            <form
              onSubmit={handleTambahAntrean}
              className="p-4 sm:p-5 bg-amber-50/50 border-b border-amber-100 grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              {(
                [
                  ["Nama Siswa", "namaSiswa", "Nama alumni", true],
                  ["NISN", "nisn", "Nomor induk siswa", false],
                  ["Kelas", "kelas", "Contoh: 9A", false],
                  ["Tahun Lulus", "tahunLulus", "Contoh: 2026", false],
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </label>
              ))}
              <label className="block sm:col-span-2">
                <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Catatan
                </span>
                <textarea
                  rows={2}
                  value={form.catatan}
                  onChange={(e) =>
                    setForm((sebelumnya) => ({
                      ...sebelumnya,
                      catatan: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </label>
              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white transition"
                >
                  Simpan Antrean
                </button>
              </div>
            </form>
          )}

          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={pencarian}
              onChange={(e) => setPencarian(e.target.value)}
              placeholder="Cari nama, NISN, kelas, atau tahun lulus"
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
            />
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as typeof filterStatus)
              }
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="SEMUA">Semua Status</option>
              <option value="Belum Diambil">Belum Diambil</option>
              <option value="Diambil">Diambil</option>
            </select>
          </div>

          {antreanTampil.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              Tidak ada antrean yang cocok.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {antreanTampil.map((item) => (
                <div key={item.id} className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2.5 py-0.5 rounded border text-[10px] font-bold ${
                            item.status === "Diambil"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {item.status}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          TICKET #{item.id}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-2">
                        {item.namaSiswa}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        NISN {item.nisn || "-"} • Kelas {item.kelas || "-"} •
                        Tahun {item.tahunLulus || "-"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.status === "Belum Diambil" ? (
                        <button
                          type="button"
                          onClick={() => handleTandaiDiambil(item)}
                          disabled={memproses === item.id}
                          className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-2 text-[11px] font-bold text-white disabled:bg-slate-300"
                        >
                          ✓ Tandai Diambil
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleBatalkan(item)}
                          disabled={memproses === item.id}
                          className="rounded-lg bg-slate-200 hover:bg-slate-300 px-3 py-2 text-[11px] font-bold text-slate-700 disabled:opacity-50"
                        >
                          ↺ Batalkan
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleHapus(item)}
                        disabled={memproses === item.id}
                        className="rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-2 text-[11px] font-bold text-rose-600 disabled:opacity-50"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-600">
                    <p>
                      <span className="font-bold text-slate-400 uppercase block text-[9px]">
                        Tanggal Ambil
                      </span>
                      {formatTanggal(item.tanggalAmbil)}
                    </p>
                    <p>
                      <span className="font-bold text-slate-400 uppercase block text-[9px]">
                        Diambil Oleh
                      </span>
                      {item.diambilOleh || "-"}
                    </p>
                    <p>
                      <span className="font-bold text-slate-400 uppercase block text-[9px]">
                        Petugas
                      </span>
                      {item.petugas || "-"}
                    </p>
                  </div>
                  {item.catatan && (
                    <p className="mt-2 text-[11px] text-slate-500 italic">
                      Catatan: {item.catatan}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
