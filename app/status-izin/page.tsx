"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import {
  ambilDaftarIzinLengkap,
  berlanggananPerubahanIzin,
  normalisasiStatusIzin,
} from "@/lib/izin-store";
import { bacaSesiSiswa, STORAGE_KEYS } from "@/lib/storage";
import type { SuratIzinItem } from "@/lib/types";

function escapeHtml(nilai: string | number | undefined | null): string {
  return String(nilai ?? "-").replace(/[&<>"']/g, (karakter) => {
    const peta: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return peta[karakter] ?? karakter;
  });
}

function kodeIzin(item: SuratIzinItem): string {
  return item.kodeBerkas || `IZIN-${String(item.id).padStart(3, "0")}`;
}

/**
 * Cetak bukti konfirmasi izin melalui jendela baru. Cara ini tetap bekerja
 * untuk data contoh yang belum memiliki baris PDF di database.
 */
function cetakBuktiIzin(item: SuratIzinItem): void {
  const jendela = window.open("", "_blank", "width=860,height=940");
  if (!jendela) {
    alert("Izinkan popup untuk mencetak bukti konfirmasi izin.");
    return;
  }

  const status = normalisasiStatusIzin(item.status);
  const verifikator =
    item.disetujuiOleh || item.diverifikasiOleh || "Guru Piket / Tata Usaha";
  const catatanStatus =
    status === "DISETUJUI"
      ? `Disetujui oleh ${verifikator}`
      : status === "DITOLAK"
        ? `Ditolak${item.catatanPenolakan ? `: ${item.catatanPenolakan}` : ""}`
        : "Menunggu verifikasi Guru Piket / Tata Usaha";

  jendela.document.open();
  jendela.document.write(`<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Bukti ${escapeHtml(kodeIzin(item))}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; padding: 28px; }
    .kop { text-align: center; border-bottom: 3px double #0f172a; padding-bottom: 14px; margin-bottom: 22px; }
    .kop h1 { font-size: 16px; margin: 0; text-transform: uppercase; letter-spacing: .4px; }
    .kop p { font-size: 11px; margin: 3px 0 0; color: #475569; }
    h2 { text-align: center; font-size: 14px; text-decoration: underline; margin: 0 0 18px; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    td.label { width: 32%; color: #475569; font-weight: bold; }
    .status { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: bold; }
    .status-disetujui { color: #047857; background: #ecfdf5; border: 1px solid #a7f3d0; }
    .status-ditolak { color: #be123c; background: #fff1f2; border: 1px solid #fecdd3; }
    .status-menunggu { color: #b45309; background: #fffbeb; border: 1px solid #fde68a; }
    .catatan { margin-top: 18px; padding: 12px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 11px; line-height: 1.6; }
    .ttd { margin-top: 42px; display: flex; justify-content: flex-end; text-align: center; font-size: 12px; }
    .ttd div { width: 230px; }
    .ttd .garis { margin-top: 62px; border-top: 1px solid #0f172a; padding-top: 5px; }
    @media print { @page { margin: 18mm; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="kop">
    <h1>SMP Negeri 1 Kertak Hanyar</h1>
    <p>Jl. Pendidikan, Kertak Hanyar, Kabupaten Banjar, Kalimantan Selatan</p>
    <p>Sistem Informasi Kesiswaan</p>
  </div>

  <h2>Bukti Konfirmasi Izin Siswa</h2>

  <table>
    <tr><td class="label">Nomor Tiket / ID Izin</td><td>${escapeHtml(kodeIzin(item))}</td></tr>
    <tr><td class="label">Nama Siswa</td><td>${escapeHtml(item.nama)}</td></tr>
    <tr><td class="label">NISN</td><td>${escapeHtml(item.nisn)}</td></tr>
    <tr><td class="label">Kelas</td><td>${escapeHtml(item.kelas)}</td></tr>
    <tr><td class="label">Jenis Izin</td><td>${escapeHtml(item.jenis)}</td></tr>
    <tr><td class="label">Tanggal Izin</td><td>${escapeHtml(item.tanggal)}</td></tr>
    <tr><td class="label">Alasan</td><td>${escapeHtml(item.alasan)}</td></tr>
    <tr>
      <td class="label">Status</td>
      <td><span class="status status-${status.toLowerCase()}">${escapeHtml(status)}</span></td>
    </tr>
    <tr><td class="label">Keterangan</td><td>${escapeHtml(catatanStatus)}</td></tr>
    <tr><td class="label">Tanggal Persetujuan</td><td>${escapeHtml(item.tanggalPersetujuan || "-")}</td></tr>
  </table>

  <div class="catatan">
    Dokumen ini dicetak dari Sistem Informasi Kesiswaan SMP Negeri 1 Kertak Hanyar.
    Status izin pada dokumen ini tersinkron dengan Dashboard Guru dan Dashboard Tata Usaha.
  </div>

  <div class="ttd">
    <div>
      <p>Kertak Hanyar, ${escapeHtml(new Date().toLocaleDateString("id-ID"))}</p>
      <p>Petugas Sekolah</p>
      <div class="garis">${escapeHtml(verifikator)}</div>
    </div>
  </div>
</body>
</html>`);
  jendela.document.close();
  jendela.focus();
  window.setTimeout(() => jendela.print(), 350);
}

