import { getStore, setStore, subscribeStore } from "./client-store";
import { normalisasiKelasSiswa, sandiSiswaDariNisn } from "./data";
import { STORAGE_KEYS } from "./storage";
import type { AkunSandiSiswa, Siswa } from "./types";

/**
 * Penyimpanan siswa hasil impor massal (PPDB).
 *
 * `SMPN1KH_STUDENTS_DATA` menjadi Single Source of Truth di browser karena
 * SQLite pada Vercel bersifat read-only. Seluruh halaman (TU, guru, login
 * siswa, surat izin, dan presensi) menggabungkan isi store ini dengan data
 * server agar siswa baru langsung dikenal sistem tanpa menunggu deploy.
 */
export const SISWA_STORAGE_KEY = STORAGE_KEYS.studentsData;

export interface SiswaLokal extends Siswa {
  sandi: string;
  noWaWali: string;
}

export const NAMA_FILE_TEMPLATE_CSV_SISWA = "template_siswa_smpn1kh.csv";

export const KONTEN_TEMPLATE_CSV_SISWA = [
  "NISN,Nama Lengkap,Kelas,No WA Wali",
  "0119000101,Budi Santoso,7A,081256322601",
  "0119000102,Siti Aminah,7B,081256322602",
].join("\n");

function kunciNisn(nisn: string): string {
  return String(nisn ?? "").trim().toLowerCase();
}

function teks(nilai: unknown): string {
  return String(nilai ?? "").trim();
}

/** Kata sandi bawaan siswa baru: "smp" + 4 digit terakhir NISN. */
export function sandiOtomatisSiswa(nisn: string): string {
  return `smp${nisn.slice(-4)}`;
}

