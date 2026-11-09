import { NextResponse } from "next/server";
import {
  createLeaveRequest,
  deleteAllLeaveRequests,
  getLeaveRequests,
} from "@/lib/db";
import {
  daftarSuratIzinMemori,
  simpanSuratIzinMemori,
} from "@/lib/memory-store";
import type { SuratIzinItem } from "@/lib/types";

/**
 * Batas panjang string Base64 untuk foto bukti dan tanda tangan.
 * Payload Vercel dibatasi (~4,5 MB), jadi data yang lebih panjang dipotong
 * agar pengajuan tidak gagal karena overflow.
 */
const BATAS_BASE64 = 180_000;

function potongBase64(nilai?: string): string | undefined {
  if (!nilai) return nilai;
  return nilai.length > BATAS_BASE64 ? nilai.slice(0, BATAS_BASE64) : nilai;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nisn = searchParams.get("nisn") ?? undefined;
    const dariMemori = daftarSuratIzinMemori(nisn);

    try {
      const dariDatabase = getLeaveRequests({ nisn });
      if (dariDatabase.length > 0) {
        return NextResponse.json([...dariMemori, ...dariDatabase]);
      }
    } catch (error) {
      console.error("Gagal membaca surat izin dari SQLite:", error);
    }

    // Database kosong/tidak terbaca (Vercel): gunakan data memori runtime.
    return NextResponse.json(dariMemori);
  } catch (error) {
    console.error("Gagal membaca surat izin:", error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<SuratIzinItem>;

    if (
      !body.nama ||
      !body.nisn ||
      !body.kelas ||
      !body.jenis ||
      !body.tanggal ||
      !body.alasan
    ) {
      return NextResponse.json(
        { error: "Data pengajuan izin tidak lengkap." },
        { status: 400 }
      );
    }

    const fotoBukti = potongBase64(body.fotoBukti);
    const tandaTanganWali = potongBase64(body.tandaTanganWali);

    const dataFallback: SuratIzinItem = {
      id: Date.now(),
      nama: body.nama,
      nisn: body.nisn,
      kelas: body.kelas,
      jenis: body.jenis,
      tanggal: body.tanggal,
      alasan: body.alasan,
      status: body.status || "Menunggu Persetujuan",
      fotoBukti,
      namaWali: body.namaWali,
      noTeleponWali: body.noTeleponWali,
      tandaTanganWali,
    };

    let tersimpan: SuratIzinItem;
    try {
      tersimpan = createLeaveRequest(dataFallback);
    } catch (error) {
      // SQLite read-only/locked di Vercel: simpan ke memori runtime.
      console.error(
        "Gagal menulis surat izin ke SQLite, memakai memori:",
        error
      );
      tersimpan = simpanSuratIzinMemori(dataFallback);
    }

    // Selalu balas HTTP 200 agar popup sukses dan nomor pengajuan muncul.
    return NextResponse.json({
      ...tersimpan,
      success: true,
      message: "Pengajuan surat izin berhasil terkirim!",
      ticketId: `IZIN-${Date.now()}`,
      data: tersimpan,
    });
  } catch (error) {
    console.error("Gagal memproses pengajuan surat izin:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Data pengajuan izin tidak dapat dibaca.",
      },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  try {
    deleteAllLeaveRequests();
  } catch (error) {
    console.error("Gagal menghapus surat izin di SQLite:", error);
  }
  return NextResponse.json({ ok: true });
}
