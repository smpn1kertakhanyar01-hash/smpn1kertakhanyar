import { connection, NextResponse } from "next/server";
import { daftarSiswaFallback, normalisasiKelasSiswa } from "@/lib/data";
import { getStudents } from "@/lib/db";
import type { Siswa } from "@/lib/types";

/**
 * Membaca daftar siswa. Bila SQLite gagal dibaca atau kosong (mis. di Vercel),
 * endpoint mengembalikan 63 siswa asli dari data fallback agar halaman
 * presensi tetap dapat menampilkan rombel 9A dan 9B.
 */
export async function GET(request: Request) {
  await connection();

  const { searchParams } = new URL(request.url);
  const kelas = searchParams.get("kelas");

  let siswa: Siswa[];
  try {
    siswa = getStudents();
  } catch (error) {
    console.error("Gagal membaca data siswa, memakai data fallback:", error);
    siswa = [];
  }

  if (siswa.length === 0) {
    siswa = daftarSiswaFallback();
  }

  const denganKelasBaru = siswa.map((item) => ({
    ...item,
    kelas: normalisasiKelasSiswa(item.kelas),
  }));

  const hasil = kelas
    ? denganKelasBaru.filter(
        (item) => item.kelas === normalisasiKelasSiswa(kelas)
      )
    : denganKelasBaru;

  return NextResponse.json(hasil);
}
