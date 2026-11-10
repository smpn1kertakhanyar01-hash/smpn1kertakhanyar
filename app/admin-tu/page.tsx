"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import NotifikasiWhatsAppFallback, {
  type DataFallbackWhatsApp,
} from "@/components/NotifikasiWhatsAppFallback";
import { api } from "@/lib/api-client";
import { susunHasilNotifikasiIzin } from "@/lib/izin-notifikasi";
import {
  ambilDaftarIzinLengkap,
  berlanggananPerubahanIzin,
  normalisasiStatusIzin,
  simpanOverrideIzin,
  terapkanOverrideIzin,
} from "@/lib/izin-store";
import {
  apakahAdminTu,
  apakahLogin,
  bacaNamaGuru,
  hapusSesiGuru,
} from "@/lib/storage";
import type { MutasiSiswa, SuratIzinItem } from "@/lib/types";

export default function AdminTuPage() {
  const router = useRouter();
  const [siap, setSiap] = useState(false);
  const [nama, setNama] = useState("");
  const [daftarMutasi, setDaftarMutasi] = useState<MutasiSiswa[]>([]);
  const [daftarIzin, setDaftarIzin] = useState<SuratIzinItem[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [memprosesIzin, setMemprosesIzin] = useState<number | null>(null);
  const [fallbackWa, setFallbackWa] =
    useState<DataFallbackWhatsApp | null>(null);

  const [sandiLama, setSandiLama] = useState("");
  const [sandiBaru, setSandiBaru] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [pesanSandi, setPesanSandi] = useState("");
  const [errorSandi, setErrorSandi] = useState("");
  const [menyimpanSandi, setMenyimpanSandi] = useState(false);

  useEffect(() => {
    if (!apakahLogin("guru") || !apakahAdminTu()) {
      router.replace("/dashboard-guru?akses=ditolak");
      return;
    }

    setNama(bacaNamaGuru());
    setSiap(true);

    let masihAktif = true;
    const muatData = async () => {
      try {
        const data = await api.getMutasiSiswa();
        if (masihAktif) setDaftarMutasi(data);
      } catch (error) {
        console.error("Gagal memuat rekap mutasi:", error);
      }

      try {
        const izin = await api.getLeaveRequests();
        if (masihAktif) setDaftarIzin(ambilDaftarIzinLengkap(izin));
      } catch (error) {
        console.error("Gagal memuat rekap surat izin:", error);
      }

      if (masihAktif) setMemuat(false);
    };

    void muatData();

    return () => {
      masihAktif = false;
    };
  }, [router]);

  // Sinkronkan keputusan izin dengan Dashboard Guru dan portal siswa.
  useEffect(() => {
    const berhenti = berlanggananPerubahanIzin(() => {
      if (!apakahLogin("guru") || !apakahAdminTu()) return;
      api
        .getLeaveRequests()
        .then((data) => setDaftarIzin(ambilDaftarIzinLengkap(data)))
        .catch((error) =>
          console.error("Gagal menyinkronkan status izin:", error)
        );
    });
    return berhenti;
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

  const handleUpdateStatusIzin = async (id: number, statusBaru: string) => {
    try {
      let catatan: string | undefined;
      if (statusBaru === "Ditolak") {
        const alasan = prompt("Masukkan alasan penolakan surat izin:");
        if (alasan === null) return;
        catatan = alasan || "Tidak memenuhi persyaratan";
      }

      setMemprosesIzin(id);
      const hasil = await api.updateLeaveRequestStatus(id, statusBaru, catatan);

      // Simpan lebih dulu agar keputusan terbaru tidak tertimpa override lama.
      simpanOverrideIzin(hasil);
      const izinTerbaru = terapkanOverrideIzin(hasil);
      setDaftarIzin((prev) =>
        prev.map((item) => (item.id === id ? izinTerbaru : item))
      );

      if (statusBaru === "Disetujui") {
        // Notifikasi WhatsApp sudah dikirim otomatis oleh handler approval
        // di backend. Tampilkan sukses bila gateway berhasil; fallback hanya
        // muncul ketika pengiriman otomatis gagal.
        const notifikasi = susunHasilNotifikasiIzin(
          izinTerbaru,
          hasil.notifikasiWa
        );

        if (notifikasi.terkirim) {
          alert(
            "Surat izin berhasil disetujui dan notifikasi WhatsApp otomatis telah terkirim."
          );
        } else {
          setFallbackWa({ ...notifikasi, nama: izinTerbaru.nama });
        }
      }
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal memperbarui status pengajuan izin."
      );
    } finally {
      setMemprosesIzin(null);
    }
  };

  const handleGantiSandi = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPesanSandi("");
    setErrorSandi("");

    if (sandiBaru.length < 6) {
      setErrorSandi("Kata sandi baru minimal 6 karakter.");
      return;
    }

    if (sandiBaru !== konfirmasi) {
      setErrorSandi("Konfirmasi kata sandi baru belum cocok.");
      return;
    }

    setMenyimpanSandi(true);
    try {
      await api.changePasswordPegawai({ sandiLama, sandiBaru });
      setSandiLama("");
      setSandiBaru("");
      setKonfirmasi("");
      setPesanSandi("Kata sandi Admin TU berhasil diperbarui.");
    } catch (error) {
      setErrorSandi(
        error instanceof Error
          ? error.message
          : "Gagal memperbarui kata sandi. Silakan coba lagi."
      );
    } finally {
      setMenyimpanSandi(false);
    }
  };

  if (!siap) {
    return (
      <main className="min-h-screen bg-[#f8fbff] flex items-center justify-center text-xs font-semibold text-slate-500">
        Memeriksa akses Tata Usaha...
      </main>
    );
  }

  const totalMasuk = daftarMutasi.filter(
    (item) => item.jenisMutasi === "MASUK"
  ).length;
  const totalKeluar = daftarMutasi.filter(
    (item) => item.jenisMutasi === "KELUAR"
  ).length;
  const belumDiputuskan = daftarMutasi.filter((item) => {
    const status = item.statusBerkas.toLowerCase();
    return (
      !status.includes("setuju") &&
      !status.includes("tolak") &&
      !status.includes("terima") &&
      !status.includes("selesai")
    );
  }).length;

  const izinMenunggu = daftarIzin.filter(
    (item) => normalisasiStatusIzin(item.status) === "MENUNGGU"
  ).length;
  const izinDisetujui = daftarIzin.filter(
    (item) => normalisasiStatusIzin(item.status) === "DISETUJUI"
  ).length;

  return (
    <main className="min-h-screen bg-[#f8fbff] text-slate-800 font-sans pb-16">
      <PageHeader
        title="DASHBOARD TATA USAHA"
        subtitle="Pengelolaan Administrasi Kesiswaan & Mutasi Siswa"
      >
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard-guru"
            className="text-xs text-slate-600 hover:text-blue-600 font-medium px-3 py-1.5 transition"
          >
            Portal Guru
          </Link>
          <Link
            href="/"
            className="text-xs text-slate-600 hover:text-blue-600 font-medium px-3 py-1.5 transition"
          >
            ← Beranda
          </Link>
          <button
            onClick={handleLogout}
            className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-semibold px-3 py-1.5 rounded-lg transition"
          >
            Keluar
          </button>
        </div>
      </PageHeader>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 mb-6 flex items-start gap-3">
          <span className="shrink-0 w-9 h-9 rounded-xl bg-white/70 border border-amber-200 flex items-center justify-center text-lg">
            🗂️
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
              Akses Khusus Tata Usaha
            </p>
            <h2 className="text-sm font-bold text-amber-900 mt-0.5">
              Selamat bertugas, {nama || "Staf Tata Usaha"}
            </h2>
            <p className="text-[11px] sm:text-xs text-amber-800 mt-1 leading-relaxed">
              Menu Mutasi Siswa hanya dapat diakses dan dikelola oleh akun
              dengan peran <strong>ADMIN_TU</strong>. Guru piket dan wali kelas
              tidak melihat data ini di portal guru.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase">
              Total Pengajuan
            </p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">
              {memuat ? "..." : daftarMutasi.length}{" "}
              <span className="text-xs font-normal text-slate-400">Berkas</span>
            </h3>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase">
              Mutasi Masuk
            </p>
            <h3 className="text-2xl font-black text-blue-600 mt-1">
              {memuat ? "..." : totalMasuk}{" "}
              <span className="text-xs font-normal text-slate-400">Siswa</span>
            </h3>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase">
              Mutasi Keluar
            </p>
            <h3 className="text-2xl font-black text-amber-600 mt-1">
              {memuat ? "..." : totalKeluar}{" "}
              <span className="text-xs font-normal text-slate-400">Siswa</span>
            </h3>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase">
              Belum Diputuskan
            </p>
            <h3 className="text-2xl font-black text-rose-600 mt-1">
              {memuat ? "..." : belumDiputuskan}{" "}
              <span className="text-xs font-normal text-slate-400">Berkas</span>
            </h3>
          </div>
        </div>

        <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Verifikasi Surat Izin Siswa
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Keputusan Tata Usaha langsung tersinkron ke Dashboard Guru dan
                halaman Status Izin Siswa.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">
                Menunggu: {memuat ? "..." : izinMenunggu}
              </span>
              <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                Disetujui: {memuat ? "..." : izinDisetujui}
              </span>
            </div>
          </div>

          {memuat ? (
            <p className="p-8 text-center text-xs text-slate-400">
              Memuat daftar surat izin...
            </p>
          ) : daftarIzin.length === 0 ? (
            <p className="p-8 text-center text-xs text-slate-400">
              Belum ada pengajuan surat izin dari siswa.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-500">
                  <tr>
                    <th className="p-3">ID Izin</th>
                    <th className="p-3">Siswa</th>
                    <th className="p-3">Jenis & Tanggal</th>
                    <th className="p-3">Alasan</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {daftarIzin.map((item) => {
                    const status = normalisasiStatusIzin(item.status);
                    const kode =
                      item.kodeBerkas ||
                      `IZIN-${String(item.id).padStart(3, "0")}`;
                    const badge =
                      status === "DISETUJUI"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : status === "DITOLAK"
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-amber-200 bg-amber-50 text-amber-700";

                    return (
                      <tr
                        key={item.id}
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className="p-3 font-mono text-[11px] font-bold text-slate-700">
                          {kode}
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-slate-900">
                            {item.nama}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {item.nisn} • {item.kelas}
                          </p>
                        </td>
                        <td className="whitespace-nowrap p-3">
                          <p className="font-semibold text-slate-700">
                            {item.jenis}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {item.tanggal}
                          </p>
                        </td>
                        <td className="max-w-xs p-3 text-slate-500">
                          {item.alasan}
                        </td>
                        <td className="whitespace-nowrap p-3">
                          <span
                            className={`rounded border px-2 py-0.5 text-[10px] font-bold ${badge}`}
                          >
                            {status}
                          </span>
                          {(item.disetujuiOleh || item.diverifikasiOleh) && (
                            <p className="mt-1 max-w-[150px] text-[10px] text-slate-400">
                              oleh{" "}
                              {item.disetujuiOleh || item.diverifikasiOleh}
                            </p>
                          )}
                        </td>
                        <td className="whitespace-nowrap p-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateStatusIzin(item.id, "Disetujui")
                              }
                              disabled={memprosesIzin === item.id}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Setujui
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateStatusIzin(item.id, "Ditolak")
                              }
                              disabled={memprosesIzin === item.id}
                              className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                            >
                              Tolak
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Menu Utama Tata Usaha
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Verifikasi berkas, input nomor surat, lalu setujui atau tolak
                  pengajuan mutasi.
                </p>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                ADMIN_TU
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
              <Link
                href="/admin-tu/mutasi"
                className="group border border-blue-200 bg-blue-50/60 hover:bg-blue-50 rounded-2xl p-4 transition"
              >
                <span className="text-xl">📑</span>
                <h3 className="text-sm font-bold text-blue-900 mt-2 group-hover:text-blue-700">
                  Kelola Mutasi Siswa
                </h3>
                <p className="text-[11px] text-blue-800 mt-1 leading-relaxed">
                  Daftar mutasi masuk & keluar, verifikasi berkas fisik, nomor
                  surat, serta keputusan TU.
                </p>
              </Link>

              <Link
                href="/dashboard-guru"
                className="group border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-2xl p-4 transition"
              >
                <span className="text-xl">🏫</span>
                <h3 className="text-sm font-bold text-slate-800 mt-2 group-hover:text-slate-600">
                  Portal Kesiswaan
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Akses layanan presensi, surat izin, jurnal kejadian, dan akun
                  siswa sebagaimana tugas pegawai.
                </p>
              </Link>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6">
            <h2 className="text-sm font-bold text-slate-900">
              Ganti Kata Sandi
            </h2>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Kata sandi bawaan Admin TU dapat diganti di sini. Minimal 6
              karakter.
            </p>

            {pesanSandi && (
              <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
                ✅ {pesanSandi}
              </div>
            )}
            {errorSandi && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold">
                ⛔ {errorSandi}
              </div>
            )}

            <form onSubmit={handleGantiSandi} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Kata Sandi Lama
                </label>
                <input
                  type="password"
                  required
                  value={sandiLama}
                  onChange={(e) => setSandiLama(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Kata Sandi Baru
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={sandiBaru}
                  onChange={(e) => setSandiBaru(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Konfirmasi Kata Sandi Baru
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={konfirmasi}
                  onChange={(e) => setKonfirmasi(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <button
                type="submit"
                disabled={menyimpanSandi}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-bold rounded-xl transition"
              >
                {menyimpanSandi ? "Menyimpan..." : "Simpan Kata Sandi"}
              </button>
            </form>
          </section>
        </div>
      </div>
      <NotifikasiWhatsAppFallback
        data={fallbackWa}
        onClose={() => setFallbackWa(null)}
      />
    </main>
  );
}
