import type { SuratIzinItem } from "./types";
import {
  apakahNomorDummyIzin,
  buatPesanPersetujuanIzin,
  buatUrlWhatsAppDenganPesan,
} from "./utils";

export interface HasilNotifikasiIzin {
  terkirim: boolean;
  dummy: boolean;
  waUrl: string;
  pesan: string;
  nomor: string;
  alasan?: string;
}

/**
 * Info notifikasi WhatsApp yang disusun oleh handler approval di server
 * (`PATCH /api/leave-requests/[id]`, dialias ke `/api/surat-izin/[id]`).
 * Berisi template pesan resmi, tautan fallback WhatsApp Web, dan penanda
 * nomor dummy (0812563225xx) sehingga guru/petugas tetap dapat mengirim
 * pesan manual jika kuota Fonnte habis.
 */
export interface InfoNotifikasiWaServer {
  nomor: string;
  pesan: string;
  waUrl: string;
  dummy: boolean;
  alasan?: string;
}

/**
 * Kirim pemberitahuan persetujuan izin melalui Fonnte. Jika nomor tujuan
 * adalah nomor dummy atau pengiriman gagal (misalnya kuota Fonnte habis),
 * hasilnya tetap menyertakan tautan WhatsApp Web agar petugas dapat mengirim
 * pesan secara manual.
 */
export async function kirimNotifikasiPersetujuanIzin(
  izin: SuratIzinItem,
  infoServer?: InfoNotifikasiWaServer
): Promise<HasilNotifikasiIzin> {
  const nomor = izin.noTeleponWali ?? "";
  const pesan =
    infoServer?.pesan ??
    buatPesanPersetujuanIzin({
      nama: izin.nama,
      jenis: izin.jenis,
      tanggal: izin.tanggal,
    });
  const waUrl =
    infoServer?.waUrl || (nomor ? buatUrlWhatsAppDenganPesan(nomor, pesan) : "");

  if (!nomor) {
    return {
      terkirim: false,
      dummy: false,
      waUrl,
      pesan,
      nomor,
      alasan: "Nomor WhatsApp orang tua/wali belum diisi.",
    };
  }

  if (infoServer?.dummy || apakahNomorDummyIzin(nomor)) {
    return {
      terkirim: false,
      dummy: true,
      waUrl,
      pesan,
      nomor,
      alasan:
        infoServer?.alasan ||
        "Nomor wali terdeteksi sebagai nomor dummy. Gunakan tombol WhatsApp Web untuk mengirim pesan secara manual.",
    };
  }

  try {
    const response = await fetch("/api/notifikasi-wa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nomorWa: nomor,
        namaSiswa: izin.nama,
        kelas: izin.kelas,
        jenisIzin: izin.jenis,
        tanggalIzin: izin.tanggal,
        pesan,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
    };

    if (!response.ok || data.ok === false) {
      return {
        terkirim: false,
        dummy: false,
        waUrl,
        pesan,
        nomor,
        alasan:
          data.error ||
          "Fonnte tidak dapat mengirim pesan (kuota habis atau token belum diatur).",
      };
    }

    return { terkirim: true, dummy: false, waUrl, pesan, nomor };
  } catch (error) {
    return {
      terkirim: false,
      dummy: false,
      waUrl,
      pesan,
      nomor,
      alasan:
        error instanceof Error
          ? error.message
          : "Gagal menghubungi layanan WhatsApp.",
    };
  }
}
