import { NextResponse } from "next/server";
import { deleteIncident } from "@/lib/db";
import { hapusInsidenMemori } from "@/lib/memory-store";

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

    try {
      deleteIncident(nomorId);
    } catch (error) {
      // Abaikan kegagalan tulis SQLite; hapus dari penyimpanan memori.
      console.error("Gagal menghapus catatan kejadian di SQLite:", error);
    }

    hapusInsidenMemori(nomorId);
    return NextResponse.json({ ok: true, success: true });
  } catch (error) {
    console.error("Gagal menghapus catatan kejadian:", error);
    return NextResponse.json(
      { error: "Gagal menghapus catatan kejadian." },
      { status: 500 }
    );
  }
}
