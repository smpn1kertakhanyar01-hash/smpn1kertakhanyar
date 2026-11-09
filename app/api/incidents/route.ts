import { NextResponse } from "next/server";
import { createIncident, getIncidents } from "@/lib/db";
import type { CatatanKejadianItem } from "@/lib/types";

export async function GET() {
  try {
    return NextResponse.json(getIncidents());
  } catch (error) {
    console.error("Gagal membaca catatan kejadian:", error);
    return NextResponse.json(
      { error: "Gagal membaca catatan kejadian." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<CatatanKejadianItem>;
    if (
      !body.guruPiket ||
      !body.kategori ||
      !body.deskripsi ||
      !body.tindakanPenanganan
    ) {
      return NextResponse.json(
        { error: "Data catatan kejadian tidak lengkap." },
        { status: 400 }
      );
    }

    const tersimpan = createIncident({
      guruPiket: body.guruPiket,
      kategori: body.kategori,
      namaSiswaTerlibat: body.namaSiswaTerlibat,
      kelasSiswa: body.kelasSiswa,
      deskripsi: body.deskripsi,
      tindakanPenanganan: body.tindakanPenanganan,
    });

    return NextResponse.json(tersimpan, { status: 201 });
  } catch (error) {
    console.error("Gagal menyimpan catatan kejadian:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan catatan kejadian." },
      { status: 500 }
    );
  }
}
