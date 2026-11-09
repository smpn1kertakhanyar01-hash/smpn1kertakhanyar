import { NextResponse } from "next/server";
import { sesiAdminTu } from "@/lib/api-auth";
import {
  createPengambilanIjazah,
  getPengambilanIjazah,
} from "@/lib/db-ijazah";
import type { PengambilanIjazahPayload } from "@/lib/types";

export async function GET(request: Request) {
  try {
    if (!sesiAdminTu(request)) {
      return NextResponse.json(
        { error: "Akses Khusus Tata Usaha." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const pencarian = searchParams.get("pencarian") ?? undefined;

    return NextResponse.json(
      getPengambilanIjazah({
        status:
          status === "Diambil" || status === "Belum Diambil"
            ? status
            : undefined,
        pencarian,
      })
    );
  } catch (error) {
    console.error("Gagal membaca administrasi ijazah:", error);
    return NextResponse.json(
      { error: "Gagal membaca data administrasi ijazah." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!sesiAdminTu(request)) {
      return NextResponse.json(
        { error: "Akses Khusus Tata Usaha." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as Partial<PengambilanIjazahPayload>;
    const namaSiswa = body.namaSiswa?.trim() ?? "";

    if (!namaSiswa) {
      return NextResponse.json(
        { error: "Nama siswa wajib diisi." },
        { status: 400 }
      );
    }

    const tersimpan = createPengambilanIjazah({
      namaSiswa,
      nisn: body.nisn,
      kelas: body.kelas,
      tahunLulus: body.tahunLulus,
      status: body.status,
      tanggalAmbil: body.tanggalAmbil,
      diambilOleh: body.diambilOleh,
      petugas: body.petugas,
      catatan: body.catatan,
    });

    return NextResponse.json(tersimpan, { status: 201 });
  } catch (error) {
    console.error("Gagal menyimpan administrasi ijazah:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan data administrasi ijazah." },
      { status: 500 }
    );
  }
}
