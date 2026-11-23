import { getStore, hasStore, setStore, subscribeStore } from "./client-store";
import {
  KATEGORI_PENGAMBILAN_IJAZAH,
  SYARAT_IJAZAH_DEFAULT,
} from "./constants";
import { STORAGE_KEYS } from "./storage";
import type {
  PengambilanIjazah,
  PengambilanIjazahPayload,
  PengaturanLayanan,
  StatusPengambilanIjazah,
} from "./types";

/**
 * Penyimpanan layanan ijazah di browser.
 *
 * `SMPN1KH_SYARAT_IJAZAH` menyimpan dua hal sekaligus:
 * 1. daftar syarat & ketentuan yang diedit petugas Tata Usaha;
 * 2. antrean pengambilan ijazah beserta status verifikasinya.
 *
 * SQLite Vercel bersifat read-only, sehingga localStorage menjadi sumber
 * utama agar perubahan TU langsung tampil permanen di halaman publik.
 */
export const SYARAT_IJAZAH_STORAGE_KEY = STORAGE_KEYS.syaratIjazah;

export interface DataIjazahLokal {
  daftarSyarat: string[];
  antrean: PengambilanIjazah[];
  updatedBy: string | null;
  updatedAt: string;
}

const CONTOH_ANTREAN: PengambilanIjazah[] = [
  {
    id: 9101,
    namaSiswa: "Siti Aminah",
    nisn: "0119000102",
    kelas: "9A",
    tahunLulus: "2026",
    status: "Belum Diambil",
    tanggalAmbil: null,
    diambilOleh: null,
    petugas: null,
    catatan: "Menunggu verifikasi berkas di Tata Usaha.",
    createdAt: "2026-11-18T08:00:00.000Z",
  },
  {
    id: 9102,
    namaSiswa: "Budi Santoso",
    nisn: "0119000101",
    kelas: "9B",
    tahunLulus: "2026",
    status: "Diambil",
    tanggalAmbil: "2026-11-20",
    diambilOleh: "Bapak Santoso",
    petugas: "Tata Usaha",
    catatan: "Berkas lengkap dan ijazah telah diserahkan.",
    createdAt: "2026-11-15T08:00:00.000Z",
  },
];

function teks(nilai: unknown): string {
  return String(nilai ?? "").trim();
}

function normalkanStatus(status: unknown): StatusPengambilanIjazah {
  return teks(status) === "Diambil" ? "Diambil" : "Belum Diambil";
}

function daftarSyaratAwal(): string[] {
  return SYARAT_IJAZAH_DEFAULT.split(/\r?\n/)
    .map((poin) => poin.trim())
    .filter(Boolean);
}

function dataAwal(): DataIjazahLokal {
  return {
    daftarSyarat: daftarSyaratAwal(),
    antrean: CONTOH_ANTREAN.map((item) => ({ ...item })),
    updatedBy: "Sistem",
    updatedAt: new Date().toISOString(),
  };
}

function normalkanAntrean(item: Partial<PengambilanIjazah> | null): PengambilanIjazah | null {
  if (!item || typeof item !== "object") return null;

  const id = Number(item.id);
  const namaSiswa = teks(item.namaSiswa);
  if (!Number.isFinite(id) || id <= 0 || !namaSiswa) return null;

  return {
    id,
    namaSiswa,
    nisn: teks(item.nisn) || null,
    kelas: teks(item.kelas) || null,
    tahunLulus: teks(item.tahunLulus) || null,
    status: normalkanStatus(item.status),
    tanggalAmbil: teks(item.tanggalAmbil) || null,
    diambilOleh: teks(item.diambilOleh) || null,
    petugas: teks(item.petugas) || null,
    catatan: teks(item.catatan) || null,
    createdAt: teks(item.createdAt) || new Date().toISOString(),
  };
}

function normalkanData(mentah: unknown): DataIjazahLokal {
  if (!mentah || typeof mentah !== "object") return dataAwal();

  const data = mentah as Partial<DataIjazahLokal> & {
    isiPersyaratan?: string;
  };

  let daftarSyarat = Array.isArray(data.daftarSyarat)
    ? data.daftarSyarat.map((poin) => teks(poin)).filter(Boolean)
    : [];

  // Dukung migrasi dari format pengaturan layanan lama (satu string).
  if (daftarSyarat.length === 0 && typeof data.isiPersyaratan === "string") {
    daftarSyarat = data.isiPersyaratan
      .split(/\r?\n/)
      .map((poin) => poin.trim())
      .filter(Boolean);
  }
  if (daftarSyarat.length === 0) daftarSyarat = daftarSyaratAwal();

  const antrean = Array.isArray(data.antrean)
    ? data.antrean
        .map((item) => normalkanAntrean(item as Partial<PengambilanIjazah>))
        .filter((item): item is PengambilanIjazah => item !== null)
    : [];

  return {
    daftarSyarat,
    antrean,
    updatedBy: teks(data.updatedBy) || "Sistem",
    updatedAt: teks(data.updatedAt) || new Date().toISOString(),
  };
}

