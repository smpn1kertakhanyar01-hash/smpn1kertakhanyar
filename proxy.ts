import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  COOKIE_PERAN_PEGAWAI,
  COOKIE_SESI_GURU,
} from "@/lib/constants";

/**
 * Proteksi optimistis rute Tata Usaha. Otorisasi sebenarnya tetap dilakukan
 * di API dengan memeriksa sesi Bearer dan peran ADMIN_TU pada database.
 */
export function proxy(request: NextRequest) {
  const sesi = request.cookies.get(COOKIE_SESI_GURU)?.value;
  const peran = request.cookies.get(COOKIE_PERAN_PEGAWAI)?.value;

  if (peran === "ADMIN_TU" && sesi) {
    return NextResponse.next();
  }

  const tujuan = sesi
    ? "/dashboard-guru?akses=ditolak"
    : "/login-guru?akses=ditolak";

  return NextResponse.redirect(new URL(tujuan, request.url));
}

export const config = {
  matcher: ["/admin-tu", "/admin-tu/:path*"],
};
