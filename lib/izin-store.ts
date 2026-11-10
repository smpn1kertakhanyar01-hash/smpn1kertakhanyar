import {
  CLIENT_STORE_EVENT,
  getStore,
  hasStore,
  setStore,
  subscribeStore,
} from "./client-store";
import { CONTOH_SURAT_IZIN } from "./memory-store";
import type { SuratIzinItem } from "./types";

/**
 * Penyimpanan surat izin bersama untuk seluruh halaman berbasis browser
 * (Form Izin, Status Izin, Dashboard Guru, dan Dashboard TU).
 *
 * `sekolah_pengajuan_izin` adalah Single Source of Truth. Data server hanya
 * dipakai sekali saat store pertama kali diinisialisasi; setelah itu seluruh
 * keputusan guru/TU dan pengajuan siswa dibaca dari localStorage sehingga
 * tetap konsisten walau SQLite Vercel bersifat read-only.
 */

export const IZIN_STORE_EVENT = CLIENT_STORE_EVENT;

/** Kunci localStorage untuk seluruh pengajuan izin. */
export const PENGAJUAN_IZIN_STORAGE_KEY = "sekolah_pengajuan_izin";

/** Kunci internal untuk menandai store sudah dimigrasikan ke format baru. */
const IZIN_VERSION_KEY = "smpn1_izin_store_version";
const IZIN_VERSION = "2";

/** Kunci lama (peta override) yang dibersihkan setelah migrasi. */
const IZIN_OVERRIDE_LAMA_KEY = "smpn1_izin_status_overrides_v1";

export type StatusIzin = "MENUNGGU" | "DISETUJUI" | "DITOLAK";

export interface OverrideStatusIzin {
  id: number;
  kodeBerkas?: string;
  status: string;
  diverifikasiOleh?: string;
  disetujuiOleh?: string;
  tanggalPersetujuan?: string;
  catatanPenolakan?: string;
  diperbaruiPada: string;
}

/** Ubah berbagai variasi status menjadi tiga status baku. */
export function normalisasiStatusIzin(status?: string): StatusIzin {
  const nilai = (status ?? "").toLowerCase();

  if (nilai.includes("tolak") || nilai.includes("reject")) return "DITOLAK";
  if (
    nilai.includes("menunggu") ||
    nilai.includes("pending") ||
    nilai.includes("proses") ||
    nilai.includes("verifikasi")
  ) {
    return "MENUNGGU";
  }
  if (
    nilai.includes("setuju") ||
    nilai.includes("terima") ||
    nilai.includes("selesai") ||
    nilai.includes("approve") ||
    nilai.includes("dikonfirmasi")
  ) {
    return "DISETUJUI";
  }
  return "MENUNGGU";
}

export function labelStatusIzin(status?: string): string {
  return normalisasiStatusIzin(status);
}

function normalkanPengajuanIzin(item: unknown): SuratIzinItem | null {
  if (!item || typeof item !== "object") return null;

  const data = item as Partial<SuratIzinItem>;
  if (data.id === undefined || data.id === null) return null;

  return {
    id: Number(data.id),
    kodeBerkas: data.kodeBerkas ? String(data.kodeBerkas) : undefined,
    nama: String(data.nama ?? "-"),
    nisn: String(data.nisn ?? ""),
    kelas: String(data.kelas ?? ""),
    jenis: String(data.jenis ?? "Izin"),
    tanggal: String(data.tanggal ?? "-"),
    alasan: String(data.alasan ?? "-"),
    status: normalisasiStatusIzin(String(data.status ?? "MENUNGGU")),
    fotoBukti: data.fotoBukti ? String(data.fotoBukti) : undefined,
    namaWali: data.namaWali ? String(data.namaWali) : undefined,
    noTeleponWali: data.noTeleponWali
      ? String(data.noTeleponWali)
      : undefined,
    tandaTanganWali: data.tandaTanganWali
      ? String(data.tandaTanganWali)
      : undefined,
    diverifikasiOleh: data.diverifikasiOleh
      ? String(data.diverifikasiOleh)
      : undefined,
    disetujuiOleh: data.disetujuiOleh ? String(data.disetujuiOleh) : undefined,
    tanggalPersetujuan: data.tanggalPersetujuan
      ? String(data.tanggalPersetujuan)
      : undefined,
    catatanPenolakan: data.catatanPenolakan
      ? String(data.catatanPenolakan)
      : undefined,
  };
}

