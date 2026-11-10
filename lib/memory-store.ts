import type {
  CatatanAbsen,
  CatatanKejadianItem,
  MutasiSiswa,
  StatistikPengunjung,
  SuratIzinItem,
} from "./types";

/**
 * Penyimpanan sementara di memori proses.
 *
 * Vercel menjalankan SQLite pada filesystem read-only sehingga operasi
 * INSERT/UPDATE dapat gagal. Data yang gagal ditulis ke SQLite tetap
 * disimpan di sini agar respons API tetap sukses dan data masih dapat
 * dibaca selama instance serverless masih hidup.
 */
interface PenyimpananMemori {
  insiden: CatatanKejadianItem[];
  suratIzin: SuratIzinItem[];
  presensi: CatatanAbsen[];
  mutasi: MutasiSiswa[];
}

type GlobalDenganMemori = typeof globalThis & {
  __smpn1PenyimpananMemori?: PenyimpananMemori;
};

function ambilPenyimpanan(): PenyimpananMemori {
  const global = globalThis as GlobalDenganMemori;
  if (!global.__smpn1PenyimpananMemori) {
    global.__smpn1PenyimpananMemori = {
      insiden: [],
      suratIzin: [],
      presensi: [],
      mutasi: [],
    };
  }
  return global.__smpn1PenyimpananMemori;
}

