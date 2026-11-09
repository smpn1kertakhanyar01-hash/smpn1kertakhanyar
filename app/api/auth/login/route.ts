import { NextResponse } from "next/server";
import { COOKIE_PERAN_PEGAWAI, COOKIE_SESI_GURU } from "@/lib/constants";
import { createAuthSession, diagnosaLogin, loginUser } from "@/lib/db";
import { buatTokenSesiFallback } from "@/lib/fallback-auth";
import type { Pengguna, PeranPegawai, PeranPengguna } from "@/lib/types";

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

interface AkunFallback {
  usernames: readonly string[];
  password: string;
  id: number;
  staffRole: PeranPegawai;
  nama: string;
}

/**
 * Bypass darurat untuk production/Vercel ketika SQLite read-only atau akun
 * belum tersinkron. Kredensial ini sengaja dicek sebelum query database.
 */
const AKUN_FALLBACK: readonly AkunFallback[] = [
  {
    usernames: ["admintu", "petugas.smpn1kh"],
    password: "adminTUkece",
    id: -1,
    staffRole: "ADMIN_TU",
    nama: "Petugas Tata Usaha & Kesiswaan",
  },
  {
    usernames: ["guru"],
    password: "@Smpn1KH#",
    id: -2,
    staffRole: "GURU_PIKET",
    nama: "Guru Piket / Pengajar",
  },
];

function cariAkunFallback(
  role: PeranPengguna,
  identifier: string,
  password: string
): Pengguna | null {
  // Fallback hanya berlaku untuk pintu login portal pegawai.
  if (role !== "guru") return null;

  const username = identifier.toLowerCase();
  const akun = AKUN_FALLBACK.find(
    (item) =>
      item.usernames.some((nama) => nama.toLowerCase() === username) &&
      item.password === password
  );

  if (!akun) return null;

  return {
    id: akun.id,
    username: identifier,
    role: "guru",
    staffRole: akun.staffRole,
    nama: akun.nama,
  };
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
    const userFallback = cariAkunFallback(role, identifier, password);
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
