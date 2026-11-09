import { connection, NextResponse } from "next/server";
import { getAgenda } from "@/lib/db";

export async function GET() {
  await connection();
  try {
    return NextResponse.json(getAgenda());
  } catch (error) {
    console.error("Gagal membaca agenda akademik:", error);
    return NextResponse.json(
      { error: "Gagal membaca agenda akademik." },
      { status: 500 }
    );
  }
}
