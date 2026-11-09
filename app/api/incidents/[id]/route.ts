import { NextResponse } from "next/server";
import { deleteIncident } from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const nomorId = Number(id);
    if (!Number.isInteger(nomorId) || nomorId <= 0) {
      return NextResponse.json(
        { error: "ID catatan tidak valid." },
        { status: 400 }
      );
    }

    deleteIncident(nomorId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Gagal menghapus catatan kejadian:", error);
    return NextResponse.json(
      { error: "Gagal menghapus catatan kejadian." },
      { status: 500 }
    );
  }
}
