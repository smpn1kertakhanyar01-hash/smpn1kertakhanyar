import { NextResponse } from "next/server";
import { sesiAdminTu } from "@/lib/api-auth";
import {
  deletePengambilanIjazah,
  updatePengambilanIjazah,
} from "@/lib/db-ijazah";
import type { PengambilanIjazahPayload } from "@/lib/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    if (!sesiAdminTu(request)) {
      return NextResponse.json(
        { error: "Akses Khusus Tata Usaha." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const nomorId = Number(id);
    if (!Number.isInteger(nomorId) || nomorId <= 0) {
      return NextResponse.json(
        { error: "ID pengambilan ijazah tidak valid." },
        { status: 400 }
      );
    }

    const body = (await request.json()) as Partial<PengambilanIjazahPayload>;
    const hasil = updatePengambilanIjazah(nomorId, body);

    if (!hasil) {
      return NextResponse.json(
        { error: "Data pengambilan ijazah tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json(hasil);
  } catch (error) {
    console.error("Gagal memperbarui administrasi ijazah:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui data administrasi ijazah." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    if (!sesiAdminTu(request)) {
      return NextResponse.json(
        { error: "Akses Khusus Tata Usaha." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const nomorId = Number(id);
    if (!Number.isInteger(nomorId) || nomorId <= 0) {
      return NextResponse.json(
        { error: "ID pengambilan ijazah tidak valid." },
        { status: 400 }
      );
    }

    if (!deletePengambilanIjazah(nomorId)) {
      return NextResponse.json(
        { error: "Data pengambilan ijazah tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Gagal menghapus administrasi ijazah:", error);
    return NextResponse.json(
      { error: "Gagal menghapus data administrasi ijazah." },
      { status: 500 }
    );
  }
}
