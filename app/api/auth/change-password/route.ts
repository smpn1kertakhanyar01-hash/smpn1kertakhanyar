import { NextResponse } from "next/server";
import { sesiDariPermintaan } from "@/lib/api-auth";
import { gantiSandiSiswa } from "@/lib/db";

interface BodyUbahSandi {
  sandiLama?: string;
  sandiBaru?: string;
}

export async function POST(request: Request) {
  try {
    const sesi = sesiDariPermintaan(request, "siswa");
    if (!sesi) {
      return NextResponse.json(
        { error: "Sesi siswa tidak valid. Silakan masuk kembali." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as BodyUbahSandi;
    const sandiLama = body.sandiLama ?? "";
    const sandiBaru = body.sandiBaru ?? "";

    if (!sandiLama || !sandiBaru) {
      return NextResponse.json(
        { error: "Kata sandi lama dan kata sandi baru wajib diisi." },
        { status: 400 }
      );
    }

    if (sandiBaru.length < 6) {
      return NextResponse.json(
        { error: "Kata sandi baru minimal 6 karakter." },
        { status: 400 }
      );
    }

    const hasil = gantiSandiSiswa(sesi.userId, sandiLama, sandiBaru);
    if (!hasil.ok) {
      return NextResponse.json({ error: hasil.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Gagal mengubah kata sandi siswa:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}
