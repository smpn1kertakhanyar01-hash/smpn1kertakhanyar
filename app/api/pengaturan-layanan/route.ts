import { NextResponse } from "next/server";
import { sesiAdminTu } from "@/lib/api-auth";
import { KATEGORI_PENGAMBILAN_IJAZAH } from "@/lib/constants";
import {
  getPengaturanLayanan,
  simpanPengaturanLayanan,
} from "@/lib/pengaturan-layanan";

const KATEGORI_VALID = [KATEGORI_PENGAMBILAN_IJAZAH];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const kategori =
      searchParams.get("kategori")?.trim() || KATEGORI_PENGAMBILAN_IJAZAH;

    if (!KATEGORI_VALID.includes(kategori)) {
      return NextResponse.json(
        { error: "Kategori pengaturan tidak dikenal." },
        { status: 400 }
      );
    }

    return NextResponse.json(getPengaturanLayanan(kategori));
  } catch (error) {
    console.error("Gagal membaca pengaturan layanan:", error);
    return NextResponse.json(
      { error: "Gagal membaca pengaturan layanan." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const sesi = sesiAdminTu(request);
    if (!sesi) {
      return NextResponse.json(
        { error: "Akses Khusus Tata Usaha." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as {
      kategori?: string;
      isiPersyaratan?: string;
    };

    const kategori =
      body.kategori?.trim() || KATEGORI_PENGAMBILAN_IJAZAH;
    if (!KATEGORI_VALID.includes(kategori)) {
      return NextResponse.json(
        { error: "Kategori pengaturan tidak dikenal." },
        { status: 400 }
      );
    }

    const isiPersyaratan = body.isiPersyaratan?.trim() ?? "";
    if (!isiPersyaratan) {
      return NextResponse.json(
        { error: "Isi persyaratan wajib diisi." },
        { status: 400 }
      );
    }

    const hasil = simpanPengaturanLayanan(
      kategori,
      isiPersyaratan,
      sesi.nama || sesi.username || "Admin TU"
    );

    return NextResponse.json(hasil);
  } catch (error) {
    console.error("Gagal menyimpan pengaturan layanan:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal menyimpan pengaturan layanan.",
      },
      { status: 500 }
    );
  }
}
