import type {
  CatatanAbsen,
  CatatanKejadianItem,
  MutasiSiswa,
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
  if (indeks === -1) return null;

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
  if (indeks === -1) return null;

  penyimpanan.mutasi[indeks] = {
    ...penyimpanan.mutasi[indeks],
    ...perubahan,
  };
  return { ...penyimpanan.mutasi[indeks] };
}
