import { NextResponse } from "next/server";
import { responsTersimpanLokal } from "@/lib/api-fallback";
import {
  createKategoriKejadian,
  getKategoriKejadian,
} from "@/lib/db-kesiswaan";

export async function GET() {
  try {
    return NextResponse.json(getKategoriKejadian());
  } catch (error) {
    console.error("Gagal membaca kategori kejadian:", error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  let body: { namaKategori?: string; poin?: number } = {};

  try {
    body = (await request.json()) as typeof body;

    const namaKategori = body.namaKategori?.trim();
    if (!namaKategori) {
      return NextResponse.json(
        { error: "Nama kategori wajib diisi." },
        { status: 400 }
      );
    }

    const poin = body.poin ?? 0;
    if (!Number.isInteger(poin)) {
      return NextResponse.json(
        { error: "Poin harus berupa bilangan bulat." },
        { status: 400 }
      );
    }

    const tersimpan = createKategoriKejadian({ namaKategori, poin });
    return NextResponse.json(tersimpan, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE") {
      return NextResponse.json(
        { error: "Nama kategori sudah terdaftar." },
        { status: 409 }
      );
    }

    console.error("Gagal menyimpan kategori kejadian:", error);
    return responsTersimpanLokal(
      {
        id: Date.now(),
        namaKategori: body.namaKategori?.trim() ?? "",
        poin: body.poin ?? 0,
        createdAt: new Date().toISOString(),
      },
      "Kategori kejadian tersimpan di perangkat pengguna."
    );
  }
}
