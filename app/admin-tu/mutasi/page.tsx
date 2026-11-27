"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { api } from "@/lib/api-client";
import {
  bacaDaftarMutasiLokal,
  berlanggananPerubahanMutasi,
  gabungkanMutasi,
  mutasiStoreSudahAda,
  simpanPerubahanMutasi,
  tambahMutasiLokal,
} from "@/lib/mutasi-store";
import {
  apakahAdminTu,
  apakahLogin,
  bacaPeranPenggunaLokal,
  hapusSesiGuru,
  PERAN_PENGGUNA_LOKAL_KEY,
} from "@/lib/storage";
import type { MutasiSiswa, MutasiSiswaPayload } from "@/lib/types";

type FilterJenis = "SEMUA" | "MASUK" | "KELUAR";
type FilterStatus =
  | "SEMUA"
  | "Menunggu Verifikasi"
  | "Berkas Terverifikasi"
  | "Disetujui"
  | "Ditolak";

const BERKAS_FISIK = [
  "Surat permohonan orang tua / wali",
  "Surat keterangan pindah sekolah",
  "Fotokopi kartu keluarga",
  "Fotokopi rapor / ijazah terakhir",
] as const;

const STATUS_TERVERIFIKASI = "Berkas Terverifikasi";
const STATUS_DISETUJUI = "Disetujui";
const STATUS_DITOLAK = "Ditolak";

interface FormMutasiBaru {
  namaSiswa: string;
  nisn: string;
  jenisMutasi: "MASUK" | "KELUAR";
  kelas: string;
  sekolah: string;
  alasan: string;
  namaWali: string;
  noTeleponWali: string;
}

const FORM_MUTASI_KOSONG: FormMutasiBaru = {
  namaSiswa: "",
  nisn: "",
  jenisMutasi: "MASUK",
  kelas: "",
  sekolah: "",
  alasan: "",
  namaWali: "",
  noTeleponWali: "",
};

function berkasSudahDiverifikasi(status: string): boolean {
  const teks = status.toLowerCase();
  return teks !== "menunggu verifikasi" && !teks.includes("menunggu");
}

