import type { AgendaAkademik, AkunSandiSiswa, AkunSiswa } from "./types";

export interface CatatanAbsenSeed {
  nisn: string;
  nama: string;
  kelas: string;
}

export const DATA_SISWA_KELAS: Record<string, CatatanAbsenSeed[]> = {
  "9A": [
    { nisn: "0119741828", nama: "AFIKA DEWI", kelas: "9A" },
    { nisn: "0123691710", nama: "AHMAD ALFARIZ", kelas: "9A" },
    { nisn: "0124909669", nama: "Aisyah Putri", kelas: "9A" },
    { nisn: "0122506321", nama: "AISYAH WIRDHA", kelas: "9A" },
    { nisn: "3110548598", nama: "Alya", kelas: "9A" },
    { nisn: "0127657034", nama: "Citra Lutfia Nur", kelas: "9A" },
    { nisn: "3117999184", nama: "Desi", kelas: "9A" },
    { nisn: "3126782140", nama: "Dinda HD Nata", kelas: "9A" },
    { nisn: "0112944152", nama: "ELLIYA DIHA KARISA", kelas: "9A" },
    { nisn: "0126478938", nama: "FIRA FADTAH WATI", kelas: "9A" },
    { nisn: "0118231215", nama: "Khairun Nisa", kelas: "9A" },
    { nisn: "0118474092", nama: "Listi Amellia", kelas: "9A" },
    { nisn: "0111150257", nama: "LOVY MUGFIRAH", kelas: "9A" },
    { nisn: "3118076325", nama: "MUHAMMAD HAFIZH FIRDAUS", kelas: "9A" },
    { nisn: "3112443445", nama: "M. Rayhan", kelas: "9A" },
    { nisn: "3119172064", nama: "Marifatullah", kelas: "9A" },
    { nisn: "0126727890", nama: "Muhammad Budiansyah", kelas: "9A" },
    { nisn: "0112557891", nama: "Muhammad Firdaus", kelas: "9A" },
    { nisn: "0129852441", nama: "MUHAMMAD NUR MAULANA", kelas: "9A" },
    { nisn: "3128237260", nama: "Muhammad Rafasya Elvin", kelas: "9A" },
    { nisn: "0112949364", nama: "Muhammad Zaini", kelas: "9A" },
    { nisn: "0129598702", nama: "Nadya Lailil Ghina", kelas: "9A" },
    { nisn: "3127596070", nama: "Najwa", kelas: "9A" },
    { nisn: "3115658647", nama: "Noor Azkia Rusyida", kelas: "9A" },
    { nisn: "0111010386", nama: "NUR BIDAIYATI HIDAYAH", kelas: "9A" },
    { nisn: "0111730618", nama: "RAHMAT ISMAIL ADITYA YUSUF", kelas: "9A" },
    { nisn: "3118272341", nama: "Ridwan", kelas: "9A" },
    { nisn: "0115093819", nama: "Said Kesya Pahlevie", kelas: "9A" },
    { nisn: "3100009934", nama: "SAPARI PUTRA", kelas: "9A" },
    { nisn: "0119643352", nama: "SURYA PUTRA", kelas: "9A" },
    { nisn: "0103338260", nama: "VENCENT ADITTIYA DEVKANT", kelas: "9A" },
    { nisn: "0119042311", nama: "Yasmin Maulida Habibah", kelas: "9A" },
  ],
  "9B": [
    { nisn: "3129764636", nama: "Agil Saputra", kelas: "9B" },
    { nisn: "0105007862", nama: "Ahda Aulia", kelas: "9B" },
    { nisn: "0112441457", nama: "AHMAD NAUFAL", kelas: "9B" },
    { nisn: "0111411342", nama: "AISYAH ARRAMADHAN", kelas: "9B" },
    { nisn: "0127659251", nama: "AVIKA INDAH SALSABILLA", kelas: "9B" },
    { nisn: "0129319000", nama: "Azkia Ramadhani", kelas: "9B" },
    { nisn: "3127885082", nama: "Azkiya Najwa", kelas: "9B" },
    { nisn: "0112173852", nama: "Elya", kelas: "9B" },
    { nisn: "0111533299", nama: "Hidayatullah", kelas: "9B" },
    { nisn: "0126571006", nama: "HISYAM NIZAR", kelas: "9B" },
    { nisn: "0117399498", nama: "M. RAYHAN AR RASYID", kelas: "9B" },
    { nisn: "0125619274", nama: "MAYDA AZZAHRA", kelas: "9B" },
    { nisn: "0111608509", nama: "Muhammad Ad'dani Putra", kelas: "9B" },
    { nisn: "0128830880", nama: "MUHAMMAD DANIAL RAFA ARUMI", kelas: "9B" },
    { nisn: "0116849305", nama: "Muhammad Daniel Saputra", kelas: "9B" },
    { nisn: "3124262910", nama: "MUHAMMAD HAFI BADALI", kelas: "9B" },
    { nisn: "0095284227", nama: "MUHAMMAD JUHDIANOR", kelas: "9B" },
    { nisn: "3127692376", nama: "MUHAMMAD MALIUNI RAMADHANI", kelas: "9B" },
    { nisn: "0102703290", nama: "MUHAMMAD NABIL FUAD", kelas: "9B" },
    { nisn: "3101857417", nama: "Muhammad Rahman", kelas: "9B" },
    { nisn: "0118112220", nama: "Nasma Ramadhani", kelas: "9B" },
    { nisn: "3114951992", nama: "Nia Artiya", kelas: "9B" },
    { nisn: "3124785359", nama: "NIA RAMADHANI", kelas: "9B" },
    { nisn: "0121890658", nama: "NOOR KHAFIFAH", kelas: "9B" },
    { nisn: "0112426156", nama: "Nur Dina Nazwa", kelas: "9B" },
    { nisn: "0109377413", nama: "Putri Larasati", kelas: "9B" },
    { nisn: "3111847105", nama: "Rizky Mubarak", kelas: "9B" },
    { nisn: "0111255564", nama: "Said Pasya Pahlevie", kelas: "9B" },
    { nisn: "3115975014", nama: "Tania Anggraini", kelas: "9B" },
    { nisn: "0118095973", nama: "ZAHRA KHAFIFAH", kelas: "9B" },
    { nisn: "0125406858", nama: "Zahratussyifa", kelas: "9B" },
  ],
};