function normalkanSiswaLokal(item: Partial<SiswaLokal> | null): SiswaLokal | null {
  if (!item || typeof item !== "object") return null;

  const nisn = teks(item.nisn).replace(/^'+/, "");
  const nama = teks(item.nama);
  if (!nisn || !nama) return null;

  return {
    nisn,
    nama,
    kelas: normalisasiKelasSiswa(teks(item.kelas)),
    sandi: teks(item.sandi) || sandiOtomatisSiswa(nisn),
    noWaWali: teks(item.noWaWali),
  };
}

/** Baca seluruh siswa yang pernah diimpor pada browser ini. */
export function bacaDaftarSiswaLokal(): SiswaLokal[] {
  const mentah = getStore<unknown>(SISWA_STORAGE_KEY, []);
  if (!Array.isArray(mentah)) return [];

  return mentah
    .map((item) => normalkanSiswaLokal(item as Partial<SiswaLokal>))
    .filter((item): item is SiswaLokal => item !== null);
}

/**
 * Gabungkan data server dengan data lokal. Siswa lokal hanya ditambahkan bila
 * NISN-nya belum ada, sehingga data resmi dari database tetap diprioritaskan.
 */
export function gabungkanSiswaLokal(dariServer: Siswa[] = []): Siswa[] {
  const peta = new Map<string, Siswa>();

  dariServer.forEach((siswa) => {
    peta.set(kunciNisn(siswa.nisn), siswa);
  });

  bacaDaftarSiswaLokal().forEach((siswa) => {
    const kunci = kunciNisn(siswa.nisn);
    if (peta.has(kunci)) return;
    peta.set(kunci, {
      nisn: siswa.nisn,
      nama: siswa.nama,
      kelas: siswa.kelas,
    });
  });

  return Array.from(peta.values());
}

/**
 * Versi lengkap untuk tabel Backup Sandi Siswa: setiap baris memiliki sandi
 * awal dan nomor wali (bila berasal dari CSV impor).
 */
export function gabungkanSiswaLokalLengkap(
  dariServer: Siswa[] = []
): SiswaLokal[] {
  const peta = new Map<string, SiswaLokal>();

  dariServer.forEach((siswa) => {
    const nisn = teks(siswa.nisn);
    if (!nisn) return;
    peta.set(kunciNisn(nisn), {
      nisn,
      nama: teks(siswa.nama),
      kelas: normalisasiKelasSiswa(teks(siswa.kelas)),
      sandi: sandiSiswaDariNisn(nisn),
      noWaWali: "",
    });
  });

  bacaDaftarSiswaLokal().forEach((siswa) => {
    peta.set(kunciNisn(siswa.nisn), siswa);
  });

  return Array.from(peta.values());
}

/** Berlangganan perubahan data siswa lintas komponen, tab, dan halaman. */
export function berlanggananPerubahanSiswa(callback: () => void): () => void {
  return subscribeStore(SISWA_STORAGE_KEY, callback);
}

/** Semua kelas yang dikenal dari data siswa lokal (untuk filter presensi). */
export function daftarKelasSiswaLokal(): string[] {
  const kelas = bacaDaftarSiswaLokal()
    .map((siswa) => siswa.kelas)
    .filter(Boolean);
  return Array.from(new Set(kelas));
}

/**
 * Saring baris CSV yang benar-benar baru dibanding daftar yang sudah ada.
 * NISN ganda dalam satu berkas hanya dihitung sekali.
 */
export function tentukanSiswaBaru(
  hasilParse: SiswaLokal[],
  daftarSaatIni: Siswa[] = []
): SiswaLokal[] {
  const sudahAda = new Set<string>();
  [...daftarSaatIni, ...bacaDaftarSiswaLokal()].forEach((siswa) => {
    sudahAda.add(kunciNisn(siswa.nisn));
  });

  const baru: SiswaLokal[] = [];
  hasilParse.forEach((siswa) => {
    const kunci = kunciNisn(siswa.nisn);
    if (!kunci || sudahAda.has(kunci)) return;
    sudahAda.add(kunci);
    baru.push(siswa);
  });

  return baru;
}

/**
 * Simpan siswa baru secara permanen ke localStorage. Data lama tetap
 * dipertahankan dan ditimpa hanya bila NISN yang sama diimpor ulang.
 */
export function simpanSiswaImpor(
  siswaBaru: SiswaLokal[],
  daftarSaatIni: Siswa[] = []
): SiswaLokal[] {
  const peta = new Map<string, SiswaLokal>();

  gabungkanSiswaLokalLengkap(daftarSaatIni).forEach((siswa) => {
    peta.set(kunciNisn(siswa.nisn), siswa);
  });

  siswaBaru.forEach((siswa) => {
    const bersih = normalkanSiswaLokal(siswa);
    if (bersih) peta.set(kunciNisn(bersih.nisn), bersih);
  });

  const hasil = Array.from(peta.values());
  setStore(SISWA_STORAGE_KEY, hasil);
  return hasil;
}

/** Akun lokal yang ditambahkan ke tabel Backup Sandi Siswa. */
export function gabungkanAkunSiswaLokal(
  dariServer: AkunSandiSiswa[] = []
): AkunSandiSiswa[] {
  const peta = new Map<string, AkunSandiSiswa>();

  dariServer.forEach((akun) => {
    peta.set(kunciNisn(akun.nisn), akun);
  });

  bacaDaftarSiswaLokal().forEach((siswa, indeks) => {
    const kunci = kunciNisn(siswa.nisn);
    if (peta.has(kunci)) return;
    peta.set(kunci, {
      id: -1000 - indeks,
      nisn: siswa.nisn,
      nama: siswa.nama,
      kelas: siswa.kelas,
      tanggalGantiSandi: null,
      sandiTerkini: siswa.sandi,
      sumberSandi: null,
    });
  });

  return Array.from(peta.values());
}

/**
 * Verifikasi login untuk akun hasil impor. Pemeriksaan dilakukan di browser
 * karena server (Vercel read-only) tidak mengetahui isi localStorage.
 */
export function cariSiswaLokalUntukLogin(
  identifier: string,
  password: string
): SiswaLokal | null {
  const nisn = kunciNisn(identifier);
  const sandi = password.trim();
  if (!nisn || !sandi) return null;

  return (
    bacaDaftarSiswaLokal().find(
      (siswa) =>
        kunciNisn(siswa.nisn) === nisn && sandi === siswa.sandi
    ) ?? null
  );
}

/** Memecah satu baris CSV dengan dukungan tanda kutip dan koma di dalamnya. */
function pecahBarisCsv(baris: string): string[] {
  const hasil: string[] = [];
  let nilai = "";
  let diKutip = false;

  for (let i = 0; i < baris.length; i += 1) {
    const karakter = baris[i];

    if (karakter === '"') {
      if (diKutip && baris[i + 1] === '"') {
        nilai += '"';
        i += 1;
      } else {
        diKutip = !diKutip;
      }
      continue;
    }

    if (karakter === "," && !diKutip) {
      hasil.push(nilai);
      nilai = "";
      continue;
    }

    nilai += karakter;
  }

  hasil.push(nilai);
  return hasil;
}

/**
 * Parse teks CSV: baris header dan baris kosong diabaikan. Kolom yang dibaca
 * adalah NISN, Nama Lengkap, Kelas, dan No WA Wali.
 */
export function parseCsvSiswa(teksCsv: string): SiswaLokal[] {
  const baris = teksCsv.replace(/^\uFEFF/, "").split(/\r?\n/);
  const hasil: SiswaLokal[] = [];

  baris.forEach((isiBaris, indeks) => {
    if (!isiBaris.trim()) return;

    const kolom = pecahBarisCsv(isiBaris).map((nilai) => nilai.trim());
    if (indeks === 0 && kunciNisn(kolom[0]) === "nisn") return;

    const siswa = normalkanSiswaLokal({
      nisn: kolom[0],
      nama: kolom[1],
      kelas: kolom[2],
      noWaWali: kolom[3],
      sandi: sandiOtomatisSiswa(teks(kolom[0]).replace(/^'+/, "")),
    });

    if (siswa) hasil.push(siswa);
  });

  return hasil;
}
