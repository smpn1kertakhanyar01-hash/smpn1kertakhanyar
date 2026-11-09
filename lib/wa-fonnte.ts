import { catatLogNotifikasiWA } from "./db-kesiswaan";
import type { MutasiSiswa } from "./types";

const FONNTE_URL = "https://api.fonnte.com/send";

export interface HasilKirimWhatsApp {
  ok: boolean;
  target: string;
  error?: string;
  respon?: unknown;
}

/**
 * Menyeragamkan nomor Indonesia ke format internasional tanpa spasi/strip,
 * misalnya "0812-3456-7890" menjadi "6281234567890".
 */
export function normalisasiNomorWhatsApp(
  nomor: string | null | undefined
): string {
  let cleaned = (nomor ?? "").replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = `62${cleaned.slice(1)}`;
  } else if (cleaned.startsWith("8")) {
    cleaned = `62${cleaned}`;
  }
  return cleaned;
}

/**
 * Mengirim teks melalui Fonnte lalu mencatat hasilnya ke tabel
 * `log_notifikasi_wa`. Fungsi ini tidak pernah melempar error agar aman
 * dipanggil dari tugas latar belakang setelah respons form dikirim.
 */
export async function kirimPesanWhatsApp(input: {
  nomorTujuan: string | null | undefined;
  pesan: string;
}): Promise<HasilKirimWhatsApp> {
  const target = normalisasiNomorWhatsApp(input.nomorTujuan);
  const nomorLog = target || input.nomorTujuan?.trim() || "-";
  const token = process.env.FONNTE_TOKEN?.trim();

  if (!token) {
    console.error(
      "[NOTIFIKASI-WA][FONNTE] FONNTE_TOKEN belum dikonfigurasi di .env.local"
    );
    catatLogNotifikasiWA({
      nomorTujuan: nomorLog,
      pesan: input.pesan,
      statusKirim: "GAGAL",
      responFonnte: { error: "FONNTE_TOKEN belum dikonfigurasi" },
    });
    return {
      ok: false,
      target,
      error: "FONNTE_TOKEN belum dikonfigurasi.",
    };
  }

  if (!target || target.length < 10) {
    console.error(
      "[NOTIFIKASI-WA][FONNTE] Nomor tujuan tidak valid:",
      input.nomorTujuan
    );
    catatLogNotifikasiWA({
      nomorTujuan: nomorLog,
      pesan: input.pesan,
      statusKirim: "GAGAL",
      responFonnte: { error: "Nomor WhatsApp tujuan tidak valid" },
    });
    return {
      ok: false,
      target,
      error: "Nomor WhatsApp tujuan tidak valid.",
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append("target", target);
    formData.append("message", input.pesan);

    const response = await fetch(FONNTE_URL, {
      method: "POST",
      headers: { Authorization: token },
      body: formData,
    });

    let dataRespon: unknown;
    try {
      dataRespon = await response.json();
    } catch {
      dataRespon = { error: "Respons Fonnte tidak dapat dibaca" };
    }

    const respon = dataRespon as {
      status?: boolean | string;
      reason?: string;
      message?: string;
      [kunci: string]: unknown;
    };
    const gagal =
      !response.ok ||
      respon?.status === false ||
      respon?.status === "false";

    catatLogNotifikasiWA({
      nomorTujuan: target,
      pesan: input.pesan,
      statusKirim: gagal ? "GAGAL" : "BERHASIL",
      responFonnte: dataRespon,
    });

    if (gagal) {
      return {
        ok: false,
        target,
        error:
          respon?.reason ??
          respon?.message ??
          "Fonnte menolak pengiriman pesan.",
        respon: dataRespon,
      };
    }

    return { ok: true, target, respon: dataRespon };
  } catch (error) {
    const pesanError =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan saat menghubungi Fonnte.";

    console.error("[NOTIFIKASI-WA][FONNTE] Gagal mengirim:", error);
    catatLogNotifikasiWA({
      nomorTujuan: target,
      pesan: input.pesan,
      statusKirim: "GAGAL",
      responFonnte: { error: pesanError },
    });

    return { ok: false, target, error: pesanError };
  }
}

/**
 * Menyusun teks notifikasi resmi pengajuan mutasi untuk Admin TU.
 */
export function buatPesanNotifikasiMutasi(
  mutasi: MutasiSiswa,
  tautanVerifikasi: string
): string {
  const labelSekolah =
    mutasi.jenisMutasi === "MASUK" ? "Sekolah Asal" : "Sekolah Tujuan";

  return [
    "🔔 PENGAJUAN MUTASI SISWA BARU - SMPN 1 KERTAK HANYAR",
    "",
    `ID Pengajuan   : #${mutasi.id}`,
    `Jenis Mutasi   : ${mutasi.jenisMutasi}`,
    `Nama Siswa     : ${mutasi.namaSiswa || "-"}`,
    `NISN           : ${mutasi.nisn || "-"}`,
    `${labelSekolah.padEnd(14)} : ${mutasi.sekolahAsalTujuan || "-"}`,
    `Rombel / Kelas : ${mutasi.kelas || "-"}`,
    `Orang Tua/Wali : ${mutasi.namaWali || "-"}`,
    `No. WhatsApp   : ${mutasi.noTeleponWali || "-"}`,
    `Alasan Pindah  : ${mutasi.alasan || "-"}`,
    `Tanggal Ajuan  : ${mutasi.tanggalMutasi}`,
    `Status Berkas  : ${mutasi.statusBerkas}`,
    "",
    "🖥️ Tautan verifikasi admin:",
    tautanVerifikasi,
    "",
    "Mohon segera ditindaklanjuti. Terima kasih.",
  ].join("\n");
}
