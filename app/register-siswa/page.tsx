"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { api } from "@/lib/api-client";
import { KELAS_PENDAFTARAN } from "@/lib/constants";

export default function RegisterSiswa() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nisn: "",
    namaLengkap: "",
    kelas: "VII A",
    password: "",
    konfirmasiPassword: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.konfirmasiPassword) {
      alert("Kata sandi dan konfirmasi kata sandi tidak cocok!");
      return;
    }

    setLoading(true);
    try {
      await api.register({
        nisn: formData.nisn.trim(),
        namaLengkap: formData.namaLengkap.trim(),
        kelas: formData.kelas,
        password: formData.password,
      });

      alert(
        `Akun berhasil dibuat untuk ${formData.namaLengkap} (NISN: ${formData.nisn})! Silakan masuk.`
      );
      router.push("/login-siswa");
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal mendaftarkan akun. Silakan coba lagi."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fafcff] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-2 flex items-center justify-center">
            <Logo priority className="h-full w-full object-contain" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Aktivasi Akun Siswa</h2>
          <p className="text-xs text-slate-500 mt-1">Daftarkan NISN resmi untuk mengakses portal nilai</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">NISN (10 Digit)</label>
            <input
              type="text"
              required
              maxLength={10}
              placeholder="Contoh: 0081234567"
              value={formData.nisn}
              onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
              className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap Sesuai Dapodik</label>
            <input
              type="text"
              required
              placeholder="Nama lengkap siswa"
              value={formData.namaLengkap}
              onChange={(e) => setFormData({ ...formData, namaLengkap: e.target.value })}
              className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tingkat / Kelas</label>
            <select
              value={formData.kelas}
              onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
              className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition bg-white"
            >
              {KELAS_PENDAFTARAN.map((kelas) => (
                <option key={kelas} value={kelas}>
                  Kelas {kelas}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Buat Kata Sandi Baru</label>
            <input
              type="password"
              required
              placeholder="Minimal 6 karakter"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Konfirmasi Kata Sandi</label>
            <input
              type="password"
              required
              placeholder="Ulangi kata sandi"
              value={formData.konfirmasiPassword}
              onChange={(e) => setFormData({ ...formData, konfirmasiPassword: e.target.value })}
              className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-3 rounded-xl shadow-md transition mt-2"
          >
            {loading ? "Memproses..." : "Daftarkan Akun Siswa →"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Sudah punya akun?{" "}
          <Link href="/login-siswa" className="text-blue-600 font-bold hover:underline">
            Masuk di sini
          </Link>
        </div>
      </div>
    </main>
  );
}
