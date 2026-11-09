# Portal Kesiswaan SMP Negeri 1 Kertak Hanyar

Aplikasi Next.js untuk layanan kesiswaan: surat izin, presensi, jurnal kejadian, mutasi siswa, dan kalender akademik.

## Menjalankan Aplikasi

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

### Konfigurasi Notifikasi WhatsApp (Fonnte)

Buat file `.env.local` dan isi:

```bash
FONNTE_TOKEN="token-fonnte-anda"
WA_ADMIN_TU="628xxxxxxxxxx"
# Opsional: URL publik untuk tautan verifikasi di pesan WhatsApp.
# Jika kosong, aplikasi memakai host dari request yang masuk.
APP_URL="https://domain-sekolah.sch.id"
```

`WA_ADMIN_TU` wajib memakai format `62` tanpa spasi atau strip. Setiap
pengajuan mutasi siswa yang tersimpan akan mengirim notifikasi ke nomor
tersebut, dan hasilnya dicatat di tabel `log_notifikasi_wa`.

Build produksi:

```bash
npm run build
npm run start
```

## Database

Data disimpan di SQLite melalui `better-sqlite3`:

- Lokasi default: `data/sekolah.db`
- File database dibuat otomatis saat pertama kali dipakai.
- Skema dan data awal (siswa, akun demo, agenda akademik) dibuat otomatis.
- Lokasi lain dapat diatur dengan environment variable `DATABASE_PATH`.
- Folder `data/` sudah diabaikan oleh Git.

Migrasi tabel kesiswaan bersifat idempoten dan dapat dijalankan manual:

```bash
npm run db:migrate
```

Tabel yang disiapkan: `kalender_akademik`, `log_notifikasi_wa`,
`kategori_kejadian`, dan `mutasi_siswa` (foreign key ke akun siswa di tabel
`users`). Skema yang sama juga dipasang otomatis oleh `lib/db.ts`.

Data localStorage lama (presensi, surat izin, jurnal, mutasi) dimigrasikan otomatis satu kali saat beranda dibuka.

### Akun Demo

| Peran | NISN / User | Kata Sandi |
| --- | --- | --- |
| Guru | `guru`, `admin`, atau `piket` | `@Smpn1KH#` |
| Admin TU | `petugas.smpn1kh` atau `admintu` | `adminTUkece` |
| Siswa (demo umum) | `siswa` | `siswa123` |

Siswa kelas IX A dan IX B masuk menggunakan NISN masing-masing dengan kata sandi
`"smp" + 4 digit terakhir NISN` (contoh: NISN `0119741828` → sandi `smp1828`).

Siswa baru dapat mendaftar melalui halaman **Aktivasi Akun Siswa** (`/register-siswa`).

## Struktur Penting

- `lib/db.ts` — skema SQLite, seed, dan seluruh operasi database.
- `app/api/` — route handler API untuk autentikasi dan data kesiswaan.
- `lib/api-client.ts` — pemanggil API bertipe untuk komponen klien.
- `lib/storage.ts` — helper sesi login di browser.
- `lib/migrate.ts` — migrasi satu kali data localStorage lama ke database.

Sesi login tetap disimpan di browser (localStorage), sedangkan akun dan seluruh data aplikasi disimpan di SQLite.
