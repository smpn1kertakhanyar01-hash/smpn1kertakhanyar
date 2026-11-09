import { connection, NextResponse } from "next/server";
import { getStudents } from "@/lib/db";

export async function GET() {
  await connection();
  try {
    return NextResponse.json(getStudents());
  } catch (error) {
    console.error("Gagal membaca data siswa:", error);
    return NextResponse.json(
      { error: "Gagal membaca data siswa." },
      { status: 500 }
    );
  }
}
