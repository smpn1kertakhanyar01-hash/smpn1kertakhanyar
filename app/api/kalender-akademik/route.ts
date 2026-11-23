import { NextResponse } from "next/server";
import { responsTersimpanLokal } from "@/lib/api-fallback";
import {
  createKalenderAkademik,
  getKalenderAkademik,
} from "@/lib/db-kesiswaan";
import type { KategoriKalender } from "@/lib/types";

const KATEGORI_VALID: KategoriKalender[] = ["Ujian", "Libur", "Kegiatan"];
const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const kategori = searchParams.get("kategori");
    const mulai = searchParams.get("mulai");
    const selesai = searchParams.get("selesai");

    return NextResponse.json(
      getKalenderAkademik({
        kategori:
          kategori && KATEGORI_VALID.includes(kategori as KategoriKalender)
            ? (kategori as KategoriKalender)
            : undefined,
        mulai: mulai && POLA_TANGGAL.test(mulai) ? mulai : undefined,
        selesai: selesai && POLA_TANGGAL.test(selesai) ? selesai : undefined,
      })
    );
  } catch (error) {
    console.error("Gagal membaca kalender akademik:", error);
    // SQLite Vercel read-only: balas array kosong agar halaman tetap tampil.
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  let body: {
    judulKegiatan?: string;
    deskripsi?: string | null;
    tanggalMulai?: string;
    tanggalSelesai?: string;
    kategori?: string;
  } = {};

  try {
    body = (await request.json()) as typeof body;

    const judulKegiatan = body.judulKegiatan?.trim();
    const tanggalMulai = body.tanggalMulai?.trim();
    const tanggalSelesai = body.tanggalSelesai?.trim();
    const kategori = body.kategori ?? "Kegiatan";

    if (!judulKegiatan) {
      return NextResponse.json(
        { error: "Judul kegiatan wajib diisi." },
        { status: 400 }
      );
    }

    if (
      !tanggalMulai ||
      !tanggalSelesai ||
      !POLA_TANGGAL.test(tanggalMulai) ||
      !POLA_TANGGAL.test(tanggalSelesai)
    ) {
      return NextResponse.json(
        { error: "Tanggal mulai dan selesai harus berformat YYYY-MM-DD." },
        { status: 400 }
      );
    }

    if (tanggalSelesai < tanggalMulai) {
      return NextResponse.json(
        { error: "Tanggal selesai tidak boleh lebih awal dari tanggal mulai." },
        { status: 400 }
      );
    }

    if (!KATEGORI_VALID.includes(kategori as KategoriKalender)) {
      return NextResponse.json(
        { error: "Kategori harus salah satu dari: Ujian, Libur, Kegiatan." },
        { status: 400 }
      );
    }

    const tersimpan = createKalenderAkademik({
      judulKegiatan,
      deskripsi: body.deskripsi?.trim() || null,
      tanggalMulai,
      tanggalSelesai,
      kategori: kategori as KategoriKalender,
    });

    return NextResponse.json(tersimpan, { status: 201 });
  } catch (error) {
    console.error("Gagal menyimpan kalender akademik:", error);
    return responsTersimpanLokal(
      {
        id: Date.now(),
        judulKegiatan: body.judulKegiatan?.trim() ?? "",
        deskripsi: body.deskripsi?.trim() || null,
        tanggalMulai: body.tanggalMulai?.trim() ?? "",
        tanggalSelesai: body.tanggalSelesai?.trim() ?? "",
        kategori: (body.kategori ?? "Kegiatan") as KategoriKalender,
        createdAt: new Date().toISOString(),
      },
      "Kegiatan kalender tersimpan di perangkat pengguna."
    );
  }
}
