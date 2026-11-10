import { NextResponse } from "next/server";
import { ambilDaftarSuratIzinServer } from "@/lib/izin-server";

/**
 * Alias endpoint status surat izin untuk portal siswa.
 * Mendukung filter `?nisn=` dan `?id=`.
 */
export async function GET(request: Request) {
  // Dibaca di luar try agar sinyal bail-out prerendering Next.js tidak
  // tertangkap dan tercatat sebagai kegagalan pembacaan data.
  const { searchParams } = new URL(request.url);
  const nisn = searchParams.get("nisn") ?? undefined;
  const id = searchParams.get("id");

  try {
    const daftar = ambilDaftarSuratIzinServer(nisn);
    if (!id) return NextResponse.json(daftar);

    const nomorId = Number(id);
    if (!Number.isInteger(nomorId)) {
      return NextResponse.json(
        { error: "ID pengajuan tidak valid." },
        { status: 400 }
      );
    }

    const hasil = daftar.find((item) => item.id === nomorId);
    if (!hasil) {
      return NextResponse.json(
        { error: "Pengajuan izin tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json(hasil);
  } catch (error) {
    console.error("Gagal membaca status surat izin:", error);
    return NextResponse.json([]);
  }
}
