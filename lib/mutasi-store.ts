import { getStore, hasStore, setStore, subscribeStore } from "./client-store";
import { STORAGE_KEYS } from "./storage";
import type { MutasiSiswa, MutasiSiswaPayload } from "./types";

/**
 * Penyimpanan mutasi siswa untuk halaman Tata Usaha.
 *
 * `SMPN1KH_MUTASI_DATA` adalah Single Source of Truth di browser karena
 * SQLite pada Vercel bersifat read-only. Data server hanya dipakai saat store
 * pertama kali diinisialisasi; setelah itu semua checklist, verifikasi, dan
 * keputusan dibaca dari localStorage sehingga langsung permanen.
 */
export const MUTASI_STORAGE_KEY = STORAGE_KEYS.mutasiData;

/** Satu berkas contoh agar tombol verifikasi/keputusan bisa langsung dicoba. */
const CONTOH_MUTASI_MENUNGGU: MutasiSiswa = {
  id: 9001,
  siswaId: null,
  namaSiswa: "Aisyah Putri Ramadhani",
  nisn: "0119000157",
  jenisKelamin: "Perempuan",
  kelas: "8B",
  jenisMutasi: "MASUK",
  tanggalMutasi: "2026-11-18",
  sekolahAsalTujuan: "SMPN 3 Banjarmasin",
  alasan: "Orang tua pindah tugas ke wilayah Kertak Hanyar.",
  noSuratMutasi: null,
  namaWali: "Ibu Sri Ramadhani",
  noTeleponWali: "081256322577",
  berkasPendukung: null,
  statusBerkas: "Menunggu Verifikasi",
  createdAt: "2026-11-18T07:30:00.000Z",
};

function teks(nilai: unknown): string {
  return String(nilai ?? "").trim();
}

function normalkanMutasi(item: Partial<MutasiSiswa> | null): MutasiSiswa | null {
  if (!item || typeof item !== "object") return null;

  const id = Number(item.id);
  if (!Number.isFinite(id) || id <= 0) return null;

  const jenisMutasi = item.jenisMutasi === "KELUAR" ? "KELUAR" : "MASUK";

  return {
    id,
    siswaId:
      item.siswaId === null || item.siswaId === undefined
        ? null
        : Number(item.siswaId) || null,
    namaSiswa: teks(item.namaSiswa) || "Siswa",
    nisn: teks(item.nisn),
    jenisKelamin: teks(item.jenisKelamin) || null,
    kelas: teks(item.kelas) || null,
    jenisMutasi,
    tanggalMutasi: teks(item.tanggalMutasi) || "-",
    sekolahAsalTujuan: teks(item.sekolahAsalTujuan) || "-",
    alasan: teks(item.alasan) || "-",
    noSuratMutasi: teks(item.noSuratMutasi) || null,
    namaWali: teks(item.namaWali) || null,
    noTeleponWali: teks(item.noTeleponWali) || null,
    berkasPendukung: item.berkasPendukung ?? null,
    statusBerkas: teks(item.statusBerkas) || "Menunggu Verifikasi",
    createdAt: teks(item.createdAt) || new Date().toISOString(),
  };
}

function tulis(daftar: MutasiSiswa[]): MutasiSiswa[] {
  const bersih = daftar
    .map((item) => normalkanMutasi(item))
    .filter((item): item is MutasiSiswa => item !== null);
  setStore(MUTASI_STORAGE_KEY, bersih);
  return bersih;
}

/** Cek apakah store mutasi sudah pernah diisi di browser. */
export function mutasiStoreSudahAda(): boolean {
  return hasStore(MUTASI_STORAGE_KEY);
}

/** Baca seluruh mutasi yang tersimpan di browser (tanpa data server). */
export function bacaDaftarMutasiLokal(): MutasiSiswa[] {
  const mentah = getStore<unknown>(MUTASI_STORAGE_KEY, []);
  if (!Array.isArray(mentah)) return [];

  return mentah
    .map((item) => normalkanMutasi(item as Partial<MutasiSiswa>))
    .filter((item): item is MutasiSiswa => item !== null);
}

/**
 * Gabungkan data server dengan store lokal. Store lokal selalu menang untuk
 * ID yang sama, sehingga keputusan TU tidak tertimpa data SQLite lama.
 */
export function gabungkanMutasi(dariServer: MutasiSiswa[] = []): MutasiSiswa[] {
  const serverBersih = dariServer
    .map((item) => normalkanMutasi(item))
    .filter((item): item is MutasiSiswa => item !== null);

  // Inisialisasi pertama: sertakan satu berkas contoh yang menunggu verifikasi.
  if (!hasStore(MUTASI_STORAGE_KEY)) {
    const awal = [...serverBersih];
    if (!awal.some((item) => item.id === CONTOH_MUTASI_MENUNGGU.id)) {
      awal.unshift({ ...CONTOH_MUTASI_MENUNGGU });
    }
    return tulis(awal);
  }

  const lokal = bacaDaftarMutasiLokal();
  if (serverBersih.length === 0) return lokal;

  const peta = new Map<string, MutasiSiswa>();
  serverBersih.forEach((item) => peta.set(String(item.id), item));
  lokal.forEach((item) => peta.set(String(item.id), item));

  return tulis(Array.from(peta.values()));
}

/** Simpan perubahan satu berkas mutasi (status, nomor surat, dll.). */
export function simpanPerubahanMutasi(
  id: number,
  perubahan: Partial<MutasiSiswa>
): MutasiSiswa[] {
  const daftar = bacaDaftarMutasiLokal().map((item) =>
    item.id === id ? normalkanMutasi({ ...item, ...perubahan }) ?? item : item
  );
  return tulis(daftar);
}

/** Tambah pengajuan mutasi baru dari frontend/publik ke store lokal. */
export function tambahMutasiLokal(payload: MutasiSiswaPayload): MutasiSiswa {
  const baru: MutasiSiswa = {
    id: Date.now(),
    siswaId: payload.siswaId ?? null,
    namaSiswa: teks(payload.namaSiswa) || "Siswa",
    nisn: teks(payload.nisn),
    jenisKelamin: teks(payload.jenisKelamin) || null,
    kelas: teks(payload.kelas) || null,
    jenisMutasi: payload.jenisMutasi === "KELUAR" ? "KELUAR" : "MASUK",
    tanggalMutasi: teks(payload.tanggalMutasi) || "-",
    sekolahAsalTujuan: teks(payload.sekolahAsalTujuan) || "-",
    alasan: teks(payload.alasan) || "-",
    noSuratMutasi: teks(payload.noSuratMutasi) || null,
    namaWali: teks(payload.namaWali) || null,
    noTeleponWali: teks(payload.noTeleponWali) || null,
    berkasPendukung: payload.berkasPendukung ?? null,
    statusBerkas: teks(payload.statusBerkas) || "Menunggu Verifikasi",
    createdAt: new Date().toISOString(),
  };

  tulis([baru, ...bacaDaftarMutasiLokal().filter((item) => item.id !== baru.id)]);
  return baru;
}

/** Berlangganan perubahan mutasi lintas tab dan halaman. */
export function berlanggananPerubahanMutasi(callback: () => void): () => void {
  return subscribeStore(MUTASI_STORAGE_KEY, callback);
}
