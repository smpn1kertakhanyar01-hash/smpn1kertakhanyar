"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { api } from "@/lib/api-client";
import {
  apakahLogin,
  bacaSesiSiswa,
  hapusSesiSiswa,
} from "@/lib/storage";

export default function PengaturanAkunPage() {
  const router = useRouter();
  const [siap, setSiap] = useState(false);
  const [nama, setNama] = useState("");
  const [nisn, setNisn] = useState("");
  const [kelas, setKelas] = useState("");

  const [sandiLama, setSandiLama] = useState("");
  const [sandiBaru, setSandiBaru] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [tampilSandi, setTampilSandi] = useState(false);
  const [pesanError, setPesanError] = useState("");
  const [pesanSukses, setPesanSukses] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!apakahLogin("siswa")) {
      router.replace("/login-siswa");
      return;
    }

    const sesi = bacaSesiSiswa();
    setNama(sesi.nama || "Siswa");
    setNisn(sesi.nisn || "-");
    setKelas(sesi.kelas || "-");
    setSiap(true);
  }, [router]);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Abaikan kegagalan jaringan; sesi lokal tetap dibersihkan.
    }
    hapusSesiSiswa();
    router.push("/login-siswa");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPesanError("");
    setPesanSukses("");

    if (sandiBaru.length < 6) {
      setPesanError("Kata sandi baru minimal 6 karakter.");
      return;
    }

    if (sandiBaru !== konfirmasi) {
      setPesanError("Konfirmasi kata sandi baru belum cocok.");
      return;
    }

    if (sandiLama === sandiBaru) {
      setPesanError("Kata sandi baru harus berbeda dari kata sandi lama.");
      return;
    }

    setLoading(true);
    try {
      await api.changePassword({ sandiLama, sandiBaru });
      setSandiLama("");
      setSandiBaru("");
      setKonfirmasi("");
      setPesanSukses(
        "Kata sandi berhasil diperbarui. Riwayat perubahan sudah tercatat untuk guru piket/BK."
      );
    } catch (error) {
      const pesan =
        error instanceof Error
          ? error.message
          : "Gagal memperbarui kata sandi. Silakan coba lagi.";
      if (pesan.toLowerCase().includes("sesi")) {
        hapusSesiSiswa();
        router.replace("/login-siswa");
        return;
      }
      setPesanError(pesan);
    } finally {
      setLoading(false);
    }
  };

  if (!siap) {
    return (
      <main className="min-h-screen bg-[#f8fbff] flex items-center justify-center p-4 font-sans">
        <p className="text-xs text-slate-400">Memeriksa sesi siswa...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fbff] text-slate-800 font-sans pb-16">
      <PageHeader
        title="PENGATURAN AKUN SISWA"
        subtitle="Ubah Kata Sandi & Keamanan Akun"
        className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 sm:px-12 py-3.5 flex justify-between items-center sticky top-0 z-50"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="text-xs text-slate-600 hover:text-blue-600 font-semibold px-2 sm:px-3 py-1.5 transition"
          >
            ← Beranda
          </Link>
          <button
            onClick={handleLogout}
            className="text-xs bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 font-semibold px-3 py-1.5 rounded-lg border border-slate-200 transition"
          >
            Keluar
          </button>
        </div>
      </PageHeader>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        {/* Kartu Profil */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-xl">
              👤
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                {nama}
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5 break-all">
                NISN: <span className="font-mono font-semibold">{nisn}</span>
                <span className="mx-1.5 text-slate-300">•</span>
                Kelas: <span className="font-semibold">{kelas}</span>
              </p>
            </div>
          </div>
        </section>

        {/* Form Ubah Sandi */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-sm font-extrabold text-slate-900">
              Ubah Kata Sandi
            </h2>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Gunakan kata sandi baru minimal 6 karakter. Jangan bagikan kata
              sandi kepada orang lain.
            </p>
          </div>

          {pesanError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold">
              {pesanError}
            </div>
          )}

          {pesanSukses && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold leading-relaxed">
              {pesanSukses}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Kata Sandi Lama
              </label>
              <input
                type={tampilSandi ? "text" : "password"}
                required
                autoComplete="current-password"
                value={sandiLama}
                onChange={(e) => setSandiLama(e.target.value)}
                placeholder="Masukkan kata sandi saat ini"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 bg-slate-50/30 transition text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Kata Sandi Baru
              </label>
              <input
                type={tampilSandi ? "text" : "password"}
                required
                minLength={6}
                autoComplete="new-password"
                value={sandiBaru}
                onChange={(e) => setSandiBaru(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 bg-slate-50/30 transition text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Konfirmasi Kata Sandi Baru
              </label>
              <input
                type={tampilSandi ? "text" : "password"}
                required
                minLength={6}
                autoComplete="new-password"
                value={konfirmasi}
                onChange={(e) => setKonfirmasi(e.target.value)}
                placeholder="Ulangi kata sandi baru"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 bg-slate-50/30 transition text-slate-900 font-medium"
              />
            </div>

            <label className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold cursor-pointer select-none">
              <input
                type="checkbox"
                checked={tampilSandi}
                onChange={(e) => setTampilSandi(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Tampilkan kata sandi
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl shadow-sm transition hover:scale-[1.01] active:scale-[0.99] text-xs"
            >
              {loading ? "Menyimpan..." : "Simpan Kata Sandi Baru"}
            </button>
          </form>
        </section>

        <section className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 leading-relaxed">
          <p className="font-bold mb-1">🔐 Catatan Keamanan</p>
          <p>
            Setiap perubahan kata sandi dicatat untuk keperluan bantuan guru
            piket/BK. Jika lupa kata sandi, hubungi guru piket atau wali kelas
            untuk verifikasi dan reset di sekolah.
          </p>
        </section>
      </div>
    </main>
  );
}
