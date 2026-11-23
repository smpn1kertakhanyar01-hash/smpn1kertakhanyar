import { NextResponse } from "next/server";
import {
  deleteKalenderAkademik,
  getKalenderAkademikById,
  updateKalenderAkademik,
} from "@/lib/db-kesiswaan";
import {
  responsBerhasilLokal,
  responsTersimpanLokal,
} from "@/lib/api-fallback";
import type { KalenderAkademik, KategoriKalender } from "@/lib/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const KATEGORI_VALID: KategoriKalender[] = ["Ujian", "Libur", "Kegiatan"];
const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

export async function PATCH(request: Request, context: RouteContext) {
  let nomorId = 0;
  let lama: KalenderAkademik | null = null;
  let body: {
    judulKegiatan?: string;
    deskripsi?: string | null;
    tanggalMulai?: string;
    tanggalSelesai?: string;
    kategori?: string;
  } = {};

  try {
    const { id } = await context.params;
    nomorId = Number(id);
    if (!Number.isInteger(nomorId) || nomorId <= 0) {
      return NextResponse.json(
        { error: "ID kalender tidak valid." },
        { status: 400 }
      );
    }

    lama = getKalenderAkademikById(nomorId);
    if (!lama) {
      return NextResponse.json(
        { error: "Kegiatan kalender tidak ditemukan." },
        { status: 404 }
      );
    }

    body = (await request.json()) as typeof body;

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
    const dasar: KalenderAkademik = lama ?? {
      id: nomorId > 0 ? nomorId : Date.now(),
      judulKegiatan: "",
      deskripsi: null,
      tanggalMulai: body.tanggalMulai ?? "",
      tanggalSelesai: body.tanggalSelesai ?? "",
      kategori: (body.kategori ?? "Kegiatan") as KategoriKalender,
      createdAt: new Date().toISOString(),
    };

    return responsTersimpanLokal(
      {
        ...dasar,
        ...(body.judulKegiatan !== undefined
          ? { judulKegiatan: body.judulKegiatan }
          : {}),
        ...(body.deskripsi !== undefined
          ? { deskripsi: body.deskripsi?.trim() || null }
          : {}),
        ...(body.tanggalMulai !== undefined
          ? { tanggalMulai: body.tanggalMulai }
          : {}),
        ...(body.tanggalSelesai !== undefined
          ? { tanggalSelesai: body.tanggalSelesai }
          : {}),
        ...(body.kategori !== undefined
          ? { kategori: body.kategori as KategoriKalender }
          : {}),
      },
      "Perubahan kalender tersimpan di perangkat pengguna."
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
      // Idempoten: data mungkin hanya ada di browser pengguna.
      return responsBerhasilLokal("Kegiatan kalender sudah tidak tersedia.");
    }

    return NextResponse.json({ ok: true, success: true });
  } catch (error) {
    console.error("Gagal menghapus kalender akademik:", error);
    return responsBerhasilLokal(
      "Penghapusan kalender diterapkan di perangkat pengguna."
    );
  }
}
