import { STORAGE_KEYS } from "./storage";
import type {
  CatatanAbsen,
  CatatanKejadianItem,
  MutasiItem,
  SuratIzinItem,
} from "./types";

function bacaDaftarLama<T>(key: string): T[] {
  if (typeof window === "undefined") return [];

  try {
    const mentah = window.localStorage.getItem(key);
    if (!mentah) return [];
    const hasil = JSON.parse(mentah) as unknown;
    return Array.isArray(hasil) ? (hasil as T[]) : [];
  } catch {
    return [];
  }
}

function normalisasiTanggal(nilai: string): string | null {
  const teks = nilai.trim();
  if (!teks) return null;

  // Format ISO: 2026-11-02 atau 2026-11-02T08:00:00.000Z
  const iso = teks.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // Format Indonesia: 2/11/2026 atau 02-11-2026 (hari/bulan/tahun)
  const lokal = teks.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (lokal) {
    const hari = lokal[1].padStart(2, "0");
    const bulan = lokal[2].padStart(2, "0");
    return `${lokal[3]}-${bulan}-${hari}`;
  }

  const tanggal = new Date(teks);
  if (!Number.isNaN(tanggal.getTime())) {
    return tanggal.toISOString().split("T")[0];
  }
  return null;
}

/**
 * Statistik kunjungan lama dapat berbentuk array, objek `{ riwayat: [...] }`,
 * atau objek dengan tanggal sebagai kunci. Semua bentuk dinormalkan.
 */
function bacaStatistikLama(): { tanggal: string; jumlah: number }[] {
  if (typeof window === "undefined") return [];

  let data: unknown;
  try {
    const mentah = window.localStorage.getItem(STORAGE_KEYS.statistikPengunjung);
    if (!mentah) return [];
    data = JSON.parse(mentah) as unknown;
  } catch {
    return [];
  }

  const kumpulan = new Map<string, number>();

  const tambah = (tanggalMentah: unknown, jumlahMentah: unknown) => {
    if (typeof tanggalMentah !== "string") return;
    if (typeof jumlahMentah !== "number" || !Number.isFinite(jumlahMentah)) {
      return;
    }
    if (jumlahMentah <= 0) return;

    const tanggal = normalisasiTanggal(tanggalMentah);
    if (!tanggal) return;

    kumpulan.set(tanggal, (kumpulan.get(tanggal) ?? 0) + Math.round(jumlahMentah));
  };

  const bacaRiwayat = (riwayat: unknown) => {
    if (!Array.isArray(riwayat)) return;
    for (const item of riwayat) {
      if (!item || typeof item !== "object") continue;
      const catatan = item as Record<string, unknown>;
      tambah(catatan.tanggal, catatan.jumlah);
    }
  };

  if (Array.isArray(data)) {
    bacaRiwayat(data);
  } else if (data && typeof data === "object") {
    const catatan = data as Record<string, unknown>;
    bacaRiwayat(catatan.riwayat);

    for (const [tanggal, jumlah] of Object.entries(catatan)) {
      // Lewati field ringkasan yang bukan tanggal.
      if (tanggal === "riwayat" || tanggal === "hariIni" || tanggal === "total") {
        continue;
      }
      tambah(tanggal, jumlah);
    }
  }

  return [...kumpulan].map(([tanggal, jumlah]) => ({ tanggal, jumlah }));
}

/**
 * Migrasi satu kali: memindahkan arsip localStorage lama ke database SQLite.
 * Jika tidak ada data lama, penanda migrasi tetap disimpan agar tidak dicek berulang.
 */
export async function migrasikanDataLama(): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(STORAGE_KEYS.migrasiDatabase) === "true") {
    return;
  }

  const attendance = bacaDaftarLama<CatatanAbsen>(
    STORAGE_KEYS.riwayatPresensi
  );
  const leaveRequests = bacaDaftarLama<SuratIzinItem>(
    STORAGE_KEYS.daftarSuratIzin
  );
  const incidents = bacaDaftarLama<CatatanKejadianItem>(
    STORAGE_KEYS.catatanKejadian
  );
  const mutations = bacaDaftarLama<MutasiItem>(
    STORAGE_KEYS.daftarSiswaMutasi
  );
  const visitors = bacaStatistikLama();

  const adaData =
    attendance.length > 0 ||
    leaveRequests.length > 0 ||
    incidents.length > 0 ||
    mutations.length > 0 ||
    visitors.length > 0;

  try {
    if (adaData) {
      const response = await fetch("/api/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendance,
          leaveRequests,
          incidents,
          mutations,
          visitors,
        }),
      });

      if (!response.ok) return;
    }

    window.localStorage.setItem(STORAGE_KEYS.migrasiDatabase, "true");
    [
      STORAGE_KEYS.riwayatPresensi,
      STORAGE_KEYS.daftarSuratIzin,
      STORAGE_KEYS.catatanKejadian,
      STORAGE_KEYS.statistikPengunjung,
      STORAGE_KEYS.daftarSiswaMutasi,
    ].forEach((key) => window.localStorage.removeItem(key));
  } catch (error) {
    console.error("Gagal memigrasikan data lama:", error);
  }
}
