import { NextResponse } from "next/server";
import { sesiDariPermintaan } from "@/lib/api-auth";
import { getStudentAccountsWithPassword } from "@/lib/db";

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
    console.error("Gagal membaca data akun siswa:", error);
    return NextResponse.json(
      { error: "Gagal membaca data akun siswa." },
      { status: 500 }
    );
  }
}
