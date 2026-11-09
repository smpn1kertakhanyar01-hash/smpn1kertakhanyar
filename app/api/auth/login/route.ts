import { NextResponse } from "next/server";
import { COOKIE_PERAN_PEGAWAI, COOKIE_SESI_GURU } from "@/lib/constants";
import { createAuthSession, diagnosaLogin, loginUser } from "@/lib/db";
import {
  buatTokenSesiFallback,
  cariAkunPetugasFallback,
  cariAkunSiswaFallback,
} from "@/lib/fallback-auth";
import type { PeranPengguna } from "@/lib/types";

interface LoginBody {
  role?: string;
  identifier?: string;
  password?: string;
}

/**
 * Portal guru/pegawai mengirim `role: "guru"`. Nilai dinormalisasi agar
 * variasi huruf besar/kecil (mis. `"GURU"`) tetap diterima.
 */
function normalisasiPeranMasuk(role?: string): PeranPengguna | null {
  const nilai = role?.trim().toLowerCase();

  if (nilai === "guru" || nilai === "pegawai") return "guru";
  if (nilai === "siswa") return "siswa";
  return null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;
    const role = normalisasiPeranMasuk(body.role);
    const identifier = body.identifier?.trim();
    const password = body.password ?? "";

    if (!role || !identifier) {
      return NextResponse.json(
        { error: "Data login tidak lengkap." },
        { status: 400 }
      );
    }

    // Cek kredensial darurat lebih dulu agar login tetap berhasil di Vercel.
    // "guru" mendapat peran GURU_PIKET, sedangkan "admintu" dan
    // "petugas.smpn1kh" mendapat peran ADMIN_TU. Keduanya lolos validasi
    // karena fallback dicek sebelum query database.
    const userFallback =
      role === "guru"
        ? cariAkunPetugasFallback(identifier, password)
        : cariAkunSiswaFallback(identifier, password);

    const user = userFallback ?? loginUser({ role, identifier, password });
    if (!user) {
      // Log diagnostik: jangan pernah mencetak kata sandi mentah.
      console.log(
        "[login] Gagal login " +
          JSON.stringify({
            role,
            identifier,
            ...diagnosaLogin({ role, identifier, password }),
          })
      );
      return NextResponse.json(
        { error: "NISN/NIP atau kata sandi salah." },
        { status: 401 }
      );
    }

    // Akun fallback memakai token stateless agar tidak bergantung pada SQLite.
    const token = userFallback
      ? buatTokenSesiFallback(userFallback)
      : createAuthSession(user.id, user.role);

    const response = NextResponse.json({ user, token });
    const opsiCookie = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    };

    if (user.role === "guru") {
      response.cookies.set(COOKIE_SESI_GURU, token, opsiCookie);
      response.cookies.set(
        COOKIE_PERAN_PEGAWAI,
        user.staffRole ?? "GURU_PIKET",
        opsiCookie
      );
    } else {
      response.cookies.delete(COOKIE_SESI_GURU);
      response.cookies.delete(COOKIE_PERAN_PEGAWAI);
    }

    return response;
  } catch (error) {
    console.error("Gagal memproses login:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}
