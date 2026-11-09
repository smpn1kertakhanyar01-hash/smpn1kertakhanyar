/**
 * Migrasi idempoten tabel kesiswaan.
 *
 * Jalankan: node scripts/migrate-kesiswaan.mjs
 * atau:     npm run db:migrate
 *
 * Skrip ini aman dijalankan berulang kali. Skema yang sama juga dipasang
 * otomatis oleh lib/db.ts saat aplikasi pertama kali membuka database.
 */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const lokasiDatabase =
  process.env.DATABASE_PATH || path.join(process.cwd(), "data", "sekolah.db");

fs.mkdirSync(path.dirname(lokasiDatabase), { recursive: true });

const db = new Database(lokasiDatabase);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
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
`);

/**
 * Menyesuaikan tabel mutasi_siswa lama agar mendukung permohonan mutasi masuk
 * tanpa akun siswa (siswa_id opsional) sekaligus menyimpan identitas pemohon
 * dan data kontak wali. Logika ini sama dengan migrasikanMutasiSiswa() pada
 * lib/db.ts.
 */
function migrasikanMutasiSiswa() {
  const kolom = db.prepare("PRAGMA table_info(mutasi_siswa)").all();
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

migrasikanMutasiSiswa();

const jumlahKategori = db
  .prepare("SELECT COUNT(*) AS jumlah FROM kategori_kejadian")
  .get().jumlah;

if (jumlahKategori === 0) {
  const simpan = db.prepare(
    "INSERT INTO kategori_kejadian (nama_kategori, poin) VALUES (?, ?)"
  );
  const seed = db.transaction(() => {
    simpan.run("Disiplin", 10);
    simpan.run("Prestasi", 20);
    simpan.run("Kerapian", 5);
  });
  seed();
}

const tabel = db
  .prepare(
    `SELECT name FROM sqlite_master
     WHERE type = 'table' AND name IN
       ('kalender_akademik', 'log_notifikasi_wa', 'kategori_kejadian', 'mutasi_siswa')
     ORDER BY name`
  )
  .all()
  .map((row) => row.name);

console.log(`Database: ${lokasiDatabase}`);
console.log(`Tabel kesiswaan siap: ${tabel.join(", ")}`);

db.close();
