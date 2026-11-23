import { NextResponse } from "next/server";
import {
  responsBerhasilLokal,
  responsTersimpanLokal,
} from "@/lib/api-fallback";
import {
  deleteKategoriKejadian,
  getKategoriKejadianById,
  updateKategoriKejadian,
} from "@/lib/db-kesiswaan";
import type { KategoriKejadianMaster } from "@/lib/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  let nomorId = 0;
  let lama: KategoriKejadianMaster | null = null;
  let body: { namaKategori?: string; poin?: number } = {};

  try {
    const { id } = await context.params;
    nomorId = Number(id);
    if (!Number.isInteger(nomorId) || nomorId <= 0) {
      return NextResponse.json(
        { error: "ID kategori tidak valid." },
        { status: 400 }
      );
    }

    lama = getKategoriKejadianById(nomorId);
    if (!lama) {
      return NextResponse.json(
        { error: "Kategori kejadian tidak ditemukan." },
        { status: 404 }
      );
    }

    body = (await request.json()) as typeof body;

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
    return responsTersimpanLokal(
      {
        id: lama?.id ?? (nomorId > 0 ? nomorId : Date.now()),
        namaKategori:
          body.namaKategori?.trim() ?? lama?.namaKategori ?? "",
        poin: body.poin ?? lama?.poin ?? 0,
        createdAt: lama?.createdAt ?? new Date().toISOString(),
      },
      "Perubahan kategori tersimpan di perangkat pengguna."
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
      // Idempoten: data mungkin hanya ada di browser pengguna.
      return responsBerhasilLokal("Kategori kejadian sudah tidak tersedia.");
    }

    return NextResponse.json({ ok: true, success: true });
  } catch (error) {
    console.error("Gagal menghapus kategori kejadian:", error);
    return responsBerhasilLokal(
      "Penghapusan kategori diterapkan di perangkat pengguna."
    );
  }
}
