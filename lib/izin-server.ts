import { getLeaveRequests } from "./db";
import {
  CONTOH_SURAT_IZIN,
  daftarSuratIzinMemori,
  gabungDenganContoh,
} from "./memory-store";
import type { SuratIzinItem } from "./types";

/** Vercel menjalankan SQLite read-only sehingga data contoh perlu dilengkapi. */
export function berjalanDiVercel(): boolean {
  return Boolean(process.env.VERCEL);
}

/**
 * Sumber data surat izin yang dipakai semua endpoint (dashboard guru, TU,
 * dan status siswa). Data contoh selalu disertakan agar daftar tidak kosong
 * dan perubahan status di memori runtime tetap menang atas data contoh.
 */
export function ambilDaftarSuratIzinServer(nisn?: string): SuratIzinItem[] {
  const dariMemori = daftarSuratIzinMemori(nisn);

  let dariDatabase: SuratIzinItem[] = [];
  try {
    dariDatabase = getLeaveRequests({ nisn });
  } catch (error) {
    console.error("Gagal membaca surat izin dari SQLite:", error);
  }

  // Di Vercel, baris demo SQLite diabaikan agar rekap tetap sesuai data
  // contoh; pengajuan baru tetap tampil melalui memori runtime.
  const sumber = berjalanDiVercel()
    ? dariMemori
    : [...dariMemori, ...dariDatabase];

  const contoh = nisn
    ? CONTOH_SURAT_IZIN.filter((item) => item.nisn === nisn)
    : CONTOH_SURAT_IZIN;

  return gabungDenganContoh(sumber, contoh);
}
