import { NextResponse } from "next/server";
import { createIncident, getIncidents } from "@/lib/db";
import {
  CONTOH_INSIDEN_SEKOLAH,
  daftarInsidenMemori,
  simpanInsidenMemori,
} from "@/lib/memory-store";
import type { CatatanKejadianItem } from "@/lib/types";
import { ambilTanggalPanjang, ambilWaktuSekarang } from "@/lib/utils";

/** Vercel menjalankan SQLite read-only sehingga data contoh perlu dilengkapi. */
function berjalanDiVercel(): boolean {
  return Boolean(process.env.VERCEL);
}

export async function GET() {
  const dariMemori = daftarInsidenMemori();

  // Di Vercel SQLite read-only hanya berisi data demo, jadi selalu tampilkan
  // enam contoh insiden agar kartu ringkasan (6 kasus) cocok dengan tabel.
  if (berjalanDiVercel()) {
    return NextResponse.json([...dariMemori, ...CONTOH_INSIDEN_SEKOLAH]);
  }

  try {
    const dariDatabase = getIncidents();
    if (dariDatabase.length > 0) {
      return NextResponse.json([...dariMemori, ...dariDatabase]);
    }
  } catch (error) {
    console.error("Gagal membaca catatan kejadian:", error);
  }

  // Database kosong/tidak terbaca: sertakan 6 contoh insiden agar kartu
  // statistik dan daftar jurnal tetap informatif di Vercel.
  return NextResponse.json([...dariMemori, ...CONTOH_INSIDEN_SEKOLAH]);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<CatatanKejadianItem>;
    if (
      !body.guruPiket ||
      !body.kategori ||
      !body.deskripsi ||
      !body.tindakanPenanganan
    ) {
      return NextResponse.json(
        { error: "Data catatan kejadian tidak lengkap." },
        { status: 400 }
      );
    }

    try {
      const tersimpan = createIncident({
        guruPiket: body.guruPiket,
        kategori: body.kategori,
        namaSiswaTerlibat: body.namaSiswaTerlibat,
        kelasSiswa: body.kelasSiswa,
        deskripsi: body.deskripsi,
        tindakanPenanganan: body.tindakanPenanganan,
      });

      return NextResponse.json(tersimpan, { status: 201 });
    } catch (error) {
      // SQLite read-only/locked di Vercel: simpan ke memori runtime.
      console.error(
        "Gagal menulis catatan kejadian ke SQLite, memakai memori:",
        error
      );

      const data = simpanInsidenMemori({
        id: Date.now(),
        tanggal: ambilTanggalPanjang(),
        waktu: ambilWaktuSekarang(),
        guruPiket: body.guruPiket,
        kategori: body.kategori,
        namaSiswaTerlibat: body.namaSiswaTerlibat ?? "-",
        kelasSiswa: body.kelasSiswa ?? "-",
        deskripsi: body.deskripsi,
        tindakanPenanganan: body.tindakanPenanganan,
      });

      return NextResponse.json({
        success: true,
        message: "Catatan kejadian berhasil disimpan",
        data,
      });
    }
  } catch (error) {
    console.error("Gagal memproses catatan kejadian:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan catatan kejadian." },
      { status: 400 }
    );
  }
}
