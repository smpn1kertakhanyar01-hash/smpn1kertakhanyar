import type { AgendaAkademik, AkunSiswa } from "./types";

export interface CatatanAbsenSeed {
  nisn: string;
  nama: string;
  kelas: string;
}

export const DATA_SISWA_KELAS: Record<string, CatatanAbsenSeed[]> = {
  "IX A": [
    { nisn: "0119741828", nama: "AFIKA DEWI", kelas: "IX A" },
    { nisn: "0123691710", nama: "AHMAD ALFARIZ", kelas: "IX A" },
    { nisn: "0124909669", nama: "Aisyah Putri", kelas: "IX A" },
    { nisn: "0122506321", nama: "AISYAH WIRDHA", kelas: "IX A" },
    { nisn: "3110548598", nama: "Alya", kelas: "IX A" },
    { nisn: "0127657034", nama: "Citra Lutfia Nur", kelas: "IX A" },
    { nisn: "3117999184", nama: "Desi", kelas: "IX A" },
    { nisn: "3126782140", nama: "Dinda HD Nata", kelas: "IX A" },
    { nisn: "0112944152", nama: "ELLIYA DIHA KARISA", kelas: "IX A" },
    { nisn: "0126478938", nama: "FIRA FADTAH WATI", kelas: "IX A" },
    { nisn: "0118231215", nama: "Khairun Nisa", kelas: "IX A" },
    { nisn: "0118474092", nama: "Listi Amellia", kelas: "IX A" },
    { nisn: "0111150257", nama: "LOVY MUGFIRAH", kelas: "IX A" },
    { nisn: "3118076325", nama: "MUHAMMAD HAFIZH FIRDAUS", kelas: "IX A" },
    { nisn: "3112443445", nama: "M. Rayhan", kelas: "IX A" },
    { nisn: "3119172064", nama: "Marifatullah", kelas: "IX A" },
    { nisn: "0126727890", nama: "Muhammad Budiansyah", kelas: "IX A" },
    { nisn: "0112557891", nama: "Muhammad Firdaus", kelas: "IX A" },
    { nisn: "0129852441", nama: "MUHAMMAD NUR MAULANA", kelas: "IX A" },
    { nisn: "3128237260", nama: "Muhammad Rafasya Elvin", kelas: "IX A" },
    { nisn: "0112949364", nama: "Muhammad Zaini", kelas: "IX A" },
    { nisn: "0129598702", nama: "Nadya Lailil Ghina", kelas: "IX A" },
    { nisn: "3127596070", nama: "Najwa", kelas: "IX A" },
    { nisn: "3115658647", nama: "Noor Azkia Rusyida", kelas: "IX A" },
    { nisn: "0111010386", nama: "NUR BIDAIYATI HIDAYAH", kelas: "IX A" },
    { nisn: "0111730618", nama: "RAHMAT ISMAIL ADITYA YUSUF", kelas: "IX A" },
    { nisn: "3118272341", nama: "Ridwan", kelas: "IX A" },
    { nisn: "0115093819", nama: "Said Kesya Pahlevie", kelas: "IX A" },
    { nisn: "3100009934", nama: "SAPARI PUTRA", kelas: "IX A" },
    { nisn: "0119643352", nama: "SURYA PUTRA", kelas: "IX A" },
    { nisn: "0103338260", nama: "VENCENT ADITTIYA DEVKANT", kelas: "IX A" },
    { nisn: "0119042311", nama: "Yasmin Maulida Habibah", kelas: "IX A" },
  ],
  "IX B": [
    { nisn: "3129764636", nama: "Agil Saputra", kelas: "IX B" },
    { nisn: "0105007862", nama: "Ahda Aulia", kelas: "IX B" },
    { nisn: "0112441457", nama: "AHMAD NAUFAL", kelas: "IX B" },
    { nisn: "0111411342", nama: "AISYAH ARRAMADHAN", kelas: "IX B" },
    { nisn: "0127659251", nama: "AVIKA INDAH SALSABILLA", kelas: "IX B" },
    { nisn: "0129319000", nama: "Azkia Ramadhani", kelas: "IX B" },
    { nisn: "3127885082", nama: "Azkiya Najwa", kelas: "IX B" },
    { nisn: "0112173852", nama: "Elya", kelas: "IX B" },
    { nisn: "0111533299", nama: "Hidayatullah", kelas: "IX B" },
    { nisn: "0126571006", nama: "HISYAM NIZAR", kelas: "IX B" },
    { nisn: "0117399498", nama: "M. RAYHAN AR RASYID", kelas: "IX B" },
    { nisn: "0125619274", nama: "MAYDA AZZAHRA", kelas: "IX B" },
    { nisn: "0111608509", nama: "Muhammad Ad'dani Putra", kelas: "IX B" },
    { nisn: "0128830880", nama: "MUHAMMAD DANIAL RAFA ARUMI", kelas: "IX B" },
    { nisn: "0116849305", nama: "Muhammad Daniel Saputra", kelas: "IX B" },
    { nisn: "3124262910", nama: "MUHAMMAD HAFI BADALI", kelas: "IX B" },
    { nisn: "0095284227", nama: "MUHAMMAD JUHDIANOR", kelas: "IX B" },
    { nisn: "3127692376", nama: "MUHAMMAD MALIUNI RAMADHANI", kelas: "IX B" },
    { nisn: "0102703290", nama: "MUHAMMAD NABIL FUAD", kelas: "IX B" },
    { nisn: "3101857417", nama: "Muhammad Rahman", kelas: "IX B" },
    { nisn: "0118112220", nama: "Nasma Ramadhani", kelas: "IX B" },
    { nisn: "3114951992", nama: "Nia Artiya", kelas: "IX B" },
    { nisn: "3124785359", nama: "NIA RAMADHANI", kelas: "IX B" },
    { nisn: "0121890658", nama: "NOOR KHAFIFAH", kelas: "IX B" },
    { nisn: "0112426156", nama: "Nur Dina Nazwa", kelas: "IX B" },
    { nisn: "0109377413", nama: "Putri Larasati", kelas: "IX B" },
    { nisn: "3111847105", nama: "Rizky Mubarak", kelas: "IX B" },
    { nisn: "0111255564", nama: "Said Pasya Pahlevie", kelas: "IX B" },
    { nisn: "3115975014", nama: "Tania Anggraini", kelas: "IX B" },
    { nisn: "0118095973", nama: "ZAHRA KHAFIFAH", kelas: "IX B" },
    { nisn: "0125406858", nama: "Zahratussyifa", kelas: "IX B" },
  ],
};

/**
 * Kata sandi siswa mengikuti pola "smp" + 4 digit terakhir NISN,
 * sehingga setiap siswa memiliki sandi yang berbeda dan unik.
 */
export const AKUN_SISWA_SEED: AkunSiswa[] = Object.values(DATA_SISWA_KELAS)
  .flat()
  .map((siswa) => ({
    ...siswa,
    sandi: `smp${siswa.nisn.slice(-4)}`,
  }));

/** Akun demo umum yang selalu dapat digunakan untuk mencoba aplikasi. */
export const AKUN_DEMO_SISWA: AkunSiswa = {
  nisn: "siswa",
  nama: "Siswa Demo",
  kelas: "IX A",
  sandi: "siswa123",
};

/** Akun siswa demo lama yang digantikan oleh data siswa IX A dan IX B. */
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
