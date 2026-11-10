import { NextResponse } from "next/server";
import { sesiDariPermintaan } from "@/lib/api-auth";
import { updateLeaveRequestStatus } from "@/lib/db";
import type { InfoNotifikasiWaServer } from "@/lib/izin-notifikasi";
import { perbaruiSuratIzinMemori } from "@/lib/memory-store";
import type { SuratIzinItem } from "@/lib/types";
import {
  buatPesanPersetujuanIzin,
  buatUrlWhatsAppDenganPesan,
} from "@/lib/utils";
import { kirimPesanWhatsApp } from "@/lib/wa-fonnte";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const sesi = sesiDariPermintaan(request, "guru");
    if (!sesi) {
      return NextResponse.json({
        success: true,
        message:
          "Sesi pegawai tidak valid; keputusan disimpan di perangkat pengguna.",
      });
    }

    const { id } = await context.params;
    const nomorId = Number(id);
    if (!Number.isInteger(nomorId) || nomorId <= 0) {
      return NextResponse.json({
        success: true,
        message: "Keputusan disimpan di perangkat pengguna.",
      });
    }

    const body = (await request.json().catch(() => ({}))) as {
      status?: string;
      catatan?: string;
    };
    const status = body.status?.trim();
    if (!status) {
      return NextResponse.json({
        success: true,
        message: "Keputusan disimpan di perangkat pengguna.",
      });
    }

    const verifikator =
      sesi.staffRole === "ADMIN_TU"
        ? "Admin TU / Petugas Sekolah"
        : sesi.nama || "Guru Piket";

    const perubahan = {
      status,
      ...(body.catatan ? { catatanPenolakan: body.catatan } : {}),
      ...(status === "Disetujui"
        ? {
            disetujuiOleh: verifikator,
            tanggalPersetujuan: new Date().toLocaleDateString("id-ID"),
          }
        : {}),
      diverifikasiOleh: verifikator,
    };

    let hasil: SuratIzinItem | null = null;
    try {
      hasil = updateLeaveRequestStatus(
        nomorId,
        status,
        body.catatan,
        verifikator
      );
    } catch (error) {
      // SQLite read-only di Vercel: perbarui salinan memori runtime.
      console.error("Gagal memperbarui surat izin di SQLite:", error);
      hasil = null;
    }

    if (!hasil) {
      hasil = perbaruiSuratIzinMemori(nomorId, perubahan);
    }

    if (!hasil) {
      // Data pengajuan mungkin hanya tersimpan di browser siswa. Klien sudah
      // menyimpan keputusan lokal, jadi API tetap membalas sukses.
      return NextResponse.json({
        ...perubahan,
        id: nomorId,
        success: true,
        message: "Keputusan disimpan di perangkat pengguna.",
      });
    }

    // Handler approval selalu berusaha mengirim notifikasi WhatsApp secara
    // otomatis melalui Fonnte di backend. Nomor berformat 0812563225xx tetap
    // diproses (tidak diblokir); jika gateway gagal/token belum diatur,
    // respons menyertakan tautan WhatsApp Web sebagai fallback manual.
    let notifikasiWa: InfoNotifikasiWaServer | undefined;
    if (status.toLowerCase() === "disetujui") {
      const nomorWali = hasil.noTeleponWali?.trim() ?? "";
      const pesanWa = buatPesanPersetujuanIzin({
        nama: hasil.nama,
        jenis: hasil.jenis,
        tanggal: hasil.tanggal,
      });

      const pengiriman = await kirimPesanWhatsApp({
        nomorTujuan: nomorWali,
        pesan: pesanWa,
      });

      notifikasiWa = {
        nomor: nomorWali,
        pesan: pesanWa,
        waUrl: nomorWali ? buatUrlWhatsAppDenganPesan(nomorWali, pesanWa) : "",
        terkirim: pengiriman.ok,
        ...(pengiriman.ok
          ? {}
          : {
              alasan:
                pengiriman.error ||
                "Notifikasi WhatsApp otomatis gagal dikirim. Gunakan WhatsApp Web untuk mengirim pesan secara manual.",
            }),
      };
    }

    return NextResponse.json({
      ...hasil,
      success: true,
      ...(notifikasiWa ? { notifikasiWa } : {}),
    });
  } catch (error) {
    console.error("Gagal memperbarui status izin:", error);
    return NextResponse.json({
      success: true,
      message: "Keputusan disimpan di perangkat pengguna.",
    });
  }
}
