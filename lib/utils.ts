export function ambilTanggalHariIni(): string {
  return new Date().toISOString().split("T")[0];
}

export function ambilWaktuSekarang(): string {
  return (
    new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }) + " WITA"
  );
}

export function ambilTanggalPanjang(): string {
  return new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function buatUrlWhatsApp(nomor: string, namaSiswa: string): string {
  let nomorBersih = nomor.replace(/[^0-9]/g, "");

  if (nomorBersih.startsWith("0")) {
    nomorBersih = "62" + nomorBersih.substring(1);
  }

  const pesan = encodeURIComponent(
    `Assalamu'alaikum Warahmatullahi Wabarakatuh, salam dari Guru Piket SMPN 1 Kertak Hanyar terkait konfirmasi permohonan surat izin ananda ${namaSiswa}.`
  );

  return `https://wa.me/${nomorBersih}?text=${pesan}`;
}

/** Ubah nomor WhatsApp ke format lokal 08xx untuk pemeriksaan nomor dummy. */
export function nomorWhatsAppLokal(nomor?: string): string {
  let nomorBersih = (nomor ?? "").replace(/[^0-9]/g, "");
  if (nomorBersih.startsWith("62")) {
    nomorBersih = "0" + nomorBersih.slice(2);
  }
  return nomorBersih;
}

/**
 * Nomor contoh 0812563225xx dipakai pada data demo. Nomor seperti ini tidak
 * boleh dianggap sebagai nomor wali sungguhan sehingga UI perlu menampilkan
 * tautan WhatsApp Web sebagai fallback.
 */
export function apakahNomorDummyIzin(nomor?: string): boolean {
  return /^0812563225\d{2}$/.test(nomorWhatsAppLokal(nomor));
}

/** Template pesan resmi persetujuan izin sesuai permintaan sekolah. */
export function buatPesanPersetujuanIzin(params: {
  nama: string;
  jenis?: string;
  tanggal: string;
}): string {
  const jenisIzin = (params.jenis ?? "").toLowerCase().includes("sakit")
    ? "izin sakit"
    : "izin";
  return `Yth. Orang Tua/Wali dari ${params.nama}, permohonan ${jenisIzin} tanggal ${params.tanggal} telah DISETUJUI oleh pihak SMP Negeri 1 Kertak Hanyar. Terima kasih.`;
}

/** Buat tautan WhatsApp Web dengan pesan yang sudah diisi otomatis. */
export function buatUrlWhatsAppDenganPesan(
  nomor: string,
  pesan: string
): string {
  let nomorBersih = nomor.replace(/[^0-9]/g, "");

  if (nomorBersih.startsWith("0")) {
    nomorBersih = "62" + nomorBersih.substring(1);
  } else if (nomorBersih.startsWith("8")) {
    nomorBersih = "62" + nomorBersih;
  }

  return `https://wa.me/${nomorBersih}?text=${encodeURIComponent(pesan)}`;
}

export interface IdentitasSiswaTersamar {
  nama: string;
  kelas: string;
}

function buatInisialNama(nama?: string | null): string {
  const namaBersih = (nama ?? "").trim();
  if (!namaBersih || namaBersih === "-") return "";

  const inisial = namaBersih
    .split(/\s+/)
    .map((kata) => kata.match(/[A-Za-zÀ-ÿ]/)?.[0]?.toUpperCase() ?? "")
    .filter(Boolean);

  return inisial.length > 0 ? `${inisial.join(".")}.` : "";
}

function ambilTingkatKelas(kelas?: string | null): string {
  const kelasBersih = (kelas ?? "").trim().replace(/^kelas\s+/i, "");
  if (!kelasBersih || kelasBersih === "-") return "";

  const cocok = kelasBersih
    .toUpperCase()
    .match(
      /^(XII|XI|IX|X|VIII|VII|VI|V|IV|III|II|I|\d{1,2})(?=[.\s\-/]|[A-Z]|$)/
    );

  return cocok?.[1] ?? "";
}

/**
 * Menyamarkan identitas siswa untuk tampilan publik/portal siswa.
 * Nama menjadi inisial (contoh: "Ahmad Fauzi" -> "A.F.") dan
 * kelas hanya menampilkan tingkat tanpa paralel (contoh: "IX A" -> "Kelas IX (Paralel Disamarkan)").
 */
export function maskStudentIdentity(
  nama?: string | null,
  kelas?: string | null
): IdentitasSiswaTersamar {
  const namaTersamar = buatInisialNama(nama);
  const tingkatKelas = ambilTingkatKelas(kelas);
  const kelasTersamar =
    kelas && kelas.trim() && kelas.trim() !== "-"
      ? tingkatKelas
        ? `Kelas ${tingkatKelas} (Paralel Disamarkan)`
        : "Kelas (Paralel Disamarkan)"
      : "";

  return {
    nama: namaTersamar,
    kelas: kelasTersamar,
  };
}
