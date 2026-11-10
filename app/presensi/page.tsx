"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { api } from "@/lib/api-client";
import { STATUS_PRESENSI } from "@/lib/constants";
import { daftarSiswaFallback, normalisasiKelasSiswa } from "@/lib/data";
import { simpanPresensiLokal } from "@/lib/presensi-store";
import type { CatatanAbsen, Siswa, StatusPresensi } from "@/lib/types";
import { ambilTanggalHariIni, ambilWaktuSekarang } from "@/lib/utils";

/** Kelas yang selalu tersedia pada pilihan presensi. */
const KELAS_PRESENSI_DASAR = ["9A", "9B"] as const;

export default function PresensiKelasPage() {
  const router = useRouter();
  const [daftarSiswa, setDaftarSiswa] = useState<Siswa[]>([]);
  const [kelasTerpilih, setKelasTerpilih] = useState<string>("9A");
  const [tanggal, setTanggal] = useState<string>("");
  const [statusMap, setStatusMap] = useState<Record<string, StatusPresensi>>({});
  const [notifSukses, setNotifSukses] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);

  // Set tanggal hari ini otomatis
  useEffect(() => {
    setTanggal(ambilTanggalHariIni());
  }, []);

  // Ambil daftar siswa dari database
  useEffect(() => {
    let masihAktif = true;

    api
      .getStudents()
      .then((data) => {
        if (!masihAktif) return;

        const dataSiswa = data.map((siswa) => ({
          ...siswa,
          kelas: normalisasiKelasSiswa(siswa.kelas),
        }));
        const tampil = dataSiswa.length > 0 ? dataSiswa : daftarSiswaFallback();
        setDaftarSiswa(tampil);

        // Default kelas pertama adalah 9A; jika tidak ada, pakai kelas
        // pertama yang benar-benar memiliki siswa.
        setKelasTerpilih((sebelumnya) => {
          if (tampil.some((siswa) => siswa.kelas === sebelumnya)) {
            return sebelumnya;
          }
          if (tampil.some((siswa) => siswa.kelas === "9A")) return "9A";
          return tampil[0]?.kelas ?? KELAS_PRESENSI_DASAR[0];
        });
      })
      .catch((error) => {
        if (!masihAktif) return;
        console.error("Gagal memuat data siswa, memakai data fallback:", error);
        // Tetap tampilkan 63 siswa asli saat API/SQLite Vercel tidak terbaca.
        setDaftarSiswa(daftarSiswaFallback());
        setKelasTerpilih((sebelumnya) =>
          sebelumnya === "9A" || sebelumnya === "9B" ? sebelumnya : "9A"
        );
      });

    return () => {
      masihAktif = false;
    };
  }, []);

  const siswaPerKelas = useMemo(
    () =>
      daftarSiswa.reduce<Record<string, Siswa[]>>((grup, siswa) => {
        (grup[siswa.kelas] ??= []).push(siswa);
        return grup;
      }, {}),
    [daftarSiswa]
  );

  const siswaList = useMemo(
    () => siswaPerKelas[kelasTerpilih] ?? [],
    [siswaPerKelas, kelasTerpilih]
  );

  // Set status awal Hadir untuk semua siswa di rombel terpilih
  useEffect(() => {
    setStatusMap(
      siswaList.reduce<Record<string, StatusPresensi>>((status, siswa) => {
        status[siswa.nisn] = "Hadir";
        return status;
      }, {})
    );
  }, [siswaList]);

  const handleUbahStatus = (nisn: string, status: StatusPresensi) => {
    setStatusMap((prev) => ({
      ...prev,
      [nisn]: status,
    }));
  };

  const handleSetSemuaHadir = () => {
    setStatusMap(
      siswaList.reduce<Record<string, StatusPresensi>>((status, siswa) => {
        status[siswa.nisn] = "Hadir";
        return status;
      }, {})
    );
  };

  const handleSimpanPresensi = async (e: React.FormEvent) => {
    e.preventDefault();

    if (siswaList.length === 0) {
      alert("Belum ada data siswa untuk kelas ini.");
      return;
    }

    if (!tanggal) {
      alert("Pilih tanggal presensi terlebih dahulu.");
      return;
    }

    const waktuSekarang = ambilWaktuSekarang();
    const catatanBaru: CatatanAbsen[] = siswaList.map((siswa) => ({
      nisn: siswa.nisn,
      nama: siswa.nama,
      kelas: siswa.kelas,
      status: statusMap[siswa.nisn] ?? "Hadir",
      tanggal,
      jamInput: waktuSekarang,
    }));

    setMenyimpan(true);

    // Simpan lebih dulu ke localStorage agar rekap tetap terisi walaupun
    // database serverless Vercel bersifat sementara/tidak persisten.
    simpanPresensiLokal(catatanBaru);

    try {
      await api.saveAttendance(catatanBaru);
    } catch (error) {
      // Data lokal sudah tersimpan, jadi guru tetap dapat melihat rekap.
      console.error("Gagal menyimpan presensi ke server:", error);
    }

    setNotifSukses(true);
    setTimeout(() => {
      setNotifSukses(false);
      router.push("/dashboard-guru");
    }, 1200);
  };

  const kelasTersedia = useMemo(() => {
    const kelas = new Set<string>(KELAS_PRESENSI_DASAR);
    Object.keys(siswaPerKelas).forEach((k) => kelas.add(k));
    return Array.from(kelas).sort((a, b) =>
      a.localeCompare(b, "id", { numeric: true })
    );
  }, [siswaPerKelas]);

  return (
    <main className="min-h-screen bg-[#f8fbff] text-slate-800 font-sans pb-16">
      <PageHeader
        title="PRESENSI KELAS"
        subtitle="Panel Pengisian Absensi Guru & Wali Kelas"
        badgeClassName="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center font-black text-blue-700 text-xs"
      >
        <Link
          href="/dashboard-guru"
          className="text-xs text-slate-600 hover:text-blue-600 font-semibold px-3 py-1.5 transition"
        >
          ← Kembali ke Dashboard Guru
        </Link>
      </PageHeader>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {notifSukses && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2 shadow-sm">
            <span>✅</span>
            <span>
              Presensi kelas {kelasTerpilih} ({siswaList.length} siswa) berhasil disimpan! Kembali ke dashboard...
            </span>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Pilih Kelas
              </label>
              <select
                value={kelasTerpilih}
                onChange={(e) => setKelasTerpilih(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600"
              >
                {kelasTersedia.map((k) => (
                  <option key={k} value={k}>
                    Kelas {k}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Tanggal Presensi
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSetSemuaHadir}
            className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 py-2 rounded-xl transition"
          >
            ✓ Set Semua Hadir
          </button>
        </div>

        <form
          onSubmit={handleSimpanPresensi}
          className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-xs font-bold text-slate-700 uppercase">
              Daftar Murid Kelas {kelasTerpilih} ({siswaList.length} Siswa)
            </h2>
            <span className="text-[11px] text-slate-400">
              Pilih status kehadiran murid
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5 w-12 text-center">No</th>
                  <th className="p-3.5">Nama Siswa</th>
                  <th className="p-3.5">NISN</th>
                  <th className="p-3.5 text-center">Status Kehadiran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {siswaList.map((siswa, idx) => {
                  const currentStatus = statusMap[siswa.nisn] || "Hadir";
                  return (
                    <tr key={siswa.nisn} className="hover:bg-slate-50/70 transition">
                      <td className="p-3.5 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">{siswa.nama}</td>
                      <td className="p-3.5 text-slate-500 font-mono">{siswa.nisn}</td>
                      <td className="p-3.5">
                        <div className="flex justify-center items-center gap-1.5">
                          {STATUS_PRESENSI.map((st) => {
                            const isSelected = currentStatus === st;
                            let style = "bg-slate-100 text-slate-600 border-slate-200";
                            if (isSelected) {
                              if (st === "Hadir")
                                style = "bg-emerald-600 text-white border-emerald-600 shadow-sm";
                              if (st === "Sakit")
                                style = "bg-amber-500 text-white border-amber-500 shadow-sm";
                              if (st === "Izin")
                                style = "bg-blue-600 text-white border-blue-600 shadow-sm";
                              if (st === "Alpa")
                                style = "bg-rose-600 text-white border-rose-600 shadow-sm";
                            }

                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleUbahStatus(siswa.nisn, st)}
                                className={`px-3 py-1 rounded-lg border text-xs font-bold transition ${style}`}
                              >
                                {st}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
            <button
              type="submit"
              disabled={menyimpan}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold px-6 py-2.5 rounded-xl shadow-sm transition hover:scale-[1.02] active:scale-[0.98] text-xs"
            >
              {menyimpan ? "Menyimpan..." : "Simpan Presensi Kelas"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
