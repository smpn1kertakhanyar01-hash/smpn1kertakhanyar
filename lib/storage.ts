import { clearStore, getStore, setStore } from "./client-store";
import { PERAN_PEGAWAI } from "./constants";
import type { PeranPegawai, PeranPengguna } from "./types";

export const STORAGE_KEYS = {
  isLoggedIn: "isLoggedIn",
  userRole: "userRole",
  authToken: "authToken",
  namaGuru: "namaGuru",
  peranPegawai: "peranPegawai",
  namaSiswa: "namaSiswa",
  nisnSiswa: "nisnSiswa",
  kelasSiswa: "kelasSiswa",
  // Kunci lama tetap dibaca agar data siswa yang sudah terlanjur tersimpan tidak hilang.
  namaSiswaLama: "siswaNama",
  nisnSiswaLama: "siswaNisn",
  kelasSiswaLama: "siswaKelas",
  redirectSetelahLogin: "redirect_setelah_login",
  // Kunci penyimpanan lama, dipakai sekali saat migrasi data ke database.
  riwayatPresensi: "riwayat_presensi",
  daftarSuratIzin: "daftar_surat_izin",
  catatanKejadian: "catatan_kejadian_harian",
  statistikPengunjung: "statistik_pengunjung",
  daftarSiswaMutasi: "daftar_siswa_mutasi",
  migrasiDatabase: "migrasi_database_selesai",
  // Single Source of Truth data operasional di browser.
  suratIzin: "SMPN1KH_SURAT_IZIN",
  presensiData: "SMPN1KH_PRESENSI_DATA",
  jurnalData: "SMPN1KH_JURNAL_DATA",
  // Daftar siswa hasil impor PPDB (lengkap dengan sandi awal).
  studentsData: "SMPN1KH_STUDENTS_DATA",
} as const;

/**
 * Pembantu localStorage yang aman dipakai saat SSR. Semua fungsi memakai
 * engine `client-store` agar perubahan langsung memicu sinkronisasi antar
 * komponen, tab, dan halaman tanpa reload.
 */
export function getData<T>(key: string, fallbackData: T): T {
  return getStore<T>(key, fallbackData);
}

export function saveData<T>(key: string, data: T): boolean {
  return setStore<T>(key, data);
}

export function updateItem<T extends object>(
  key: string,
  idKey: string,
  idVal: string | number,
  updateFields: Partial<T>
): T[] {
  const daftar = getStore<T[]>(key, []);
  const hasil = daftar.map((item) => {
    const nilaiId = (item as Record<string, unknown>)[idKey];
    return String(nilaiId) === String(idVal)
      ? { ...item, ...updateFields }
      : item;
  });

  setStore<T[]>(key, hasil);
  return hasil;
}

export function deleteItem<T extends object>(
  key: string,
  idKey: string,
  idVal: string | number
): T[] {
  const daftar = getStore<T[]>(key, []);
  const hasil = daftar.filter((item) => {
    const nilaiId = (item as Record<string, unknown>)[idKey];
    return String(nilaiId) !== String(idVal);
  });

  setStore<T[]>(key, hasil);
  return hasil;
}

export function clearData(key: string): void {
  clearStore(key);
}

export function apakahLogin(peran: PeranPengguna): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.localStorage.getItem(STORAGE_KEYS.isLoggedIn) === "true" &&
    window.localStorage.getItem(STORAGE_KEYS.userRole) === peran &&
    Boolean(window.localStorage.getItem(STORAGE_KEYS.authToken))
  );
}

export function bacaSesiSiswa() {
  if (typeof window === "undefined") {
    return { nama: "", nisn: "", kelas: "" };
  }

  return {
    nama:
      window.localStorage.getItem(STORAGE_KEYS.namaSiswa) ??
      window.localStorage.getItem(STORAGE_KEYS.namaSiswaLama) ??
      "",
    nisn:
      window.localStorage.getItem(STORAGE_KEYS.nisnSiswa) ??
      window.localStorage.getItem(STORAGE_KEYS.nisnSiswaLama) ??
      "",
    kelas:
      window.localStorage.getItem(STORAGE_KEYS.kelasSiswa) ??
      window.localStorage.getItem(STORAGE_KEYS.kelasSiswaLama) ??
      "",
  };
}

export function simpanSesiSiswa(akun: {
  nama: string;
  nisn: string;
  kelas: string;
  token: string;
}): void {
  window.localStorage.setItem(STORAGE_KEYS.userRole, "siswa");
  window.localStorage.setItem(STORAGE_KEYS.isLoggedIn, "true");
  window.localStorage.setItem(STORAGE_KEYS.authToken, akun.token);
  window.localStorage.setItem(STORAGE_KEYS.namaSiswa, akun.nama);
  window.localStorage.setItem(STORAGE_KEYS.nisnSiswa, akun.nisn);
  window.localStorage.setItem(STORAGE_KEYS.kelasSiswa, akun.kelas);
}

export function hapusSesiSiswa(): void {
  [
    STORAGE_KEYS.isLoggedIn,
    STORAGE_KEYS.userRole,
    STORAGE_KEYS.authToken,
    STORAGE_KEYS.namaSiswa,
    STORAGE_KEYS.nisnSiswa,
    STORAGE_KEYS.kelasSiswa,
    STORAGE_KEYS.namaSiswaLama,
    STORAGE_KEYS.nisnSiswaLama,
    STORAGE_KEYS.kelasSiswaLama,
  ].forEach((key) => window.localStorage.removeItem(key));
}

export function bacaNamaGuru(): string {
  if (typeof window === "undefined") return "Guru Piket";
  return window.localStorage.getItem(STORAGE_KEYS.namaGuru) || "Guru Piket";
}

export function bacaPeranPegawai(): PeranPegawai | null {
  if (typeof window === "undefined") return null;
  const peran = window.localStorage.getItem(STORAGE_KEYS.peranPegawai);
  return (PERAN_PEGAWAI as readonly string[]).includes(peran ?? "")
    ? (peran as PeranPegawai)
    : null;
}

export function apakahAdminTu(): boolean {
  return bacaPeranPegawai() === "ADMIN_TU";
}

export function simpanSesiGuru(
  nama: string,
  token: string,
  peranPegawai: PeranPegawai = "GURU_PIKET"
): void {
  window.localStorage.setItem(STORAGE_KEYS.userRole, "guru");
  window.localStorage.setItem(STORAGE_KEYS.isLoggedIn, "true");
  window.localStorage.setItem(STORAGE_KEYS.authToken, token);
  window.localStorage.setItem(STORAGE_KEYS.namaGuru, nama);
  window.localStorage.setItem(STORAGE_KEYS.peranPegawai, peranPegawai);
}

export function hapusSesiGuru(): void {
  [
    STORAGE_KEYS.isLoggedIn,
    STORAGE_KEYS.userRole,
    STORAGE_KEYS.authToken,
    STORAGE_KEYS.namaGuru,
    STORAGE_KEYS.peranPegawai,
  ].forEach((key) => window.localStorage.removeItem(key));
}
