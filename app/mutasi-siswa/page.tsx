"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { api } from "@/lib/api-client";
import { KELAS_PENDAFTARAN, NOMOR_WHATSAPP } from "@/lib/constants";
import type { JenisMutasi, MutasiSiswa } from "@/lib/types";

interface FormMutasi {
  nama: string;
  nisn: string;
  jenisKelamin: string;
  kelas: string;
  sekolah: string;
  alasan: string;
  namaWali: string;
  noTeleponWali: string;
}

const TAB_MUTASI: { id: JenisMutasi; label: string; ikon: string }[] = [
  {
    id: "MASUK",
    label: "Siswa Pindahan (Mutasi Masuk)",
    ikon: "📥",
  },
  {
    id: "KELUAR",
    label: "Permohonan Pindah Sekolah (Mutasi Keluar)",
    ikon: "📤",
  },
];

interface PoinPersyaratan {
  teks: string;
  subPoin?: string[];
}

const PERSYARATAN_MUTASI: Record<
  JenisMutasi,
  { judul: string; poin: PoinPersyaratan[] }
> = {
  MASUK: {
    judul: "Persyaratan Berkas Mutasi Masuk:",
    poin: [
      {
        teks: "Menyerahkan Surat Pindah dari sekolah asal yang telah disahkan.",
      },
      {
        teks: "Menyerahkan raport dari sekolah asal.",
      },
      {
        teks: "Menyerahkan fotokopi STTB / DANEM SD/MIN/MIS yang sederajat dan telah disahkan.",
      },
      {
        teks: "Pas foto terbaru:",
        subPoin: [
          "Ukuran 2x3 cm (2 lembar)",
          "Ukuran 3x4 cm (3 lembar)",
        ],
      },
      {
        teks: "Mengisi data pribadi dan surat perjanjian yang diserahkan oleh sekolah.",
      },
    ],
  },
  KELUAR: {
    judul: "Persyaratan Mutasi Keluar:",
    poin: [
      {
        teks: "Surat Keterangan / Kartu Bebas Pustaka (Bebas Pinjaman Perpustakaan Sekolah).",
      },
      {
        teks: "Surat Rekomendasi Pindah Sekolah dari sekolah asal (SMPN 1 Kertak Hanyar).",
      },
      {
        teks: "Tidak memiliki tanggungan administrasi kesiswaan.",
      },
    ],
  },
};

function buatTautanWhatsAppAdmin(
  data: Pick<MutasiSiswa, "namaSiswa" | "nisn" | "jenisMutasi">
): string {
  const nama = data.namaSiswa?.trim() || "-";
  const nisn = data.nisn?.trim() || "-";
  const pesan = `Halo Admin TU SMPN 1 Kertak Hanyar, saya sudah mengajukan permohonan mutasi di web dengan rincian:
Nama: ${nama}
NISN: ${nisn}
Jenis: ${data.jenisMutasi}
Mohon bantuannya untuk verifikasi berkas. Terima kasih.`;

  return `https://wa.me/${NOMOR_WHATSAPP}?text=${encodeURIComponent(pesan)}`;
}

