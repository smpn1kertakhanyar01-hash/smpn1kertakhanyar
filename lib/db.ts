import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import {
  AKUN_ADMIN_TU,
  AKUN_ADMIN_TU_ALTERNATIF,
  AKUN_GURU_DEMO,
  KATEGORI_PENGAMBILAN_IJAZAH,
  PERAN_LOGIN_PEGAWAI,
  PERAN_PEGAWAI,
  STATUS_PRESENSI,
  SYARAT_IJAZAH_DEFAULT,
} from "./constants";
import {
  AGENDA_AKADEMIK,
  AKUN_DEMO_SISWA,
  AKUN_SISWA_SEED,
  USERNAME_SISWA_LAMA,
} from "./data";
import {
  apakahTokenSesiFallback,
  bacaTokenSesiFallback,
} from "./fallback-auth";
import type {
  AgendaAkademik,
  AkunSandiSiswa,
  CatatanAbsen,
  CatatanKejadianItem,
  KategoriKejadian,
  LoginPayload,
  MutasiItem,
  Pengguna,
  PeranPegawai,
  PeranPengguna,
  RegisterPayload,
  SesiPengguna,
  Siswa,
  StatusPresensi,
  SuratIzinItem,
} from "./types";
import {
  ambilTanggalHariIni,
  ambilTanggalPanjang,
  ambilWaktuSekarang,
} from "./utils";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (
    role IN ('guru', 'siswa', 'GURU_PIKET', 'WALI_KELAS', 'ADMIN_TU')
  ),
  nama TEXT NOT NULL,
  nisn TEXT,
  kelas TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS students (
  nisn TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  kelas TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_students_kelas ON students (kelas);

CREATE TABLE IF NOT EXISTS agenda (
  id INTEGER PRIMARY KEY,
  tanggal TEXT NOT NULL,
  kegiatan TEXT NOT NULL,
  kategori TEXT NOT NULL,
  semester TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nisn TEXT NOT NULL,
  nama TEXT NOT NULL,
  kelas TEXT NOT NULL,
  tanggal TEXT NOT NULL,
  status TEXT NOT NULL,
  jam_input TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (nisn, tanggal)
);
CREATE INDEX IF NOT EXISTS idx_attendance_tanggal ON attendance (tanggal);
CREATE INDEX IF NOT EXISTS idx_attendance_kelas ON attendance (kelas);

CREATE TABLE IF NOT EXISTS leave_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama TEXT NOT NULL,
  nisn TEXT NOT NULL,
  kelas TEXT NOT NULL,
  jenis TEXT NOT NULL,
  tanggal TEXT NOT NULL,
  alasan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Menunggu Persetujuan',
  foto_bukti TEXT,
  nama_wali TEXT,
  no_telepon_wali TEXT,
  tanda_tangan_wali TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_leave_requests_nisn ON leave_requests (nisn);

CREATE TABLE IF NOT EXISTS pengambilan_ijazah (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama_siswa TEXT NOT NULL,
  nisn TEXT,
  kelas TEXT,
  tahun_lulus TEXT,
  status TEXT NOT NULL DEFAULT 'Belum Diambil'
    CHECK (status IN ('Belum Diambil', 'Diambil')),
  tanggal_ambil TEXT,
  diambil_oleh TEXT,
  petugas TEXT,
  catatan TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pengambilan_ijazah_status
  ON pengambilan_ijazah (status);

CREATE TABLE IF NOT EXISTS pengaturan_layanan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kategori TEXT NOT NULL UNIQUE,
  isi_persyaratan TEXT NOT NULL,
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS incidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tanggal TEXT NOT NULL,
  waktu TEXT NOT NULL,
  guru_piket TEXT NOT NULL,
  kategori TEXT NOT NULL,
  nama_siswa_terlibat TEXT,
  kelas_siswa TEXT,
  deskripsi TEXT NOT NULL,
  tindakan_penanganan TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mutations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama TEXT NOT NULL,
  nisn TEXT NOT NULL,
  jenis_kelamin TEXT NOT NULL,
  sekolah_asal TEXT NOT NULL,
  kelas_tujuan TEXT NOT NULL,
  alasan_pindah TEXT NOT NULL,
  nama_wali TEXT NOT NULL,
  no_telepon_wali TEXT NOT NULL,
  surat_pindah TEXT,
  tanggal_pengajuan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Menunggu Verifikasi',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS visitors (
  tanggal TEXT PRIMARY KEY,
  jumlah INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('guru', 'siswa')),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions (user_id);

CREATE TABLE IF NOT EXISTS riwayat_sandi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  siswa_id INTEGER NOT NULL,
  nisn TEXT NOT NULL,
  nama_siswa TEXT NOT NULL,
  tanggal_ganti TEXT NOT NULL,
  sandi_tercatat TEXT NOT NULL,
  sumber TEXT NOT NULL DEFAULT 'siswa' CHECK (sumber IN ('siswa', 'guru')),
  FOREIGN KEY (siswa_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_riwayat_sandi_siswa ON riwayat_sandi (siswa_id);

CREATE TABLE IF NOT EXISTS kalender_akademik (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  judul_kegiatan TEXT NOT NULL,
  deskripsi TEXT,
  tanggal_mulai TEXT NOT NULL,
  tanggal_selesai TEXT NOT NULL,
  kategori TEXT NOT NULL DEFAULT 'Kegiatan'
    CHECK (kategori IN ('Ujian', 'Libur', 'Kegiatan')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (tanggal_selesai >= tanggal_mulai)
);
CREATE INDEX IF NOT EXISTS idx_kalender_akademik_tanggal
  ON kalender_akademik (tanggal_mulai, tanggal_selesai);
CREATE INDEX IF NOT EXISTS idx_kalender_akademik_kategori
  ON kalender_akademik (kategori);

CREATE TABLE IF NOT EXISTS log_notifikasi_wa (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nomor_tujuan TEXT NOT NULL,
  pesan TEXT NOT NULL,
  status_kirim TEXT NOT NULL
    CHECK (status_kirim IN ('BERHASIL', 'GAGAL')),
  respon_fonnte TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_log_notifikasi_wa_nomor
  ON log_notifikasi_wa (nomor_tujuan);
CREATE INDEX IF NOT EXISTS idx_log_notifikasi_wa_status
  ON log_notifikasi_wa (status_kirim);
CREATE INDEX IF NOT EXISTS idx_log_notifikasi_wa_created
  ON log_notifikasi_wa (created_at);

CREATE TABLE IF NOT EXISTS kategori_kejadian (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama_kategori TEXT NOT NULL UNIQUE,
  poin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mutasi_siswa (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  siswa_id INTEGER,
  nama_siswa TEXT,
  nisn TEXT,
  jenis_kelamin TEXT,
  kelas TEXT,
  jenis_mutasi TEXT NOT NULL
    CHECK (jenis_mutasi IN ('MASUK', 'KELUAR')),
  tanggal_mutasi TEXT NOT NULL,
  sekolah_asal_tujuan TEXT NOT NULL,
  alasan TEXT NOT NULL,
  no_surat_mutasi TEXT,
  nama_wali TEXT,
  no_telepon_wali TEXT,
  berkas_pendukung TEXT,
  status_berkas TEXT NOT NULL DEFAULT 'Menunggu Verifikasi',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (siswa_id) REFERENCES users(id) ON DELETE SET NULL
);
`;

interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  role: string;
  nama: string;
  nisn: string | null;
  kelas: string | null;
}

interface LeaveRequestRow {
  id: number;
  nama: string;
  nisn: string;
  kelas: string;
  jenis: string;
  tanggal: string;
  alasan: string;
  status: string;
  fotoBukti: string | null;
  namaWali: string | null;
  noTeleponWali: string | null;
  tandaTanganWali: string | null;
  diverifikasiOleh: string | null;
  disetujuiOleh: string | null;
  tanggalPersetujuan: string | null;
  catatanPenolakan: string | null;
}

interface IncidentRow {
  id: number;
  tanggal: string;
  waktu: string;
  guruPiket: string;
  kategori: KategoriKejadian;
  namaSiswaTerlibat: string | null;
  kelasSiswa: string | null;
  deskripsi: string;
  tindakanPenanganan: string;
}

interface MutationRow {
  id: number;
  nama: string;
  nisn: string;
  jenisKelamin: string;
  sekolahAsal: string;
  kelasTujuan: string;
  alasanPindah: string;
  namaWali: string;
  noTeleponWali: string;
  suratPindah: string | null;
  tanggalPengajuan: string;
  status: string;
}

interface AkunSandiRow {
  id: number;
  username: string;
  nisn: string;
  nama: string;
  kelas: string;
  tanggalGantiSandi: string | null;
  sandiTercatat: string | null;
  sumberSandi: "siswa" | "guru" | null;
}

interface SessionUserRow {
  userId: number;
  role: "guru" | "siswa";
  staffRole: string;
  username: string;
  nama: string;
  nisn: string | null;
  kelas: string | null;
}

function normalisasiPeranPegawai(role: string): PeranPegawai {
  return (PERAN_PEGAWAI as readonly string[]).includes(role)
    ? (role as PeranPegawai)
    : "GURU_PIKET";
}

/**
 * Portal pegawai memakai `role: "guru"` pada payload login, tetapi akun staf
 * dapat tersimpan dengan role database `GURU_PIKET`, `WALI_KELAS`, atau
 * `ADMIN_TU`. Semua peran tersebut harus diizinkan masuk lewat portal yang sama.
 */
function daftarPeranLogin(role: PeranPengguna): readonly string[] {
  return role === "guru" ? PERAN_LOGIN_PEGAWAI : ["siswa"];
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  const hasil = crypto.scryptSync(password, salt, 64);
  const tersimpan = Buffer.from(hash, "hex");
  return (
    hasil.length === tersimpan.length &&
    crypto.timingSafeEqual(hasil, tersimpan)
  );
}

const KUNCI_BACKUP_SANDI = crypto
  .createHash("sha256")
  .update(
    process.env.PASSWORD_BACKUP_KEY ||
      "smpn1-kertak-hanyar-backup-sandi-siswa-v1"
  )
  .digest();

/**
 * Sandi default mengikuti pola data siswa: smp + 4 digit terakhir NISN.
 * Username non-NISN (mis. akun demo "siswa") memakai sandi demo bawaan.
 */
export function sandiDefaultSiswa(identifier: string): string {
  const bersih = identifier.trim();
  return /^\d{10}$/.test(bersih)
    ? `smp${bersih.slice(-4)}`
    : AKUN_DEMO_SISWA.sandi;
}

function enkripsiSandiBackup(sandi: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KUNCI_BACKUP_SANDI, iv);
  const terenkripsi = Buffer.concat([
    cipher.update(sandi, "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    terenkripsi.toString("base64"),
  ].join(":");
}

function dekripsiSandiBackup(tercatat: string): string | null {
  try {
    const [versi, ivBase64, tagBase64, dataBase64] = tercatat.split(":");
    if (versi !== "v1" || !ivBase64 || !tagBase64 || !dataBase64) return null;

    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      KUNCI_BACKUP_SANDI,
      Buffer.from(ivBase64, "base64")
    );
    decipher.setAuthTag(Buffer.from(tagBase64, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataBase64, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

const VERSI_SINKRON_AKUN_SISWA = 2;

function pastikanAkunGuru(db: Database.Database): void {
  const cekAkun = db.prepare(
    "SELECT id FROM users WHERE username = ? COLLATE NOCASE"
  );
  const simpanAkun = db.prepare(
    `INSERT INTO users (username, password_hash, role, nama)
     VALUES (?, ?, ?, ?)`
  );

  for (const username of AKUN_GURU_DEMO.users) {
    if (cekAkun.get(username)) continue;
    simpanAkun.run(
      username,
      hashPassword(AKUN_GURU_DEMO.password),
      AKUN_GURU_DEMO.role,
      AKUN_GURU_DEMO.nama
    );
  }
}

/**
 * Akun bawaan staf Tata Usaha. Akun utama (`petugas.smpn1kh`) dan akun
 * alternatif (`admintu`) dipastikan selalu ada. Kata sandi akun yang sudah
 * ada tidak ditimpa agar perubahan sandi dari dashboard TU tetap berlaku.
 */
function pastikanAkunAdminTu(db: Database.Database): void {
  const cariAkun = db.prepare(
    "SELECT id FROM users WHERE username = ? COLLATE NOCASE"
  );
  const perbaruiProfil = db.prepare(
    "UPDATE users SET role = ?, nama = ? WHERE id = ?"
  );
  const simpanAkun = db.prepare(
    `INSERT INTO users (username, password_hash, role, nama)
     VALUES (?, ?, ?, ?)`
  );

  for (const akun of [AKUN_ADMIN_TU, AKUN_ADMIN_TU_ALTERNATIF]) {
    const akunAda = cariAkun.get(akun.username) as { id: number } | undefined;

    if (akunAda) {
      // Jaga peran dan nama tetap sesuai tanpa menimpa kata sandi yang sudah diganti.
      perbaruiProfil.run(akun.role, akun.nama, akunAda.id);
      continue;
    }

    simpanAkun.run(
      akun.username,
      hashPassword(akun.password),
      akun.role,
      akun.nama
    );
  }
}

function pastikanAkunDemoSiswa(db: Database.Database): void {
  const akun = db
    .prepare(
      `SELECT id, password_hash
       FROM users
       WHERE username = ? COLLATE NOCASE`
    )
    .get(AKUN_DEMO_SISWA.nisn) as
    | { id: number; password_hash: string }
    | undefined;

  if (!akun) {
    db.prepare(
      `INSERT INTO users (username, password_hash, role, nama, nisn, kelas)
       VALUES (?, ?, 'siswa', ?, ?, ?)`
    ).run(
      AKUN_DEMO_SISWA.nisn,
      hashPassword(AKUN_DEMO_SISWA.sandi),
      AKUN_DEMO_SISWA.nama,
      "0081234567",
      AKUN_DEMO_SISWA.kelas
    );
    return;
  }

  const sandiCocok = verifyPassword(AKUN_DEMO_SISWA.sandi, akun.password_hash);
  if (sandiCocok) {
    db.prepare(
      `UPDATE users SET nama = ?, nisn = ?, kelas = ? WHERE id = ?`
    ).run(AKUN_DEMO_SISWA.nama, "0081234567", AKUN_DEMO_SISWA.kelas, akun.id);
  } else {
    db.prepare(
      `UPDATE users
       SET password_hash = ?, nama = ?, nisn = ?, kelas = ?
       WHERE id = ?`
    ).run(
      hashPassword(AKUN_DEMO_SISWA.sandi),
      AKUN_DEMO_SISWA.nama,
      "0081234567",
      AKUN_DEMO_SISWA.kelas,
      akun.id
    );
  }
}

/**
 * Menyelaraskan data siswa dan akun login dengan daftar siswa terbaru.
 * Dijalankan sekali per versi data agar kata sandi unik hanya di-hash
 * ketika akun baru dibuat atau sandinya berubah.
 */
function sinkronkanAkunSiswa(db: Database.Database): void {
  const versi = db.pragma("user_version", { simple: true }) as number;
  if (versi >= VERSI_SINKRON_AKUN_SISWA) return;

  const nisnBaru = new Set(AKUN_SISWA_SEED.map((akun) => akun.nisn));

  const simpanSiswa = db.prepare(
    `INSERT INTO students (nisn, nama, kelas)
     VALUES (?, ?, ?)
     ON CONFLICT(nisn) DO UPDATE SET
       nama = excluded.nama,
       kelas = excluded.kelas`
  );
  const cariAkun = db.prepare(
    `SELECT id, password_hash
     FROM users
     WHERE username = ? COLLATE NOCASE AND role = 'siswa'`
  );
  const tambahAkun = db.prepare(
    `INSERT INTO users (username, password_hash, role, nama, nisn, kelas)
     VALUES (?, ?, 'siswa', ?, ?, ?)`
  );
  const perbaruiAkun = db.prepare(
    `UPDATE users
     SET password_hash = ?, nama = ?, nisn = ?, kelas = ?
     WHERE id = ?`
  );
  const perbaruiProfil = db.prepare(
    `UPDATE users SET nama = ?, nisn = ?, kelas = ? WHERE id = ?`
  );
  const hapusAkun = db.prepare("DELETE FROM users WHERE username = ?");
  const hapusSiswa = db.prepare("DELETE FROM students WHERE nisn = ?");

  const tx = db.transaction(() => {
    // Hapus akun dan data siswa demo lama yang sudah tidak dipakai.
    for (const username of USERNAME_SISWA_LAMA) {
      if (nisnBaru.has(username)) continue;
      hapusAkun.run(username);
      hapusSiswa.run(username);
    }

    for (const akun of AKUN_SISWA_SEED) {
      simpanSiswa.run(akun.nisn, akun.nama, akun.kelas);

      const user = cariAkun.get(akun.nisn) as
        | { id: number; password_hash: string }
        | undefined;

      if (!user) {
        tambahAkun.run(
          akun.nisn,
          hashPassword(akun.sandi),
          akun.nama,
          akun.nisn,
          akun.kelas
        );
        continue;
      }

      if (verifyPassword(akun.sandi, user.password_hash)) {
        perbaruiProfil.run(akun.nama, akun.nisn, akun.kelas, user.id);
      } else {
        perbaruiAkun.run(
          hashPassword(akun.sandi),
          akun.nama,
          akun.nisn,
          akun.kelas,
          user.id
        );
      }
    }

    db.pragma(`user_version = ${VERSI_SINKRON_AKUN_SISWA}`);
  });
  tx();
}

function seedDatabase(db: Database.Database): void {
  pastikanAkunGuru(db);
  pastikanAkunAdminTu(db);
  pastikanAkunDemoSiswa(db);
  sinkronkanAkunSiswa(db);

  const jumlahAgenda = db
    .prepare("SELECT COUNT(*) AS jumlah FROM agenda")
    .get() as { jumlah: number };

  if (jumlahAgenda.jumlah === 0) {
    const simpanAgenda = db.prepare(
      "INSERT OR IGNORE INTO agenda (id, tanggal, kegiatan, kategori, semester) VALUES (?, ?, ?, ?, ?)"
    );
    const tx = db.transaction(() => {
      for (const agenda of AGENDA_AKADEMIK) {
        simpanAgenda.run(
          agenda.id,
          agenda.tanggal,
          agenda.kegiatan,
          agenda.kategori,
          agenda.semester
        );
      }
    });
    tx();
  }

  const jumlahKategori = db
    .prepare("SELECT COUNT(*) AS jumlah FROM kategori_kejadian")
    .get() as { jumlah: number };

  if (jumlahKategori.jumlah === 0) {
    const simpanKategori = db.prepare(
      `INSERT OR IGNORE INTO kategori_kejadian (nama_kategori, poin)
       VALUES (?, ?)`
    );
    const txKategori = db.transaction(() => {
      simpanKategori.run("Disiplin", 10);
      simpanKategori.run("Prestasi", 20);
      simpanKategori.run("Kerapian", 5);
    });
    txKategori();
  }

  // Pengaturan layanan awal. INSERT OR IGNORE memastikan teks yang sudah
  // diedit Admin TU tidak tertimpa saat server dijalankan ulang.
  db.prepare(
    `INSERT OR IGNORE INTO pengaturan_layanan
       (kategori, isi_persyaratan, updated_by, updated_at)
     VALUES (?, ?, 'Sistem', datetime('now'))`
  ).run(KATEGORI_PENGAMBILAN_IJAZAH, SYARAT_IJAZAH_DEFAULT);
}

/**
 * Menyesuaikan tabel mutasi_siswa lama agar mendukung permohonan mutasi
 * masuk tanpa akun siswa (siswa_id opsional) sekaligus menyimpan identitas
 * pemohon dan data kontak wali.
 */
function migrasikanMutasiSiswa(db: Database.Database): void {
  const kolom = db
    .prepare("PRAGMA table_info(mutasi_siswa)")
    .all() as { name: string; notnull: number }[];

  if (kolom.length === 0) return;

  const punyaIdentitas = kolom.some((item) => item.name === "nama_siswa");
  const siswaIdNullable =
    kolom.find((item) => item.name === "siswa_id")?.notnull === 0;

  if (!punyaIdentitas || !siswaIdNullable) {
    const migrasi = db.transaction(() => {
      db.exec(`
        CREATE TABLE mutasi_siswa_baru (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          siswa_id INTEGER,
          nama_siswa TEXT,
          nisn TEXT,
          jenis_kelamin TEXT,
          kelas TEXT,
          jenis_mutasi TEXT NOT NULL
            CHECK (jenis_mutasi IN ('MASUK', 'KELUAR')),
          tanggal_mutasi TEXT NOT NULL,
          sekolah_asal_tujuan TEXT NOT NULL,
          alasan TEXT NOT NULL,
          no_surat_mutasi TEXT,
          nama_wali TEXT,
          no_telepon_wali TEXT,
          berkas_pendukung TEXT,
          status_berkas TEXT NOT NULL DEFAULT 'Menunggu Verifikasi',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (siswa_id) REFERENCES users(id) ON DELETE SET NULL
        );

        INSERT INTO mutasi_siswa_baru
          (id, siswa_id, nama_siswa, nisn, jenis_kelamin, kelas, jenis_mutasi,
           tanggal_mutasi, sekolah_asal_tujuan, alasan, no_surat_mutasi,
           nama_wali, no_telepon_wali, berkas_pendukung, status_berkas, created_at)
        SELECT
           id, siswa_id, NULL, NULL, NULL, NULL, jenis_mutasi,
           tanggal_mutasi, sekolah_asal_tujuan, alasan, no_surat_mutasi,
           NULL, NULL, NULL, status_berkas, created_at
        FROM mutasi_siswa;

        DROP TABLE mutasi_siswa;
        ALTER TABLE mutasi_siswa_baru RENAME TO mutasi_siswa;
      `);
    });
    migrasi();
  }

  // Indeks dibuat setelah tabel dipastikan memakai skema terbaru. Ini juga
  // menangani database lama yang belum memiliki kolom nisn.
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_mutasi_siswa_siswa
      ON mutasi_siswa (siswa_id);
    CREATE INDEX IF NOT EXISTS idx_mutasi_siswa_nisn
      ON mutasi_siswa (nisn);
    CREATE INDEX IF NOT EXISTS idx_mutasi_siswa_jenis
      ON mutasi_siswa (jenis_mutasi);
    CREATE INDEX IF NOT EXISTS idx_mutasi_siswa_tanggal
      ON mutasi_siswa (tanggal_mutasi);
  `);
}

/**
 * Memperluas nilai kolom `users.role` agar mendukung peran pegawai
 * (GURU_PIKET, WALI_KELAS, ADMIN_TU). SQLite tidak dapat mengubah CHECK
 * secara langsung, sehingga tabel dibangun ulang dengan ID tetap.
 */
function migrasikanPeranPegawai(db: Database.Database): void {
  const tabel = db
    .prepare(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'"
    )
    .get() as { sql: string } | undefined;

  if (tabel?.sql && !tabel.sql.includes("ADMIN_TU")) {
    db.pragma("foreign_keys = OFF");
    try {
      const migrasi = db.transaction(() => {
        db.exec(`
          CREATE TABLE users_baru (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK (
              role IN ('guru', 'siswa', 'GURU_PIKET', 'WALI_KELAS', 'ADMIN_TU')
            ),
            nama TEXT NOT NULL,
            nisn TEXT,
            kelas TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          );

          INSERT INTO users_baru
            (id, username, password_hash, role, nama, nisn, kelas, created_at)
          SELECT
            id, username, password_hash, role, nama, nisn, kelas, created_at
          FROM users;

          DROP TABLE users;
          ALTER TABLE users_baru RENAME TO users;
        `);
      });
      migrasi();
    } finally {
      db.pragma("foreign_keys = ON");
    }
  }

  // Akun guru lama tetap dikenali sebagai guru piket.
  db.prepare(
    "UPDATE users SET role = 'GURU_PIKET' WHERE role = 'guru'"
  ).run();
}

/**
 * Menambahkan kolom audit pada tabel leave_requests. SQLite belum mendukung
 * `ADD COLUMN IF NOT EXISTS`, sehingga kolom diperiksa lewat PRAGMA.
 */
function migrasikanLeaveRequests(db: Database.Database): void {
  const kolom = new Set(
    (
      db.prepare("PRAGMA table_info(leave_requests)").all() as {
        name: string;
      }[]
    ).map((item) => item.name)
  );

  const tambahan: [string, string][] = [
    ["tanda_tangan_wali", "TEXT"],
    ["catatan_penolakan", "TEXT"],
    ["disetujui_oleh", "TEXT"],
    ["tanggal_persetujuan", "TEXT"],
    ["diverifikasi_oleh", "TEXT"],
  ];

  for (const [namaKolom, tipe] of tambahan) {
    if (kolom.has(namaKolom)) continue;
    db.exec(`ALTER TABLE leave_requests ADD COLUMN ${namaKolom} ${tipe}`);
  }
}

const globalDatabase = globalThis as typeof globalThis & {
  __sekolahDatabase?: Database.Database;
};

export function getDb(): Database.Database {
  if (!globalDatabase.__sekolahDatabase) {
    const lokasiDatabase =
      process.env.DATABASE_PATH ||
      path.join(process.cwd(), "data", "sekolah.db");

    fs.mkdirSync(path.dirname(lokasiDatabase), { recursive: true });

    const db = new Database(lokasiDatabase);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.exec(SCHEMA);
    migrasikanPeranPegawai(db);
    migrasikanLeaveRequests(db);
    migrasikanMutasiSiswa(db);
    seedDatabase(db);
    globalDatabase.__sekolahDatabase = db;
  }

  return globalDatabase.__sekolahDatabase;
}

export function loginUser({
  role,
  identifier,
  password,
}: LoginPayload): Pengguna | null {
  const db = getDb();
  const daftarPeran = daftarPeranLogin(role);
  const placeholders = daftarPeran.map(() => "?").join(", ");
  const row = db
    .prepare(
      `SELECT id, username, password_hash, role, nama, nisn, kelas
       FROM users
       WHERE username = ? COLLATE NOCASE AND role IN (${placeholders})`
    )
    .get(identifier, ...daftarPeran) as UserRow | undefined;

  if (!row || !verifyPassword(password, row.password_hash)) return null;

  return {
    id: row.id,
    username: row.username,
    role,
    ...(role === "guru"
      ? { staffRole: normalisasiPeranPegawai(row.role) }
      : {}),
    nama: row.nama,
    nisn: row.nisn ?? undefined,
    kelas: row.kelas ?? undefined,
  };
}

export interface DiagnosaLogin {
  akunDitemukan: boolean;
  peranTersimpan: string | null;
  peranDiizinkan: boolean;
  kataSandiCocok: boolean;
}

/**
 * Ringkasan penyebab kegagalan login untuk keperluan log server.
 * Tidak pernah mengembalikan kata sandi mentah.
 */
export function diagnosaLogin({
  role,
  identifier,
  password,
}: LoginPayload): DiagnosaLogin {
  const row = getDb()
    .prepare(
      `SELECT password_hash, role
       FROM users
       WHERE username = ? COLLATE NOCASE`
    )
    .get(identifier) as
    | { password_hash: string; role: string }
    | undefined;

  if (!row) {
    return {
      akunDitemukan: false,
      peranTersimpan: null,
      peranDiizinkan: false,
      kataSandiCocok: false,
    };
  }

  const peranDiizinkan = daftarPeranLogin(role).includes(row.role);

  return {
    akunDitemukan: true,
    peranTersimpan: row.role,
    peranDiizinkan,
    kataSandiCocok: verifyPassword(password, row.password_hash),
  };
}

export function createAuthSession(
  userId: number,
  role: "guru" | "siswa"
): string {
  const db = getDb();
  const sekarang = new Date().toISOString();
  db.prepare("DELETE FROM auth_sessions WHERE expires_at <= ?").run(sekarang);

  const token = crypto.randomBytes(32).toString("hex");
  const kedaluwarsa = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  db.prepare(
    `INSERT INTO auth_sessions (token, user_id, role, expires_at)
     VALUES (?, ?, ?, ?)`
  ).run(token, userId, role, kedaluwarsa);

  return token;
}

export function getSessionUser(token: string): SesiPengguna | null {
  if (!token) return null;

  // Sesi fallback diverifikasi tanpa menyentuh database (aman untuk Vercel).
  if (apakahTokenSesiFallback(token)) return bacaTokenSesiFallback(token);

  const row = getDb()
    .prepare(
      `SELECT
         s.user_id AS userId,
         s.role,
         u.role AS staffRole,
         u.username,
         u.nama,
         u.nisn,
         u.kelas
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ?`
    )
    .get(token, new Date().toISOString()) as SessionUserRow | undefined;

  if (!row) return null;

  return {
    userId: row.userId,
    role: row.role,
    ...(row.role === "guru"
      ? { staffRole: normalisasiPeranPegawai(row.staffRole) }
      : {}),
    username: row.username,
    nama: row.nama,
    nisn: row.nisn ?? undefined,
    kelas: row.kelas ?? undefined,
  };
}

export function deleteAuthSession(token: string): void {
  if (!token) return;
  // Token fallback bersifat stateless; tidak ada baris database yang dihapus.
  if (apakahTokenSesiFallback(token)) return;
  getDb().prepare("DELETE FROM auth_sessions WHERE token = ?").run(token);
}

function catatRiwayatSandi(
  db: Database.Database,
  user: UserRow,
  sandiBaru: string,
  sumber: "siswa" | "guru"
): void {
  db.prepare(
    `INSERT INTO riwayat_sandi
      (siswa_id, nisn, nama_siswa, tanggal_ganti, sandi_tercatat, sumber)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    user.id,
    user.nisn || user.username,
    user.nama,
    new Date().toISOString(),
    enkripsiSandiBackup(sandiBaru),
    sumber
  );
}

export function gantiSandiSiswa(
  userId: number,
  sandiLama: string,
  sandiBaru: string
): { ok: true } | { ok: false; error: string } {
  if (!sandiLama || !sandiBaru) {
    return { ok: false, error: "Kata sandi lama dan baru wajib diisi." };
  }

  if (sandiBaru.length < 6) {
    return { ok: false, error: "Kata sandi baru minimal 6 karakter." };
  }

  const db = getDb();
  const user = db
    .prepare(
      `SELECT id, username, password_hash, role, nama, nisn, kelas
       FROM users
       WHERE id = ? AND role = 'siswa'`
    )
    .get(userId) as UserRow | undefined;

  if (!user) {
    return { ok: false, error: "Akun siswa tidak ditemukan." };
  }

  if (!verifyPassword(sandiLama, user.password_hash)) {
    return { ok: false, error: "Kata sandi lama tidak cocok." };
  }

  if (sandiLama === sandiBaru) {
    return {
      ok: false,
      error: "Kata sandi baru harus berbeda dari kata sandi lama.",
    };
  }

  const simpan = db.transaction(() => {
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
      hashPassword(sandiBaru),
      user.id
    );
    catatRiwayatSandi(db, user, sandiBaru, "siswa");
  });
  simpan();

  return { ok: true };
}

/**
 * Mengganti kata sandi akun pegawai (guru piket, wali kelas, admin TU).
 * Riwayat sandi hanya disimpan untuk akun siswa.
 */
export function gantiSandiPegawai(
  userId: number,
  sandiLama: string,
  sandiBaru: string
): { ok: true } | { ok: false; error: string } {
  if (!sandiLama || !sandiBaru) {
    return { ok: false, error: "Kata sandi lama dan baru wajib diisi." };
  }

  if (sandiBaru.length < 6) {
    return { ok: false, error: "Kata sandi baru minimal 6 karakter." };
  }

  if (sandiLama === sandiBaru) {
    return {
      ok: false,
      error: "Kata sandi baru harus berbeda dari kata sandi lama.",
    };
  }

  const db = getDb();
  const user = db
    .prepare(
      `SELECT id, username, password_hash, role, nama, nisn, kelas
       FROM users
       WHERE id = ?
         AND role IN ('GURU_PIKET', 'WALI_KELAS', 'ADMIN_TU')`
    )
    .get(userId) as UserRow | undefined;

  if (!user) {
    return { ok: false, error: "Akun pegawai tidak ditemukan." };
  }

  if (!verifyPassword(sandiLama, user.password_hash)) {
    return { ok: false, error: "Kata sandi lama tidak cocok." };
  }

  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
    hashPassword(sandiBaru),
    user.id
  );

  return { ok: true };
}

export function resetSandiSiswa(
  nisn: string
):
  | { ok: true; nama: string; sandiBaru: string }
  | { ok: false; error: string } {
  const nisnBersih = nisn.trim();
  if (!nisnBersih) {
    return { ok: false, error: "NISN siswa wajib diisi." };
  }

  const db = getDb();
  const user = db
    .prepare(
      `SELECT id, username, password_hash, role, nama, nisn, kelas
       FROM users
       WHERE role = 'siswa'
         AND (username = ? COLLATE NOCASE OR nisn = ? COLLATE NOCASE)`
    )
    .get(nisnBersih, nisnBersih) as UserRow | undefined;

  if (!user) {
    return { ok: false, error: "Akun siswa tidak ditemukan." };
  }

  const sandiBaru = sandiDefaultSiswa(user.username);
  const simpan = db.transaction(() => {
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
      hashPassword(sandiBaru),
      user.id
    );
    catatRiwayatSandi(db, user, sandiBaru, "guru");
    db.prepare("DELETE FROM auth_sessions WHERE user_id = ?").run(user.id);
  });
  simpan();

  return { ok: true, nama: user.nama, sandiBaru };
}

export function getStudentAccountsWithPassword(): AkunSandiSiswa[] {
  const rows = getDb()
    .prepare(
      `SELECT
         u.id,
         u.username,
         COALESCE(NULLIF(u.nisn, ''), u.username) AS nisn,
         u.nama,
         COALESCE(NULLIF(u.kelas, ''), '-') AS kelas,
         r.tanggal_ganti AS tanggalGantiSandi,
         r.sandi_tercatat AS sandiTercatat,
         r.sumber AS sumberSandi
       FROM users u
       LEFT JOIN riwayat_sandi r ON r.id = (
         SELECT id FROM riwayat_sandi
         WHERE siswa_id = u.id
         ORDER BY id DESC
         LIMIT 1
       )
       WHERE u.role = 'siswa'
       ORDER BY u.kelas ASC, u.nama ASC`
    )
    .all() as AkunSandiRow[];

  return rows.map((row) => ({
    id: row.id,
    nisn: row.nisn,
    nama: row.nama,
    kelas: row.kelas,
    tanggalGantiSandi: row.tanggalGantiSandi,
    sandiTerkini: row.sandiTercatat
      ? dekripsiSandiBackup(row.sandiTercatat)
      : null,
    sumberSandi: row.sumberSandi,
  }));
}

export function registerStudent(
  payload: RegisterPayload
): { ok: true; user: Pengguna } | { ok: false; error: string } {
  const db = getDb();
  const username = payload.nisn.trim();
  const sudahAda = db
    .prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE")
    .get(username);

  if (sudahAda) {
    return { ok: false, error: "NISN sudah terdaftar. Silakan masuk." };
  }

  const passwordHash = hashPassword(payload.password);
  const simpan = db.transaction(() => {
    const hasil = db
      .prepare(
        `INSERT INTO users (username, password_hash, role, nama, nisn, kelas)
         VALUES (?, ?, 'siswa', ?, ?, ?)`
      )
      .run(
        username,
        passwordHash,
        payload.namaLengkap,
        username,
        payload.kelas
      );

    db.prepare(
      `INSERT INTO students (nisn, nama, kelas)
       VALUES (?, ?, ?)
       ON CONFLICT(nisn) DO UPDATE SET
         nama = excluded.nama,
         kelas = excluded.kelas`
    ).run(username, payload.namaLengkap, payload.kelas);

    return Number(hasil.lastInsertRowid);
  });

  const id = simpan();

  return {
    ok: true,
    user: {
      id,
      username,
      role: "siswa",
      nama: payload.namaLengkap,
      nisn: username,
      kelas: payload.kelas,
    },
  };
}

export function getStudents(): Siswa[] {
  return getDb()
    .prepare(
      "SELECT nisn, nama, kelas FROM students ORDER BY kelas ASC, nama ASC"
    )
    .all() as Siswa[];
}

export function getAgenda(): AgendaAkademik[] {
  return getDb()
    .prepare(
      "SELECT id, tanggal, kegiatan, kategori, semester FROM agenda ORDER BY id ASC"
    )
    .all() as AgendaAkademik[];
}

export function getAttendance(filter?: {
  kelas?: string;
  tanggal?: string;
}): CatatanAbsen[] {
  let sql = `SELECT nisn, nama, kelas, tanggal, status, jam_input AS jamInput
             FROM attendance
             WHERE 1 = 1`;
  const params: string[] = [];

  if (filter?.kelas) {
    sql += " AND kelas = ?";
    params.push(filter.kelas);
  }

  if (filter?.tanggal) {
    sql += " AND tanggal = ?";
    params.push(filter.tanggal);
  }

  sql += " ORDER BY tanggal DESC, kelas ASC, nama ASC";
  return getDb().prepare(sql).all(...params) as CatatanAbsen[];
}

export function saveAttendance(items: CatatanAbsen[]): CatatanAbsen[] {
  const db = getDb();
  const simpan = db.prepare(
    `INSERT INTO attendance (nisn, nama, kelas, tanggal, status, jam_input)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(nisn, tanggal) DO UPDATE SET
       nama = excluded.nama,
       kelas = excluded.kelas,
       status = excluded.status,
       jam_input = excluded.jam_input`
  );

  const tx = db.transaction(() => {
    for (const item of items) {
      const status = (STATUS_PRESENSI as readonly string[]).includes(item.status)
        ? (item.status as StatusPresensi)
        : "Hadir";

      simpan.run(
        item.nisn,
        item.nama,
        item.kelas,
        item.tanggal,
        status,
        item.jamInput || ambilWaktuSekarang()
      );
    }
  });
  tx();

  return getAttendance();
}

export function deleteAllAttendance(): void {
  getDb().prepare("DELETE FROM attendance").run();
}

function mapLeaveRequest(row: LeaveRequestRow): SuratIzinItem {
  return {
    id: row.id,
    nama: row.nama,
    nisn: row.nisn,
    kelas: row.kelas,
    jenis: row.jenis,
    tanggal: row.tanggal,
    alasan: row.alasan,
    status: row.status,
    fotoBukti: row.fotoBukti ?? undefined,
    namaWali: row.namaWali ?? undefined,
    noTeleponWali: row.noTeleponWali ?? undefined,
    tandaTanganWali: row.tandaTanganWali ?? undefined,
    diverifikasiOleh: row.diverifikasiOleh ?? undefined,
    disetujuiOleh: row.disetujuiOleh ?? undefined,
    tanggalPersetujuan: row.tanggalPersetujuan ?? undefined,
    catatanPenolakan: row.catatanPenolakan ?? undefined,
  };
}

export function getLeaveRequests(filter?: {
  nisn?: string;
}): SuratIzinItem[] {
  let sql = `SELECT id, nama, nisn, kelas, jenis, tanggal, alasan, status,
                    foto_bukti AS fotoBukti,
                    nama_wali AS namaWali,
                    no_telepon_wali AS noTeleponWali,
                    tanda_tangan_wali AS tandaTanganWali,
                    diverifikasi_oleh AS diverifikasiOleh,
                    disetujui_oleh AS disetujuiOleh,
                    tanggal_persetujuan AS tanggalPersetujuan,
                    catatan_penolakan AS catatanPenolakan
             FROM leave_requests
             WHERE 1 = 1`;
  const params: string[] = [];

  if (filter?.nisn) {
    sql += " AND nisn = ?";
    params.push(filter.nisn);
  }

  sql += " ORDER BY id DESC";
  const rows = getDb().prepare(sql).all(...params) as LeaveRequestRow[];
  return rows.map(mapLeaveRequest);
}

export function getLeaveRequestById(id: number): SuratIzinItem | null {
  const row = getDb()
    .prepare(
      `SELECT id, nama, nisn, kelas, jenis, tanggal, alasan, status,
              foto_bukti AS fotoBukti,
              nama_wali AS namaWali,
              no_telepon_wali AS noTeleponWali,
              tanda_tangan_wali AS tandaTanganWali,
              diverifikasi_oleh AS diverifikasiOleh,
              disetujui_oleh AS disetujuiOleh,
              tanggal_persetujuan AS tanggalPersetujuan,
              catatan_penolakan AS catatanPenolakan
       FROM leave_requests
       WHERE id = ?`
    )
    .get(id) as LeaveRequestRow | undefined;

  return row ? mapLeaveRequest(row) : null;
}

export function createLeaveRequest(
  input: Omit<SuratIzinItem, "id">
): SuratIzinItem {
  const db = getDb();
  try {
    db.exec("ALTER TABLE leave_requests ADD COLUMN tanda_tangan_wali TEXT");
  } catch {
    // Kolom mungkin sudah ada
  }
  const hasil = db
    .prepare(
      `INSERT INTO leave_requests
         (nama, nisn, kelas, jenis, tanggal, alasan, status, foto_bukti, nama_wali, no_telepon_wali, tanda_tangan_wali)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.nama,
      input.nisn,
      input.kelas,
      input.jenis,
      input.tanggal,
      input.alasan,
      input.status || "Menunggu Persetujuan",
      input.fotoBukti ?? null,
      input.namaWali ?? null,
      input.noTeleponWali ?? null,
      input.tandaTanganWali ?? null
    );

  const tersimpan = getLeaveRequestById(Number(hasil.lastInsertRowid));
  if (!tersimpan) {
    throw new Error("Gagal menyimpan pengajuan izin.");
  }
  return tersimpan;
}

export function updateLeaveRequestStatus(
  id: number,
  status: string,
  catatan?: string,
  verifikator?: string
): SuratIzinItem | null {
  const db = getDb();
  const petugas = verifikator?.trim() || "Guru Piket";

  if (status.toLowerCase() === "disetujui") {
    db.prepare(
      `UPDATE leave_requests
       SET status = ?,
           disetujui_oleh = ?,
           diverifikasi_oleh = ?,
           tanggal_persetujuan = COALESCE(tanggal_persetujuan, datetime('now'))
       WHERE id = ?`
    ).run("Disetujui", petugas, petugas, id);
  } else if (status.toLowerCase() === "ditolak") {
    db.prepare(
      `UPDATE leave_requests
       SET status = ?,
           catatan_penolakan = COALESCE(?, catatan_penolakan),
           diverifikasi_oleh = ?
       WHERE id = ?`
    ).run("Ditolak", catatan || null, petugas, id);
  } else {
    db.prepare(
      `UPDATE leave_requests
       SET status = ?, diverifikasi_oleh = COALESCE(diverifikasi_oleh, ?)
       WHERE id = ?`
    ).run(status, petugas, id);
  }

  return getLeaveRequestById(id);
}

export function deleteAllLeaveRequests(): void {
  getDb().prepare("DELETE FROM leave_requests").run();
}

function mapIncident(row: IncidentRow): CatatanKejadianItem {
  return {
    id: row.id,
    tanggal: row.tanggal,
    waktu: row.waktu,
    guruPiket: row.guruPiket,
    kategori: row.kategori,
    namaSiswaTerlibat: row.namaSiswaTerlibat ?? undefined,
    kelasSiswa: row.kelasSiswa ?? undefined,
    deskripsi: row.deskripsi,
    tindakanPenanganan: row.tindakanPenanganan,
  };
}

export function getIncidents(): CatatanKejadianItem[] {
  const rows = getDb()
    .prepare(
      `SELECT id, tanggal, waktu,
              guru_piket AS guruPiket,
              kategori,
              nama_siswa_terlibat AS namaSiswaTerlibat,
              kelas_siswa AS kelasSiswa,
              deskripsi,
              tindakan_penanganan AS tindakanPenanganan
       FROM incidents
       ORDER BY id DESC`
    )
    .all() as IncidentRow[];

  return rows.map(mapIncident);
}

export function createIncident(
  input: Omit<CatatanKejadianItem, "id" | "tanggal" | "waktu"> & {
    tanggal?: string;
    waktu?: string;
  }
): CatatanKejadianItem {
  const db = getDb();
  const hasil = db
    .prepare(
      `INSERT INTO incidents
         (tanggal, waktu, guru_piket, kategori, nama_siswa_terlibat, kelas_siswa, deskripsi, tindakan_penanganan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.tanggal ?? ambilTanggalPanjang(),
      input.waktu ?? ambilWaktuSekarang(),
      input.guruPiket,
      input.kategori,
      input.namaSiswaTerlibat ?? null,
      input.kelasSiswa ?? null,
      input.deskripsi,
      input.tindakanPenanganan
    );

  const row = db
    .prepare(
      `SELECT id, tanggal, waktu,
              guru_piket AS guruPiket,
              kategori,
              nama_siswa_terlibat AS namaSiswaTerlibat,
              kelas_siswa AS kelasSiswa,
              deskripsi,
              tindakan_penanganan AS tindakanPenanganan
       FROM incidents
       WHERE id = ?`
    )
    .get(Number(hasil.lastInsertRowid)) as IncidentRow | undefined;

  if (!row) {
    throw new Error("Gagal menyimpan catatan kejadian.");
  }
  return mapIncident(row);
}

export function deleteIncident(id: number): void {
  getDb().prepare("DELETE FROM incidents WHERE id = ?").run(id);
}

function mapMutation(row: MutationRow): MutasiItem {
  return {
    id: row.id,
    nama: row.nama,
    nisn: row.nisn,
    jenisKelamin: row.jenisKelamin,
    sekolahAsal: row.sekolahAsal,
    kelasTujuan: row.kelasTujuan,
    alasanPindah: row.alasanPindah,
    namaWali: row.namaWali,
    noTeleponWali: row.noTeleponWali,
    suratPindah: row.suratPindah ?? undefined,
    tanggalPengajuan: row.tanggalPengajuan,
    status: row.status,
  };
}

export function getMutations(): MutasiItem[] {
  const rows = getDb()
    .prepare(
      `SELECT id, nama, nisn,
              jenis_kelamin AS jenisKelamin,
              sekolah_asal AS sekolahAsal,
              kelas_tujuan AS kelasTujuan,
              alasan_pindah AS alasanPindah,
              nama_wali AS namaWali,
              no_telepon_wali AS noTeleponWali,
              surat_pindah AS suratPindah,
              tanggal_pengajuan AS tanggalPengajuan,
              status
       FROM mutations
       ORDER BY id DESC`
    )
    .all() as MutationRow[];

  return rows.map(mapMutation);
}

export function createMutation(input: Omit<MutasiItem, "id">): MutasiItem {
  const db = getDb();
  const hasil = db
    .prepare(
      `INSERT INTO mutations
         (nama, nisn, jenis_kelamin, sekolah_asal, kelas_tujuan, alasan_pindah,
          nama_wali, no_telepon_wali, surat_pindah, tanggal_pengajuan, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.nama,
      input.nisn,
      input.jenisKelamin,
      input.sekolahAsal,
      input.kelasTujuan,
      input.alasanPindah,
      input.namaWali,
      input.noTeleponWali,
      input.suratPindah ?? null,
      input.tanggalPengajuan,
      input.status || "Menunggu Verifikasi"
    );

  const row = db
    .prepare(
      `SELECT id, nama, nisn,
              jenis_kelamin AS jenisKelamin,
              sekolah_asal AS sekolahAsal,
              kelas_tujuan AS kelasTujuan,
              alasan_pindah AS alasanPindah,
              nama_wali AS namaWali,
              no_telepon_wali AS noTeleponWali,
              surat_pindah AS suratPindah,
              tanggal_pengajuan AS tanggalPengajuan,
              status
       FROM mutations
       WHERE id = ?`
    )
    .get(Number(hasil.lastInsertRowid)) as MutationRow | undefined;

  if (!row) {
    throw new Error("Gagal menyimpan data mutasi.");
  }
  return mapMutation(row);
}

export function getVisitorStats(): {
  hariIni: number;
  total: number;
  riwayat: { tanggal: string; jumlah: number }[];
} {
  const riwayat = getDb()
    .prepare("SELECT tanggal, jumlah FROM visitors ORDER BY tanggal DESC")
    .all() as { tanggal: string; jumlah: number }[];

  const tanggalHariIni = ambilTanggalHariIni();
  return {
    hariIni:
      riwayat.find((item) => item.tanggal === tanggalHariIni)?.jumlah ?? 0,
    total: riwayat.reduce((total, item) => total + item.jumlah, 0),
    riwayat,
  };
}

export function recordVisit(): {
  hariIni: number;
  total: number;
  riwayat: { tanggal: string; jumlah: number }[];
} {
  const tanggalHariIni = ambilTanggalHariIni();
  getDb()
    .prepare(
      `INSERT INTO visitors (tanggal, jumlah)
       VALUES (?, 1)
       ON CONFLICT(tanggal) DO UPDATE SET jumlah = jumlah + 1`
    )
    .run(tanggalHariIni);

  return getVisitorStats();
}

export interface DataMigrasiLama {
  attendance?: Partial<CatatanAbsen>[];
  leaveRequests?: Partial<SuratIzinItem>[];
  incidents?: Partial<CatatanKejadianItem>[];
  mutations?: Partial<MutasiItem>[];
  visitors?: { tanggal: string; jumlah: number }[];
}

export interface HasilMigrasi {
  attendance: number;
  leaveRequests: number;
  incidents: number;
  mutations: number;
  visitors: number;
}

/**
 * Menyalin data yang sebelumnya tersimpan di localStorage ke SQLite.
 * Hanya data yang belum ada yang dimasukkan agar aman dijalankan berulang.
 */
export function migrateLegacyData(data: DataMigrasiLama): HasilMigrasi {
  const db = getDb();
  const hasil: HasilMigrasi = {
    attendance: 0,
    leaveRequests: 0,
    incidents: 0,
    mutations: 0,
    visitors: 0,
  };

  const simpanPresensi = db.prepare(
    `INSERT OR IGNORE INTO attendance (nisn, nama, kelas, tanggal, status, jam_input)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const simpanIzin = db.prepare(
    `INSERT OR IGNORE INTO leave_requests
       (id, nama, nisn, kelas, jenis, tanggal, alasan, status, foto_bukti, nama_wali, no_telepon_wali)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const simpanKejadian = db.prepare(
    `INSERT OR IGNORE INTO incidents
       (id, tanggal, waktu, guru_piket, kategori, nama_siswa_terlibat, kelas_siswa, deskripsi, tindakan_penanganan)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const simpanMutasi = db.prepare(
    `INSERT OR IGNORE INTO mutations
       (id, nama, nisn, jenis_kelamin, sekolah_asal, kelas_tujuan, alasan_pindah,
        nama_wali, no_telepon_wali, surat_pindah, tanggal_pengajuan, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const cekIzin = db.prepare(
    `SELECT id FROM leave_requests WHERE nisn = ? AND tanggal = ? AND jenis = ? AND alasan = ?`
  );
  const cekKejadian = db.prepare(
    `SELECT id FROM incidents WHERE tanggal = ? AND deskripsi = ?`
  );
  const cekMutasi = db.prepare(
    `SELECT id FROM mutations WHERE nisn = ? AND tanggal_pengajuan = ?`
  );
  const simpanPengunjung = db.prepare(
    `INSERT INTO visitors (tanggal, jumlah)
     VALUES (?, ?)
     ON CONFLICT(tanggal) DO UPDATE SET jumlah = MAX(visitors.jumlah, excluded.jumlah)`
  );

  const tx = db.transaction(() => {
    for (const item of data.attendance ?? []) {
      if (!item.nisn || !item.nama || !item.kelas || !item.tanggal) continue;
      const status = (STATUS_PRESENSI as readonly string[]).includes(
        item.status ?? ""
      )
        ? (item.status as StatusPresensi)
        : "Hadir";

      const info = simpanPresensi.run(
        item.nisn,
        item.nama,
        item.kelas,
        item.tanggal,
        status,
        item.jamInput || ambilWaktuSekarang()
      );
      hasil.attendance += info.changes;
    }

    for (const item of data.leaveRequests ?? []) {
      if (
        !item.nisn ||
        !item.nama ||
        !item.kelas ||
        !item.jenis ||
        !item.tanggal ||
        !item.alasan
      ) {
        continue;
      }
      if (cekIzin.get(item.nisn, item.tanggal, item.jenis, item.alasan)) {
        continue;
      }

      const info = simpanIzin.run(
        typeof item.id === "number" ? item.id : null,
        item.nama,
        item.nisn,
        item.kelas,
        item.jenis,
        item.tanggal,
        item.alasan,
        item.status || "Menunggu Persetujuan",
        item.fotoBukti ?? null,
        item.namaWali ?? null,
        item.noTeleponWali ?? null
      );
      hasil.leaveRequests += info.changes;
    }

    for (const item of data.incidents ?? []) {
      if (
        !item.tanggal ||
        !item.guruPiket ||
        !item.kategori ||
        !item.deskripsi ||
        !item.tindakanPenanganan
      ) {
        continue;
      }
      if (cekKejadian.get(item.tanggal, item.deskripsi)) continue;

      const info = simpanKejadian.run(
        typeof item.id === "number" ? item.id : null,
        item.tanggal,
        item.waktu || ambilWaktuSekarang(),
        item.guruPiket,
        item.kategori,
        item.namaSiswaTerlibat ?? null,
        item.kelasSiswa ?? null,
        item.deskripsi,
        item.tindakanPenanganan
      );
      hasil.incidents += info.changes;
    }

    for (const item of data.mutations ?? []) {
      if (
        !item.nama ||
        !item.nisn ||
        !item.jenisKelamin ||
        !item.sekolahAsal ||
        !item.kelasTujuan ||
        !item.alasanPindah ||
        !item.namaWali ||
        !item.noTeleponWali ||
        !item.tanggalPengajuan
      ) {
        continue;
      }
      if (cekMutasi.get(item.nisn, item.tanggalPengajuan)) continue;

      const info = simpanMutasi.run(
        typeof item.id === "number" ? item.id : null,
        item.nama,
        item.nisn,
        item.jenisKelamin,
        item.sekolahAsal,
        item.kelasTujuan,
        item.alasanPindah,
        item.namaWali,
        item.noTeleponWali,
        item.suratPindah ?? null,
        item.tanggalPengajuan,
        item.status || "Menunggu Verifikasi"
      );
      hasil.mutations += info.changes;
    }

    for (const item of data.visitors ?? []) {
      if (!item.tanggal || !Number.isFinite(item.jumlah) || item.jumlah < 0) {
        continue;
      }
      const info = simpanPengunjung.run(item.tanggal, item.jumlah);
      hasil.visitors += info.changes;
    }
  });
  tx();

  return hasil;
}
