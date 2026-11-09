import { NextResponse } from "next/server";
import { getLogNotifikasiWA } from "@/lib/db-kesiswaan";
import type { StatusKirimWA } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const nomor = searchParams.get("nomor");
    const limit = Number(searchParams.get("limit"));

    return NextResponse.json(
      getLogNotifikasiWA({
        statusKirim:
          status === "BERHASIL" || status === "GAGAL"
            ? (status as StatusKirimWA)
            : undefined,
        nomorTujuan: nomor?.trim() || undefined,
        limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
      })
    );
  } catch (error) {
    console.error("Gagal membaca log notifikasi WhatsApp:", error);
    return NextResponse.json(
      { error: "Gagal membaca log notifikasi WhatsApp." },
      { status: 500 }
    );
  }
}
