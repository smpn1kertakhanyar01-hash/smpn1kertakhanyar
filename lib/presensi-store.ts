import { getStore, setStore, subscribeStore } from "./client-store";
import { daftarSiswaFallback, normalisasiKelasSiswa } from "./data";
import { STATUS_PRESENSI } from "./constants";
import type { CatatanAbsen, StatusPresensi } from "./types";

/**
 * Penyimpanan presensi bersama untuk halaman input (`/presensi`), rekap
 * (`/rekap-presensi`), dan dashboard guru.
 *
 * `sekolah_presensi_data` adalah Single Source of Truth di browser sehingga
 * input guru langsung terbaca di seluruh halaman tanpa bergantung pada SQLite
 * Vercel yang bersifat read-only.
 */

export const PRESENSI_STORAGE_KEY = "sekolah_presensi_data";
export const PRESENSI_STORE_EVENT = "smpn1:presensi-berubah";

/** Kelas yang selalu ditampilkan pada filter rekap presensi. */
export const KELAS_REKAP_PRESENSI = ["9A", "9B"] as const;

function kunciPresensi(item: Pick<CatatanAbsen, "nisn" | "tanggal">): string {
  return `${item.nisn}__${item.tanggal}`;
}

function apakahStatusPresensi(nilai: unknown): nilai is StatusPresensi {
  return (STATUS_PRESENSI as readonly unknown[]).includes(nilai);
}

function normalkanCatatan(
  item: Partial<CatatanAbsen> | null | undefined
): CatatanAbsen | null {
  if (!item || !item.nisn || !item.tanggal) return null;

  const status = apakahStatusPresensi(item.status) ? item.status : "Hadir";

  return {
    nisn: String(item.nisn),
    nama: String(item.nama ?? "-"),
    kelas: normalisasiKelasSiswa(String(item.kelas ?? "")),
    status,
    tanggal: String(item.tanggal),
    jamInput: String(item.jamInput ?? "-"),
  };
}

/** Baca seluruh rekap presensi yang tersimpan di browser. */
export function bacaPresensiLokal(): CatatanAbsen[] {
  const mentah = getStore<unknown>(PRESENSI_STORAGE_KEY, []);
  if (!Array.isArray(mentah)) return [];

  return mentah
    .map((item) => normalkanCatatan(item as Partial<CatatanAbsen>))
    .filter((item): item is CatatanAbsen => item !== null);
}

function tulisPresensiLokal(daftar: CatatanAbsen[]): void {
  setStore(PRESENSI_STORAGE_KEY, daftar);
}

/**
 * Simpan hasil input presensi satu kelas. Entri dengan NISN + tanggal yang
 * sama akan ditimpa oleh data terbaru, sedangkan kelas lain tetap dipertahankan.
 */
export function simpanPresensiLokal(catatan: CatatanAbsen[]): CatatanAbsen[] {
  if (typeof window === "undefined" || catatan.length === 0) return [];

  const peta = new Map<string, CatatanAbsen>();
  [...bacaPresensiLokal(), ...catatan].forEach((item) => {
    const bersih = normalkanCatatan(item);
    if (bersih) peta.set(kunciPresensi(bersih), bersih);
  });

  const daftar = Array.from(peta.values());
  tulisPresensiLokal(daftar);
  return daftar;
}

/**
 * Gabungkan data server dengan data lokal. Data lokal diprioritaskan karena
 * merupakan input terbaru dari guru pada browser ini.
 */
export function gabungPresensi(
  dariServer: CatatanAbsen[] = [],
  dariLokal: CatatanAbsen[] = bacaPresensiLokal()
): CatatanAbsen[] {
  const peta = new Map<string, CatatanAbsen>();

  [...dariServer, ...dariLokal].forEach((item) => {
    const bersih = normalkanCatatan(item);
    if (bersih) peta.set(kunciPresensi(bersih), bersih);
  });

  return Array.from(peta.values());
}

/** Berlangganan perubahan presensi dari halaman/tab lain. */
export function berlanggananPerubahanPresensi(
  callback: () => void
): () => void {
  return subscribeStore(PRESENSI_STORAGE_KEY, callback);
}

/**
 * Data contoh realistis untuk 63 siswa (9A dan 9B) ketika API maupun
 * localStorage belum memiliki presensi pada tanggal yang dipilih.
 *
 * Distribusi:
 * - 9A (32 siswa): 29 Hadir, 2 Sakit, 1 Izin.
 * - 9B (31 siswa): 28 Hadir, 2 Izin, 1 Sakit.
 */
export function buatPresensiFallback(tanggal: string): CatatanAbsen[] {
  // Posisi siswa yang tidak Hadir dibuat tetap agar hasil rekap konsisten.
  const pola9A: Record<number, StatusPresensi> = {
    4: "Sakit",
    13: "Izin",
    22: "Sakit",
  };
  const pola9B: Record<number, StatusPresensi> = {
    3: "Izin",
    11: "Sakit",
    20: "Izin",
  };

  const jumlahPerKelas: Record<string, number> = {};

  return daftarSiswaFallback().map((siswa) => {
    const kelas = normalisasiKelasSiswa(siswa.kelas);
    const indeks = jumlahPerKelas[kelas] ?? 0;
    jumlahPerKelas[kelas] = indeks + 1;

    const pola = kelas === "9A" ? pola9A : kelas === "9B" ? pola9B : {};
    const status = pola[indeks] ?? "Hadir";

    return {
      nisn: siswa.nisn,
      nama: siswa.nama,
      kelas,
      status,
      tanggal,
      jamInput: `07:${String(10 + (indeks % 20)).padStart(2, "0")}`,
    };
  });
}
