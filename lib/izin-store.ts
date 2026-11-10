import { CONTOH_SURAT_IZIN } from "./memory-store";
import type { SuratIzinItem } from "./types";

/**
 * Penyimpanan status izin bersama untuk halaman berbasis browser
 * (Dashboard Guru, Dashboard TU, dan Status Izin Siswa).
 *
 * API server sudah menyimpan perubahan di memori runtime, tetapi memori
 * serverless dapat hilang saat instance berganti. Lapisan localStorage ini
 * memastikan keputusan guru/TU langsung terlihat di seluruh tab dan halaman
 * pada browser yang sama, tanpa menunggu respons server.
 */

export const IZIN_STORE_EVENT = "smpn1:izin-store-berubah";
const IZIN_STORAGE_KEY = "smpn1_izin_status_overrides_v1";

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

type PetaOverride = Record<string, OverrideStatusIzin>;

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
  const baku = normalisasiStatusIzin(status);
  if (baku === "DISETUJUI") return "DISETUJUI";
  if (baku === "DITOLAK") return "DITOLAK";
  return "MENUNGGU";
}

function bacaPetaOverride(): PetaOverride {
  if (typeof window === "undefined") return {};
  try {
    const mentah = window.localStorage.getItem(IZIN_STORAGE_KEY);
    if (!mentah) return {};
    const hasil = JSON.parse(mentah) as PetaOverride;
    return hasil && typeof hasil === "object" ? hasil : {};
  } catch {
    return {};
  }
}

function tulisPetaOverride(peta: PetaOverride): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(IZIN_STORAGE_KEY, JSON.stringify(peta));
    window.dispatchEvent(new Event(IZIN_STORE_EVENT));
  } catch (error) {
    console.error("Gagal menyimpan status izin lokal:", error);
  }
}

function cariOverride(
  item: Pick<SuratIzinItem, "id" | "kodeBerkas">,
  peta = bacaPetaOverride()
): OverrideStatusIzin | undefined {
  const langsung = peta[String(item.id)];
  if (langsung) return langsung;
  if (!item.kodeBerkas) return undefined;
  return Object.values(peta).find(
    (override) => override.kodeBerkas === item.kodeBerkas
  );
}

/**
 * Terapkan status terbaru dari localStorage ke satu berkas izin. Status
 * selalu dinormalkan agar badge di semua halaman memakai nilai yang sama.
 */
export function terapkanOverrideIzin(
  item: SuratIzinItem,
  peta = bacaPetaOverride()
): SuratIzinItem {
  const override = cariOverride(item, peta);
  const statusMentah = override?.status ?? item.status;

  return {
    ...item,
    ...(override
      ? {
          diverifikasiOleh:
            override.diverifikasiOleh ?? item.diverifikasiOleh,
          disetujuiOleh: override.disetujuiOleh ?? item.disetujuiOleh,
          tanggalPersetujuan:
            override.tanggalPersetujuan ?? item.tanggalPersetujuan,
          catatanPenolakan:
            override.catatanPenolakan ?? item.catatanPenolakan,
        }
      : {}),
    status: normalisasiStatusIzin(statusMentah),
  };
}

/** Simpan keputusan terbaru agar dibaca halaman lain di browser yang sama. */
export function simpanOverrideIzin(item: SuratIzinItem): void {
  if (typeof window === "undefined") return;

  const peta = bacaPetaOverride();
  peta[String(item.id)] = {
    id: item.id,
    kodeBerkas: item.kodeBerkas,
    status: item.status,
    diverifikasiOleh: item.diverifikasiOleh,
    disetujuiOleh: item.disetujuiOleh,
    tanggalPersetujuan: item.tanggalPersetujuan,
    catatanPenolakan: item.catatanPenolakan,
    diperbaruiPada: new Date().toISOString(),
  };
  tulisPetaOverride(peta);
}

/** Hapus seluruh override lokal, misalnya saat arsip izin direset. */
export function hapusSemuaOverrideIzin(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(IZIN_STORAGE_KEY);
    window.dispatchEvent(new Event(IZIN_STORE_EVENT));
  } catch (error) {
    console.error("Gagal menghapus status izin lokal:", error);
  }
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
 * Gabungkan data server dengan data contoh dan override lokal.
 * - `sertakanSeed` dipakai halaman siswa agar riwayat AFIKA DEWI tidak kosong.
 * - Data server menang atas seed, lalu override lokal menimpa keduanya.
 */
export function ambilDaftarIzinLengkap(
  dariServer: SuratIzinItem[] = [],
  opsi?: { nisn?: string; sertakanSeed?: boolean }
): SuratIzinItem[] {
  const peta = bacaPetaOverride();
  const seed = opsi?.sertakanSeed
    ? CONTOH_SURAT_IZIN.filter(
        (item) => !opsi.nisn || item.nisn === opsi.nisn
      )
    : [];

  return gabungTanpaDuplikat(dariServer, seed).map((item) =>
    terapkanOverrideIzin(item, peta)
  );
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
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === IZIN_STORAGE_KEY) callback();
  };
  const handleLokal = () => callback();

  window.addEventListener("storage", handleStorage);
  window.addEventListener(IZIN_STORE_EVENT, handleLokal);
  window.addEventListener("focus", handleLokal);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(IZIN_STORE_EVENT, handleLokal);
    window.removeEventListener("focus", handleLokal);
  };
}
