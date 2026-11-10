import { NextResponse } from "next/server";
import { getVisitorStats, recordVisit } from "@/lib/db";
import { rekapKunjunganFallback } from "@/lib/memory-store";
import type { StatistikPengunjung } from "@/lib/types";

/** Vercel menjalankan SQLite read-only sehingga rekap contoh perlu disiapkan. */
function berjalanDiVercel(): boolean {
  return Boolean(process.env.VERCEL);
}

/**
 * Saat tabel kunjungan kosong (atau berjalan di Vercel), tampilkan rekap
 * mingguan contoh agar tabel "Rekap Kunjungan Harian Website" tidak kosong dan
 * selaras dengan kartu statistik dashboard.
 */
function lengkapiStatistik(
  statistik: StatistikPengunjung
): StatistikPengunjung {
  // Di Vercel SQLite hanya berisi data demo/kosong, jadi rekap mingguan contoh
  // dipakai agar tabel dan kartu "Pengunjung Hari Ini" menampilkan angka sama.
  if (berjalanDiVercel() || statistik.riwayat.length === 0) {
    return rekapKunjunganFallback();
  }

  return statistik;
}

export async function GET() {
  try {
    return NextResponse.json(lengkapiStatistik(getVisitorStats()));
  } catch (error) {
    console.error("Gagal membaca statistik pengunjung:", error);
    // SQLite tidak terbaca di Vercel: tetap kirim rekap contoh.
    return NextResponse.json(rekapKunjunganFallback());
  }
}

export async function POST() {
  try {
    return NextResponse.json(lengkapiStatistik(recordVisit()));
  } catch (error) {
    console.error("Gagal merekam kunjungan:", error);
    // Jangan gagalkan pemuatan beranda hanya karena SQLite read-only.
    return NextResponse.json(rekapKunjunganFallback());
  }
}
