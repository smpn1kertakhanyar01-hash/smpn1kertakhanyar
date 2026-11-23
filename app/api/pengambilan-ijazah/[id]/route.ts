import { NextResponse } from "next/server";
import { sesiAdminTu } from "@/lib/api-auth";
import {
  responsBerhasilLokal,
  responsTersimpanLokal,
} from "@/lib/api-fallback";
import {
  deletePengambilanIjazah,
  getPengambilanIjazahById,
  updatePengambilanIjazah,
} from "@/lib/db-ijazah";
import type {
  PengambilanIjazah,
  PengambilanIjazahPayload,
} from "@/lib/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  let nomorId = 0;
  let lama: PengambilanIjazah | null = null;
  let body: Partial<PengambilanIjazahPayload> = {};

  try {
    if (!sesiAdminTu(request)) {
      return NextResponse.json(
        { error: "Akses Khusus Tata Usaha." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    nomorId = Number(id);
    if (!Number.isInteger(nomorId) || nomorId <= 0) {
      return NextResponse.json(
        { error: "ID pengambilan ijazah tidak valid." },
        { status: 400 }
      );
    }

    lama = getPengambilanIjazahById(nomorId);
    body = (await request.json()) as Partial<PengambilanIjazahPayload>;
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

    // SQLite Vercel read-only: kembalikan objek gabungan agar baris tabel di
    // dashboard tetap utuh dan tidak berubah menjadi data kosong.
    return responsTersimpanLokal(
      {
        id: lama?.id ?? (nomorId > 0 ? nomorId : Date.now()),
        namaSiswa: body.namaSiswa ?? lama?.namaSiswa ?? "",
        nisn: body.nisn ?? lama?.nisn ?? null,
        kelas: body.kelas ?? lama?.kelas ?? null,
        tahunLulus: body.tahunLulus ?? lama?.tahunLulus ?? null,
        status: body.status ?? lama?.status ?? "Belum Diambil",
        tanggalAmbil: body.tanggalAmbil ?? lama?.tanggalAmbil ?? null,
        diambilOleh: body.diambilOleh ?? lama?.diambilOleh ?? null,
        petugas: body.petugas ?? lama?.petugas ?? null,
        catatan: body.catatan ?? lama?.catatan ?? null,
        createdAt: lama?.createdAt ?? new Date().toISOString(),
      },
      "Perubahan administrasi ijazah tersimpan di perangkat pengguna."
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
      // Idempoten: data mungkin hanya ada di browser pengguna.
      return responsBerhasilLokal("Arsip ijazah sudah tidak tersedia.");
    }

    return NextResponse.json({ ok: true, success: true });
  } catch (error) {
    console.error("Gagal menghapus administrasi ijazah:", error);
    return responsBerhasilLokal(
      "Penghapusan arsip ijazah diterapkan di perangkat pengguna."
    );
  }
}