export default function MutasiSiswaPage() {
  const [jenisMutasi, setJenisMutasi] = useState<JenisMutasi>("MASUK");
  const [formData, setFormData] = useState<FormMutasi>({
    nama: "",
    nisn: "",
    jenisKelamin: "Laki-laki",
    kelas: KELAS_PENDAFTARAN[0],
    sekolah: "",
    alasan: "",
    namaWali: "",
    noTeleponWali: "",
  });
  const [berkas, setBerkas] = useState<string>("");
  const [notifSukses, setNotifSukses] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [tautanWa, setTautanWa] = useState("");
  const [sisaDetik, setSisaDetik] = useState(3);
  const [sudahDialihkan, setSudahDialihkan] = useState(false);

  useEffect(() => {
    if (!notifSukses || !tautanWa || sudahDialihkan) return;

    if (sisaDetik <= 0) {
      setSudahDialihkan(true);
      const jendela = window.open(
        tautanWa,
        "_blank",
        "noopener,noreferrer"
      );
      if (!jendela) {
        window.location.href = tautanWa;
      }
      return;
    }

    const timer = window.setTimeout(() => {
      setSisaDetik((detik) => detik - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [notifSukses, tautanWa, sisaDetik, sudahDialihkan]);

  const pilihTab = (jenis: JenisMutasi) => {
    if (jenis === jenisMutasi) return;
    setJenisMutasi(jenis);
    setNotifSukses(false);
    setTautanWa("");
    setSisaDetik(3);
    setSudahDialihkan(false);
    setBerkas("");
    setFormData((prev) => ({ ...prev, sekolah: "", alasan: "" }));
  };

  const handleUploadBerkas = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBerkas(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setMenyimpan(true);
    try {
      const tersimpan = await api.createMutasiSiswa({
        siswaId: null,
        namaSiswa: formData.nama.trim(),
        nisn: formData.nisn.trim(),
        jenisKelamin:
          jenisMutasi === "MASUK" ? formData.jenisKelamin : null,
        kelas: formData.kelas,
        jenisMutasi,
        tanggalMutasi: new Date().toISOString().slice(0, 10),
        sekolahAsalTujuan: formData.sekolah.trim(),
        alasan: formData.alasan.trim(),
        noSuratMutasi: null,
        namaWali: formData.namaWali.trim() || null,
        noTeleponWali: formData.noTeleponWali.trim() || null,
        berkasPendukung: berkas || null,
        statusBerkas: "Menunggu Verifikasi",
      });

      setTautanWa(buatTautanWhatsAppAdmin(tersimpan));
      setSisaDetik(3);
      setSudahDialihkan(false);
      setNotifSukses(true);
    } catch (error) {
      console.error("Gagal menyimpan data mutasi:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Gagal mengirim berkas permohonan mutasi. Silakan coba lagi."
      );
    } finally {
      setMenyimpan(false);
    }
  };

  const isMutasiMasuk = jenisMutasi === "MASUK";
  const persyaratan = PERSYARATAN_MUTASI[jenisMutasi];
  const judulForm = isMutasiMasuk
    ? "Formulir Siswa Pindahan (Mutasi Masuk)"
    : "Formulir Permohonan Mutasi Keluar";
  const deskripsiForm = isMutasiMasuk
    ? "Lengkapi data siswa pindahan dan unggah berkas surat mutasi resmi dari sekolah sebelumnya."
    : "Lengkapi data permohonan surat keterangan pindah sekolah ke sekolah tujuan baru.";

  return (
    <main className="min-h-screen bg-[#f8fbff] text-slate-800 font-sans pb-16">
      {/* Header */}
      <PageHeader
        title="PENDAFTARAN & PERMOHONAN MUTASI SISWA"
        subtitle="Layanan Mutasi Masuk dan Mutasi Keluar SMPN 1 Kertak Hanyar"
      >
        <Link
          href="/"
          className="text-xs text-slate-600 hover:text-blue-600 font-semibold px-3 py-1.5 transition"
        >
          ← Kembali ke Beranda
        </Link>
      </PageHeader>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
          {/* Tab Mutasi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl mb-6">
            {TAB_MUTASI.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => pilihTab(tab.id)}
                className={`text-[11px] sm:text-xs font-bold px-3 py-2.5 rounded-lg transition text-center ${
                  jenisMutasi === tab.id
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span className="mr-1">{tab.ikon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="border-b border-slate-100 pb-4 mb-6">
            <h2 className="text-base font-bold text-slate-900">{judulForm}</h2>
            <p className="text-xs text-slate-500 mt-1">{deskripsiForm}</p>
          </div>

          {/* Persyaratan & Ketentuan Mutasi */}
          <section
            aria-labelledby="judul-persyaratan-mutasi"
            className={`mb-6 rounded-2xl border p-4 sm:p-5 ${
              isMutasiMasuk
                ? "bg-amber-50 border-amber-200"
                : "bg-blue-50 border-blue-200"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className={`shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center text-lg ${
                  isMutasiMasuk
                    ? "bg-white/70 border-amber-200"
                    : "bg-white/70 border-blue-200"
                }`}
              >
                📄
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    isMutasiMasuk ? "text-amber-700" : "text-blue-700"
                  }`}
                >
                  Persyaratan &amp; Ketentuan Mutasi
                </p>
                <h3
                  id="judul-persyaratan-mutasi"
                  className={`mt-0.5 text-sm font-bold ${
                    isMutasiMasuk ? "text-amber-900" : "text-blue-900"
                  }`}
                >
                  {persyaratan.judul}
                </h3>
                <ol
                  className={`mt-2.5 ml-4 list-decimal list-outside space-y-1.5 text-[11px] sm:text-xs leading-relaxed ${
                    isMutasiMasuk
                      ? "text-amber-900 marker:text-amber-700"
                      : "text-blue-900 marker:text-blue-700"
                  }`}
                >
                  {persyaratan.poin.map((poin) => (
                    <li key={poin.teks} className="pl-1 break-words">
                      {poin.teks}
                      {poin.subPoin && (
                        <ul
                          className={`mt-1 ml-4 list-disc list-outside space-y-0.5 ${
                            isMutasiMasuk
                              ? "marker:text-amber-700"
                              : "marker:text-blue-700"
                          }`}
                        >
                          {poin.subPoin.map((sub) => (
                            <li key={sub} className="pl-1 break-words">
                              {sub}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Lengkap Siswa
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama lengkap siswa"
                  value={formData.nama}
                  onChange={(e) =>
                    setFormData({ ...formData, nama: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  NISN (10 Digit)
                </label>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  pattern="\d{10}"
                  minLength={10}
                  maxLength={10}
                  title="NISN harus terdiri dari 10 angka"
                  placeholder="Nomor Induk Siswa Nasional"
                  value={formData.nisn}
                  onChange={(e) =>
                    setFormData({ ...formData, nisn: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 font-mono"
                />
              </div>
            </div>

            {isMutasiMasuk ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={formData.jenisKelamin}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        jenisKelamin: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 bg-white"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Daftar ke Rombel Kelas
                  </label>
                  <select
                    value={formData.kelas}
                    onChange={(e) =>
                      setFormData({ ...formData, kelas: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 bg-white"
                  >
                    {KELAS_PENDAFTARAN.map((kelas) => (
                      <option key={kelas} value={kelas}>
                        Kelas {kelas}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Kelas Saat Ini
                </label>
                <select
                  value={formData.kelas}
                  onChange={(e) =>
                    setFormData({ ...formData, kelas: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 bg-white"
                >
                  {KELAS_PENDAFTARAN.map((kelas) => (
                    <option key={kelas} value={kelas}>
                      Kelas {kelas}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {isMutasiMasuk ? "Nama Sekolah Asal" : "Nama Sekolah Tujuan"}
              </label>
              <input
                type="text"
                required
                placeholder={
                  isMutasiMasuk
                    ? "Contoh: SMPN 2 Gambut / MTsN 1 Banjarmasin"
                    : "Contoh: SMPN 2 Banjarmasin / SMPN di kota lain"
                }
                value={formData.sekolah}
                onChange={(e) =>
                  setFormData({ ...formData, sekolah: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {isMutasiMasuk
                  ? "Alasan Pindah / Mutasi"
                  : "Alasan Pindah / Mutasi Keluar"}
              </label>
              <textarea
                rows={3}
                required
                placeholder={
                  isMutasiMasuk
                    ? "Contoh: Mengikuti domisili kepindahan tugas kerja orang tua ke Kertak Hanyar"
                    : "Contoh: Mengikuti domisili orang tua / pindah tempat tinggal"
                }
                value={formData.alasan}
                onChange={(e) =>
                  setFormData({ ...formData, alasan: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Orang Tua / Wali
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama wali murid"
                  value={formData.namaWali}
                  onChange={(e) =>
                    setFormData({ ...formData, namaWali: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isMutasiMasuk
                    ? "No. WhatsApp Wali"
                    : "No. WhatsApp Orang Tua"}
                </label>
                <input
                  type="tel"
                  required
                  inputMode="tel"
                  placeholder="Contoh: 081234567890"
                  value={formData.noTeleponWali}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      noTeleponWali: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {isMutasiMasuk
                  ? "Foto Surat Keterangan Pindah Sekolah (Opsional/Bisa Menyusul)"
                  : "Berkas Pendukung (Surat Permohonan / KTP Orang Tua)"}
              </label>
              <input
                type="file"
                accept={
                  isMutasiMasuk ? "image/*" : "image/*,application/pdf"
                }
                required={!isMutasiMasuk}
                onChange={handleUploadBerkas}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {berkas && (
                <p className="text-[10px] text-emerald-600 font-semibold mt-1.5">
                  ✅ Berkas siap dikirim.
                </p>
              )}
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={menyimpan}
                className={`w-full py-3 disabled:opacity-60 text-white font-bold rounded-xl shadow-sm transition hover:scale-[1.01] active:scale-[0.99] ${
                  isMutasiMasuk
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-cyan-600 hover:bg-cyan-700"
                }`}
              >
                {menyimpan
                  ? "Mengirim..."
                  : isMutasiMasuk
                    ? "Kirim Berkas Pendaftaran Mutasi Masuk"
                    : "Kirim Permohonan Mutasi Keluar"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {notifSukses && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="judul-sukses-mutasi"
        >
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-600">
              ✓
            </div>
            <h2
              id="judul-sukses-mutasi"
              className="text-lg font-bold text-slate-900"
            >
              Pendaftaran Berhasil!
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Mengalihkan ke WhatsApp Layanan Mutasi TU dalam{" "}
              <span className="font-black text-blue-600">{sisaDetik}</span>{" "}
              detik...
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
              Jika pengalihan otomatis tidak berjalan, gunakan tombol di bawah
              ini untuk membuka WhatsApp Admin TU.
            </p>

            <a
              href={tautanWa}
              target="_blank"
              rel="noreferrer"
              onClick={() => setSudahDialihkan(true)}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.99]"
            >
              <span>💬</span>
              <span>Buka WhatsApp Admin TU Sekarang</span>
            </a>

            <Link
              href="/"
              className="mt-3 inline-block text-[11px] font-semibold text-slate-500 transition hover:text-blue-600"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
