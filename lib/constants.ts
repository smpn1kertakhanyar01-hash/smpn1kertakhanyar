export const NAMA_SEKOLAH = "SMP Negeri 1 Kertak Hanyar";
export const NAMA_SEKOLAH_UPPER = "SMP NEGERI 1 KERTAK HANYAR";

export const NOMOR_WHATSAPP = "6287795102755";
export const PESAN_WHATSAPP_DEFAULT =
  "Halo Admin Layanan Kesiswaan SMPN 1 Kertak Hanyar, saya ingin bertanya seputar layanan sekolah.";

/** Kelas yang dipakai pada filter dan formulir layanan. */
export const KELAS_UTAMA = ["VII A", "VIII B", "IX C"] as const;
export const KELAS_PENDAFTARAN = [
  "VII A",
  "VII B",
  "VIII A",
  "VIII B",
  "IX A",
  "IX B",
] as const;

export const STATUS_PRESENSI = ["Hadir", "Sakit", "Izin", "Alpa"] as const;

export const KATEGORI_KEJADIAN = [
  { value: "Kedisiplinan", label: "Kedisiplinan / Tata Tertib" },
  { value: "Kesehatan / UKS", label: "Kesehatan / Siswa Sakit (UKS)" },
  { value: "Fasilitas / Sarpras", label: "Fasilitas / Sarana Prasarana" },
  { value: "Lainnya", label: "Kejadian Khusus Lainnya" },
] as const;

export const AKUN_GURU_DEMO = {
  users: ["guru", "admin", "piket"],
  password: "@Smpn1KH#",
  nama: "Guru Piket SMPN 1 Kertak Hanyar",
  role: "GURU_PIKET",
} as const;

export const AKUN_ADMIN_TU = {
  username: "petugas.smpn1kh",
  password: "adminTUkece",
  nama: "Petugas Kesiswaan & Tata Usaha",
  role: "ADMIN_TU",
} as const;

/** Username akun Admin TU lama yang dimigrasikan ke akun petugas tunggal. */
export const USERNAME_ADMIN_TU_LAMA = "admintu";

/** Peran pegawai yang disimpan pada kolom `users.role`. */
export const PERAN_PEGAWAI = [
  "GURU_PIKET",
  "WALI_KELAS",
  "ADMIN_TU",
] as const;

/** Cookie optimistis untuk proteksi rute oleh proxy. */
export const COOKIE_SESI_GURU = "sesi_guru";
export const COOKIE_PERAN_PEGAWAI = "peran_pegawai";

/** Kategori pengaturan layanan untuk persyaratan pengambilan ijazah. */
export const KATEGORI_PENGAMBILAN_IJAZAH = "PENGAMBILAN_IJAZAH";

/**
 * Isi awal persyaratan pengambilan ijazah. Satu baris mewakili satu poin.
 * Nilai ini hanya dipakai saat database belum memiliki pengaturan tersimpan.
 */
export const SYARAT_IJAZAH_DEFAULT = [
  "Menyerahkan Surat Keterangan Bebas Pustaka dari perpustakaan sekolah.",
  "Menyerahkan Surat Keterangan Bebas Administrasi/tanggungan keuangan sekolah.",
  "Melakukan cap 3 jari secara langsung di hadapan petugas Tata Usaha (tidak dapat diwakilkan).",
  "Menandatangani buku ekspedisi pengambilan ijazah.",
  "Pengambilan oleh pihak lain wajib menyertakan Surat Kuasa dari orang tua/wali bermeterai Rp10.000, fotokopi KTP orang tua/wali, dan fotokopi KTP penerima kuasa.",
  "Mengikuti tata tertib kunjungan: datang pada jam layanan Tata Usaha, berpakaian sopan, dan menjaga ketertiban di lingkungan sekolah.",
].join("\n");
