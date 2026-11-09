"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import OpeningLaunching, {
  OPENING_RESET_EVENT,
} from "@/components/OpeningLaunching";
import PageHeader from "@/components/PageHeader";
import { api } from "@/lib/api-client";
import { KATEGORI_PENGAMBILAN_IJAZAH } from "@/lib/constants";
import { migrasikanDataLama } from "@/lib/migrate";
import {
  apakahLogin,
  bacaSesiSiswa,
  hapusSesiSiswa,
  STORAGE_KEYS,
} from "@/lib/storage";
import type { PengaturanLayanan } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const sudahRekamKunjungan = useRef(false);
  const [pengunjungHariIni, setPengunjungHariIni] = useState<number>(0);
  const [totalPengunjung, setTotalPengunjung] = useState<number>(0);
  const [isSiswaLogin, setIsSiswaLogin] = useState<boolean>(false);
  const [namaSiswa, setNamaSiswa] = useState<string>("");
  const [syaratIjazah, setSyaratIjazah] = useState<PengaturanLayanan | null>(
    null
  );
  const [memuatSyaratIjazah, setMemuatSyaratIjazah] = useState(true);
  const [gagalSyaratIjazah, setGagalSyaratIjazah] = useState("");
  const [tampilSyaratIjazah, setTampilSyaratIjazah] = useState(false);

  useEffect(() => {
    // 1. Periksa status sesi siswa
    if (apakahLogin("siswa")) {
      const sesi = bacaSesiSiswa();
      setIsSiswaLogin(true);
      setNamaSiswa(sesi.nama || "Siswa");
    } else {
      setIsSiswaLogin(false);
    }

    // 2. Pindahkan data localStorage lama ke database (sekali saja)
    void migrasikanDataLama();

    // 3. Rekam dan hitung statistik kunjungan website
    if (sudahRekamKunjungan.current) return;
    sudahRekamKunjungan.current = true;

    api
      .recordVisit()
      .then((statistik) => {
        setPengunjungHariIni(statistik.hariIni);
        setTotalPengunjung(statistik.total);
      })
      .catch((error) => {
        console.error("Gagal membaca statistik pengunjung:", error);
      });

    api
      .getPengaturanLayanan(KATEGORI_PENGAMBILAN_IJAZAH)
      .then((hasil) => {
        setSyaratIjazah(hasil);
        setGagalSyaratIjazah("");
      })
      .catch((error) => {
        console.error("Gagal membaca persyaratan ijazah:", error);
        setGagalSyaratIjazah(
          "Informasi persyaratan belum dapat dimuat. Silakan coba lagi nanti."
        );
      })
      .finally(() => setMemuatSyaratIjazah(false));
  }, []);

  // Handler proteksi untuk menu khusus siswa
  const proteksiAksesSiswa = (tujuanUrl: string) => {
    if (apakahLogin("siswa")) {
      // Jika siswa sudah terautentikasi, langsung buka rute yang dituju
      router.push(tujuanUrl);
    } else {
      // Simpan rute yang diklik agar setelah login otomatis dihantarkan ke sana
      sessionStorage.setItem(STORAGE_KEYS.redirectSetelahLogin, tujuanUrl);
      router.push("/login-siswa");
    }
  };

  // Tombol atas "Masuk Siswa" (selalu kembalikan ke beranda setelah login)
  const handleKlikMasukSiswa = () => {
    sessionStorage.removeItem(STORAGE_KEYS.redirectSetelahLogin);
    router.push("/login-siswa");
  };

  // Khusus demo/presentasi: paksa layar peresmian muncul kembali.
  const handleResetOpening = () => {
    window.dispatchEvent(new Event(OPENING_RESET_EVENT));
  };

  const handleLogoutSiswa = async () => {
    try {
      await api.logout();
    } catch {
      // Abaikan kegagalan jaringan; sesi lokal tetap dibersihkan.
    }
    hapusSesiSiswa();
    setIsSiswaLogin(false);
  };

  const poinSyaratIjazah = (syaratIjazah?.isiPersyaratan ?? "")
    .split(/\r?\n/)
    .map((poin) => poin.trim())
    .filter(Boolean);

  return (
    <main className="min-h-screen bg-[#fafbfc] text-slate-800 font-sans selection:bg-blue-600 selection:text-white">
      <OpeningLaunching />

      {/* Header Navigasi */}
      <PageHeader
        title="SMP NEGERI 1 KERTAK HANYAR"
        subtitle="E-Layanan & Portal Informasi Kesiswaan"
        className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 sm:px-12 py-3.5 flex justify-between items-center sticky top-0 z-50"
        titleClassName="font-extrabold text-slate-900 text-sm leading-tight tracking-tight"
        subtitleClassName="text-[11px] text-blue-600 font-semibold tracking-wide"
      >
        <div className="flex items-center gap-3">
          <Link
            href="/login-guru"
            className="text-xs font-bold text-slate-600 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 border border-slate-200 px-3.5 py-2 rounded-xl transition"
          >
            Portal Guru →
          </Link>

          {isSiswaLogin ? (
            <div className="flex items-center gap-2">
              <Link
                href="/pengaturan-akun"
                title="Pengaturan Akun / Ubah Kata Sandi"
                className="text-xs font-bold text-slate-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition"
              >
                👤 {namaSiswa} ⚙️
              </Link>
              <button
                onClick={handleLogoutSiswa}
                className="text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-xl transition"
              >
                Keluar
              </button>
            </div>
          ) : (
            <button
              onClick={handleKlikMasukSiswa}
              className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl shadow-sm transition hover:scale-[1.02] active:scale-[0.98]"
            >
              Masuk Siswa
            </button>
          )}
        </div>
      </PageHeader>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 pt-12 pb-8 text-center">
        <div className="flex flex-col items-center gap-3 mb-4">
          <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-3.5 py-1.5 rounded-full inline-block">
            SISTEM INFORMASI KESISWAAN DIGITAL
          </span>
          <span className="font-bold tracking-widest text-blue-700 bg-blue-50 border border-blue-200 px-4 py-1.5 rounded-full inline-flex items-center justify-center gap-2 text-xs sm:text-sm shadow-sm max-w-full">
            <svg
              className="h-4 w-4 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            <span className="text-center">SETITIK TINTA SEJUTA MAKNA</span>
          </span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
          Layanan Sekolah Lebih Cepat, <br className="hidden sm:block" />
          <span className="text-blue-600">Transparan & Terpadu</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto mt-3 leading-relaxed">
          Kemudahan pengajuan surat izin daring, pantauan kehadiran kelas harian, jurnal kegiatan siswa terproteksi, dan jadwal kegiatan resmi SMPN 1 Kertak Hanyar.
        </p>
      </section>

      {/* Grid Menu Layanan Kesiswaan */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 py-6">
        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-4">
          Pilihan Layanan Kesiswaan
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Menu 1: Kalender Akademik (Terbuka Umum) */}
          <Link
            href="/kalender-akademik"
            className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:border-blue-400 hover:shadow-md transition flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition">
                📅
              </div>
              <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-blue-600 transition">
                Kalender Akademik
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Jadwal lengkap kegiatan belajar, ujian sekolah, dan libur semester resmi.
              </p>
            </div>
            <span className="text-[11px] font-bold text-blue-600 mt-4 inline-block">
              Buka Jadwal →
            </span>
          </Link>

          {/* Menu 2: Pengajuan Surat Izin (Proteksi Akun Siswa) */}
          <div
            onClick={() => proteksiAksesSiswa("/surat-izin")}
            className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:border-blue-400 hover:shadow-md transition flex flex-col justify-between group cursor-pointer"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition">
                ✉️
              </div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-blue-600 transition">
                  Pengajuan Surat Izin
                </h4>
                <span className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  🔒 Login Siswa
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Kirim permohonan izin sakit atau urusan keluarga disertai berkas foto fisik.
              </p>
            </div>
            <span className="text-[11px] font-bold text-blue-600 mt-4 inline-block">
              Ajukan Surat →
            </span>
          </div>

          {/* Menu 3: Status Izin (Terbuka Umum) */}
          <Link
            href="/status-izin"
            className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:border-blue-400 hover:shadow-md transition flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition">
                🔍
              </div>
              <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-blue-600 transition">
                Cek Status Pengajuan
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Pantau verifikasi surat apakah disetujui atau ditolak guru piket.
              </p>
            </div>
            <span className="text-[11px] font-bold text-blue-600 mt-4 inline-block">
              Periksa Berkas →
            </span>
          </Link>

          {/* Menu 4: Papan Kehadiran Kelas (Terbuka Umum / Read-Only) */}
          <Link
            href="/rekap-presensi"
            className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:border-blue-400 hover:shadow-md transition flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition">
                📊
              </div>
              <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-blue-600 transition">
                Papan Kehadiran Kelas
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Pantau rekapitulasi absensi harian kelas yang dicatat resmi oleh guru.
              </p>
            </div>
            <span className="text-[11px] font-bold text-emerald-600 mt-4 inline-block">
              Lihat Hasil Absensi →
            </span>
          </Link>

          {/* Menu 5: Jurnal Siswa (Proteksi Akun Siswa) */}
          <div
            onClick={() => proteksiAksesSiswa("/jurnal-siswa")}
            className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:border-purple-400 hover:shadow-md transition flex flex-col justify-between group cursor-pointer"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition">
                📓
              </div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-purple-600 transition">
                  Jurnal Kejadian Harian
                </h4>
                <span className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  🔒 Login Siswa
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Informasi pengawasan kesiswaan harian dan catatan pengawas khusus bagi siswa terdaftar.
              </p>
            </div>
            <span className="text-[11px] font-bold text-purple-600 mt-4 inline-block">
              Buka Jurnal Siswa →
            </span>
          </div>

          {/* Menu 6: Mutasi Siswa (Terbuka Umum) */}
          <Link
            href="/mutasi-siswa"
            className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:border-cyan-400 hover:shadow-md transition flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition">
                📑
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-cyan-600 transition">
                  Mutasi Siswa
                </h4>
                <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  ✨ Layanan Baru
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Pengajuan dan informasi pindah masuk atau keluar sekolah di pertengahan semester.
              </p>
            </div>
            <span className="text-[11px] font-bold text-cyan-600 mt-4 inline-block">
              Ajukan Mutasi →
            </span>
          </Link>

          {/* Menu 7: Informasi & Persyaratan Pengambilan Ijazah (Terbuka Umum) */}
          <button
            type="button"
            onClick={() => setTampilSyaratIjazah(true)}
            className="text-left bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:border-amber-400 hover:shadow-md transition flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition">
                🎓
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-amber-600 transition">
                  Informasi &amp; Persyaratan Pengambilan Ijazah
                </h4>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Cek kelengkapan berkas dan ketentuan resmi pengambilan ijazah
                alumni sebelum datang ke Tata Usaha.
              </p>
            </div>
            <span className="text-[11px] font-bold text-amber-600 mt-4 inline-block">
              Lihat Persyaratan →
            </span>
          </button>
        </div>
      </section>

      {/* Visitor Counter Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 py-4">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-2xl">
              🌐
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Statistik Pengunjung Portal</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Pemantauan keaktifan pengunjung website resmi SMPN 1 Kertak Hanyar secara transparan.
              </p>
            </div>
          </div>

          <div className="flex gap-4 w-full sm:w-auto justify-center">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-center min-w-[130px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Hari Ini
              </span>
              <span className="text-xl font-black text-blue-600 mt-0.5 block">
                {pengunjungHariIni} <span className="text-xs font-semibold text-slate-400">Orang</span>
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-center min-w-[130px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Total Kunjungan
              </span>
              <span className="text-xl font-black text-slate-800 mt-0.5 block">
                {totalPengunjung} <span className="text-xs font-semibold text-slate-400">Hits</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 sm:px-8 pt-10 pb-8 border-t border-slate-200 mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
        <div className="flex flex-col items-center gap-1 text-center sm:items-start sm:text-left">
          <p className="text-slate-500">
            © 2026 SMP Negeri 1 Kertak Hanyar. All rights reserved.
          </p>
          <p className="text-slate-500 font-medium">
            Created by Meilysa Maulida
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <Link href="/login-guru" className="hover:text-blue-600 transition">
            Portal Guru Piket
          </Link>
          <Link href="/kalender-akademik" className="hover:text-blue-600 transition">
            Jadwal Akademik
          </Link>
          <button
            type="button"
            onClick={handleResetOpening}
            title="Khusus demo/presentasi: tampilkan kembali layar peresmian"
            className="cursor-pointer text-[10px] text-slate-300 transition hover:text-blue-600"
          >
            Reset Launching
          </button>
        </div>
      </footer>

      {tampilSyaratIjazah && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="judul-syarat-ijazah"
          onClick={() => setTampilSyaratIjazah(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                  Layanan Tata Usaha
                </p>
                <h2
                  id="judul-syarat-ijazah"
                  className="mt-0.5 text-base font-extrabold text-slate-900"
                >
                  Informasi &amp; Persyaratan Pengambilan Ijazah
                </h2>
                <p className="mt-1 text-[11px] text-slate-500">
                  SMP Negeri 1 Kertak Hanyar
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTampilSyaratIjazah(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
                aria-label="Tutup informasi persyaratan"
              >
                ✕
              </button>
            </div>

            {memuatSyaratIjazah ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                Memuat persyaratan pengambilan ijazah...
              </div>
            ) : gagalSyaratIjazah || poinSyaratIjazah.length === 0 ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center text-xs font-semibold text-rose-700">
                {gagalSyaratIjazah ||
                  "Persyaratan pengambilan ijazah belum tersedia."}
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                <p className="mb-2 text-[11px] font-bold text-amber-900">
                  Harap lengkapi persyaratan berikut:
                </p>
                <ol className="ml-4 list-decimal list-outside space-y-2 text-[11px] leading-relaxed text-amber-950 sm:text-xs">
                  {poinSyaratIjazah.map((poin, idx) => (
                    <li key={`${idx}-${poin}`} className="pl-0.5">
                      {poin}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="mt-3 flex flex-col items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[10px] text-slate-400 sm:flex-row">
              <span>
                {syaratIjazah?.updatedAt
                  ? `Diperbarui ${syaratIjazah.updatedAt} oleh ${
                      syaratIjazah.updatedBy || "Admin TU"
                    }`
                  : "Informasi resmi Tata Usaha"}
              </span>
              <button
                type="button"
                onClick={() => setTampilSyaratIjazah(false)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
