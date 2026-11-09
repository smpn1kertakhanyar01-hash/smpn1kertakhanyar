import { NextResponse } from "next/server";
import { getLeaveRequestById } from "@/lib/db";
import fs from "node:fs";
import path from "node:path";

function bacaLogoAman(namaFile: string): Buffer | null {
  try {
    const lokasi = path.join(process.cwd(), "public", namaFile);
    if (!fs.existsSync(lokasi)) return null;
    return fs.readFileSync(lokasi);
  } catch (err) {
    console.error("DEBUG PDF ERROR: gagal baca logo", namaFile, err);
    return null;
  }
}

function buatPdfBuffer(surat: any) {
  try {
    const logoDinasPath = path.join(process.cwd(), "public", "logo-dinas.png");
    const logoSekolahPath = path.join(process.cwd(), "public", "logo-sekolah.png");
    try { bacaLogoAman("logo-dinas.png"); } catch {}
    try { bacaLogoAman("logo-sekolah.png"); } catch {}
    try { bacaLogoAman("logo.jpg"); } catch {}

    const namaSiswa = surat?.namaSiswa || surat?.nama_siswa || surat?.nama || "-";
    const nisn = surat?.nisn || "-";
    const kelas = surat?.kelas || "-";
    const namaWali = surat?.namaWali || surat?.nama_wali || "-";
    const noWa = surat?.noTeleponWali || surat?.no_telepon_wali || surat?.noWa || "-";
    const jenisIzin = surat?.jenis || surat?.jenisIzin || "-";
    let tanggalMulai = "-";
    let tanggalSelesai = "-";
    if (surat?.tanggalMulai && surat?.tanggalSelesai) {
      tanggalMulai = surat.tanggalMulai;
      tanggalSelesai = surat.tanggalSelesai;
    } else if (surat?.tanggal && String(surat.tanggal).includes(" s/d ")) {
      const parts = String(surat.tanggal).split(" s/d ");
      tanggalMulai = parts[0];
      tanggalSelesai = parts[1] || "-";
    } else if (surat?.tanggal) {
      tanggalMulai = String(surat.tanggal);
      tanggalSelesai = String(surat.tanggal);
    }
    const alasan = String(surat?.alasan || "-");
    const status = "DISETUJUI OLEH GURU PIKET";
    const noRegistrasi = surat?.noRegistrasi || ("IZN-" + (surat?.id || Date.now()));
    const tanggalCetak = new Date().toLocaleDateString("id-ID");

    const pageWidth = 595;
    const centerX = pageWidth / 2;
    const marginLeft = 45;
    const marginRight = 550;
    const labelX = 55;
    const colonX = 180;
    const valueX = 195;
    const colKiriX = 60;
    const colKananX = 360;
    const logoKiriX = 45;
    const logoKananX = 500;

    const alasanWrap = alasan.length > 80 ? alasan.substring(0, 77) + "..." : alasan;

    const pdf = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n4 0 obj\n<< /Length 2500 >>\nstream\nBT\n/F2 12 Tf\n" + centerX + " 790 Td\n(PEMERINTAH KABUPATEN BANJAR) Tj\nET\nBT\n/F2 12 Tf\n" + centerX + " 776 Td\n(DINAS PENDIDIKAN) Tj\nET\nBT\n/F2 18 Tf\n" + centerX + " 755 Td\n(SMP NEGERI 1 KERTAK HANYAR) Tj\nET\nBT\n/F1 9 Tf\n" + centerX + " 738 Td\n(Jl. A. Yani Km. 10.200, Kertak Hanyar, Kab. Banjar, Kalimantan Selatan) Tj\nET\n" + marginLeft + " 720 m\n" + marginRight + " 720 l\nS\n" + marginLeft + " 717 m\n" + marginRight + " 717 l\nS\nBT\n/F2 16 Tf\n" + centerX + " 690 Td\n(SURAT KETERANGAN PERMOHONAN IZIN SISWA) Tj\nET\nBT\n/F1 11 Tf\n" + centerX + " 670 Td\n(Nomor Registrasi: " + noRegistrasi + ") Tj\nET\nBT\n/F2 11 Tf\n" + labelX + " 640 Td\n(I. IDENTITAS SISWA) Tj\nET\nBT\n/F1 10 Tf\n" + labelX + " 624 Td\n(Nama Siswa) Tj\n" + colonX + " 624 Td\n(:) Tj\n" + valueX + " 624 Td\n(" + namaSiswa + ") Tj\nET\nBT\n/F1 10 Tf\n" + labelX + " 608 Td\n(NISN) Tj\n" + colonX + " 608 Td\n(:) Tj\n" + valueX + " 608 Td\n(" + nisn + ") Tj\nET\nBT\n/F1 10 Tf\n" + labelX + " 592 Td\n(Kelas) Tj\n" + colonX + " 592 Td\n(:) Tj\n" + valueX + " 592 Td\n(" + kelas + ") Tj\nET\nBT\n/F2 11 Tf\n" + labelX + " 570 Td\n(II. IDENTITAS ORANG TUA / WALI) Tj\nET\nBT\n/F1 10 Tf\n" + labelX + " 554 Td\n(Nama Orang Tua/Wali) Tj\n" + colonX + " 554 Td\n(:) Tj\n" + valueX + " 554 Td\n(" + namaWali + ") Tj\nET\nBT\n/F1 10 Tf\n" + labelX + " 538 Td\n(No. WhatsApp / HP) Tj\n" + colonX + " 538 Td\n(:) Tj\n" + valueX + " 538 Td\n(" + noWa + ") Tj\nET\nBT\n/F2 11 Tf\n" + labelX + " 516 Td\n(III. RINCIAN PERMOHONAN IZIN) Tj\nET\nBT\n/F1 10 Tf\n" + labelX + " 500 Td\n(Jenis Izin) Tj\n" + colonX + " 500 Td\n(:) Tj\n" + valueX + " 500 Td\n(" + jenisIzin + ") Tj\nET\nBT\n/F1 10 Tf\n" + labelX + " 484 Td\n(Periode Izin) Tj\n" + colonX + " 484 Td\n(:) Tj\n" + valueX + " 484 Td\n(" + tanggalMulai + " s/d " + tanggalSelesai + ") Tj\nET\nBT\n/F1 10 Tf\n" + labelX + " 468 Td\n(Alasan / Keterangan) Tj\n" + colonX + " 468 Td\n(:) Tj\n" + valueX + " 468 Td\n(" + alasanWrap + ") Tj\nET\nBT\n/F1 10 Tf\n" + labelX + " 452 Td\n(Status Verifikasi) Tj\n" + colonX + " 452 Td\n(:) Tj\n" + valueX + " 452 Td\n(" + status + ") Tj\nET\nBT\n/F1 10 Tf\n" + labelX + " 420 Td\n(Demikian surat permohonan izin ini diajukan agar dapat dipertimbangkan) Tj\n0 -12 Td\n(dan disahkan oleh pihak SMP Negeri 1 Kertak Hanyar.) Tj\nET\nBT\n/F1 10 Tf\n" + colKiriX + " 340 Td\n(Kertak Hanyar, " + tanggalCetak + ") Tj\n0 -16 Td\n(Orang Tua / Wali Siswa) Tj\n0 -70 Td\n(___________________________) Tj\n0 -14 Td\n(" + namaWali.toUpperCase() + ") Tj\nET\nBT\n/F1 10 Tf\n" + colKananX + " 340 Td\n(Kertak Hanyar, " + tanggalCetak + ") Tj\n0 -16 Td\n(Guru Piket / Pengesahan Sekolah) Tj\n0 -70 Td\n(___________________________) Tj\n0 -14 Td\n(Guru Piket SMP Negeri 1 Kertak Hanyar) Tj\nET\nendstream\nendobj\n5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\nxref\n0 7\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000266 00000 n \n0000002770 00000 n \n0000002847 00000 n \ntrailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n2924\n%%EOF";

    return Buffer.from(pdf, "binary");
  } catch (err) {
    console.error("DEBUG PDF ERROR:", err);
    const fallbackPdf = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n4 0 obj\n<< /Length 1300 >>\nstream\nBT\n/F2 12 Tf\n297 790 Td\n(PEMERINTAH KABUPATEN BANJAR) Tj\nET\nBT\n/F2 12 Tf\n297 776 Td\n(DINAS PENDIDIKAN) Tj\nET\nBT\n/F2 16 Tf\n297 755 Td\n(SMP NEGERI 1 KERTAK HANYAR) Tj\nET\nBT\n/F1 8 Tf\n297 738 Td\n(Jl. A. Yani Km. 10.200, Kertak Hanyar, Kab. Banjar, Kalimantan Selatan) Tj\nET\n45 720 m\n550 720 l\nS\n45 717 m\n550 717 l\nS\nBT\n/F2 14 Tf\n297 690 Td\n(SURAT KETERANGAN PERMOHONAN IZIN SISWA) Tj\nET\nBT\n/F1 10 Tf\n55 640 Td\n(Nama Siswa) Tj\n180 640 Td\n(:) Tj\n195 640 Td\n(" + (surat?.nama || "-") + ") Tj\nET\nBT\n/F1 10 Tf\n55 624 Td\n(NISN) Tj\n180 624 Td\n(:) Tj\n195 624 Td\n(" + (surat?.nisn || "-") + ") Tj\nET\nBT\n/F1 10 Tf\n55 608 Td\n(Kelas) Tj\n180 608 Td\n(:) Tj\n195 608 Td\n(" + (surat?.kelas || "-") + ") Tj\nET\nBT\n/F1 10 Tf\n55 592 Td\n(Nama Orang Tua/Wali) Tj\n180 592 Td\n(:) Tj\n195 592 Td\n(" + (surat?.namaWali || "-") + ") Tj\nET\nBT\n/F1 10 Tf\n55 576 Td\n(No. WhatsApp / HP) Tj\n180 576 Td\n(:) Tj\n195 576 Td\n(" + (surat?.noTeleponWali || "-") + ") Tj\nET\nBT\n/F1 10 Tf\n55 560 Td\n(Jenis Izin) Tj\n180 560 Td\n(:) Tj\n195 560 Td\n(" + (surat?.jenis || "-") + ") Tj\nET\nBT\n/F1 10 Tf\n55 544 Td\n(Periode Izin) Tj\n180 544 Td\n(:) Tj\n195 544 Td\n(" + (surat?.tanggal || "-") + ") Tj\nET\nBT\n/F1 10 Tf\n55 528 Td\n(Alasan / Keterangan) Tj\n180 528 Td\n(:) Tj\n195 528 Td\n(" + (surat?.alasan || "-") + ") Tj\nET\nBT\n/F1 10 Tf\n55 512 Td\n(Status Verifikasi) Tj\n180 512 Td\n(:) Tj\n195 512 Td\n(DISETUJUI OLEH GURU PIKET) Tj\nET\nBT\n/F1 9 Tf\n60 300 Td\n(Kertak Hanyar, " + new Date().toLocaleDateString("id-ID") + ") Tj\n0 -14 Td\n(Orang Tua / Wali Siswa) Tj\n0 -50 Td\n(___________________________) Tj\nET\nBT\n/F1 9 Tf\n360 300 Td\n(Kertak Hanyar, " + new Date().toLocaleDateString("id-ID") + ") Tj\n0 -14 Td\n(Guru Piket / Pengesahan Sekolah) Tj\n0 -50 Td\n(___________________________) Tj\nET\nendstream\nendobj\n5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\nxref\n0 7\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000266 00000 n \n0000001720 00000 n \n0000001797 00000 n \ntrailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n1874\n%%EOF";
    return Buffer.from(fallbackPdf, "binary");
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID tidak ditemukan." }, { status: 400 });
    }
    const izin = getLeaveRequestById(Number(id));
    if (!izin) {
      return NextResponse.json({ error: "Data izin tidak ditemukan." }, { status: 404 });
    }
    const suratData = {
      ...izin,
      noRegistrasi: "IZN-" + new Date().toISOString().slice(0,10).replace(/-/g,"") + "-" + String(izin.id).padStart(6,"0"),
    };
    try {
      const pdfBuffer = buatPdfBuffer(suratData);
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": "inline; filename=\"Surat-Izin-" + (izin.nisn || izin.id) + "-" + izin.id + ".pdf\"",
        },
      });
    } catch (pdfError) {
      console.error("DEBUG PDF ERROR:", pdfError);
      const pdfBuffer = buatPdfBuffer(suratData);
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": "inline; filename=\"Surat-Izin-" + (izin.nisn || izin.id) + "-" + izin.id + ".pdf\"",
        },
      });
    }
  } catch (err) {
    console.error("DEBUG PDF ERROR:", err);
    return NextResponse.json({ error: "Gagal generate PDF." }, { status: 500 });
  }
}
