"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import { NOMOR_WHATSAPP } from "@/lib/constants";
import { simpanSesiSiswa, STORAGE_KEYS } from "@/lib/storage";
import type { Pengguna } from "@/lib/types";

interface ResponsLogin {
  user?: Pengguna;
  token?: string;
  error?: string;
}

/**
 * Verifikasi akun langsung ke API route yang membaca SQLite.
 * Path sengaja relatif agar tetap mengarah ke host yang sedang dipakai,
 * termasuk saat aplikasi dibuka lewat IP Wi-Fi dari HP/laptop lain.
 */
async function verifikasiLoginSiswa(
  identifier: string,
  password: string
): Promise<{ user: Pengguna; token: string }> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "siswa", identifier, password }),
  });

  let data: ResponsLogin = {};
  try {
    data = (await response.json()) as ResponsLogin;
  } catch {
    // Respons bukan JSON; gunakan pesan fallback di bawah.
  }

  if (!response.ok || !data.user || !data.token) {
    throw new Error(
      data.error ||
        (response.ok
          ? "Respons login dari server tidak valid."
          : "NISN atau kata sandi salah.")
    );
  }

  return { user: data.user, token: data.token };
}

export default function LoginSiswaPage() {
  const router = useRouter();
  const [nisn, setNisn] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [pesanError, setPesanError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [tampilBantuan, setTampilBantuan] = useState<boolean>(false);
  const [namaBantuan, setNamaBantuan] = useState<string>("");
  const [nisnBantuan, setNisnBantuan] = useState<string>("");

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setPesanError("");

    try {
      const { user, token } = await verifikasiLoginSiswa(
        nisn.trim(),
        password.trim()
      );

      // 1. Simpan sesi otentikasi siswa
      simpanSesiSiswa({
        nama: user.nama,
        nisn: user.nisn ?? "",
        kelas: user.kelas ?? "",
        token,
      });

      // 2. Baca halaman target yang tadi diklik (Surat Izin / Jurnal Kejadian)
      const targetRedirect = sessionStorage.getItem(
        STORAGE_KEYS.redirectSetelahLogin
      );
      const tujuan =
        targetRedirect && targetRedirect.startsWith("/")
          ? targetRedirect
          : "/";

      // Hapus jejak setelah dibaca agar tidak mengganggu login berikutnya.
      sessionStorage.removeItem(STORAGE_KEYS.redirectSetelahLogin);

      // 3. Alihkan ke halaman target, atau kembali ke beranda.
      router.replace(tujuan);
    } catch (error) {
      setLoading(false);
      if (error instanceof TypeError) {
        setPesanError(
          "Tidak dapat terhubung ke server. Pastikan server berjalan dan perangkat berada di jaringan Wi-Fi yang sama."
        );
        return;
      }
      setPesanError(
        error instanceof Error
          ? error.message
          : "NISN atau Sandi salah!"
      );
    }
  };

  const identitasBantuan = [
    namaBantuan.trim(),
    nisnBantuan.trim() ? `NISN ${nisnBantuan.trim()}` : "",
  ]
    .filter(Boolean)
    .join(" / ");

  const pesanBantuan = encodeURIComponent(
    `Halo Admin/Guru Piket SMPN 1 Kertak Hanyar, saya ${
      identitasBantuan || "[Nama/NISN]"
    } lupa kata sandi akun siswa saya, mohon bantuan reset.`
  );
  const tautanBantuan = `https://wa.me/${NOMOR_WHATSAPP}?text=${pesanBantuan}`;

  return (
    <main className="min-h-screen bg-[#f8fbff] flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Logo priority className="h-full w-full rounded-2xl object-contain" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Portal Masuk Siswa
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            SMP Negeri 1 Kertak Hanyar
          </p>
        </div>

        {pesanError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs text-center font-bold">
            {pesanError}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              NISN Siswa / ID Akses
            </label>
            <input
              type="text"
              required
              placeholder="Masukkan NISN atau ID akses"
              value={nisn}
              onChange={(e) => setNisn(e.target.value)}
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
              placeholder="Masukkan kata sandi"
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
            {loading ? "Memverifikasi..." : "Masuk ke Akun Siswa →"}
          </button>
        </form>

        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => {
              setNisnBantuan(nisn);
              setTampilBantuan(true);
            }}
            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline transition"
          >
            Lupa Kata Sandi?
          </button>
        </div>

        <div className="mt-6 text-center border-t border-slate-100 pt-4">
          <Link
            href="/"
            className="text-xs text-slate-500 hover:text-blue-600 font-semibold transition inline-block"
          >
            ← Kembali ke Beranda
          </Link>
        </div>
      </div>

      {tampilBantuan && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setTampilBantuan(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-md p-5 sm:p-6 max-h-[90vh] overflow-y-auto text-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">
                  Bantuan Lupa Kata Sandi
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Pemulihan akun siswa SMPN 1 Kertak Hanyar
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTampilBantuan(false)}
                aria-label="Tutup bantuan"
                className="w-8 h-8 shrink-0 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-100 text-blue-900 leading-relaxed">
                <p className="font-bold mb-1">
                  Opsi 1 — Hubungi Guru Piket / Wali Kelas
                </p>
                <p>
                  Hubungi Guru Piket / Wali Kelas di Sekolah untuk verifikasi
                  dan reset kata sandi instan.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-900 leading-relaxed">
                <p className="font-bold mb-1">
                  Opsi 2 — Kirim Bantuan via WhatsApp
                </p>
                <p>
                  Lengkapi identitas di bawah agar guru dapat menemukan akun
                  Anda dengan cepat.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Siswa <span className="font-normal text-slate-400">(opsional)</span>
                </label>
                <input
                  type="text"
                  value={namaBantuan}
                  onChange={(e) => setNamaBantuan(e.target.value)}
                  placeholder="Contoh: Ahmad Fauzi"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 bg-slate-50/30 transition text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  NISN Siswa
                </label>
                <input
                  type="text"
                  value={nisnBantuan}
                  onChange={(e) => setNisnBantuan(e.target.value)}
                  placeholder="Masukkan NISN / ID akses"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 bg-slate-50/30 transition text-slate-900 font-medium"
                />
              </div>

              <a
                href={tautanBantuan}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-xs transition bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-sm hover:scale-[1.01] active:scale-[0.99]"
              >
                💬 Kirim Bantuan via WhatsApp Layanan Sekolah
              </a>

              <p className="text-[10px] text-slate-500 leading-relaxed">
                Tips: isi nama dan NISN di atas agar pesan bantuan otomatis
                lengkap dan guru dapat langsung menemukan akun Anda.
              </p>

              <button
                type="button"
                onClick={() => setTampilBantuan(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition"
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
