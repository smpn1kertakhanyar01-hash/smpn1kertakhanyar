import { NextResponse } from "next/server";
import { sesiDariPermintaan } from "@/lib/api-auth";
import { updateLeaveRequestStatus } from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const sesi = sesiDariPermintaan(request, "guru");
    if (!sesi) {
      return NextResponse.json(
        { error: "Sesi pegawai tidak valid. Silakan masuk kembali." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const nomorId = Number(id);
    if (!Number.isInteger(nomorId) || nomorId <= 0) {
      return NextResponse.json(
        { error: "ID pengajuan tidak valid." },
        { status: 400 }
      );
    }

    const body = (await request.json()) as { status?: string; catatan?: string };
    const status = body.status?.trim();
    if (!status) {
      return NextResponse.json(
        { error: "Status pengajuan wajib diisi." },
        { status: 400 }
      );
    }

    const verifikator =
      sesi.staffRole === "ADMIN_TU"
        ? "Admin TU / Petugas Sekolah"
        : sesi.nama || "Guru Piket";

    const hasil = updateLeaveRequestStatus(
      nomorId,
      status,
      body.catatan,
      verifikator
    );
    if (!hasil) {
      return NextResponse.json(
        { error: "Pengajuan izin tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json(hasil);
  } catch (error) {
    console.error("Gagal memperbarui status izin:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui status pengajuan." },
      { status: 500 }
    );
  }
}
