import type { KATEGORI_KEJADIAN, STATUS_PRESENSI } from "./constants";

export type PeranPengguna = "guru" | "siswa";
export type PeranPegawai = "GURU_PIKET" | "WALI_KELAS" | "ADMIN_TU";
export type StatusPresensi = (typeof STATUS_PRESENSI)[number];
export type KategoriKejadian = (typeof KATEGORI_KEJADIAN)[number]["value"];

export interface AkunSiswa {
  nisn: string;
  nama: string;
  kelas: string;
  sandi: string;
}

export interface Pengguna {
  id: number;
  username: string;
  role: PeranPengguna;
  /** Peran detail pegawai, hanya terisi untuk akun guru/staf. */
  staffRole?: PeranPegawai;
  nama: string;
  nisn?: string;
  kelas?: string;
}

export interface Siswa {
  nisn: string;
  nama: string;
  kelas: string;
}

/** Data presensi yang dibaca dashboard; sebagian field berasal dari data lama. */
export interface PresensiItem {
  nisn?: string;
  nama?: string;
  kelas?: string;
  tanggal: string;
  waktu?: string;
  jamInput?: string;
  status: string;
  keterangan?: string;
}

export interface CatatanAbsen {
  nisn: string;
  nama: string;
  kelas: string;
  status: StatusPresensi;
  tanggal: string;
  jamInput: string;
}

export interface SuratIzinItem {
  id: number;
  /** Kode berkas tampilan, mis. IZIN-001 (opsional untuk data lama). */
  kodeBerkas?: string;
  nama: string;
  nisn: string;
  kelas: string;
  jenis: string;
  tanggal: string;
  alasan: string;
  status: string;
  fotoBukti?: string;
  namaWali?: string;
  noTeleponWali?: string;
  tandaTanganWali?: string;
  /** Nama petugas yang memverifikasi/memutuskan pengajuan izin. */
  diverifikasiOleh?: string;
  disetujuiOleh?: string;
  tanggalPersetujuan?: string;
  catatanPenolakan?: string;
}

export interface CatatanKejadianItem {
  id: number;
  tanggal: string;
  waktu: string;
  guruPiket: string;
  kategori: KategoriKejadian;
  namaSiswaTerlibat?: string;
  kelasSiswa?: string;
  deskripsi: string;
  tindakanPenanganan: string;
}

export interface AkunSandiSiswa {
  id: number;
  nisn: string;
  nama: string;
  kelas: string;
  tanggalGantiSandi: string | null;
  sandiTerkini: string | null;
  sumberSandi: "siswa" | "guru" | null;
}

export interface SesiPengguna {
  userId: number;
  role: PeranPengguna;
  /** Peran detail pegawai, hanya terisi untuk akun guru/staf. */
  staffRole?: PeranPegawai;
  username: string;
  nama: string;
  nisn?: string;
  kelas?: string;
}

export interface MutasiItem {
  id: number;
  nama: string;
  nisn: string;
  jenisKelamin: string;
  sekolahAsal: string;
  kelasTujuan: string;
  alasanPindah: string;
  namaWali: string;
  noTeleponWali: string;
  suratPindah?: string;
  tanggalPengajuan: string;
  status: string;
}

export interface RiwayatKunjungan {
  tanggal: string;
  jumlah: number;
}

export interface StatistikPengunjung {
  hariIni: number;
  total: number;
  riwayat: RiwayatKunjungan[];
}

export interface AgendaAkademik {
  id: number;
  tanggal: string;
  kegiatan: string;
  kategori: "Libur" | "Ujian" | "Kegiatan" | "Rapor";
  semester: "Ganjil" | "Genap";
}

/* -------------------------------------------------------------------------- */
/*                        Tabel kesiswaan (migrasi baru)                      */
/* -------------------------------------------------------------------------- */

export type KategoriKalender = "Ujian" | "Libur" | "Kegiatan";

export interface KalenderAkademik {
  id: number;
  judulKegiatan: string;
  deskripsi: string | null;
  tanggalMulai: string;
  tanggalSelesai: string;
  kategori: KategoriKalender;
  createdAt: string;
}

export type StatusKirimWA = "BERHASIL" | "GAGAL";

export interface LogNotifikasiWA {
  id: number;
  nomorTujuan: string;
  pesan: string;
  statusKirim: StatusKirimWA;
  responFonnte: string | null;
  createdAt: string;
}

export interface KategoriKejadianMaster {
  id: number;
  namaKategori: string;
  poin: number;
  createdAt: string;
}

export type JenisMutasi = "MASUK" | "KELUAR";

export interface MutasiSiswa {
  id: number;
  siswaId: number | null;
  namaSiswa: string | null;
  nisn: string | null;
  jenisKelamin: string | null;
  kelas: string | null;
  jenisMutasi: JenisMutasi;
  tanggalMutasi: string;
  sekolahAsalTujuan: string;
  alasan: string;
  noSuratMutasi: string | null;
  namaWali: string | null;
  noTeleponWali: string | null;
  berkasPendukung: string | null;
  statusBerkas: string;
  createdAt: string;
}

/**
 * Payload pendaftaran mutasi. `siswaId` boleh kosong untuk mutasi masuk
 * dari siswa yang belum memiliki akun di sistem.
 */
export interface MutasiSiswaPayload {
  siswaId?: number | null;
  namaSiswa?: string | null;
  nisn?: string | null;
  jenisKelamin?: string | null;
  kelas?: string | null;
  jenisMutasi: JenisMutasi;
  tanggalMutasi: string;
  sekolahAsalTujuan: string;
  alasan: string;
  noSuratMutasi?: string | null;
  namaWali?: string | null;
  noTeleponWali?: string | null;
  berkasPendukung?: string | null;
  statusBerkas?: string;
}

export type StatusPengambilanIjazah = "Belum Diambil" | "Diambil";

export interface PengambilanIjazah {
  id: number;
  namaSiswa: string;
  nisn: string | null;
  kelas: string | null;
  tahunLulus: string | null;
  status: StatusPengambilanIjazah;
  tanggalAmbil: string | null;
  diambilOleh: string | null;
  petugas: string | null;
  catatan: string | null;
  createdAt: string;
}

export interface PengambilanIjazahPayload {
  namaSiswa: string;
  nisn?: string | null;
  kelas?: string | null;
  tahunLulus?: string | null;
  status?: StatusPengambilanIjazah;
  tanggalAmbil?: string | null;
  diambilOleh?: string | null;
  petugas?: string | null;
  catatan?: string | null;
}

/** Pengaturan layanan dinamis yang dapat diedit Admin TU. */
export interface PengaturanLayanan {
  id: number;
  kategori: string;
  isiPersyaratan: string;
  updatedBy: string | null;
  updatedAt: string;
}

export interface LoginPayload {
  role: PeranPengguna;
  identifier: string;
  password: string;
}

export interface RegisterPayload {
  nisn: string;
  namaLengkap: string;
  kelas: string;
  password: string;
}
