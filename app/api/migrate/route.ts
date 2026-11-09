import { NextResponse } from "next/server";
import { migrateLegacyData } from "@/lib/db";
import type { DataMigrasiLama } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DataMigrasiLama;
    return NextResponse.json(migrateLegacyData(body));
  } catch (error) {
    console.error("Gagal memigrasikan data lama:", error);
    return NextResponse.json(
      { error: "Gagal memigrasikan data lama." },
      { status: 500 }
    );
  }
}
