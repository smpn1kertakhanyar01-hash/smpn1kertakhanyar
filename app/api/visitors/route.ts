import { NextResponse } from "next/server";
import { getVisitorStats, recordVisit } from "@/lib/db";

export async function GET() {
  try {
    return NextResponse.json(getVisitorStats());
  } catch (error) {
    console.error("Gagal membaca statistik pengunjung:", error);
    return NextResponse.json(
      { error: "Gagal membaca statistik pengunjung." },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    return NextResponse.json(recordVisit());
  } catch (error) {
    console.error("Gagal merekam kunjungan:", error);
    return NextResponse.json(
      { error: "Gagal merekam kunjungan." },
      { status: 500 }
    );
  }
}
