import { NextResponse } from "next/server";
import { sesiAdminTu } from "@/lib/api-auth";
import {
  deleteMutasiSiswa,
  getMutasiSiswaById,
  siswaTerdaftar,
  updateMutasiSiswa,
} from "@/lib/db-kesiswaan";
import type { JenisMutasi } from "@/lib/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const JENIS_VALID: JenisMutasi[] = ["MASUK", "KELUAR"];
const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

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
        { error: "ID mutasi tidak valid." },
        { status: 400 }
      );
    }

    if (!getMutasiSiswaById(nomorId)) {
      return NextResponse.json(
        { error: "Data mutasi siswa tidak ditemukan." },
        { status: 404 }
      );
    }

    const body = (await request.json()) as {
      siswaId?: number | null;
      namaSiswa?: string | null;
      nisn?: string | null;
      jenisKelamin?: string | null;
      kelas?: string | null;
      jenisMutasi?: string;
      tanggalMutasi?: string;
      sekolahAsalTujuan?: string;
      alasan?: string;
      noSuratMutasi?: string | null;
      namaWali?: string | null;
      noTeleponWali?: string | null;
      berkasPendukung?: string | null;
      statusBerkas?: string;
    };

    let siswaId: number | null | undefined;
    if (body.siswaId !== undefined) {
      if (body.siswaId === null) {
        siswaId = null;
      } else {
        siswaId = Number(body.siswaId);
        if (!Number.isInteger(siswaId) || siswaId <= 0) {
          return NextResponse.json(
            { error: "ID siswa tidak valid." },
            { status: 400 }
          );
        }

        if (!siswaTerdaftar(siswaId)) {
          return NextResponse.json(
            { error: "Siswa tidak ditemukan atau bukan akun siswa." },
            { status: 400 }
          );
        }
      }
    }

    if (
      body.jenisMutasi !== undefined &&
      !JENIS_VALID.includes(body.jenisMutasi as JenisMutasi)
    ) {
      return NextResponse.json(
        { error: "Jenis mutasi harus MASUK atau KELUAR." },
        { status: 400 }
      );
    }

    const tanggalMutasi = body.tanggalMutasi?.trim();
    if (
      body.tanggalMutasi !== undefined &&
      (!tanggalMutasi || !POLA_TANGGAL.test(tanggalMutasi))
    ) {
      return NextResponse.json(
        { error: "Tanggal mutasi harus berformat YYYY-MM-DD." },
        { status: 400 }
      );
    }

    const sekolahAsalTujuan =
      body.sekolahAsalTujuan === undefined
        ? undefined
        : body.sekolahAsalTujuan.trim();
    const alasan = body.alasan === undefined ? undefined : body.alasan.trim();
    if (sekolahAsalTujuan !== undefined && !sekolahAsalTujuan) {
      return NextResponse.json(
        { error: "Sekolah asal/tujuan wajib diisi." },
        { status: 400 }
      );
    }

    if (alasan !== undefined && !alasan) {
      return NextResponse.json(
        { error: "Alasan mutasi wajib diisi." },
        { status: 400 }
      );
    }

    const hasil = updateMutasiSiswa(nomorId, {
      siswaId,
      namaSiswa:
        body.namaSiswa === undefined
          ? undefined
          : body.namaSiswa?.trim() || null,
      nisn:
        body.nisn === undefined ? undefined : body.nisn?.trim() || null,
      jenisKelamin:
        body.jenisKelamin === undefined
          ? undefined
          : body.jenisKelamin?.trim() || null,
      kelas:
        body.kelas === undefined ? undefined : body.kelas?.trim() || null,
      jenisMutasi: body.jenisMutasi as JenisMutasi | undefined,
      tanggalMutasi,
      sekolahAsalTujuan,
      alasan,
      noSuratMutasi:
        body.noSuratMutasi === undefined
          ? undefined
          : body.noSuratMutasi?.trim() || null,
      namaWali:
        body.namaWali === undefined
          ? undefined
          : body.namaWali?.trim() || null,
      noTeleponWali:
        body.noTeleponWali === undefined
          ? undefined
          : body.noTeleponWali?.trim() || null,
      berkasPendukung:
        body.berkasPendukung === undefined
          ? undefined
          : body.berkasPendukung || null,
      statusBerkas: body.statusBerkas?.trim() || undefined,
    });

    return NextResponse.json(hasil);
  } catch (error) {
    console.error("Gagal memperbarui mutasi siswa:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui mutasi siswa." },
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
        { error: "ID mutasi tidak valid." },
        { status: 400 }
      );
    }

    if (!deleteMutasiSiswa(nomorId)) {
      return NextResponse.json(
        { error: "Data mutasi siswa tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Gagal menghapus mutasi siswa:", error);
    return NextResponse.json(
      { error: "Gagal menghapus mutasi siswa." },
      { status: 500 }
    );
  }
}
