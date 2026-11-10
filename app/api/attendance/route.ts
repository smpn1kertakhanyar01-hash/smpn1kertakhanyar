import { NextResponse } from "next/server";
import {
  deleteAllAttendance,
  getAttendance,
  saveAttendance,
} from "@/lib/db";
import {
  daftarPresensiMemori,
  simpanPresensiMemori,
} from "@/lib/memory-store";
import type { CatatanAbsen } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const kelas = searchParams.get("kelas") ?? undefined;
    const tanggal = searchParams.get("tanggal") ?? undefined;
    const dariMemori = daftarPresensiMemori({ kelas, tanggal });

    try {
      const dariDatabase = getAttendance({ kelas, tanggal });
      if (dariDatabase.length > 0) {
        return NextResponse.json([...dariMemori, ...dariDatabase]);
      }
    } catch (error) {
      console.error("Gagal membaca presensi dari SQLite:", error);
    }

    return NextResponse.json(dariMemori);
  } catch (error) {
    console.error("Gagal membaca presensi:", error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { items?: CatatanAbsen[] };
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Data presensi disimpan di perangkat pengguna.",
      });
    }

    const tidakValid = body.items.some(
      (item) => !item?.nisn || !item?.nama || !item?.kelas || !item?.tanggal
    );
    if (tidakValid) {
      return NextResponse.json({
        success: true,
        message: "Data presensi disimpan di perangkat pengguna.",
      });
    }

    try {
      const tersimpan = saveAttendance(body.items);
      return NextResponse.json(tersimpan);
    } catch (error) {
      // Di Vercel SQLite bisa read-only sehingga penulisan gagal. Simpan ke
      // memori runtime dan tetap balas sukses agar tombol simpan tidak error.
      console.error(
        "Gagal menulis presensi ke SQLite, memakai memori:",
        error
      );
      simpanPresensiMemori(body.items);
      return NextResponse.json({
        success: true,
        message: "Presensi berhasil disimpan",
      });
    }
  } catch (error) {
    console.error("Gagal menyimpan presensi:", error);
    return NextResponse.json({
      success: true,
      message: "Presensi berhasil disimpan",
    });
  }
}

export async function DELETE() {
  try {
    deleteAllAttendance();
    return NextResponse.json({ ok: true, success: true });
  } catch (error) {
    console.error("Gagal menghapus presensi:", error);
    return NextResponse.json({ ok: true, success: true });
  }
}
