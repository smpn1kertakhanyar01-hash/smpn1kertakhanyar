import type { SuratIzinItem } from "./types";
import {
  buatPesanPersetujuanIzin,
  buatUrlWhatsAppDenganPesan,
} from "./utils";

export interface HasilNotifikasiIzin {
  terkirim: boolean;
  waUrl: string;
  pesan: string;
  nomor: string;
  alasan?: string;
}

/**
 * Hasil pengiriman WhatsApp yang disusun handler approval di server
 * (`PATCH /api/leave-requests/[id]`, dialias ke `/api/surat-izin/[id]`).
 *
 * Pengiriman selalu dilakukan backend melalui Fonnte tanpa memblokir nomor
 * tertentu. Jika gateway gagal (token belum diatur/kuota habis), respons
 * menyertakan tautan WhatsApp Web agar petugas dapat mengirim manual.
 */
export interface InfoNotifikasiWaServer {
  nomor: string;
  pesan: string;
  waUrl: string;
  terkirim: boolean;
  alasan?: string;
}

/**
 * Susun data notifikasi izin dari hasil pengiriman backend. Fungsi ini tidak
 * lagi melakukan pengecekan nomor dummy maupun memanggil gateway: seluruh
 * pengiriman otomatis sudah dijalankan handler approval di server.
 */
export function susunHasilNotifikasiIzin(
  izin: SuratIzinItem,
  infoServer?: InfoNotifikasiWaServer
): HasilNotifikasiIzin {
  const nomor = infoServer?.nomor ?? izin.noTeleponWali ?? "";
  const pesan =
    infoServer?.pesan ??
    buatPesanPersetujuanIzin({
      nama: izin.nama,
      jenis: izin.jenis,
      tanggal: izin.tanggal,
    });
  const waUrl =
    infoServer?.waUrl || (nomor ? buatUrlWhatsAppDenganPesan(nomor, pesan) : "");

  if (infoServer?.terkirim) {
    return { terkirim: true, waUrl, pesan, nomor };
  }

  return {
    terkirim: false,
    waUrl,
    pesan,
    nomor,
    alasan:
      infoServer?.alasan ||
      "Notifikasi WhatsApp otomatis gagal dikirim. Gunakan WhatsApp Web untuk mengirim pesan secara manual.",
  };
}