/** Baca seluruh pengajuan izin yang tersimpan di browser. */
export function bacaPengajuanIzinLokal(): SuratIzinItem[] {
  const mentah = getStore<unknown>(PENGAJUAN_IZIN_STORAGE_KEY, []);
  if (!Array.isArray(mentah)) return [];

  return mentah
    .map(normalkanPengajuanIzin)
    .filter((item): item is SuratIzinItem => item !== null);
}

/** Simpan daftar izin; bila kuota penuh, lampiran base64 dilepas. */
function tulisPengajuanIzinLokal(daftar: SuratIzinItem[]): void {
  if (setStore(PENGAJUAN_IZIN_STORAGE_KEY, daftar)) return;

  const ringkas = daftar.map((item) => ({
    ...item,
    fotoBukti: undefined,
    tandaTanganWali: undefined,
  }));
  setStore(PENGAJUAN_IZIN_STORAGE_KEY, ringkas);
}

/** Peta keputusan lama (sebelum store disatukan) untuk migrasi sekali jalan. */
type PetaOverrideLama = Record<string, OverrideStatusIzin>;

function bacaPetaOverrideLama(): PetaOverrideLama {
  if (typeof window === "undefined") return {};

  try {
    const mentah = window.localStorage.getItem(IZIN_OVERRIDE_LAMA_KEY);
    if (!mentah) return {};

    const hasil = JSON.parse(mentah) as unknown;
    if (!hasil || typeof hasil !== "object" || Array.isArray(hasil)) return {};
    return hasil as PetaOverrideLama;
  } catch (error) {
    console.error("Gagal membaca status izin lokal lama:", error);
    return {};
  }
}

function cariOverrideLama(
  item: SuratIzinItem,
  peta: PetaOverrideLama
): OverrideStatusIzin | undefined {
  const langsung = peta[String(item.id)];
  if (langsung) return langsung;
  if (!item.kodeBerkas) return undefined;

  return Object.values(peta).find(
    (override) => override?.kodeBerkas === item.kodeBerkas
  );
}

/** Bawa keputusan dari format lama agar tidak hilang saat migrasi store. */
function terapkanOverrideLama(
  item: SuratIzinItem,
  peta: PetaOverrideLama
): SuratIzinItem {
  const override = cariOverrideLama(item, peta);
  if (!override) return item;

  return {
    ...item,
    status: normalisasiStatusIzin(override.status ?? item.status),
    diverifikasiOleh: override.diverifikasiOleh ?? item.diverifikasiOleh,
    disetujuiOleh: override.disetujuiOleh ?? item.disetujuiOleh,
    tanggalPersetujuan:
      override.tanggalPersetujuan ?? item.tanggalPersetujuan,
    catatanPenolakan: override.catatanPenolakan ?? item.catatanPenolakan,
  };
}

function gabungTanpaDuplikat(
  utama: SuratIzinItem[],
  cadangan: SuratIzinItem[]
): SuratIzinItem[] {
  const idTerpakai = new Set(utama.map((item) => String(item.id)));
  const kodeTerpakai = new Set(
    utama
      .map((item) => item.kodeBerkas)
      .filter((kode): kode is string => Boolean(kode))
  );

  return [
    ...utama,
    ...cadangan.filter((item) => {
      if (idTerpakai.has(String(item.id))) return false;
      if (item.kodeBerkas && kodeTerpakai.has(item.kodeBerkas)) return false;
      return true;
    }),
  ];
}

