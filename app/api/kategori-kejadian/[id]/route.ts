import { NextResponse } from "next/server";
import {
  deleteKategoriKejadian,
  getKategoriKejadianById,
  updateKategoriKejadian,
} from "@/lib/db-kesiswaan";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const nomorId = Number(id);
    if (!Number.isInteger(nomorId) || nomorId <= 0) {
      return NextResponse.json(
        { error: "ID kategori tidak valid." },
        { status: 400 }
      );
    }

    if (!getKategoriKejadianById(nomorId)) {
      return NextResponse.json(
        { error: "Kategori kejadian tidak ditemukan." },
        { status: 404 }
      );
    }

    const body = (await request.json()) as {
      namaKategori?: string;
      poin?: number;
    };

    const namaKategori =
      body.namaKategori === undefined ? undefined : body.namaKategori.trim();
    if (namaKategori !== undefined && !namaKategori) {
      return NextResponse.json(
        { error: "Nama kategori wajib diisi." },
        { status: 400 }
      );
    }

    if (body.poin !== undefined && !Number.isInteger(body.poin)) {
      return NextResponse.json(
        { error: "Poin harus berupa bilangan bulat." },
        { status: 400 }
      );
    }

    const hasil = updateKategoriKejadian(nomorId, {
      namaKategori,
      poin: body.poin,
    });

    return NextResponse.json(hasil);
  } catch (error) {
    if ((error as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE") {
      return NextResponse.json(
        { error: "Nama kategori sudah terdaftar." },
        { status: 409 }
      );
    }

    console.error("Gagal memperbarui kategori kejadian:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui kategori kejadian." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const nomorId = Number(id);
    if (!Number.isInteger(nomorId) || nomorId <= 0) {
      return NextResponse.json(
        { error: "ID kategori tidak valid." },
        { status: 400 }
      );
    }

    if (!deleteKategoriKejadian(nomorId)) {
      return NextResponse.json(
        { error: "Kategori kejadian tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Gagal menghapus kategori kejadian:", error);
    return NextResponse.json(
      { error: "Gagal menghapus kategori kejadian." },
      { status: 500 }
    );
  }
}
