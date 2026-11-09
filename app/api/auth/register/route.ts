import { NextResponse } from "next/server";
import { registerStudent } from "@/lib/db";

interface RegisterBody {
  nisn?: string;
  namaLengkap?: string;
  kelas?: string;
  password?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterBody;
    const nisn = body.nisn?.trim() ?? "";
    const namaLengkap = body.namaLengkap?.trim() ?? "";
    const kelas = body.kelas?.trim() ?? "";
    const password = body.password ?? "";

    if (!nisn || !namaLengkap || !kelas) {
      return NextResponse.json(
        { error: "NISN, nama lengkap, dan kelas wajib diisi." },
        { status: 400 }
      );
    }

    if (!/^\d{10}$/.test(nisn)) {
      return NextResponse.json(
        { error: "NISN harus terdiri dari 10 digit angka." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Kata sandi minimal 6 karakter." },
        { status: 400 }
      );
    }

    const hasil = registerStudent({ nisn, namaLengkap, kelas, password });
    if (!hasil.ok) {
      return NextResponse.json({ error: hasil.error }, { status: 409 });
    }

    return NextResponse.json({ user: hasil.user }, { status: 201 });
  } catch (error) {
    console.error("Gagal mendaftarkan siswa:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}
