import { getDb } from "./db";
import type {
  JenisMutasi,
  KalenderAkademik,
  KategoriKalender,
  KategoriKejadianMaster,
  LogNotifikasiWA,
  MutasiSiswa,
  MutasiSiswaPayload,
  StatusKirimWA,
} from "./types";

/* -------------------------------------------------------------------------- */
/*                             Kalender Akademik                              */
/* -------------------------------------------------------------------------- */

type InputKalenderAkademik = Omit<KalenderAkademik, "id" | "createdAt">;

const KOLOM_KALENDER = `
  id,
  judul_kegiatan AS judulKegiatan,
  deskripsi,
  tanggal_mulai AS tanggalMulai,
  tanggal_selesai AS tanggalSelesai,
  kategori,
  created_at AS createdAt
`;

export function getKalenderAkademik(filter?: {
  kategori?: KategoriKalender;
  /** Tanggal awal rentang (YYYY-MM-DD). */
  mulai?: string;
  /** Tanggal akhir rentang (YYYY-MM-DD). */
  selesai?: string;
}): KalenderAkademik[] {
  let sql = `SELECT ${KOLOM_KALENDER} FROM kalender_akademik WHERE 1 = 1`;
  const params: string[] = [];

  if (filter?.kategori) {
    sql += " AND kategori = ?";
    params.push(filter.kategori);
  }

  // Kegiatan yang beririsan dengan rentang tanggal yang diminta.
  if (filter?.mulai) {
    sql += " AND tanggal_selesai >= ?";
    params.push(filter.mulai);
  }

  if (filter?.selesai) {
    sql += " AND tanggal_mulai <= ?";
    params.push(filter.selesai);
  }

  sql += " ORDER BY tanggal_mulai ASC, id ASC";
  return getDb().prepare(sql).all(...params) as KalenderAkademik[];
}

export function getKalenderAkademikById(
  id: number
): KalenderAkademik | null {
  const row = getDb()
    .prepare(`SELECT ${KOLOM_KALENDER} FROM kalender_akademik WHERE id = ?`)
    .get(id) as KalenderAkademik | undefined;

  return row ?? null;
}

