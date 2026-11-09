import { after, NextResponse } from "next/server";
import { sesiAdminTu } from "@/lib/api-auth";
import {
  cariSiswaIdByNisn,
  createMutasiSiswa,
  getMutasiSiswa,
  getSiswaProfileById,
} from "@/lib/db-kesiswaan";
import {
  buatPesanNotifikasiMutasi,
  kirimPesanWhatsApp,
} from "@/lib/wa-fonnte";
import type { JenisMutasi } from "@/lib/types";

const JENIS_VALID: JenisMutasi[] = ["MASUK", "KELUAR"];
const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

/** Basis URL publik untuk tautan verifikasi di pesan WhatsApp. */
function tentukanBasisUrl(request: Request): string {
  const dariEnv = process.env.APP_URL?.trim();
  if (dariEnv) return dariEnv.replace(/\/+$/, "");

  const alamat = new URL(request.url);
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protokol =
    request.headers.get("x-forwarded-proto") ??
    alamat.protocol.replace(":", "");

  return host ? `${protokol}://${host}` : alamat.origin;
}

export async function GET(request: Request) {
  try {
    if (!sesiAdminTu(request)) {
      return NextResponse.json(
        { error: "Akses Khusus Tata Usaha." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const siswaId = Number(searchParams.get("siswaId"));
    const jenis = searchParams.get("jenis");

    return NextResponse.json(
      getMutasiSiswa({
        siswaId:
          Number.isInteger(siswaId) && siswaId > 0 ? siswaId : undefined,
        jenisMutasi:
          jenis === "MASUK" || jenis === "KELUAR"
            ? (jenis as JenisMutasi)
            : undefined,
      })
    );
  } catch (error) {
    console.error("Gagal membaca mutasi siswa:", error);
    return NextResponse.json(
      { error: "Gagal membaca mutasi siswa." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
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

    if (!JENIS_VALID.includes(body.jenisMutasi as JenisMutasi)) {
      return NextResponse.json(
        { error: "Jenis mutasi harus MASUK atau KELUAR." },
        { status: 400 }
      );
    }

    const tanggalMutasi = body.tanggalMutasi?.trim();
    if (!tanggalMutasi || !POLA_TANGGAL.test(tanggalMutasi)) {
      return NextResponse.json(
        { error: "Tanggal mutasi harus berformat YYYY-MM-DD." },
        { status: 400 }
      );
    }

    const sekolahAsalTujuan = body.sekolahAsalTujuan?.trim();
    const alasan = body.alasan?.trim();
    if (!sekolahAsalTujuan || !alasan) {
      return NextResponse.json(
        { error: "Sekolah asal/tujuan dan alasan wajib diisi." },
        { status: 400 }
      );
    }

    // Tautkan ke akun siswa bila NISN sudah terdaftar. Mutasi masuk dari
    // sekolah lain tetap dapat disimpan tanpa akun (siswaId = null).
    let siswaId =
      body.siswaId === null || body.siswaId === undefined
        ? null
        : Number(body.siswaId);
    if (siswaId !== null && (!Number.isInteger(siswaId) || siswaId <= 0)) {
      return NextResponse.json(
        { error: "ID siswa tidak valid." },
        { status: 400 }
      );
    }

    let profil = siswaId !== null ? getSiswaProfileById(siswaId) : null;
    if (siswaId !== null && !profil) {
      return NextResponse.json(
        { error: "Siswa tidak ditemukan atau bukan akun siswa." },
        { status: 400 }
      );
    }

    const nisn = body.nisn?.trim() || profil?.nisn || "";
    if (!nisn) {
      return NextResponse.json(
        { error: "NISN siswa wajib diisi." },
        { status: 400 }
      );
    }

    if (siswaId === null) {
      siswaId = cariSiswaIdByNisn(nisn);
      if (siswaId !== null) profil = getSiswaProfileById(siswaId);
    }

    const namaSiswa = body.namaSiswa?.trim() || profil?.nama || "";
    if (!namaSiswa) {
      return NextResponse.json(
        { error: "Nama lengkap siswa wajib diisi." },
        { status: 400 }
      );
    }

    const tersimpan = createMutasiSiswa({
      siswaId,
      namaSiswa,
      nisn,
      jenisKelamin: body.jenisKelamin?.trim() || null,
      kelas: body.kelas?.trim() || profil?.kelas || null,
      jenisMutasi: body.jenisMutasi as JenisMutasi,
      tanggalMutasi,
      sekolahAsalTujuan,
      alasan,
      // Pengajuan publik selalu masuk antrean verifikasi TU. Nomor surat dan
      // keputusan hanya boleh diisi melalui endpoint khusus ADMIN_TU.
      noSuratMutasi: null,
      namaWali: body.namaWali?.trim() || null,
      noTeleponWali: body.noTeleponWali?.trim() || null,
      berkasPendukung: body.berkasPendukung || null,
      statusBerkas: "Menunggu Verifikasi",
    });

    // Kirim notifikasi ke Admin TU setelah respons dikirim ke pemohon, agar
    // proses Fonnte yang lambat tidak menghambat form di web.
    const tautanVerifikasi = `${tentukanBasisUrl(request)}/admin-tu/mutasi`;
    const nomorAdminTu = process.env.WA_ADMIN_TU;
    const pesanNotifikasi = buatPesanNotifikasiMutasi(
      tersimpan,
      tautanVerifikasi
    );

    after(async () => {
      try {
        const hasil = await kirimPesanWhatsApp({
          nomorTujuan: nomorAdminTu,
          pesan: pesanNotifikasi,
        });

        if (!hasil.ok) {
          console.warn(
            "[NOTIFIKASI-MUTASI] Gagal mengirim WhatsApp ke Admin TU:",
            hasil.error
          );
        }
      } catch (error) {
        // Jangan pernah menggagalkan penyimpanan mutasi karena notifikasi.
        console.error(
          "[NOTIFIKASI-MUTASI] Exception saat mengirim WhatsApp:",
          error
        );
      }
    });

    return NextResponse.json(tersimpan, { status: 201 });
  } catch (error) {
    console.error("Gagal menyimpan mutasi siswa:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan mutasi siswa." },
      { status: 500 }
    );
  }
}
