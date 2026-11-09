import { NextResponse } from "next/server";
import {
  createLeaveRequest,
  deleteAllLeaveRequests,
  getLeaveRequests,
} from "@/lib/db";
import type { SuratIzinItem } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nisn = searchParams.get("nisn") ?? undefined;
    return NextResponse.json(getLeaveRequests({ nisn }));
  } catch (error) {
    console.error("Gagal membaca surat izin:", error);
    return NextResponse.json(
      { error: "Gagal membaca data surat izin." },
      { status: 500 }
    );
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

    const tersimpan = createLeaveRequest({
      nama: body.nama,
      nisn: body.nisn,
      kelas: body.kelas,
      jenis: body.jenis,
      tanggal: body.tanggal,
      alasan: body.alasan,
      status: body.status || "Menunggu Persetujuan",
      fotoBukti: body.fotoBukti,
      namaWali: body.namaWali,
      noTeleponWali: body.noTeleponWali,
      tandaTanganWali: (body as any).tandaTanganWali,
    } as any);

    return NextResponse.json(tersimpan, { status: 201 });
  } catch (error) {
    console.error("Gagal menyimpan surat izin:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan pengajuan surat izin." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    deleteAllLeaveRequests();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Gagal menghapus surat izin:", error);
    return NextResponse.json(
      { error: "Gagal menghapus data surat izin." },
      { status: 500 }
    );
  }
}
