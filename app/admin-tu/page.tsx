"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { api } from "@/lib/api-client";
import {
  apakahAdminTu,
  apakahLogin,
  bacaNamaGuru,
  hapusSesiGuru,
} from "@/lib/storage";
import type { MutasiSiswa } from "@/lib/types";

export default function AdminTuPage() {
  const router = useRouter();
  const [siap, setSiap] = useState(false);
  const [nama, setNama] = useState("");
  const [daftarMutasi, setDaftarMutasi] = useState<MutasiSiswa[]>([]);
  const [memuat, setMemuat] = useState(true);

  const [sandiLama, setSandiLama] = useState("");
  const [sandiBaru, setSandiBaru] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [pesanSandi, setPesanSandi] = useState("");
  const [errorSandi, setErrorSandi] = useState("");
  const [menyimpanSandi, setMenyimpanSandi] = useState(false);

  useEffect(() => {
    if (!apakahLogin("guru") || !apakahAdminTu()) {
      router.replace("/dashboard-guru?akses=ditolak");
      return;
    }

    setNama(bacaNamaGuru());
    setSiap(true);

    let masihAktif = true;
    const muatData = async () => {
      try {
        const data = await api.getMutasiSiswa();
        if (masihAktif) setDaftarMutasi(data);
      } catch (error) {
        console.error("Gagal memuat rekap mutasi:", error);
      } finally {
        if (masihAktif) setMemuat(false);
      }
    };

    void muatData();

    return () => {
      masihAktif = false;
    };
  }, [router]);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Abaikan kegagalan jaringan; sesi lokal tetap dibersihkan.
    }
    hapusSesiGuru();
    router.replace("/login-guru");
  };

  const handleGantiSandi = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPesanSandi("");
    setErrorSandi("");

    if (sandiBaru.length < 6) {
      setErrorSandi("Kata sandi baru minimal 6 karakter.");
      return;
    }

    if (sandiBaru !== konfirmasi) {
      setErrorSandi("Konfirmasi kata sandi baru belum cocok.");
      return;
    }

    setMenyimpanSandi(true);
    try {
      await api.changePasswordPegawai({ sandiLama, sandiBaru });
      setSandiLama("");
      setSandiBaru("");
      setKonfirmasi("");
      setPesanSandi("Kata sandi Admin TU berhasil diperbarui.");
    } catch (error) {
      setErrorSandi(
        error instanceof Error
          ? error.message
          : "Gagal memperbarui kata sandi. Silakan coba lagi."
      );
    } finally {
      setMenyimpanSandi(false);
    }
  };

  if (!siap) {
    return (
      <main className="min-h-screen bg-[#f8fbff] flex items-center justify-center text-xs font-semibold text-slate-500">
        Memeriksa akses Tata Usaha...
      </main>
    );
  }

  const totalMasuk = daftarMutasi.filter(
    (item) => item.jenisMutasi === "MASUK"
  ).length;
  const totalKeluar = daftarMutasi.filter(
    (item) => item.jenisMutasi === "KELUAR"
  ).length;
  const belumDiputuskan = daftarMutasi.filter(
    (item) =>
      item.statusBerkas !== "Disetujui" && item.statusBerkas !== "Ditolak"
  ).length;

  return (
    <main className="min-h-screen bg-[#f8fbff] text-slate-800 font-sans pb-16">
      <PageHeader
        title="DASHBOARD TATA USAHA"
        subtitle="Pengelolaan Administrasi Kesiswaan & Mutasi Siswa"
      >
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard-guru"
            className="text-xs text-slate-600 hover:text-blue-600 font-medium px-3 py-1.5 transition"
          >
            Portal Guru
          </Link>
          <Link
            href="/"
            className="text-xs text-slate-600 hover:text-blue-600 font-medium px-3 py-1.5 transition"
          >
            ← Beranda
          </Link>
          <button
            onClick={handleLogout}
            className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-semibold px-3 py-1.5 rounded-lg transition"
          >
            Keluar
          </button>
        </div>
      </PageHeader>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 mb-6 flex items-start gap-3">
          <span className="shrink-0 w-9 h-9 rounded-xl bg-white/70 border border-amber-200 flex items-center justify-center text-lg">
            🗂️
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
              Akses Khusus Tata Usaha
            </p>
            <h2 className="text-sm font-bold text-amber-900 mt-0.5">
              Selamat bertugas, {nama || "Staf Tata Usaha"}
            </h2>
            <p className="text-[11px] sm:text-xs text-amber-800 mt-1 leading-relaxed">
              Menu Mutasi Siswa hanya dapat diakses dan dikelola oleh akun
              dengan peran <strong>ADMIN_TU</strong>. Guru piket dan wali kelas
              tidak melihat data ini di portal guru.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase">
              Total Pengajuan
            </p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">
              {memuat ? "..." : daftarMutasi.length}{" "}
              <span className="text-xs font-normal text-slate-400">Berkas</span>
            </h3>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase">
              Mutasi Masuk
            </p>
            <h3 className="text-2xl font-black text-blue-600 mt-1">
              {memuat ? "..." : totalMasuk}{" "}
              <span className="text-xs font-normal text-slate-400">Siswa</span>
            </h3>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase">
              Mutasi Keluar
            </p>
            <h3 className="text-2xl font-black text-amber-600 mt-1">
              {memuat ? "..." : totalKeluar}{" "}
              <span className="text-xs font-normal text-slate-400">Siswa</span>
            </h3>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase">
              Belum Diputuskan
            </p>
            <h3 className="text-2xl font-black text-rose-600 mt-1">
              {memuat ? "..." : belumDiputuskan}{" "}
              <span className="text-xs font-normal text-slate-400">Berkas</span>
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Menu Utama Tata Usaha
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Verifikasi berkas, input nomor surat, lalu setujui atau tolak
                  pengajuan mutasi.
                </p>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                ADMIN_TU
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
              <Link
                href="/admin-tu/mutasi"
                className="group border border-blue-200 bg-blue-50/60 hover:bg-blue-50 rounded-2xl p-4 transition"
              >
                <span className="text-xl">📑</span>
                <h3 className="text-sm font-bold text-blue-900 mt-2 group-hover:text-blue-700">
                  Kelola Mutasi Siswa
                </h3>
                <p className="text-[11px] text-blue-800 mt-1 leading-relaxed">
                  Daftar mutasi masuk & keluar, verifikasi berkas fisik, nomor
                  surat, serta keputusan TU.
                </p>
              </Link>

              <Link
                href="/dashboard-guru"
                className="group border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-2xl p-4 transition"
              >
                <span className="text-xl">🏫</span>
                <h3 className="text-sm font-bold text-slate-800 mt-2 group-hover:text-slate-600">
                  Portal Kesiswaan
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Akses layanan presensi, surat izin, jurnal kejadian, dan akun
                  siswa sebagaimana tugas pegawai.
                </p>
              </Link>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6">
            <h2 className="text-sm font-bold text-slate-900">
              Ganti Kata Sandi
            </h2>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Kata sandi bawaan Admin TU dapat diganti di sini. Minimal 6
              karakter.
            </p>

            {pesanSandi && (
              <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
                ✅ {pesanSandi}
              </div>
            )}
            {errorSandi && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold">
                ⛔ {errorSandi}
              </div>
            )}

            <form onSubmit={handleGantiSandi} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Kata Sandi Lama
                </label>
                <input
                  type="password"
                  required
                  value={sandiLama}
                  onChange={(e) => setSandiLama(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Kata Sandi Baru
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={sandiBaru}
                  onChange={(e) => setSandiBaru(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Konfirmasi Kata Sandi Baru
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={konfirmasi}
                  onChange={(e) => setKonfirmasi(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <button
                type="submit"
                disabled={menyimpanSandi}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-bold rounded-xl transition"
              >
                {menyimpanSandi ? "Menyimpan..." : "Simpan Kata Sandi"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
