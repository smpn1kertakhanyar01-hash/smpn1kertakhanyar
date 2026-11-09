import { NextResponse } from "next/server";
import { createMutation, getMutations } from "@/lib/db";
import type { MutasiItem } from "@/lib/types";

export async function GET() {
  try {
    return NextResponse.json(getMutations());
  } catch (error) {
    console.error("Gagal membaca data mutasi:", error);
    return NextResponse.json(
      { error: "Gagal membaca data mutasi." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<MutasiItem>;
    if (
      !body.nama ||
      !body.nisn ||
      !body.jenisKelamin ||
      !body.sekolahAsal ||
      !body.kelasTujuan ||
      !body.alasanPindah ||
      !body.namaWali ||
      !body.noTeleponWali
    ) {
      return NextResponse.json(
        { error: "Data pendaftaran mutasi tidak lengkap." },
        { status: 400 }
      );
    }

    const tersimpan = createMutation({
      nama: body.nama,
      nisn: body.nisn,
      jenisKelamin: body.jenisKelamin,
      sekolahAsal: body.sekolahAsal,
      kelasTujuan: body.kelasTujuan,
      alasanPindah: body.alasanPindah,
      namaWali: body.namaWali,
      noTeleponWali: body.noTeleponWali,
      suratPindah: body.suratPindah,
      tanggalPengajuan:
        body.tanggalPengajuan || new Date().toLocaleDateString("id-ID"),
      status: body.status || "Menunggu Verifikasi",
    });

    return NextResponse.json(tersimpan, { status: 201 });
  } catch (error) {
    console.error("Gagal menyimpan data mutasi:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan data mutasi." },
      { status: 500 }
    );
  }
}
