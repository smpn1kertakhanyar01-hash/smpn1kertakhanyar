"use client";

import { useState } from "react";
import type { HasilNotifikasiIzin } from "@/lib/izin-notifikasi";

export interface DataFallbackWhatsApp extends HasilNotifikasiIzin {
  nama: string;
}

interface Props {
  data: DataFallbackWhatsApp | null;
  onClose: () => void;
}

/**
 * Dialog fallback ketika notifikasi WhatsApp otomatis tidak dapat dikirim.
 * Petugas tetap bisa membuka WhatsApp Web dengan pesan yang sudah terisi.
 */
export default function NotifikasiWhatsAppFallback({ data, onClose }: Props) {
  const [tersalin, setTersalin] = useState(false);

  if (!data) return null;

  const salinPesan = async () => {
    try {
      await navigator.clipboard.writeText(data.pesan);
      setTersalin(true);
      window.setTimeout(() => setTersalin(false), 2000);
    } catch {
      setTersalin(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="judul-fallback-wa"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
              Fallback WhatsApp
            </span>
            <h3
              id="judul-fallback-wa"
              className="mt-2 text-sm font-bold text-slate-900"
            >
              Notifikasi otomatis belum terkirim
            </h3>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              {data.alasan ||
                "Gunakan tautan WhatsApp Web di bawah untuk mengirim pemberitahuan secara manual."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
            aria-label="Tutup dialog"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-3 text-xs">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Penerima
            </p>
            <p className="mt-0.5 font-bold text-slate-800">{data.nama}</p>
            <p className="font-mono text-[11px] text-slate-500">
              {data.nomor || "Nomor belum diisi"}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
              Pratinjau pesan
            </p>
            <p className="mt-1 whitespace-pre-wrap leading-relaxed text-emerald-900">
              {data.pesan}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {data.waUrl ? (
              <a
                href={data.waUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700"
              >
                💬 Buka WhatsApp Web
              </a>
            ) : (
              <span className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-center text-xs font-semibold text-slate-400">
                Nomor WhatsApp tidak tersedia
              </span>
            )}
            <button
              type="button"
              onClick={salinPesan}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              {tersalin ? "✅ Tersalin" : "Salin Pesan"}
            </button>
          </div>

          <p className="text-[10px] leading-relaxed text-slate-400">
            Status izin sudah tersimpan dan tersinkron ke Dashboard Guru,
            Dashboard TU, serta halaman Status Izin Siswa.
          </p>
        </div>
      </div>
    </div>
  );
}
