import { getStore, setStore, subscribeStore } from "./client-store";
import { KATEGORI_KEJADIAN } from "./constants";
import { CONTOH_INSIDEN_SEKOLAH } from "./memory-store";
import type { CatatanKejadianItem, KategoriKejadian } from "./types";
import { ambilTanggalPanjang, ambilWaktuSekarang } from "./utils";

/**
 * Penyimpanan jurnal kejadian bersama untuk Dashboard Guru dan halaman
 * Jurnal Kesiswaan siswa.
 *
 * `sekolah_jurnal_data` adalah Single Source of Truth di browser sehingga
 * catatan yang baru disimpan guru langsung muncul di riwayat tanpa gagal
 * simpan, meskipun SQLite Vercel bersifat read-only.
 */

export const JURNAL_STORAGE_KEY = "sekolah_jurnal_data";
export const JURNAL_STORE_EVENT = "smpn1:jurnal-berubah";

const JURNAL_VERSION_KEY = "smpn1_jurnal_store_version";
const JURNAL_VERSION = "2";

function apakahKategoriKejadian(nilai: unknown): nilai is KategoriKejadian {
  return (KATEGORI_KEJADIAN as readonly { value: string }[]).some(
    (kategori) => kategori.value === nilai
  );
}

function normalkanCatatanKejadian(
  item: unknown
): CatatanKejadianItem | null {
  if (!item || typeof item !== "object") return null;

  const data = item as Partial<CatatanKejadianItem>;
  if (data.id === undefined || data.id === null) return null;
  if (!data.deskripsi || !data.tindakanPenanganan) return null;

  return {
    id: Number(data.id),
    tanggal: String(data.tanggal ?? "-"),
    waktu: String(data.waktu ?? "-"),
    guruPiket: String(data.guruPiket ?? "Guru Piket"),
    kategori: apakahKategoriKejadian(data.kategori)
      ? data.kategori
      : "Lainnya",
    namaSiswaTerlibat: data.namaSiswaTerlibat
      ? String(data.namaSiswaTerlibat)
      : "-",
    kelasSiswa: data.kelasSiswa ? String(data.kelasSiswa) : "-",
    deskripsi: String(data.deskripsi),
    tindakanPenanganan: String(data.tindakanPenanganan),
  };
}

/** Baca seluruh catatan jurnal yang tersimpan di browser. */
export function bacaJurnalLokal(): CatatanKejadianItem[] {
  const mentah = getStore<unknown>(JURNAL_STORAGE_KEY, []);
  if (!Array.isArray(mentah)) return [];

  return mentah
    .map(normalkanCatatanKejadian)
    .filter((item): item is CatatanKejadianItem => item !== null);
}

function gabungTanpaDuplikat(
  utama: CatatanKejadianItem[],
  cadangan: CatatanKejadianItem[]
): CatatanKejadianItem[] {
  const idTerpakai = new Set(utama.map((item) => String(item.id)));
  return [
    ...utama,
    ...cadangan
      .filter((item) => !idTerpakai.has(String(item.id)))
      .map((item) => ({ ...item })),
  ];
}

/**
 * Ambil jurnal lengkap. Pada pembacaan pertama, data server + contoh
 * diisikan ke store. Setelah itu store lokal menjadi acuan utama sehingga
 * catatan yang dihapus tidak muncul kembali.
 */
export function ambilJurnalLengkap(
  dariServer: CatatanKejadianItem[] = []
): CatatanKejadianItem[] {
  if (typeof window === "undefined") return [...dariServer];

  const lokal = bacaJurnalLokal();
  const sudahMigrasi =
    window.localStorage.getItem(JURNAL_VERSION_KEY) === JURNAL_VERSION;

  if (sudahMigrasi) return lokal;

  try {
    window.localStorage.setItem(JURNAL_VERSION_KEY, JURNAL_VERSION);
  } catch (error) {
    console.error("Gagal menandai versi store jurnal:", error);
  }

  const awal = gabungTanpaDuplikat(
    lokal,
    gabungTanpaDuplikat(dariServer, CONTOH_INSIDEN_SEKOLAH)
  );
  setStore(JURNAL_STORAGE_KEY, awal);
  return awal;
}

/** Buat objek catatan kejadian baru dengan tanggal dan waktu saat ini. */
export function buatCatatanKejadian(
  payload: Omit<CatatanKejadianItem, "id" | "tanggal" | "waktu"> & {
    tanggal?: string;
    waktu?: string;
  }
): CatatanKejadianItem {
  return {
    id: Date.now(),
    tanggal: payload.tanggal ?? ambilTanggalPanjang(),
    waktu: payload.waktu ?? ambilWaktuSekarang(),
    guruPiket: payload.guruPiket || "Guru Piket",
    kategori: payload.kategori,
    namaSiswaTerlibat: payload.namaSiswaTerlibat || "-",
    kelasSiswa: payload.kelasSiswa || "-",
    deskripsi: payload.deskripsi,
    tindakanPenanganan: payload.tindakanPenanganan,
  };
}

/** Simpan catatan baru di baris paling atas. */
export function simpanJurnalBaru(
  item: CatatanKejadianItem
): CatatanKejadianItem[] {
  if (typeof window === "undefined") return [];

  const bersih = normalkanCatatanKejadian(item);
  if (!bersih) return bacaJurnalLokal();

  const tanpaDuplikat = ambilJurnalLengkap().filter(
    (lokal) => String(lokal.id) !== String(bersih.id)
  );
  const daftar = [bersih, ...tanpaDuplikat];

  setStore(JURNAL_STORAGE_KEY, daftar);
  return daftar;
}

/** Hapus satu catatan jurnal berdasarkan id. */
export function hapusJurnalLokal(id: number): CatatanKejadianItem[] {
  if (typeof window === "undefined") return [];

  const daftar = ambilJurnalLengkap().filter(
    (item) => String(item.id) !== String(id)
  );
  setStore(JURNAL_STORAGE_KEY, daftar);
  return daftar;
}

/** Berlangganan perubahan jurnal dari halaman/tab lain. */
export function berlanggananPerubahanJurnal(
  callback: () => void
): () => void {
  return subscribeStore(JURNAL_STORAGE_KEY, callback);
}
