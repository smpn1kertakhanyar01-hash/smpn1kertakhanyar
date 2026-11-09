import { NextResponse } from "next/server";
import { COOKIE_PERAN_PEGAWAI, COOKIE_SESI_GURU } from "@/lib/constants";
import { createAuthSession, loginUser } from "@/lib/db";
import type { PeranPengguna } from "@/lib/types";

interface LoginBody {
  role?: PeranPengguna;
  identifier?: string;
  password?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;
    const role = body.role;
    const identifier = body.identifier?.trim();
    const password = body.password ?? "";

    if ((role !== "guru" && role !== "siswa") || !identifier) {
      return NextResponse.json(
        { error: "Data login tidak lengkap." },
        { status: 400 }
      );
    }

    const user = loginUser({ role, identifier, password });
    if (!user) {
      return NextResponse.json(
        { error: "NISN/NIP atau kata sandi salah." },
        { status: 401 }
      );
    }

    const token = createAuthSession(user.id, user.role);

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
