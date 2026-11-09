import { NextResponse } from "next/server";
import {
  deleteAllAttendance,
  getAttendance,
  saveAttendance,
} from "@/lib/db";
import type { CatatanAbsen } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const kelas = searchParams.get("kelas") ?? undefined;
    const tanggal = searchParams.get("tanggal") ?? undefined;
    return NextResponse.json(getAttendance({ kelas, tanggal }));
  } catch (error) {
    console.error("Gagal membaca presensi:", error);
    return NextResponse.json(
      { error: "Gagal membaca data presensi." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { items?: CatatanAbsen[] };
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "Data presensi tidak boleh kosong." },
        { status: 400 }
      );
    }

    const tidakValid = body.items.some(
      (item) =>
        !item?.nisn || !item?.nama || !item?.kelas || !item?.tanggal
    );
    if (tidakValid) {
      return NextResponse.json(
        { error: "Data presensi tidak lengkap." },
        { status: 400 }
      );
    }

    return NextResponse.json(saveAttendance(body.items));
  } catch (error) {
    console.error("Gagal menyimpan presensi:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan data presensi." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    deleteAllAttendance();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Gagal menghapus presensi:", error);
    return NextResponse.json(
      { error: "Gagal menghapus data presensi." },
      { status: 500 }
    );
  }
}