function tanggalBeberapaHariLalu(jumlahHari: number): string {
  const tanggal = new Date();
  tanggal.setDate(tanggal.getDate() - jumlahHari);
  return tanggal.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Enam contoh kejadian agar statistik dashboard tidak kosong di Vercel. */
export const CONTOH_INSIDEN_SEKOLAH: CatatanKejadianItem[] = [
  {
    id: -1,
    tanggal: tanggalBeberapaHariLalu(1),
    waktu: "07.15 WITA",
    guruPiket: "Guru Piket / Pengajar",
    kategori: "Kedisiplinan",
    namaSiswaTerlibat: "Siswa Kelas 9A",
    kelasSiswa: "9A",
    deskripsi:
      "Siswa datang terlambat setelah bel masuk berbunyi dan tidak membawa surat keterangan.",
    tindakanPenanganan:
      "Dicatat dalam buku piket, diberikan pembinaan, dan diarahkan membuat surat pernyataan.",
  },
  {
    id: -2,
    tanggal: tanggalBeberapaHariLalu(2),
    waktu: "08.40 WITA",
    guruPiket: "Guru Piket / Pengajar",
    kategori: "Kesehatan / UKS",
    namaSiswaTerlibat: "Siswa Kelas 9B",
    kelasSiswa: "9B",
    deskripsi:
      "Siswa mengeluh pusing dan lemas saat kegiatan pembelajaran di kelas.",
    tindakanPenanganan:
      "Dibawa ke UKS, diberi istirahat dan air minum, lalu orang tua dihubungi.",
  },
  {
    id: -3,
    tanggal: tanggalBeberapaHariLalu(3),
    waktu: "10.05 WITA",
    guruPiket: "Guru Piket / Pengajar",
    kategori: "Fasilitas / Sarpras",
    namaSiswaTerlibat: "-",
    kelasSiswa: "-",
    deskripsi:
      "Kran air di toilet siswa bocor sehingga lantai menjadi licin.",
    tindakanPenanganan:
      "Dilaporkan ke petugas sarana prasarana dan area dipasang tanda peringatan.",
  },
  {
    id: -4,
    tanggal: tanggalBeberapaHariLalu(4),
    waktu: "07.30 WITA",
    guruPiket: "Guru Piket / Pengajar",
    kategori: "Kedisiplinan",
    namaSiswaTerlibat: "Siswa Kelas 9A",
    kelasSiswa: "9A",
    deskripsi:
      "Siswa tidak memakai atribut seragam lengkap saat apel pagi.",
    tindakanPenanganan:
      "Diberikan teguran lisan dan diingatkan melengkapi atribut pada hari berikutnya.",
  },
  {
    id: -5,
    tanggal: tanggalBeberapaHariLalu(5),
    waktu: "11.20 WITA",
    guruPiket: "Guru Piket / Pengajar",
    kategori: "Kesehatan / UKS",
    namaSiswaTerlibat: "Siswa Kelas 9B",
    kelasSiswa: "9B",
    deskripsi:
      "Siswa mengalami sakit perut saat jam pelajaran dan tidak dapat melanjutkan kegiatan.",
    tindakanPenanganan:
      "Dirawat di UKS dan orang tua diminta menjemput untuk pemeriksaan lanjutan.",
  },
  {
    id: -6,
    tanggal: tanggalBeberapaHariLalu(6),
    waktu: "13.10 WITA",
    guruPiket: "Guru Piket / Pengajar",
    kategori: "Lainnya",
    namaSiswaTerlibat: "Siswa Kelas 9A",
    kelasSiswa: "9A",
    deskripsi:
      "Siswa melaporkan kehilangan buku catatan pelajaran di lingkungan kelas.",
    tindakanPenanganan:
      "Diinformasikan kepada wali kelas dan diumumkan agar barang yang ditemukan dikembalikan.",
  },
];

export function simpanInsidenMemori(
  item: CatatanKejadianItem
): CatatanKejadianItem {
  ambilPenyimpanan().insiden.unshift(item);
  return item;
}

export function daftarInsidenMemori(): CatatanKejadianItem[] {
  return [...ambilPenyimpanan().insiden];
}

export function hapusInsidenMemori(id: number): boolean {
  const penyimpanan = ambilPenyimpanan();
  const sebelum = penyimpanan.insiden.length;
  penyimpanan.insiden = penyimpanan.insiden.filter((item) => item.id !== id);
  return penyimpanan.insiden.length < sebelum;
}

export function simpanSuratIzinMemori(item: SuratIzinItem): SuratIzinItem {
  ambilPenyimpanan().suratIzin.unshift(item);
  return item;
}

export function daftarSuratIzinMemori(nisn?: string): SuratIzinItem[] {
  const daftar = ambilPenyimpanan().suratIzin;
  return (nisn ? daftar.filter((item) => item.nisn === nisn) : daftar).map(
    (item) => ({ ...item })
  );
}

export function perbaruiSuratIzinMemori(
  id: number,
  perubahan: Partial<SuratIzinItem>
): SuratIzinItem | null {
  const penyimpanan = ambilPenyimpanan();
  const indeks = penyimpanan.suratIzin.findIndex((item) => item.id === id);
  if (indeks === -1) {
    // Izinkan verifikasi/penolakan data contoh yang tampil di dashboard.
    const contoh = CONTOH_SURAT_IZIN.find((item) => item.id === id);
    if (!contoh) return null;
    penyimpanan.suratIzin.unshift({ ...contoh, ...perubahan });
    return { ...penyimpanan.suratIzin[0] };
  }

  penyimpanan.suratIzin[indeks] = {
    ...penyimpanan.suratIzin[indeks],
    ...perubahan,
  };
  return { ...penyimpanan.suratIzin[indeks] };
}

export function simpanPresensiMemori(items: CatatanAbsen[]): CatatanAbsen[] {
  const penyimpanan = ambilPenyimpanan();

  for (const item of items) {
    const indeks = penyimpanan.presensi.findIndex(
      (lama) => lama.nisn === item.nisn && lama.tanggal === item.tanggal
    );
    if (indeks === -1) {
      penyimpanan.presensi.push({ ...item });
    } else {
      penyimpanan.presensi[indeks] = { ...item };
    }
  }

  return penyimpanan.presensi.map((item) => ({ ...item }));
}

export function daftarPresensiMemori(filter?: {
  kelas?: string;
  tanggal?: string;
}): CatatanAbsen[] {
  return ambilPenyimpanan()
    .presensi.filter(
      (item) =>
        (!filter?.kelas || item.kelas === filter.kelas) &&
        (!filter?.tanggal || item.tanggal === filter.tanggal)
    )
    .map((item) => ({ ...item }));
}

export function simpanMutasiMemori(item: MutasiSiswa): MutasiSiswa {
  ambilPenyimpanan().mutasi.unshift(item);
  return item;
}

export function daftarMutasiMemori(filter?: {
  siswaId?: number;
  jenisMutasi?: string;
}): MutasiSiswa[] {
  return ambilPenyimpanan()
    .mutasi.filter(
      (item) =>
        (filter?.siswaId === undefined || item.siswaId === filter.siswaId) &&
        (!filter?.jenisMutasi || item.jenisMutasi === filter.jenisMutasi)
    )
    .map((item) => ({ ...item }));
}

export function perbaruiMutasiMemori(
  id: number,
  perubahan: Partial<MutasiSiswa>
): MutasiSiswa | null {
  const penyimpanan = ambilPenyimpanan();
  const indeks = penyimpanan.mutasi.findIndex((item) => item.id === id);
  if (indeks === -1) {
    // Izinkan verifikasi/keputusan pada data contoh mutasi di dashboard.
    const contoh = CONTOH_MUTASI_SISWA.find((item) => item.id === id);
    if (!contoh) return null;
    penyimpanan.mutasi.unshift({ ...contoh, ...perubahan });
    return { ...penyimpanan.mutasi[0] };
  }

  penyimpanan.mutasi[indeks] = {
    ...penyimpanan.mutasi[indeks],
    ...perubahan,
  };
  return { ...penyimpanan.mutasi[indeks] };
}

/**
 * Menggabungkan data memori dengan data contoh tanpa duplikasi ID, sehingga
 * perubahan status pada data contoh tetap terlihat setelah halaman dimuat ulang.
 */
export function gabungDenganContoh<T extends { id: number }>(
  memori: T[],
  contoh: T[]
): T[] {
  const idMemori = new Set(memori.map((item) => item.id));
  return [
    ...memori,
    ...contoh
      .filter((item) => !idMemori.has(item.id))
      .map((item) => ({ ...item })),
  ];
}

const IZIN_MENUNGGU_SEED = [
  {
    nama: "Ahmad Rizky Pratama",
    nisn: "0081234561",
    kelas: "9A",
    jenis: "Sakit",
    alasan: "Sakit Demam (Surat Dokter)",
    tanggal: "09/11/2026",
    wa: "081256322500",
  },
  {
    nama: "AFIKA DEWI",
    nisn: "0119741828",
    kelas: "9A",
    jenis: "Izin",
    alasan: "Acara Keluarga Luar Kota",
    tanggal: "09/11/2026",
    wa: "081256322501",
  },
  {
    nama: "Agil Saputra",
    nisn: "3129764636",
    kelas: "9B",
    jenis: "Sakit",
    alasan: "Sakit Flu dan Batuk",
    tanggal: "09/11/2026",
    wa: "081256322502",
  },
  {
    nama: "Ahda Aulia",
    nisn: "0105007862",
    kelas: "9B",
    jenis: "Izin",
    alasan: "Izin Menjenguk Kerabat",
    tanggal: "08/11/2026",
    wa: "081256322503",
  },
] as const;

const IZIN_DISETUJUI_SEED = [
  { nama: "Aisyah Putri", nisn: "0124909669", kelas: "9A" },
  { nama: "Citra Lutfia Nur", nisn: "0127657034", kelas: "9A" },
  { nama: "M. Rayhan", nisn: "3112443445", kelas: "9A" },
  { nama: "Alya", nisn: "3110548598", kelas: "9A" },
  { nama: "Dinda HD Nata", nisn: "3126782140", kelas: "9A" },
  { nama: "Khairun Nisa", nisn: "0118231215", kelas: "9A" },
  { nama: "Nadya Lailil Ghina", nisn: "0129598702", kelas: "9A" },
  { nama: "Ridwan", nisn: "3118272341", kelas: "9A" },
  { nama: "Yasmin Maulida Habibah", nisn: "0119042311", kelas: "9A" },
  { nama: "AHMAD NAUFAL", nisn: "0112441457", kelas: "9B" },
  { nama: "AISYAH ARRAMADHAN", nisn: "0111411342", kelas: "9B" },
  { nama: "Azkia Ramadhani", nisn: "0129319000", kelas: "9B" },
  { nama: "Elya", nisn: "0112173852", kelas: "9B" },
  { nama: "Hidayatullah", nisn: "0111533299", kelas: "9B" },
  { nama: "MAYDA AZZAHRA", nisn: "0125619274", kelas: "9B" },
  { nama: "Muhammad Rahman", nisn: "3101857417", kelas: "9B" },
  { nama: "Nia Artiya", nisn: "3114951992", kelas: "9B" },
] as const;

const ALASAN_IZIN_DISETUJUI = [
  "Sakit dan telah melampirkan surat dokter",
  "Keperluan keluarga yang tidak dapat ditinggalkan",
  "Mengikuti lomba mewakili sekolah",
  "Kontrol kesehatan di puskesmas",
  "Acara keluarga di luar kota",
  "Izin pulang lebih awal karena kondisi kesehatan",
  "Mendampingi orang tua ke rumah sakit",
  "Kegiatan keagamaan bersama keluarga",
] as const;

/**
 * 21 contoh berkas surat izin: 4 menunggu + 17 disetujui. Angka ini selaras
 * dengan kartu ringkasan dashboard (4 menunggu, 17 disetujui).
 */
export const CONTOH_SURAT_IZIN: SuratIzinItem[] = [
  ...IZIN_MENUNGGU_SEED.map((item, index) => ({
    id: 9001 + index,
    kodeBerkas: `IZIN-${String(index + 1).padStart(3, "0")}`,
    nama: item.nama,
    nisn: item.nisn,
    kelas: item.kelas,
    jenis: item.jenis,
    tanggal: item.tanggal,
    alasan: item.alasan,
    status: "MENUNGGU",
    namaWali: `Orang Tua/Wali ${item.nama}`,
    noTeleponWali: item.wa,
  })),
  ...IZIN_DISETUJUI_SEED.map((item, index) => {
    const nomor = IZIN_MENUNGGU_SEED.length + index + 1;
    const tanggal = `${String((index % 7) + 1).padStart(2, "0")}/11/2026`;
    return {
      id: 9000 + nomor,
      kodeBerkas: `IZIN-${String(nomor).padStart(3, "0")}`,
      nama: item.nama,
      nisn: item.nisn,
      kelas: item.kelas,
      jenis: index % 3 === 0 ? "Sakit" : "Izin",
      tanggal,
      alasan: ALASAN_IZIN_DISETUJUI[index % ALASAN_IZIN_DISETUJUI.length],
      status: "DISETUJUI",
      namaWali: `Orang Tua/Wali ${item.nama}`,
      noTeleponWali: `0812563225${String(4 + index).padStart(2, "0")}`,
      diverifikasiOleh: "Admin TU / Petugas Sekolah",
      tanggalPersetujuan: tanggal,
    };
  }),
];

/** Dua contoh mutasi: satu masuk (Diterima) dan satu keluar (Selesai). */
export const CONTOH_MUTASI_SISWA: MutasiSiswa[] = [
  {
    id: 8001,
    siswaId: null,
    namaSiswa: "Budi Santoso",
    nisn: "0091234567",
    jenisKelamin: "Laki-laki",
    kelas: "9A",
    jenisMutasi: "MASUK",
    tanggalMutasi: "2026-11-05",
    sekolahAsalTujuan: "SMPN 2 Gambut",
    alasan: "Orang tua pindah tugas ke Kertak Hanyar",
    noSuratMutasi: "421.3/101/SMPN2-GBT/2026",
    namaWali: "Bapak Santoso",
    noTeleponWali: "081256322510",
    berkasPendukung: null,
    statusBerkas: "Diterima",
    createdAt: "2026-11-05T08:00:00.000Z",
  },
  {
    id: 8002,
    siswaId: null,
    namaSiswa: "Rina Marlina",
    nisn: "0123456780",
    jenisKelamin: "Perempuan",
    kelas: "9B",
    jenisMutasi: "KELUAR",
    tanggalMutasi: "2026-11-06",
    sekolahAsalTujuan: "SMPN 1 Martapura",
    alasan: "Mengikuti orang tua pindah domisili",
    noSuratMutasi: "421.3/102/SMPN1-KH/2026",
    namaWali: "Ibu Marlina",
    noTeleponWali: "081256322511",
    berkasPendukung: null,
    statusBerkas: "Selesai",
    createdAt: "2026-11-06T09:15:00.000Z",
  },
];

/** Rekap kunjungan mingguan contoh agar tabel statistik tidak kosong. */
export const REKAP_KUNJUNGAN_MINGGUAN: StatistikPengunjung = {
  hariIni: 128,
  total: 600,
  riwayat: [
    { tanggal: "Senin", jumlah: 128 },
    { tanggal: "Selasa", jumlah: 115 },
    { tanggal: "Rabu", jumlah: 140 },
    { tanggal: "Kamis", jumlah: 122 },
    { tanggal: "Jumat", jumlah: 95 },
  ],
};

export function rekapKunjunganFallback(): StatistikPengunjung {
  return {
    hariIni: REKAP_KUNJUNGAN_MINGGUAN.hariIni,
    total: REKAP_KUNJUNGAN_MINGGUAN.total,
    riwayat: REKAP_KUNJUNGAN_MINGGUAN.riwayat.map((item) => ({ ...item })),
  };
}
