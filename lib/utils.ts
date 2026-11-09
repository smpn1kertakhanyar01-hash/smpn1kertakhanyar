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