function formatTanggal(tanggal: string | null | undefined): string {
  if (!tanggal) return "-";
  const normal = tanggal.includes("T")
    ? tanggal
    : `${tanggal.replace(" ", "T")}Z`;
  const parsed = new Date(normal);
  if (Number.isNaN(parsed.getTime())) return tanggal;

  return parsed.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function badgeStatus(status: string): string {
  const teks = status.toLowerCase();
  if (teks.includes("tolak")) {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  if (teks.includes("setuju") || teks.includes("terima")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (teks.includes("verifikasi")) {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }
  return "bg-amber-50 text-amber-700 border-amber-200";
}

export default function AdminTuMutasiPage() {
  const router = useRouter();
  const [siap, setSiap] = useState(false);
  const [memuat, setMemuat] = useState(true);
  const [daftar, setDaftar] = useState<MutasiSiswa[]>([]);

  const [filterJenis, setFilterJenis] = useState<FilterJenis>("SEMUA");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("SEMUA");
  const [pencarian, setPencarian] = useState("");

  const [berkasFisik, setBerkasFisik] = useState<Record<number, boolean[]>>({});
  const [nomorSurat, setNomorSurat] = useState<Record<number, string>>({});
  const [memproses, setMemproses] = useState<number | null>(null);
  const [pesanSukses, setPesanSukses] = useState("");
  const [pesanError, setPesanError] = useState("");
  const [pratinjau, setPratinjau] = useState<{
    url: string;
    nama: string;
  } | null>(null);
  const [tampilFormBaru, setTampilFormBaru] = useState(false);
  const [formBaru, setFormBaru] = useState<FormMutasiBaru>(FORM_MUTASI_KOSONG);

  useEffect(() => {
    bacaPeranPenggunaLokal();
    const peranLokal = window.localStorage.getItem(PERAN_PENGGUNA_LOKAL_KEY);

    if (
      peranLokal !== "tu" ||
      !apakahLogin("guru") ||
      !apakahAdminTu()
    ) {
      router.replace("/dashboard-guru?akses=ditolak");
      return;
    }

    setSiap(true);

    let masihAktif = true;
    const terapkanDaftar = (data: MutasiSiswa[]) => {
      setDaftar(data);
      setBerkasFisik(
        Object.fromEntries(
          data.map((item) => [
            item.id,
            BERKAS_FISIK.map(() => berkasSudahDiverifikasi(item.statusBerkas)),
          ])
        )
      );
      setNomorSurat(
        Object.fromEntries(
          data.map((item) => [item.id, item.noSuratMutasi ?? ""])
        )
      );
      setMemuat(false);
    };

    // Tampilkan data browser seketika agar tombol verifikasi langsung bisa
    // diklik tanpa menunggu respons API/serverless.
    const storeSudahAda = mutasiStoreSudahAda();
    terapkanDaftar(gabungkanMutasi([]));

    const muatData = async () => {
      // Server hanya dipakai sekali saat store masih kosong. Setelah itu
      // localStorage selalu menang agar checklist pengguna tidak tertimpa.
      if (storeSudahAda) return;

      let dariServer: MutasiSiswa[] = [];
      try {
        dariServer = await api.getMutasiSiswa();
      } catch (error) {
        console.error("Gagal memuat mutasi siswa dari server:", error);
      }

      if (!masihAktif) return;
      if (dariServer.length > 0) {
        terapkanDaftar(gabungkanMutasi(dariServer));
      }
    };

    void muatData();

    return () => {
      masihAktif = false;
    };
  }, [router]);

  // Perubahan status dari halaman lain langsung tampil di rekap dan kartu.
  useEffect(() => {
    return berlanggananPerubahanMutasi(() => {
      if (!apakahAdminTu()) return;
      const data = bacaDaftarMutasiLokal();
      setDaftar(data);
      setBerkasFisik(
        Object.fromEntries(
          data.map((item) => [
            item.id,
            BERKAS_FISIK.map(() => berkasSudahDiverifikasi(item.statusBerkas)),
          ])
        )
      );
      setNomorSurat(
        Object.fromEntries(
          data.map((item) => [item.id, item.noSuratMutasi ?? ""])
        )
      );
    });
  }, []);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Abaikan kegagalan jaringan; sesi lokal tetap dibersihkan.
    }
    hapusSesiGuru();
    router.replace("/login-guru");
  };

  const daftarTampil = useMemo(() => {
    const kunci = pencarian.trim().toLowerCase();

    return daftar.filter((item) => {
      if (filterJenis !== "SEMUA" && item.jenisMutasi !== filterJenis) {
        return false;
      }
      if (filterStatus !== "SEMUA") {
        const status = item.statusBerkas.toLowerCase();
        if (filterStatus === "Disetujui") {
          // "Diterima"/"Selesai" adalah status akhir data contoh mutasi.
          if (
            !status.includes("setuju") &&
            !status.includes("terima") &&
            !status.includes("selesai")
          ) {
            return false;
          }
        } else if (filterStatus === "Ditolak") {
          if (!status.includes("tolak")) return false;
        } else if (filterStatus === "Menunggu Verifikasi") {
          if (!status.includes("menunggu")) return false;
        } else if (filterStatus === "Berkas Terverifikasi") {
          if (
            !status.includes("verifikasi") ||
            status.includes("menunggu")
          ) {
            return false;
          }
        } else if (item.statusBerkas !== filterStatus) {
          return false;
        }
      }
      if (!kunci) return true;

      return [item.namaSiswa, item.nisn, item.kelas, item.sekolahAsalTujuan]
        .filter(Boolean)
        .some((nilai) => String(nilai).toLowerCase().includes(kunci));
    });
  }, [daftar, filterJenis, filterStatus, pencarian]);

  const jumlah = useMemo(
    () => ({
      masuk: daftar.filter((item) => item.jenisMutasi === "MASUK").length,
      keluar: daftar.filter((item) => item.jenisMutasi === "KELUAR").length,
      menunggu: daftar.filter((item) =>
        item.statusBerkas.toLowerCase().includes("menunggu")
      ).length,
      disetujui: daftar.filter((item) => {
        const status = item.statusBerkas.toLowerCase();
        return (
          status.includes("setuju") ||
          status.includes("terima") ||
          status.includes("selesai")
        );
      }).length,
    }),
    [daftar]
  );

  const perbaruiItem = (hasil: MutasiSiswa) => {
    // Tulis ke localStorage lebih dulu agar keputusan permanen walau API
    // SQLite Vercel gagal.
    const daftarTerbaru = simpanPerubahanMutasi(hasil.id, hasil);
    setDaftar(daftarTerbaru);
    setNomorSurat((sebelumnya) => ({
      ...sebelumnya,
      [hasil.id]: hasil.noSuratMutasi ?? "",
    }));
    if (berkasSudahDiverifikasi(hasil.statusBerkas)) {
      setBerkasFisik((sebelumnya) => ({
        ...sebelumnya,
        [hasil.id]: BERKAS_FISIK.map(() => true),
      }));
    }
  };

  const ubahBerkas = (id: number, indeks: number) => {
    setBerkasFisik((sebelumnya) => {
      const saatIni = sebelumnya[id] ?? BERKAS_FISIK.map(() => false);
      const salinan = [...saatIni];
      salinan[indeks] = !salinan[indeks];
      return { ...sebelumnya, [id]: salinan };
    });
  };

  const semuaBerkasLengkap = (id: number): boolean => {
    const daftarCek = berkasFisik[id];
    return Boolean(daftarCek?.length) && daftarCek.every(Boolean);
  };

  const handleVerifikasi = (item: MutasiSiswa) => {
    setPesanSukses("");
    setPesanError("");

    if (!semuaBerkasLengkap(item.id)) {
      setPesanError(
        `Berkas fisik ${item.namaSiswa ?? "siswa"} belum lengkap. Centang seluruh dokumen terlebih dahulu.`
      );
      return;
    }

    setMemproses(item.id);
    const hasil: MutasiSiswa = {
      ...item,
      statusBerkas: STATUS_TERVERIFIKASI,
    };
    perbaruiItem(hasil);
    setPesanSukses(
      `Berkas fisik ${item.namaSiswa ?? "siswa"} dinyatakan lengkap dan terverifikasi.`
    );
    setMemproses(null);

    // Kirim salinan ke server sebagai cadangan. Kegagalan SQLite tidak
    // membatalkan status yang sudah tersimpan di localStorage.
    void api
      .updateMutasiSiswa(item.id, { statusBerkas: STATUS_TERVERIFIKASI })
      .catch((error) =>
        console.error("Gagal menyinkronkan verifikasi ke server:", error)
      );
  };

  const handleKeputusan = (
    item: MutasiSiswa,
    keputusan: "Disetujui" | "Ditolak"
  ) => {
    setPesanSukses("");
    setPesanError("");

    if (keputusan === STATUS_DISETUJUI) {
      if (!semuaBerkasLengkap(item.id)) {
        setPesanError(
          "Mutasi hanya dapat disetujui setelah seluruh berkas fisik terverifikasi."
        );
        return;
      }

      const surat = (nomorSurat[item.id] ?? "").trim();
      if (!surat) {
        setPesanError(
          "Nomor Surat Rekomendasi / Pindah wajib diisi sebelum menyetujui mutasi."
        );
        return;
      }
    }

    const konfirmasi = window.confirm(
      keputusan === STATUS_DISETUJUI
        ? `Setujui mutasi ${item.jenisMutasi} untuk ${item.namaSiswa ?? "siswa ini"}?`
        : `Tolak pengajuan mutasi ${item.jenisMutasi} untuk ${item.namaSiswa ?? "siswa ini"}?`
    );
    if (!konfirmasi) return;

    setMemproses(item.id);
    const nomor = (nomorSurat[item.id] ?? "").trim();
    const hasil: MutasiSiswa = {
      ...item,
      statusBerkas: keputusan,
      ...(keputusan === STATUS_DISETUJUI ? { noSuratMutasi: nomor } : {}),
    };
    perbaruiItem(hasil);
    setPesanSukses(
      keputusan === STATUS_DISETUJUI
        ? `Mutasi ${item.namaSiswa ?? "siswa"} berhasil disetujui.`
        : `Pengajuan mutasi ${item.namaSiswa ?? "siswa"} ditolak.`
    );
    setMemproses(null);

    void api
      .updateMutasiSiswa(item.id, {
        statusBerkas: keputusan,
        ...(keputusan === STATUS_DISETUJUI ? { noSuratMutasi: nomor } : {}),
      })
      .catch((error) =>
        console.error("Gagal menyinkronkan keputusan ke server:", error)
      );
  };

  const handleTambahMutasiBaru = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: MutasiSiswaPayload = {
      siswaId: null,
      namaSiswa: formBaru.namaSiswa.trim(),
      nisn: formBaru.nisn.trim(),
      jenisKelamin: "Laki-laki",
      kelas: formBaru.kelas.trim() || null,
      jenisMutasi: formBaru.jenisMutasi,
      tanggalMutasi: new Date().toISOString().slice(0, 10),
      sekolahAsalTujuan: formBaru.sekolah.trim(),
      alasan: formBaru.alasan.trim(),
      noSuratMutasi: null,
      namaWali: formBaru.namaWali.trim() || null,
      noTeleponWali: formBaru.noTeleponWali.trim() || null,
      berkasPendukung: null,
      statusBerkas: "Menunggu Verifikasi",
    };

    const baru = tambahMutasiLokal(payload);
    setDaftar(bacaDaftarMutasiLokal());
    setNomorSurat((sebelumnya) => ({ ...sebelumnya, [baru.id]: "" }));
    setBerkasFisik((sebelumnya) => ({
      ...sebelumnya,
      [baru.id]: BERKAS_FISIK.map(() => false),
    }));
    setFormBaru(FORM_MUTASI_KOSONG);
    setTampilFormBaru(false);
    setPesanError("");
    setPesanSukses(
      `Pengajuan mutasi ${baru.namaSiswa} ditambahkan dan menunggu verifikasi.`
    );

    void api.createMutasiSiswa(payload).catch((error) =>
      console.error("Gagal mengirim salinan pengajuan ke server:", error)
    );
  };

  if (!siap) {
    return (
      <main className="min-h-screen bg-[#f8fbff] flex items-center justify-center text-xs font-semibold text-slate-500">
        Memeriksa akses Tata Usaha...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fbff] text-slate-800 font-sans pb-16">
      <PageHeader
        title="KELOLA MUTASI SISWA"
        subtitle="Verifikasi Berkas & Keputusan Tata Usaha"
      >
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            href="/admin-tu"
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
          >
            ← Kembali ke Dashboard TU
          </Link>
          <Link
            href="/"
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-blue-700"
          >
            Beranda
          </Link>
          <button
            onClick={handleLogout}
            className="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-100"
          >
            Keluar
          </button>
        </div>
      </PageHeader>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 mb-6 flex items-start gap-3">
          <span className="shrink-0 w-9 h-9 rounded-xl bg-white/70 border border-amber-200 flex items-center justify-center text-lg">
            🔐
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
              Akses Khusus Tata Usaha
            </p>
            <p className="text-[11px] sm:text-xs text-amber-800 mt-1 leading-relaxed">
              Periksa keaslian berkas fisik, masukkan Nomor Surat Rekomendasi /
              Pindah, lalu setujui atau tolak pengajuan. Data ini tidak terlihat
              oleh guru piket maupun wali kelas.
            </p>
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={() => setTampilFormBaru((nilai) => !nilai)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition"
          >
            {tampilFormBaru ? "− Tutup Formulir" : "+ Ajukan Mutasi Baru"}
          </button>
        </div>

        {tampilFormBaru && (
          <form
            onSubmit={handleTambahMutasiBaru}
            className="bg-white border border-blue-200 rounded-2xl shadow-sm p-4 sm:p-5 mb-6"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Formulir Pengajuan Mutasi Baru
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Berkas baru langsung masuk antrean dengan status Menunggu
                  Verifikasi dan tersimpan di perangkat.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTampilFormBaru(false)}
                className="text-xs font-bold text-slate-500 hover:text-rose-600"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(
                [
                  ["Nama Siswa", "namaSiswa", "Contoh: Aisyah Putri Ramadhani", true],
                  ["NISN", "nisn", "Contoh: 0119000157", true],
                  ["Kelas", "kelas", "Contoh: 8B", false],
                  ["Sekolah Asal / Tujuan", "sekolah", "Nama sekolah", true],
                  ["Nama Orang Tua / Wali", "namaWali", "Nama wali", false],
                  ["No. Telepon Wali", "noTeleponWali", "08xxxxxxxxxx", false],
                ] as const
              ).map(([label, kunci, placeholder, wajib]) => (
                <label key={kunci} className="block">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    {label}
                  </span>
                  <input
                    type="text"
                    required={wajib}
                    value={formBaru[kunci]}
                    onChange={(e) =>
                      setFormBaru((sebelumnya) => ({
                        ...sebelumnya,
                        [kunci]: e.target.value,
                      }))
                    }
                    placeholder={placeholder}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </label>
              ))}
              <label className="block">
                <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Jenis Mutasi
                </span>
                <select
                  value={formBaru.jenisMutasi}
                  onChange={(e) =>
                    setFormBaru((sebelumnya) => ({
                      ...sebelumnya,
                      jenisMutasi: e.target.value as FormMutasiBaru["jenisMutasi"],
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="MASUK">Mutasi Masuk</option>
                  <option value="KELUAR">Mutasi Keluar</option>
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Alasan Mutasi
                </span>
                <textarea
                  required
                  rows={2}
                  value={formBaru.alasan}
                  onChange={(e) =>
                    setFormBaru((sebelumnya) => ({
                      ...sebelumnya,
                      alasan: e.target.value,
                    }))
                  }
                  placeholder="Alasan pengajuan mutasi"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white transition"
              >
                Simpan Pengajuan
              </button>
            </div>
          </form>
        )}

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <p className="text-[10px] font-semibold text-slate-500 uppercase">
              Mutasi Masuk
            </p>
            <h3 className="text-xl font-black text-blue-600 mt-1">
              {memuat ? "..." : jumlah.masuk}
            </h3>
          </div>
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <p className="text-[10px] font-semibold text-slate-500 uppercase">
              Mutasi Keluar
            </p>
            <h3 className="text-xl font-black text-amber-600 mt-1">
              {memuat ? "..." : jumlah.keluar}
            </h3>
          </div>
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <p className="text-[10px] font-semibold text-slate-500 uppercase">
              Menunggu Verifikasi
            </p>
            <h3 className="text-xl font-black text-rose-600 mt-1">
              {memuat ? "..." : jumlah.menunggu}
            </h3>
          </div>
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <p className="text-[10px] font-semibold text-slate-500 uppercase">
              Disetujui
            </p>
            <h3 className="text-xl font-black text-emerald-600 mt-1">
              {memuat ? "..." : jumlah.disetujui}
            </h3>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 mb-6 flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Cari Siswa / Sekolah
            </label>
            <input
              type="text"
              value={pencarian}
              onChange={(e) => setPencarian(e.target.value)}
              placeholder="Nama, NISN, kelas, atau sekolah asal/tujuan"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Jenis
            </label>
            <select
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value as FilterJenis)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-blue-500"
            >
              <option value="SEMUA">Semua Jenis</option>
              <option value="MASUK">Mutasi Masuk</option>
              <option value="KELUAR">Mutasi Keluar</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as FilterStatus)
              }
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-blue-500"
            >
              <option value="SEMUA">Semua Status</option>
              <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
              <option value="Berkas Terverifikasi">Berkas Terverifikasi</option>
              <option value="Disetujui">Disetujui</option>
              <option value="Ditolak">Ditolak</option>
            </select>
          </div>
        </div>

        {pesanSukses && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
            ✅ {pesanSukses}
          </div>
        )}
        {pesanError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            ⛔ {pesanError}
          </div>
        )}

        {memuat ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs font-semibold text-slate-500">
            Memuat pengajuan mutasi...
          </div>
        ) : daftarTampil.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <p className="text-sm font-bold text-slate-600">
              Tidak ada pengajuan mutasi yang cocok.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Ubah filter atau tunggu pengajuan baru dari formulir mutasi siswa.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {daftarTampil.map((item) => {
              const cek = berkasFisik[item.id] ?? BERKAS_FISIK.map(() => false);
              const lengkap = semuaBerkasLengkap(item.id);
              const diproses = memproses === item.id;
              const statusFinal = item.statusBerkas.toLowerCase();
              const final =
                statusFinal.includes("setuju") ||
                statusFinal.includes("tolak") ||
                statusFinal.includes("terima") ||
                statusFinal.includes("selesai");
              const berkas = item.berkasPendukung;

              return (
                <article
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
                >
                  <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2.5 py-0.5 rounded border text-[10px] font-bold ${
                            item.jenisMutasi === "MASUK"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          MUTASI {item.jenisMutasi}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded border text-[10px] font-bold ${badgeStatus(
                            item.statusBerkas
                          )}`}
                        >
                          {item.statusBerkas}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          #{item.id}
                        </span>
                      </div>
                      <h2 className="text-sm font-bold text-slate-900 mt-2">
                        {item.namaSiswa || "Siswa Tanpa Nama"}
                      </h2>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        NISN {item.nisn || "-"} • Kelas {item.kelas || "-"} •{" "}
                        {item.jenisKelamin || "-"}
                      </p>
                    </div>
                    <div className="text-left sm:text-right text-[11px] text-slate-500">
                      <p>
                        Tanggal Mutasi:{" "}
                        <span className="font-semibold text-slate-700">
                          {item.tanggalMutasi}
                        </span>
                      </p>
                      <p className="mt-0.5">
                        Diajukan:{" "}
                        <span className="font-semibold text-slate-700">
                          {formatTanggal(item.createdAt)}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          Sekolah Asal / Tujuan
                        </p>
                        <p className="text-xs font-semibold text-slate-800 mt-0.5">
                          {item.sekolahAsalTujuan}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          Alasan Mutasi
                        </p>
                        <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">
                          {item.alasan}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">
                            Nama Wali
                          </p>
                          <p className="text-xs text-slate-700 mt-0.5">
                            {item.namaWali || "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">
                            No. Telepon Wali
                          </p>
                          <p className="text-xs text-slate-700 mt-0.5">
                            {item.noTeleponWali || "-"}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          Berkas Pendukung
                        </p>
                        {berkas ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPratinjau({
                                url: berkas,
                                nama: item.namaSiswa || "Siswa",
                              })
                            }
                            className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition"
                          >
                            📎 Lihat Berkas Unggahan
                          </button>
                        ) : (
                          <p className="text-[11px] text-slate-400 mt-1">
                            Tidak ada berkas digital yang diunggah.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">
                          Checklist Verifikasi Berkas Fisik
                        </p>
                        <div className="mt-2 space-y-1.5">
                          {BERKAS_FISIK.map((label, indeks) => (
                            <label
                              key={label}
                              className="flex items-start gap-2 text-[11px] text-slate-700 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={Boolean(cek[indeks])}
                                onChange={() => ubahBerkas(item.id, indeks)}
                                disabled={diproses}
                                className="mt-0.5 accent-blue-600"
                              />
                              <span>{label}</span>
                            </label>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleVerifikasi(item)}
                          disabled={diproses || !lengkap || final}
                          className="mt-3 w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-[11px] font-bold transition"
                        >
                          {diproses
                            ? "Menyimpan..."
                            : lengkap
                              ? "Simpan Verifikasi Berkas"
                              : "Lengkapi Checklist Dulu"}
                        </button>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Nomor Surat Rekomendasi / Pindah
                        </label>
                        <input
                          type="text"
                          value={nomorSurat[item.id] ?? ""}
                          onChange={(e) =>
                            setNomorSurat((sebelumnya) => ({
                              ...sebelumnya,
                              [item.id]: e.target.value,
                            }))
                          }
                          disabled={diproses || final}
                          placeholder="Contoh: 421.3/123/SMPN1-KH/2026"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono focus:outline-none focus:border-blue-500 disabled:bg-slate-100"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleKeputusan(item, STATUS_DISETUJUI)}
                          disabled={diproses || final}
                          className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-[11px] font-bold transition"
                        >
                          ✓ Setujui Mutasi
                        </button>
                        <button
                          type="button"
                          onClick={() => handleKeputusan(item, STATUS_DITOLAK)}
                          disabled={diproses || final}
                          className="flex-1 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-[11px] font-bold transition"
                        >
                          ✕ Tolak Mutasi
                        </button>
                      </div>

                      {final && (
                        <p className="text-[10px] text-slate-400 text-center">
                          Keputusan sudah final dan tidak dapat diubah dari
                          halaman ini.
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {pratinjau && (
        <div
          className="fixed inset-0 z-[80] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPratinjau(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">
                  Berkas Pendukung
                </p>
                <h3 className="text-sm font-bold text-slate-800">
                  {pratinjau.nama}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={pratinjau.url}
                  download={`berkas-mutasi-${pratinjau.nama}`}
                  className="text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition"
                >
                  Unduh
                </a>
                <button
                  type="button"
                  onClick={() => setPratinjau(null)}
                  className="text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition"
                >
                  Tutup
                </button>
              </div>
            </div>
            <div className="overflow-auto bg-slate-100 flex-1 p-3">
              {pratinjau.url.startsWith("data:application/pdf") ? (
                <iframe
                  src={pratinjau.url}
                  title={`Berkas ${pratinjau.nama}`}
                  className="w-full h-[70vh] rounded-lg bg-white"
                />
              ) : pratinjau.url.startsWith("data:image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pratinjau.url}
                  alt={`Berkas ${pratinjau.nama}`}
                  className="max-w-full mx-auto rounded-lg bg-white"
                />
              ) : (
                <div className="p-10 text-center text-xs text-slate-500">
                  Format berkas tidak dapat dipratinjau. Silakan gunakan tombol
                  Unduh.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