export default function StatusIzinPage() {
  const router = useRouter();
  const [daftarIzinSiswa, setDaftarIzinSiswa] = useState<SuratIzinItem[]>([]);
  const [siswaNama, setSiswaNama] = useState("");
  const [siswaNisn, setSiswaNisn] = useState("");
  const [memuat, setMemuat] = useState(true);
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
    setSiswaNisn(sesi.nisn || "");

    let masihAktif = true;

    const muatRiwayat = async () => {
      try {
        // Hanya tampilkan berkas milik siswa yang sedang login berdasarkan NISN.
        const data = await api.getLeaveRequests(sesi.nisn);
        if (!masihAktif) return;
        setDaftarIzinSiswa(
          ambilDaftarIzinLengkap(data, {
            nisn: sesi.nisn,
            sertakanSeed: true,
          })
        );
      } catch (error) {
        console.error("Gagal memuat status izin:", error);
        if (!masihAktif) return;
        // Tetap tampilkan data contoh agar riwayat siswa tidak kosong saat API gagal.
        setDaftarIzinSiswa(
          ambilDaftarIzinLengkap([], {
            nisn: sesi.nisn,
            sertakanSeed: true,
          })
        );
      } finally {
        if (masihAktif) setMemuat(false);
      }
    };

    void muatRiwayat();

    // Perubahan dari Dashboard Guru/TU langsung terlihat tanpa reload.
    const berhenti = berlanggananPerubahanIzin(() => {
      void muatRiwayat();
    });

    return () => {
      masihAktif = false;
      berhenti();
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
                {siswaNisn ? ` • NISN ${siswaNisn}` : ""}
              </p>
              <p className="text-[11px] text-emerald-600 mt-1 font-medium">
                Status tersinkron dengan Dashboard Guru &amp; Tata Usaha
              </p>
            </div>
            <Link
              href="/surat-izin"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition text-center shadow-sm"
            >
              + Ajukan Izin Baru
            </Link>
          </div>

          {memuat ? (
            <div className="text-center py-12">
              <p className="text-sm font-semibold text-slate-700">
                Memuat riwayat surat izin...
              </p>
            </div>
          ) : daftarIzinSiswa.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm font-semibold text-slate-700">Belum Ada Pengajuan Surat</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Anda belum pernah mengajukan izin permohonan melalui portal daring.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {daftarIzinSiswa.map((item) => {
                const status = normalisasiStatusIzin(item.status);
                const verifikator =
                  item.disetujuiOleh ||
                  item.diverifikasiOleh ||
                  "Guru Piket / Tata Usaha";
                const badgeClass =
                  status === "DISETUJUI"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : status === "DITOLAK"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-amber-50 text-amber-700 border-amber-200";

                return (
                  <div
                    key={item.id}
                    className="border border-slate-200 rounded-2xl p-4 sm:p-5 hover:border-blue-200 transition bg-[#fdfefe]"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-black tracking-wide text-sky-700">
                          {kodeIzin(item)}
                        </span>
                        <span className="font-bold text-sm text-slate-900">{item.jenis}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs font-medium text-slate-500">{item.tanggal}</span>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-bold self-start sm:self-auto border ${badgeClass} ${
                          status === "MENUNGGU" ? "animate-pulse" : ""
                        }`}
                      >
                        {status === "MENUNGGU"
                          ? "⏳ MENUNGGU"
                          : status === "DISETUJUI"
                            ? "✅ DISETUJUI"
                            : "✕ DITOLAK"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Nomor Tiket / ID Izin
                        </p>
                        <p className="mt-0.5 font-mono font-bold text-slate-800">
                          {kodeIzin(item)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Jenis &amp; Tanggal Izin
                        </p>
                        <p className="mt-0.5 font-semibold text-slate-800">
                          {item.jenis} • {item.tanggal}
                        </p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Alasan Izin
                        </p>
                        <p className="mt-0.5 leading-relaxed text-slate-600">
                          {item.alasan}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`mt-3 rounded-xl border px-3 py-2 text-[11px] leading-relaxed ${
                        status === "DISETUJUI"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : status === "DITOLAK"
                            ? "border-rose-200 bg-rose-50 text-rose-800"
                            : "border-amber-200 bg-amber-50 text-amber-800"
                      }`}
                    >
                      {status === "DISETUJUI" ? (
                        <span>
                          <b>Disetujui oleh Guru Piket / Tata Usaha</b>
                          {item.disetujuiOleh || item.diverifikasiOleh
                            ? ` (${verifikator})`
                            : ""}
                          {item.tanggalPersetujuan
                            ? ` pada ${item.tanggalPersetujuan}`
                            : ""}
                          .
                        </span>
                      ) : status === "DITOLAK" ? (
                        <span>
                          <b>Ditolak oleh {verifikator}.</b>
                          {item.catatanPenolakan
                            ? ` Alasan: ${item.catatanPenolakan}`
                            : " Silakan hubungi pihak sekolah untuk informasi lebih lanjut."}
                        </span>
                      ) : (
                        <span>
                          Menunggu verifikasi <b>Guru Piket / Tata Usaha</b>.
                          Status akan berubah otomatis setelah diputuskan.
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => cetakBuktiIzin(item)}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-bold transition ${
                          status === "DISETUJUI"
                            ? "border-emerald-200 bg-emerald-600 text-white hover:bg-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        🖨️{" "}
                        {status === "DISETUJUI"
                          ? "Cetak / Unduh Bukti Konfirmasi"
                          : "Cetak Ringkasan Pengajuan"}
                      </button>

                      {item.fotoBukti && (
                        <button
                          type="button"
                          onClick={() => setModalFoto(item.fotoBukti || null)}
                          className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1"
                        >
                          📄 Lihat Foto Surat Bertanda Tangan
                        </button>
                      )}
                      {item.tandaTanganWali && (
                        <button
                          type="button"
                          onClick={() => setModalTtd(item.tandaTanganWali || null)}
                          className="text-xs text-emerald-600 hover:underline font-semibold flex items-center gap-1"
                        >
                          ✍️ Lihat Tanda Tangan Orang Tua/Wali
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
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
