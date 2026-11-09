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
} as const;

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
