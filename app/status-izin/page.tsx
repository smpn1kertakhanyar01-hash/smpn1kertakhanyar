"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { bacaSesiSiswa, STORAGE_KEYS } from "@/lib/storage";
import type { SuratIzinItem } from "@/lib/types";

export default function StatusIzinPage() {
  const router = useRouter();
  const [daftarIzinSiswa, setDaftarIzinSiswa] = useState<SuratIzinItem[]>([]);
  const [siswaNama, setSiswaNama] = useState("");
  const [modalFoto, setModalFoto] = useState<string | null>(null);
  const [modalTtd, setModalTtd] = useState<string | null>(null);

  useEffect(() => {
    const loggedIn = localStorage.getItem(STORAGE_KEYS.isLoggedIn);

    if (loggedIn !== "true") {
      alert("Silakan login terlebih dahulu!");
      router.push("/login-siswa");
      return;
    }

    const sesi = bacaSesiSiswa();
    setSiswaNama(sesi.nama || "Siswa");

    let masihAktif = true;
    // Hanya tampilkan berkas milik siswa yang sedang login berdasarkan NISN
    api
      .getLeaveRequests(sesi.nisn)
      .then((data) => {
        if (masihAktif) setDaftarIzinSiswa(data);
      })
      .catch((error) => {
        console.error("Gagal memuat status izin:", error);
      });

    return () => {
      masihAktif = false;
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-[#fafbfc] text-slate-800 font-sans py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Tombol Kembali */}
        <div className="mb-6 flex justify-between items-center">
          <Link
            href="/surat-izin"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition"
          >
            ← Kembali ke Formulir Izin
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            Beranda Utama
          </Link>
        </div>

        {/* Kartu Status */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="border-b border-slate-100 pb-5 mb-6 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-3 py-1 rounded-full border border-sky-100">
                STATUS PENGAJUAN
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                Riwayat Surat Izin Saya
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Pemohon: <b className="text-slate-800">{siswaNama}</b>
              </p>
            </div>
            <Link
              href="/surat-izin"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition text-center shadow-sm"
            >
              + Ajukan Izin Baru
            </Link>
          </div>

          {daftarIzinSiswa.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm font-semibold text-slate-700">Belum Ada Pengajuan Surat</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Anda belum pernah mengajukan izin permohonan melalui portal daring.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {daftarIzinSiswa.map((item) => (
                <div
                  key={item.id}
                  className="border border-slate-200 rounded-2xl p-4 sm:p-5 hover:border-blue-200 transition bg-[#fdfefe]"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{item.jenis}</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-medium text-slate-500">{item.tanggal}</span>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-bold self-start sm:self-auto border ${
                        item.status === "Disetujui"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : item.status === "Ditolak"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                      }`}
                    >
                      {item.status === "Menunggu Persetujuan" ? "⏳ Menunggu Persetujuan" : item.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mb-3">
                    <b>Alasan:</b> {item.alasan}
                  </p>

                  <div className="flex flex-wrap gap-3">
                    {item.fotoBukti && (
                      <button
                        onClick={() => setModalFoto(item.fotoBukti || null)}
                        className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1"
                      >
                        📄 Lihat Foto Surat Bertanda Tangan
                      </button>
                    )}
                    {(item as any).tandaTanganWali && (
                      <button
                        onClick={() => setModalTtd((item as any).tandaTanganWali || null)}
                        className="text-xs text-emerald-600 hover:underline font-semibold flex items-center gap-1"
                      >
                        ✍️ Lihat Tanda Tangan Orang Tua/Wali
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Pratinjau Foto */}
      {modalFoto && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          style={{ pointerEvents: "auto" }}
          onClick={() => setModalFoto(null)}
        >
          <div className="bg-white p-4 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-auto relative z-[10000]" style={{ pointerEvents: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold text-slate-800">Foto Surat Fisik & Bukti Tanda Tangan</h3>
              <button
                onClick={() => setModalFoto(null)}
                className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg text-slate-600 cursor-pointer relative z-10"
              >
                ✕ Tutup
              </button>
            </div>
            <img src={modalFoto} alt="Bukti Surat" className="w-full rounded-2xl object-contain border" />
          </div>
        </div>
      )}

      {/* Modal Pratinjau Tanda Tangan */}
      {modalTtd && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          style={{ pointerEvents: "auto" }}
          onClick={() => setModalTtd(null)}
        >
          <div className="bg-white p-4 rounded-3xl max-w-lg w-full relative z-[10000]" style={{ pointerEvents: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold text-slate-800">Tanda Tangan Orang Tua/Wali</h3>
              <button
                onClick={() => setModalTtd(null)}
                className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg text-slate-600 cursor-pointer relative z-10"
              >
                ✕ Tutup
              </button>
            </div>
            <img src={modalTtd} alt="Tanda Tangan Orang Tua/Wali" className="w-full rounded-2xl object-contain border bg-white" />
            <p className="text-[10px] text-slate-500 mt-2 text-center">Tanda tangan digital hasil pengajuan surat izin</p>
          </div>
        </div>
      )}
    </main>
  );
}