/**
 * Inisialisasi store sekali saja. Data contoh + data server digabungkan dengan
 * pengajuan lokal lama agar tidak ada data yang hilang saat migrasi.
 */
function pastikanStoreIzinTerisi(
  dariServer: SuratIzinItem[] = []
): SuratIzinItem[] {
  if (typeof window === "undefined") return [];

  const lokal = bacaPengajuanIzinLokal();
  const sudahMigrasi =
    window.localStorage.getItem(IZIN_VERSION_KEY) === IZIN_VERSION;

  if (sudahMigrasi) return lokal;

  const petaLama = bacaPetaOverrideLama();

  // Tandai versi lebih dulu agar event perubahan saat menulis tidak memicu
  // migrasi berulang.
  try {
    window.localStorage.setItem(IZIN_VERSION_KEY, IZIN_VERSION);
  } catch (error) {
    console.error("Gagal menandai versi store izin:", error);
  }

  const awal = gabungTanpaDuplikat(
    lokal,
    gabungTanpaDuplikat(dariServer, CONTOH_SURAT_IZIN)
  )
    .map((item) => terapkanOverrideIzin(item))
    .map((item) => terapkanOverrideLama(item, petaLama));

  tulisPengajuanIzinLokal(awal);

  // Hapus format lama setelah data baru tersimpan.
  try {
    window.localStorage.removeItem(IZIN_OVERRIDE_LAMA_KEY);
  } catch (error) {
    console.error("Gagal membersihkan status izin lokal lama:", error);
  }

  return awal;
}

/**
 * Buat nomor tiket berurutan dengan format `IZIN-xxx`.
 * Nomor diambil dari kode berkas terbesar yang sudah ada di store.
 */
export function buatKodeIzinBaru(): string {
  const daftar = pastikanStoreIzinTerisi();
  const nomorTerbesar = daftar.reduce((terbesar, item) => {
    const cocok = /^IZIN-(\d+)$/i.exec(item.kodeBerkas ?? "");
    if (!cocok) return terbesar;
    return Math.max(terbesar, Number(cocok[1]));
  }, 0);

  return `IZIN-${String(nomorTerbesar + 1).padStart(3, "0")}`;
}

/**
 * Simpan pengajuan izin baru di baris paling atas. Entri dengan id atau kode
 * berkas yang sama diganti agar tidak muncul ganda.
 */
export function simpanPengajuanIzinBaru(item: SuratIzinItem): void {
  if (typeof window === "undefined") return;

  const bersih = normalkanPengajuanIzin(item);
  if (!bersih) return;

  const tanpaDuplikat = pastikanStoreIzinTerisi().filter(
    (lokal) =>
      String(lokal.id) !== String(bersih.id) &&
      !(
        bersih.kodeBerkas &&
        lokal.kodeBerkas &&
        lokal.kodeBerkas === bersih.kodeBerkas
      )
  );

  tulisPengajuanIzinLokal([bersih, ...tanpaDuplikat]);
}

function itemIzinSama(
  kiri: Pick<SuratIzinItem, "id" | "kodeBerkas">,
  kanan: Pick<SuratIzinItem, "id" | "kodeBerkas">
): boolean {
  if (String(kiri.id) === String(kanan.id)) return true;
  return Boolean(
    kiri.kodeBerkas &&
      kanan.kodeBerkas &&
      kiri.kodeBerkas === kanan.kodeBerkas
  );
}

/**
 * Simpan keputusan guru/TU langsung ke store bersama. Status selalu
 * dinormalkan agar badge di semua halaman memakai nilai yang sama.
 *
 * Data dari API fallback bisa berupa objek parsial (hanya berisi status dan
 * id), jadi item yang sudah ada digabung apa adanya tanpa mengisi field
 * kosong dengan placeholder.
 */
