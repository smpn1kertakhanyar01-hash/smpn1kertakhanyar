import { NextResponse } from "next/server";
import { sesiAdminTu } from "@/lib/api-auth";
import {
  deleteMutasiSiswa,
  getMutasiSiswaById,
  siswaTerdaftar,
  updateMutasiSiswa,
} from "@/lib/db-kesiswaan";
import {
  CONTOH_MUTASI_SISWA,
  daftarMutasiMemori,
  perbaruiMutasiMemori,
} from "@/lib/memory-store";
import type { JenisMutasi, MutasiSiswa } from "@/lib/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const JENIS_VALID: JenisMutasi[] = ["MASUK", "KELUAR"];
const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

/** Cek ketersediaan data di SQLite, memori runtime, atau data contoh. */
function adaDataMutasi(id: number): boolean {
  try {
    if (getMutasiSiswaById(id)) return true;
  } catch (error) {
    console.error("Gagal memeriksa mutasi siswa di SQLite:", error);
  }

  return (
    daftarMutasiMemori().some((item) => item.id === id) ||
    CONTOH_MUTASI_SISWA.some((item) => item.id === id)
  );
}

/** Jangan menimpa nilai data contoh dengan undefined saat memperbarui memori. */
function buangNilaiUndefined<T extends object>(nilai: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(nilai).filter(([, isi]) => isi !== undefined)
  ) as Partial<T>;
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
        { error: "ID mutasi tidak valid." },
        { status: 400 }
      );
    }

    if (!adaDataMutasi(nomorId)) {
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

    const perubahan = {
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
    };

    let hasil: MutasiSiswa | null = null;
    try {
      hasil = updateMutasiSiswa(nomorId, perubahan);
    } catch (error) {
      // SQLite read-only di Vercel: perbarui salinan memori runtime.
      console.error("Gagal memperbarui mutasi siswa di SQLite:", error);
    }

    if (!hasil) {
      hasil = perbaruiMutasiMemori(
        nomorId,
        buangNilaiUndefined(perubahan)
      );
    }

    if (!hasil) {
      return NextResponse.json(
        { error: "Data mutasi siswa tidak ditemukan." },
        { status: 404 }
      );
    }

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

    let terhapus = false;
    try {
      terhapus = deleteMutasiSiswa(nomorId);
    } catch (error) {
      // SQLite read-only di Vercel: data memori/contoh tidak dapat dihapus.
      console.error("Gagal menghapus mutasi siswa di SQLite:", error);
    }

    if (!terhapus) {
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
