import {
  KATEGORI_PENGAMBILAN_IJAZAH,
  SYARAT_IJAZAH_DEFAULT,
} from "./constants";
import { getDb } from "./db";
import type { PengaturanLayanan } from "./types";

const KOLOM_PENGATURAN = `
  id,
  kategori,
  isi_persyaratan AS isiPersyaratan,
  updated_by AS updatedBy,
  updated_at AS updatedAt
`;

function bacaPengaturan(kategori: string): PengaturanLayanan | null {
  const row = getDb()
    .prepare(
      `SELECT ${KOLOM_PENGATURAN}
       FROM pengaturan_layanan
       WHERE kategori = ?`
    )
    .get(kategori) as PengaturanLayanan | undefined;

  return row ?? null;
}

/**
 * Membaca pengaturan layanan. Jika baris belum ada (misalnya database lama),
 * baris default dibuat otomatis agar halaman publik tetap dapat menampilkan
 * persyaratan resmi.
 */
export function getPengaturanLayanan(
  kategori: string = KATEGORI_PENGAMBILAN_IJAZAH
): PengaturanLayanan {
  const db = getDb();
  let hasil = bacaPengaturan(kategori);

  if (!hasil) {
    const isiDefault =
      kategori === KATEGORI_PENGAMBILAN_IJAZAH ? SYARAT_IJAZAH_DEFAULT : "";

    db.prepare(
      `INSERT OR IGNORE INTO pengaturan_layanan
         (kategori, isi_persyaratan, updated_by, updated_at)
       VALUES (?, ?, 'Sistem', datetime('now'))`
    ).run(kategori, isiDefault);

    hasil = bacaPengaturan(kategori);
  }

  if (!hasil) {
    throw new Error("Gagal membaca pengaturan layanan.");
  }

  return hasil;
}

export function simpanPengaturanLayanan(
  kategori: string,
  isiPersyaratan: string,
  updatedBy: string
): PengaturanLayanan {
  const isi = isiPersyaratan.replace(/\r\n/g, "\n").trim();

  if (!isi) {
    throw new Error("Isi persyaratan wajib diisi.");
  }

  getDb()
    .prepare(
      `INSERT INTO pengaturan_layanan
         (kategori, isi_persyaratan, updated_by, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(kategori) DO UPDATE SET
         isi_persyaratan = excluded.isi_persyaratan,
         updated_by = excluded.updated_by,
         updated_at = datetime('now')`
    )
    .run(kategori, isi, updatedBy.trim() || "Admin TU");

  return getPengaturanLayanan(kategori);
}
