import { NextResponse } from "next/server";
import { catatLogNotifikasiWA } from "@/lib/db-kesiswaan";

interface NotifikasiWA {
  nomorWa: string;
  namaSiswa: string;
  kelas?: string;
  noReg?: string;
  jenisIzin?: string;
  tanggalIzin?: string;
  pesan?: string;
  pdfUrl?: string;
}

function formatNomorWa(nomor: string) {
  let cleaned = nomor.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  } else if (cleaned.startsWith("8")) {
    cleaned = "62" + cleaned;
  }
  return cleaned;
}

function buatPesanResmi(body: NotifikasiWA) {
  const namaSiswa = body.namaSiswa || "-";
  const kelas = body.kelas || "-";
  const noReg = body.noReg || "-";
  const jenisIzin = body.jenisIzin || "-";
  const tanggalIzin = body.tanggalIzin || "-";

  return `Yth. Bapak/Ibu Orang Tua/Wali,

Permohonan surat izin siswa atas nama ${namaSiswa} (Kelas ${kelas}) dengan Nomor Registrasi: ${noReg} telah BERHASIL TERKIRIM ke sistem kesiswaan SMPN 1 Kertak Hanyar.

Rincian Permohonan:
- Nama Siswa      : ${namaSiswa}
- Kelas            : ${kelas}
- Jenis Izin       : ${jenisIzin}
- Tanggal          : ${tanggalIzin}
- Nomor Registrasi : ${noReg}
- Status Verifikasi: MENUNGGU VERIFIKASI DARI GURU PIKET

Dokumen bukti pendaftaran resmi (Surat Keterangan Permohonan Izin Siswa) telah otomatis diproses dan dikirimkan oleh WhatsApp Admin SMPN 1 Kertak Hanyar.

Bapak/Ibu dapat memantau status persetujuan surat secara berkala melalui tautan portal: http://[domain/ip]/status-izin

Terima kasih atas kerja samanya.

Hormat kami,
Admin Kesiswaan SMPN 1 Kertak Hanyar`;
}

function isLocalUrl(url?: string) {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") return true;
    // Check for private IP ranges
    if (/^192\.168\./.test(parsed.hostname) || /^10\./.test(parsed.hostname) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(parsed.hostname)) return true;
    return false;
  } catch {
    return true;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as NotifikasiWA;
    const target = formatNomorWa(body.nomorWa || "");
    const fonnteToken = process.env.FONNTE_TOKEN;
    const pdfUrl = body.pdfUrl;

    const namaFile = `Surat_Izin_${(body.namaSiswa || "Siswa").replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
    let pesan = body.pesan || buatPesanResmi(body);

    console.log("FONNTE TOKEN ADA:", !!fonnteToken);
    console.log("Nomor Tujuan:", target);
    console.log("[NOTIFIKASI-WA][FONNTE] PDF URL:", pdfUrl || "-");
    console.log("[NOTIFIKASI-WA][FONNTE] Nama File:", namaFile);

    if (!fonnteToken) {
      console.error("[NOTIFIKASI-WA][FONNTE] ERROR: FONNTE_TOKEN tidak ditemukan di environment (.env.local)");
      catatLogNotifikasiWA({
        nomorTujuan: target || body.nomorWa || "-",
        pesan,
        statusKirim: "GAGAL",
        responFonnte: { error: "FONNTE_TOKEN belum dikonfigurasi" },
      });
      return NextResponse.json({ 
        ok: false, 
        error: "FONNTE_TOKEN belum dikonfigurasi di file .env.local" 
      }, { status: 500 });
    }

    if (!target || target.length < 10) {
      console.error("[NOTIFIKASI-WA][FONNTE] ERROR: Nomor WA target tidak valid:", body.nomorWa);
      catatLogNotifikasiWA({
        nomorTujuan: target || body.nomorWa || "-",
        pesan,
        statusKirim: "GAGAL",
        responFonnte: { error: "Nomor WhatsApp orang tua tidak valid" },
      });
      return NextResponse.json({ 
        ok: false, 
        error: "Nomor WhatsApp orang tua tidak valid" 
      }, { status: 400 });
    }

    // Tambahkan info nomor registrasi dan tautan ke pesan jika belum ada
    if (body.noReg && !pesan.includes(body.noReg)) {
      pesan = `${pesan}\n\nNomor Registrasi: ${body.noReg}\nLink Unduh PDF Resmi: ${pdfUrl || "[Tautan akan tersedia melalui portal]"}\nTautan Portal Status: http://[domain/ip]/status-izin`;
    }

    try {
      const formData = new URLSearchParams();
      formData.append("target", target);
      formData.append("message", pesan);
      
      // Jika URL masih localhost/IP lokal, jangan sertakan parameter url ke Fonnte
      if (pdfUrl && !isLocalUrl(pdfUrl)) {
        formData.append("url", pdfUrl);
        formData.append("filename", namaFile);
        console.log("[NOTIFIKASI-WA][FONNTE] Menyertakan lampiran URL publik");
      } else if (pdfUrl && isLocalUrl(pdfUrl)) {
        console.log("[NOTIFIKASI-WA][FONNTE] URL lokal terdeteksi, parameter 'url' TIDAK dikirim ke Fonnte (akan menggunakan pesan teks saja)");
      }

      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: fonnteToken,
        },
        body: formData,
      });

      const dataRespon = await response.json();
      console.log("Respon Fonnte:", JSON.stringify(dataRespon));

      if (!response.ok || dataRespon?.status === false || dataRespon?.status === "false") {
        console.error("[NOTIFIKASI-WA][FONNTE] ERROR: Fonnte mengembalikan error:", dataRespon);
        catatLogNotifikasiWA({
          nomorTujuan: target,
          pesan,
          statusKirim: "GAGAL",
          responFonnte: dataRespon,
        });
        return NextResponse.json({ 
          ok: false, 
          provider: "fonnte",
          error: dataRespon?.reason || dataRespon?.message || "Gagal mengirim pesan melalui Fonnte",
          detail: dataRespon
        }, { status: 502 });
      }

      catatLogNotifikasiWA({
        nomorTujuan: target,
        pesan,
        statusKirim: "BERHASIL",
        responFonnte: dataRespon,
      });

      return NextResponse.json({ 
        ok: true, 
        provider: "fonnte",
        dispatched: true,
        target: target,
        result: dataRespon 
      });
    } catch (gatewayError) {
      console.error("[NOTIFIKASI-WA][FONNTE] EXCEPTION saat mengirim:", gatewayError);
      catatLogNotifikasiWA({
        nomorTujuan: target,
        pesan,
        statusKirim: "GAGAL",
        responFonnte: {
          error:
            gatewayError instanceof Error
              ? gatewayError.message
              : "Terjadi kesalahan saat menghubungi Fonnte",
        },
      });
      return NextResponse.json({ 
        ok: false, 
        provider: "fonnte",
        error: gatewayError instanceof Error ? gatewayError.message : "Terjadi kesalahan saat menghubungi Fonnte" 
      }, { status: 502 });
    }
  } catch (error) {
    console.error("[NOTIFIKASI-WA] ERROR: Gagal memproses notifikasi WA:", error);
    return NextResponse.json({ error: "Gagal memproses notifikasi WhatsApp." }, { status: 500 });
  }
}