function tulis(data: DataIjazahLokal): DataIjazahLokal {
  const bersih = normalkanData(data);
  setStore(SYARAT_IJAZAH_STORAGE_KEY, bersih);
  return bersih;
}

/** Baca seluruh data ijazah (syarat + antrean) dari localStorage. */
export function bacaDataIjazahLokal(): DataIjazahLokal {
  if (!hasStore(SYARAT_IJAZAH_STORAGE_KEY)) {
    return tulis(dataAwal());
  }

  return normalkanData(
    getStore<unknown>(SYARAT_IJAZAH_STORAGE_KEY, null)
  );
}

export function bacaDaftarSyaratIjazah(): string[] {
  return bacaDataIjazahLokal().daftarSyarat;
}

export function bacaAntreanIjazah(): PengambilanIjazah[] {
  return bacaDataIjazahLokal().antrean;
}

/** Bentuk data syarat agar kompatibel dengan tampilan PengaturanLayanan. */
export function bacaPengaturanIjazahLokal(): PengaturanLayanan {
  const data = bacaDataIjazahLokal();
  return {
    id: 1,
    kategori: KATEGORI_PENGAMBILAN_IJAZAH,
    isiPersyaratan: data.daftarSyarat.join("\n"),
    updatedBy: data.updatedBy,
    updatedAt: data.updatedAt,
  };
}

/** Simpan daftar syarat/ketentuan yang diedit petugas TU. */
export function simpanDaftarSyaratIjazah(
  daftarSyarat: string[],
  updatedBy: string
): DataIjazahLokal {
  const bersih = daftarSyarat.map((poin) => teks(poin)).filter(Boolean);
  if (bersih.length === 0) {
    throw new Error("Isi persyaratan wajib diisi.");
  }

  return tulis({
    ...bacaDataIjazahLokal(),
    daftarSyarat: bersih,
    updatedBy: teks(updatedBy) || "Admin TU",
    updatedAt: new Date().toISOString(),
  });
}

/** Simpan seluruh antrean (dipakai setelah perubahan status di TU). */
export function simpanAntreanIjazah(
  antrean: PengambilanIjazah[]
): DataIjazahLokal {
  return tulis({ ...bacaDataIjazahLokal(), antrean });
}

/** Tambah antrean baru dari formulir publik maupun petugas TU. */
export function tambahIjazahLokal(
  payload: PengambilanIjazahPayload
): PengambilanIjazah {
  const baru: PengambilanIjazah = {
    id: Date.now(),
    namaSiswa: teks(payload.namaSiswa) || "Siswa",
    nisn: teks(payload.nisn) || null,
    kelas: teks(payload.kelas) || null,
    tahunLulus: teks(payload.tahunLulus) || null,
    status: normalkanStatus(payload.status),
    tanggalAmbil: teks(payload.tanggalAmbil) || null,
    diambilOleh: teks(payload.diambilOleh) || null,
    petugas: teks(payload.petugas) || null,
    catatan: teks(payload.catatan) || null,
    createdAt: new Date().toISOString(),
  };

  simpanAntreanIjazah([
    baru,
    ...bacaAntreanIjazah().filter((item) => item.id !== baru.id),
  ]);
  return baru;
}

/** Perbarui status verifikasi / penyerahan ijazah. */
export function perbaruiIjazahLokal(
  id: number,
  perubahan: Partial<PengambilanIjazahPayload>
): PengambilanIjazah[] {
  const daftar = bacaAntreanIjazah().map((item) =>
    item.id === id
      ? normalkanAntrean({ ...item, ...perubahan }) ?? item
      : item
  );
  return simpanAntreanIjazah(daftar).antrean;
}

/** Hapus satu arsip antrean ijazah. */
export function hapusIjazahLokal(id: number): PengambilanIjazah[] {
  return simpanAntreanIjazah(
    bacaAntreanIjazah().filter((item) => item.id !== id)
  ).antrean;
}

/** Berlangganan perubahan syarat/antrean lintas halaman dan tab. */
export function berlanggananPerubahanIjazah(callback: () => void): () => void {
  return subscribeStore(SYARAT_IJAZAH_STORAGE_KEY, callback);
}
