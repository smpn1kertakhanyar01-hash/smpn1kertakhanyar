import { NextResponse } from "next/server";
import { sesiDariPermintaan } from "@/lib/api-auth";
import { resetSandiSiswa } from "@/lib/db";

interface BodyResetSandi {
  nisn?: string;
}

export async function POST(request: Request) {
  try {
    if (!sesiDariPermintaan(request, "guru")) {
      return NextResponse.json(
        { error: "Akses ditolak. Khusus guru piket/BK." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as BodyResetSandi;
    const nisn = body.nisn?.trim() ?? "";

    if (!nisn) {
      return NextResponse.json(
        { error: "NISN siswa wajib diisi." },
        { status: 400 }
      );
    }

    const hasil = resetSandiSiswa(nisn);
    if (!hasil.ok) {
      return NextResponse.json({ error: hasil.error }, { status: 404 });
    }

    return NextResponse.json(hasil);
  } catch (error) {
    console.error("Gagal mereset kata sandi siswa:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}