export function createKalenderAkademik(
  input: InputKalenderAkademik
): KalenderAkademik {
  const hasil = getDb()
    .prepare(
      `INSERT INTO kalender_akademik
         (judul_kegiatan, deskripsi, tanggal_mulai, tanggal_selesai, kategori)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      input.judulKegiatan,
      input.deskripsi ?? null,
      input.tanggalMulai,
      input.tanggalSelesai,
      input.kategori
    );

  const tersimpan = getKalenderAkademikById(Number(hasil.lastInsertRowid));
  if (!tersimpan) {
    throw new Error("Gagal menyimpan kegiatan kalender akademik.");
  }
  return tersimpan;
}

export function updateKalenderAkademik(
  id: number,
  input: Partial<InputKalenderAkademik>
): KalenderAkademik | null {
  const petaKolom: Record<keyof InputKalenderAkademik, string> = {
    judulKegiatan: "judul_kegiatan",
    deskripsi: "deskripsi",
    tanggalMulai: "tanggal_mulai",
    tanggalSelesai: "tanggal_selesai",
    kategori: "kategori",
  };

  const set: string[] = [];
  const params: (string | null)[] = [];

  for (const [kunci, kolom] of Object.entries(petaKolom) as [
    keyof InputKalenderAkademik,
    string,
  ][]) {
    if (input[kunci] === undefined) continue;
    set.push(`${kolom} = ?`);
    params.push(input[kunci] ?? null);
  }

  if (set.length === 0) return getKalenderAkademikById(id);

  getDb()
    .prepare(`UPDATE kalender_akademik SET ${set.join(", ")} WHERE id = ?`)
    .run(...params, id);

  return getKalenderAkademikById(id);
}

export function deleteKalenderAkademik(id: number): boolean {
  return (
    getDb().prepare("DELETE FROM kalender_akademik WHERE id = ?").run(id)
      .changes > 0
  );
}

/* -------------------------------------------------------------------------- */
/*                         Log Notifikasi WhatsApp                            */
/* -------------------------------------------------------------------------- */

export interface InputLogNotifikasiWA {
  nomorTujuan: string;
  pesan: string;
  statusKirim: StatusKirimWA;
  responFonnte?: unknown;
}

function serialisasiResponFonnte(respon: unknown): string | null {
  if (respon === undefined || respon === null) return null;
  if (typeof respon === "string") return respon;
  try {
    return JSON.stringify(respon);
  } catch {
    return String(respon);
  }
}

export function getLogNotifikasiWA(filter?: {
  statusKirim?: StatusKirimWA;
  nomorTujuan?: string;
  limit?: number;
}): LogNotifikasiWA[] {
  let sql = `
    SELECT
      id,
      nomor_tujuan AS nomorTujuan,
      pesan,
      status_kirim AS statusKirim,
      respon_fonnte AS responFonnte,
      created_at AS createdAt
    FROM log_notifikasi_wa
    WHERE 1 = 1
  `;
  const params: (string | number)[] = [];

  if (filter?.statusKirim) {
    sql += " AND status_kirim = ?";
    params.push(filter.statusKirim);
  }

  if (filter?.nomorTujuan) {
    sql += " AND nomor_tujuan = ?";
    params.push(filter.nomorTujuan);
  }

  const batas = Math.min(Math.max(filter?.limit ?? 100, 1), 500);
  sql += " ORDER BY id DESC LIMIT ?";
  params.push(batas);

  return getDb().prepare(sql).all(...params) as LogNotifikasiWA[];
}

export function createLogNotifikasiWA(
  input: InputLogNotifikasiWA
): LogNotifikasiWA {
  const db = getDb();
  const hasil = db
    .prepare(
      `INSERT INTO log_notifikasi_wa
         (nomor_tujuan, pesan, status_kirim, respon_fonnte)
       VALUES (?, ?, ?, ?)`
    )
    .run(
      input.nomorTujuan,
      input.pesan,
      input.statusKirim,
      serialisasiResponFonnte(input.responFonnte)
    );

  const row = db
    .prepare(
      `SELECT
         id,
         nomor_tujuan AS nomorTujuan,
         pesan,
         status_kirim AS statusKirim,
         respon_fonnte AS responFonnte,
         created_at AS createdAt
       FROM log_notifikasi_wa
       WHERE id = ?`
    )
    .get(Number(hasil.lastInsertRowid)) as LogNotifikasiWA | undefined;

  if (!row) {
    throw new Error("Gagal menyimpan log notifikasi WhatsApp.");
  }
  return row;
}

/**
 * Mencatat log WA tanpa mengganggu proses utama pengiriman.
 * Kegagalan menulis log hanya ditulis ke console.
 */
export function catatLogNotifikasiWA(input: InputLogNotifikasiWA): void {
  try {
    createLogNotifikasiWA(input);
  } catch (error) {
    console.error("Gagal mencatat log notifikasi WhatsApp:", error);
  }
}

/* -------------------------------------------------------------------------- */
/*                            Kategori Kejadian                               */
/* -------------------------------------------------------------------------- */

type InputKategoriKejadian = Omit<KategoriKejadianMaster, "id" | "createdAt">;

const KOLOM_KATEGORI = `
  id,
  nama_kategori AS namaKategori,
  poin,
  created_at AS createdAt
`;

export function getKategoriKejadian(): KategoriKejadianMaster[] {
  return getDb()
    .prepare(
      `SELECT ${KOLOM_KATEGORI} FROM kategori_kejadian
       ORDER BY nama_kategori ASC`
    )
    .all() as KategoriKejadianMaster[];
}

export function getKategoriKejadianById(
  id: number
): KategoriKejadianMaster | null {
  const row = getDb()
    .prepare(`SELECT ${KOLOM_KATEGORI} FROM kategori_kejadian WHERE id = ?`)
    .get(id) as KategoriKejadianMaster | undefined;

  return row ?? null;
}

export function createKategoriKejadian(
  input: InputKategoriKejadian
): KategoriKejadianMaster {
  const hasil = getDb()
    .prepare(
      `INSERT INTO kategori_kejadian (nama_kategori, poin) VALUES (?, ?)`
    )
    .run(input.namaKategori.trim(), input.poin);

  const tersimpan = getKategoriKejadianById(Number(hasil.lastInsertRowid));
  if (!tersimpan) {
    throw new Error("Gagal menyimpan kategori kejadian.");
  }
  return tersimpan;
}

export function updateKategoriKejadian(
  id: number,
  input: Partial<InputKategoriKejadian>
): KategoriKejadianMaster | null {
  const set: string[] = [];
  const params: (string | number)[] = [];

  if (input.namaKategori !== undefined) {
    set.push("nama_kategori = ?");
    params.push(input.namaKategori.trim());
  }

  if (input.poin !== undefined) {
    set.push("poin = ?");
    params.push(input.poin);
  }

  if (set.length === 0) return getKategoriKejadianById(id);

  getDb()
    .prepare(`UPDATE kategori_kejadian SET ${set.join(", ")} WHERE id = ?`)
    .run(...params, id);

  return getKategoriKejadianById(id);
}

export function deleteKategoriKejadian(id: number): boolean {
  return (
    getDb().prepare("DELETE FROM kategori_kejadian WHERE id = ?").run(id)
      .changes > 0
  );
}

/* -------------------------------------------------------------------------- */
/*                               Mutasi Siswa                                 */
/* -------------------------------------------------------------------------- */

type InputMutasiSiswa = MutasiSiswaPayload;

const KOLOM_MUTASI_SISWA = `
  id,
  siswa_id AS siswaId,
  nama_siswa AS namaSiswa,
  nisn,
  jenis_kelamin AS jenisKelamin,
  kelas,
  jenis_mutasi AS jenisMutasi,
  tanggal_mutasi AS tanggalMutasi,
  sekolah_asal_tujuan AS sekolahAsalTujuan,
  alasan,
  no_surat_mutasi AS noSuratMutasi,
  nama_wali AS namaWali,
  no_telepon_wali AS noTeleponWali,
  berkas_pendukung AS berkasPendukung,
  status_berkas AS statusBerkas,
  created_at AS createdAt
`;

/** Memastikan ID yang dipakai benar-benar akun siswa (bukan guru). */
export function siswaTerdaftar(siswaId: number): boolean {
  const row = getDb()
    .prepare("SELECT id FROM users WHERE id = ? AND role = 'siswa'")
    .get(siswaId);

  return Boolean(row);
}

export interface ProfilSiswaRingkas {
  id: number;
  nama: string;
  nisn: string | null;
  kelas: string | null;
}

export function getSiswaProfileById(
  siswaId: number
): ProfilSiswaRingkas | null {
  const row = getDb()
    .prepare(
      `SELECT id, nama, nisn, kelas
       FROM users
       WHERE id = ? AND role = 'siswa'`
    )
    .get(siswaId) as ProfilSiswaRingkas | undefined;

  return row ?? null;
}

/** Mencari akun siswa berdasarkan NISN/username untuk ditautkan ke mutasi. */
export function cariSiswaIdByNisn(nisn: string): number | null {
  const bersih = nisn.trim();
  if (!bersih) return null;

  const row = getDb()
    .prepare(
      `SELECT id FROM users
       WHERE role = 'siswa'
         AND (nisn = ? COLLATE NOCASE OR username = ? COLLATE NOCASE)
       LIMIT 1`
    )
    .get(bersih, bersih) as { id: number } | undefined;

  return row?.id ?? null;
}

export function getMutasiSiswa(filter?: {
  siswaId?: number;
  jenisMutasi?: JenisMutasi;
}): MutasiSiswa[] {
  let sql = `SELECT ${KOLOM_MUTASI_SISWA} FROM mutasi_siswa WHERE 1 = 1`;
  const params: (string | number)[] = [];

  if (filter?.siswaId !== undefined) {
    sql += " AND siswa_id = ?";
    params.push(filter.siswaId);
  }

  if (filter?.jenisMutasi) {
    sql += " AND jenis_mutasi = ?";
    params.push(filter.jenisMutasi);
  }

  sql += " ORDER BY tanggal_mutasi DESC, id DESC";
  return getDb().prepare(sql).all(...params) as MutasiSiswa[];
}

export function getMutasiSiswaById(id: number): MutasiSiswa | null {
  const row = getDb()
    .prepare(`SELECT ${KOLOM_MUTASI_SISWA} FROM mutasi_siswa WHERE id = ?`)
    .get(id) as MutasiSiswa | undefined;

  return row ?? null;
}

export function createMutasiSiswa(input: InputMutasiSiswa): MutasiSiswa {
  const hasil = getDb()
    .prepare(
      `INSERT INTO mutasi_siswa
         (siswa_id, nama_siswa, nisn, jenis_kelamin, kelas, jenis_mutasi,
          tanggal_mutasi, sekolah_asal_tujuan, alasan, no_surat_mutasi,
          nama_wali, no_telepon_wali, berkas_pendukung, status_berkas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.siswaId ?? null,
      input.namaSiswa?.trim() || null,
      input.nisn?.trim() || null,
      input.jenisKelamin?.trim() || null,
      input.kelas?.trim() || null,
      input.jenisMutasi,
      input.tanggalMutasi,
      input.sekolahAsalTujuan,
      input.alasan,
      input.noSuratMutasi?.trim() || null,
      input.namaWali?.trim() || null,
      input.noTeleponWali?.trim() || null,
      input.berkasPendukung || null,
      input.statusBerkas?.trim() || "Menunggu Verifikasi"
    );

  const tersimpan = getMutasiSiswaById(Number(hasil.lastInsertRowid));
  if (!tersimpan) {
    throw new Error("Gagal menyimpan data mutasi siswa.");
  }
  return tersimpan;
}

export function updateMutasiSiswa(
  id: number,
  input: Partial<InputMutasiSiswa>
): MutasiSiswa | null {
  const petaKolom: Record<keyof InputMutasiSiswa, string> = {
    siswaId: "siswa_id",
    namaSiswa: "nama_siswa",
    nisn: "nisn",
    jenisKelamin: "jenis_kelamin",
    kelas: "kelas",
    jenisMutasi: "jenis_mutasi",
    tanggalMutasi: "tanggal_mutasi",
    sekolahAsalTujuan: "sekolah_asal_tujuan",
    alasan: "alasan",
    noSuratMutasi: "no_surat_mutasi",
    namaWali: "nama_wali",
    noTeleponWali: "no_telepon_wali",
    berkasPendukung: "berkas_pendukung",
    statusBerkas: "status_berkas",
  };

  const set: string[] = [];
  const params: (string | number | null)[] = [];

  for (const [kunci, kolom] of Object.entries(petaKolom) as [
    keyof InputMutasiSiswa,
    string,
  ][]) {
    if (input[kunci] === undefined) continue;
    set.push(`${kolom} = ?`);
    params.push(input[kunci] ?? null);
  }

  if (set.length === 0) return getMutasiSiswaById(id);

  getDb()
    .prepare(`UPDATE mutasi_siswa SET ${set.join(", ")} WHERE id = ?`)
    .run(...params, id);

  return getMutasiSiswaById(id);
}

export function deleteMutasiSiswa(id: number): boolean {
  return (
    getDb().prepare("DELETE FROM mutasi_siswa WHERE id = ?").run(id).changes > 0
  );
}