export function simpanOverrideIzin(item: SuratIzinItem): void {
  if (typeof window === "undefined") return;
  if (item?.id === undefined || item?.id === null) return;

  const daftar = pastikanStoreIzinTerisi();
  const kunci = {
    id: Number(item.id),
    kodeBerkas: item.kodeBerkas ? String(item.kodeBerkas) : undefined,
  };
  const indeks = daftar.findIndex((lokal) => itemIzinSama(lokal, kunci));

  if (indeks === -1) {
    const bersih = normalkanPengajuanIzin(item);
    if (!bersih) return;
    tulisPengajuanIzinLokal([bersih, ...daftar]);
    return;
  }

  const lokal = daftar[indeks];
  const gabungan: SuratIzinItem = {
    ...lokal,
    ...item,
    status: normalisasiStatusIzin(item.status ?? lokal.status),
  };

  const diperbarui = daftar.map((entri, posisi) =>
    posisi === indeks ? gabungan : entri
  );
  tulisPengajuanIzinLokal(diperbarui);
}

/** Terapkan status terbaru dari store ke satu berkas izin. */
export function terapkanOverrideIzin(item: SuratIzinItem): SuratIzinItem {
  return {
    ...item,
    status: normalisasiStatusIzin(item.status),
  };
}

/**
 * Hapus seluruh arsip izin. Store sengaja ditulis sebagai array kosong
 * (bukan dihapus) beserta penanda versi agar data contoh/server tidak
 * muncul kembali setelah tombol "Hapus Semua" ditekan.
 */
export function hapusSemuaOverrideIzin(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(IZIN_VERSION_KEY, IZIN_VERSION);
    window.localStorage.removeItem(IZIN_OVERRIDE_LAMA_KEY);
  } catch (error) {
    console.error("Gagal menandai reset store izin:", error);
  }

  tulisPengajuanIzinLokal([]);
}

function cocokDenganPemohon(
  item: SuratIzinItem,
  opsi?: { nisn?: string; nama?: string }
): boolean {
  const nisn = (opsi?.nisn ?? "").trim();
  const nama = (opsi?.nama ?? "").trim().toLowerCase();

  if (!nisn && !nama) return true;

  const nisnCocok = Boolean(nisn) && item.nisn.trim() === nisn;
  const namaCocok =
    Boolean(nama) && item.nama.trim().toLowerCase() === nama;

  return nisnCocok || namaCocok;
}

/**
 * Ambil daftar izin lengkap dari store. Parameter `dariServer` hanya dipakai
 * saat inisialisasi pertama; sesudahnya localStorage selalu menang.
 */
export function ambilDaftarIzinLengkap(
  dariServer: SuratIzinItem[] = [],
  opsi?: { nisn?: string; nama?: string; sertakanSeed?: boolean }
): SuratIzinItem[] {
  const daftar = pastikanStoreIzinTerisi(dariServer);

  return daftar
    .filter((item) => cocokDenganPemohon(item, opsi))
    .map((item) => terapkanOverrideIzin(item));
}

/** Cari data contoh milik siswa berdasarkan NISN. */
export function cariIzinSeed(nisn?: string): SuratIzinItem[] {
  if (!nisn) return [];
  return CONTOH_SURAT_IZIN.filter((item) => item.nisn === nisn).map((item) => ({
    ...item,
  }));
}

/** Berlangganan perubahan dari tab lain maupun dari halaman yang sama. */
export function berlanggananPerubahanIzin(
  callback: () => void
): () => void {
  return subscribeStore(
    [PENGAJUAN_IZIN_STORAGE_KEY, IZIN_VERSION_KEY],
    callback
  );
}

/** Apakah store izin sudah pernah diinisialisasi di browser ini. */
export function storeIzinSudahAda(): boolean {
  return hasStore(PENGAJUAN_IZIN_STORAGE_KEY);
}
