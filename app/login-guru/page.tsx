"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import { api } from "@/lib/api-client";
import { simpanSesiGuru } from "@/lib/storage";

export default function LoginGuruPage() {
  const router = useRouter();
  const [nip, setNip] = useState("");
  const [password, setPassword] = useState("");
  const [pesanError, setPesanError] = useState("");
  const [pesanAkses, setPesanAkses] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const parameter = new URLSearchParams(window.location.search);
    if (parameter.get("akses") === "ditolak") {
      setPesanAkses(
        "Akses Khusus Tata Usaha. Silakan masuk dengan akun Admin TU."
      );
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setPesanError("");

    try {
      const { user, token } = await api.login({
        role: "guru",
        identifier: nip.trim(),
        password: password.trim(),
      });

      simpanSesiGuru(user.nama, token, user.staffRole);

      setTimeout(() => {
        router.push("/dashboard-guru");
      }, 200);
    } catch {
      setLoading(false);
      setPesanError(
        "Akses ditolak! Periksa NIP/username dan kata sandi akun pegawai."
      );
    }
  };

  return (
    <main className="min-h-screen bg-[#f8fbff] flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Logo priority className="h-full w-full rounded-2xl object-contain" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Portal Guru, Piket & Tata Usaha
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            SMP Negeri 1 Kertak Hanyar
          </p>
        </div>

        {pesanAkses && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs text-center font-bold">
            ⛔ {pesanAkses}
          </div>
        )}

        {pesanError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs text-center font-bold">
            {pesanError}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              NIP / Kode Akses Guru
            </label>
            <input
              type="text"
              required
              placeholder="Masukkan NIP / kode akses pegawai"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 bg-slate-50/30 transition text-slate-900 font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Kata Sandi
            </label>
            <input
              type="password"
              required
              placeholder="Kata sandi akun pegawai"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 bg-slate-50/30 transition text-slate-900 font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl shadow-sm transition hover:scale-[1.01] active:scale-[0.99] text-xs mt-2"
          >
            {loading ? "Memverifikasi..." : "Masuk ke Panel Pegawai →"}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-slate-100 pt-4">
          <Link
            href="/"
            className="text-xs text-slate-500 hover:text-blue-600 font-semibold transition inline-block"
          >
            ← Kembali ke Beranda
          </Link>
        </div>
      </div>
    </main>
  );
}
