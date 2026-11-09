import { NextResponse } from "next/server";
import { sesiDariPermintaan } from "@/lib/api-auth";
import { getStudentAccountsWithPassword } from "@/lib/db";
import { daftarAkunSandiSiswaFallback } from "@/lib/data";

export async function GET(request: Request) {
  try {
    if (!sesiDariPermintaan(request, "guru")) {
      return NextResponse.json(
        { error: "Akses ditolak. Khusus guru piket/BK." },
        { status: 401 }
      );
    }

    return NextResponse.json(getStudentAccountsWithPassword());
  } catch (error) {
    console.error(
      "Gagal membaca data akun siswa, memakai data fallback:",
      error
    );
    return NextResponse.json(daftarAkunSandiSiswaFallback());
  }
}
