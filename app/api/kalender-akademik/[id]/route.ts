import { NextResponse } from "next/server";
import {
  deleteKalenderAkademik,
  getKalenderAkademikById,
  updateKalenderAkademik,
} from "@/lib/db-kesiswaan";
import type { KategoriKalender } from "@/lib/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const KATEGORI_VALID: KategoriKalender[] = ["Ujian", "Libur", "Kegiatan"];
const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const nomorId = Number(id);
    if (!Number.isInteger(nomorId) || nomorId <= 0) {
      return NextResponse.json(
        { error: "ID kalender tidak valid." },
        { status: 400 }
      );
    }

    const lama = getKalenderAkademikById(nomorId);
    if (!lama) {
      return NextResponse.json(
        { error: "Kegiatan kalender tidak ditemukan." },
        { status: 404 }
      );
    }

    const body = (await request.json()) as {
      judulKegiatan?: string;
      deskripsi?: string | null;
      tanggalMulai?: string;
      tanggalSelesai?: string;
      kategori?: string;
    };

    const judulKegiatan =
      body.judulKegiatan === undefined
        ? undefined
        : body.judulKegiatan.trim();
    if (judulKegiatan !== undefined && !judulKegiatan) {
      return NextResponse.json(
        { error: "Judul kegiatan wajib diisi." },
        { status: 400 }
      );
    }

    const tanggalMulai = body.tanggalMulai?.trim() ?? lama.tanggalMulai;
    const tanggalSelesai = body.tanggalSelesai?.trim() ?? lama.tanggalSelesai;
    if (
      !POLA_TANGGAL.test(tanggalMulai) ||
      !POLA_TANGGAL.test(tanggalSelesai)
    ) {
      return NextResponse.json(
        { error: "Tanggal harus berformat YYYY-MM-DD." },
        { status: 400 }
      );
    }

    if (tanggalSelesai < tanggalMulai) {
      return NextResponse.json(
        { error: "Tanggal selesai tidak boleh lebih awal dari tanggal mulai." },
        { status: 400 }
      );
    }

    if (
      body.kategori !== undefined &&
      !KATEGORI_VALID.includes(body.kategori as KategoriKalender)
    ) {
      return NextResponse.json(
        { error: "Kategori harus salah satu dari: Ujian, Libur, Kegiatan." },
        { status: 400 }
      );
    }

    const hasil = updateKalenderAkademik(nomorId, {
      judulKegiatan,
      deskripsi:
        body.deskripsi === undefined
          ? undefined
          : body.deskripsi?.trim() || null,
      tanggalMulai: body.tanggalMulai === undefined ? undefined : tanggalMulai,
      tanggalSelesai:
        body.tanggalSelesai === undefined ? undefined : tanggalSelesai,
      kategori: body.kategori as KategoriKalender | undefined,
    });

    return NextResponse.json(hasil);
  } catch (error) {
    console.error("Gagal memperbarui kalender akademik:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui kalender akademik." },
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
        { error: "ID kalender tidak valid." },
        { status: 400 }
      );
    }

    if (!deleteKalenderAkademik(nomorId)) {
      return NextResponse.json(
        { error: "Kegiatan kalender tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Gagal menghapus kalender akademik:", error);
    return NextResponse.json(
      { error: "Gagal menghapus kalender akademik." },
      { status: 500 }
    );
  }
}