/**
 * Kata sandi siswa mengikuti pola "smp" + 4 digit terakhir NISN.
 * Beberapa akun memiliki sandi khusus yang tercatat pada data sekolah.
 */
const SANDI_KHUSUS_SISWA: Record<string, string> = {
  // Sesuai data asli sekolah: Ahda Aulia memakai sandi khusus.
  "0105007862": "ahda7862",
};

export function sandiSiswaDariNisn(nisn: string): string {
  const bersih = nisn.trim();
  return SANDI_KHUSUS_SISWA[bersih] ?? `smp${bersih.slice(-4)}`;
}

export const AKUN_SISWA_SEED: AkunSiswa[] = Object.values(DATA_SISWA_KELAS)
  .flat()
  .map((siswa) => ({
    ...siswa,
    sandi: sandiSiswaDariNisn(siswa.nisn),
  }));

/**
 * Daftar akun siswa untuk tampilan darurat (mis. saat SQLite Vercel tidak
 * dapat dibaca). Isinya sama dengan 63 siswa asli pada AKUN_SISWA_SEED.
 */
export function daftarAkunSandiSiswaFallback(): AkunSandiSiswa[] {
  return AKUN_SISWA_SEED.map((akun, indeks) => ({
    id: -(indeks + 1),
    nisn: akun.nisn,
    nama: akun.nama,
    kelas: akun.kelas,
    tanggalGantiSandi: null,
    sandiTerkini: akun.sandi,
    sumberSandi: null,
  }));
}

/** Akun demo umum yang selalu dapat digunakan untuk mencoba aplikasi. */
export const AKUN_DEMO_SISWA: AkunSiswa = {
  nisn: "siswa",
  nama: "Siswa Demo",
  kelas: "9A",
  sandi: "siswa123",
};

/** Akun siswa demo lama yang digantikan oleh data siswa kelas 9A dan 9B. */
export const USERNAME_SISWA_LAMA = [
  "0081234561",
  "0081234562",
  "0081234563",
  "0081234564",
  "0081234565",
  "0071234571",
  "0071234572",
  "0071234573",
  "0071234574",
  "0061234581",
  "0061234582",
  "0061234583",
  "0061234584",
  "0081234567",
  "0082345678",
  "0083456789",
  "0084567890",
];

export const AGENDA_AKADEMIK: AgendaAkademik[] = [
  // Semester Ganjil
  { id: 1, tanggal: "13 - 15 Juli 2026", kegiatan: "Masa Pengenalan Lingkungan Sekolah (MPLS)", kategori: "Kegiatan", semester: "Ganjil" },
  { id: 2, tanggal: "17 Agustus 2026", kegiatan: "HUT Kemerdekaan RI Ke-81", kategori: "Libur", semester: "Ganjil" },
  { id: 3, tanggal: "21 - 26 September 2026", kegiatan: "Penilaian Tengah Semester (PTS) Ganjil", kategori: "Ujian", semester: "Ganjil" },
  { id: 4, tanggal: "28 Nov - 05 Des 2026", kegiatan: "Penilaian Akhir Semester (PAS) Ganjil", kategori: "Ujian", semester: "Ganjil" },
  { id: 5, tanggal: "18 Desember 2026", kegiatan: "Pembagian Rapor Semester Ganjil", kategori: "Rapor", semester: "Ganjil" },
  { id: 6, tanggal: "21 Des 2026 - 02 Jan 2027", kegiatan: "Libur Akhir Semester Ganjil", kategori: "Libur", semester: "Ganjil" },

  // Semester Genap
  { id: 7, tanggal: "04 Januari 2027", kegiatan: "Awal Masuk Pembelajaran Semester Genap", kategori: "Kegiatan", semester: "Genap" },
  { id: 8, tanggal: "08 - 13 Maret 2027", kegiatan: "Penilaian Tengah Semester (PTS) Genap", kategori: "Ujian", semester: "Genap" },
  { id: 9, tanggal: "19 - 24 April 2027", kegiatan: "Ujian Sekolah (US) Kelas IX", kategori: "Ujian", semester: "Genap" },
  { id: 10, tanggal: "18 Juni 2027", kegiatan: "Pembagian Rapor Kenaikan Kelas", kategori: "Rapor", semester: "Genap" },
];
