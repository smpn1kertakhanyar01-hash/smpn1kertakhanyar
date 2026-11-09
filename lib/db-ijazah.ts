import { getDb } from "./db";
import type {
  PengambilanIjazah,
  PengambilanIjazahPayload,
  StatusPengambilanIjazah,
} from "./types";

const KOLOM_PENGAMBILAN_IJAZAH = `
  id,
  nama_siswa AS namaSiswa,
  nisn,
  kelas,
  tahun_lulus AS tahunLulus,
  status,
  tanggal_ambil AS tanggalAmbil,
  diambil_oleh AS diambilOleh,
  petugas,
  catatan,
  created_at AS createdAt
`;

const STATUS_VALID: StatusPengambilanIjazah[] = ["Belum Diambil", "Diambil"];

function normalisasiStatus(status: string | null | undefined): StatusPengambilanIjazah {
  return STATUS_VALID.includes(status as StatusPengambilanIjazah)
    ? (status as StatusPengambilanIjazah)
    : "Belum Diambil";
}

function tanggalHariIni(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getPengambilanIjazah(filter?: {
  status?: StatusPengambilanIjazah;
  pencarian?: string;
}): PengambilanIjazah[] {
  let sql = `SELECT ${KOLOM_PENGAMBILAN_IJAZAH}
             FROM pengambilan_ijazah
             WHERE 1 = 1`;
  const params: string[] = [];

  if (filter?.status) {
    sql += " AND status = ?";
    params.push(filter.status);
  }

  if (filter?.pencarian?.trim()) {
    sql += " AND (nama_siswa LIKE ? OR nisn LIKE ? OR kelas LIKE ?)";
    const pola = `%${filter.pencarian.trim()}%`;
    params.push(pola, pola, pola);
  }

  sql += " ORDER BY (status = 'Belum Diambil') DESC, id DESC";
  return getDb().prepare(sql).all(...params) as PengambilanIjazah[];
}

export function getPengambilanIjazahById(id: number): PengambilanIjazah | null {
  const row = getDb()
    .prepare(
      `SELECT ${KOLOM_PENGAMBILAN_IJAZAH}
       FROM pengambilan_ijazah
       WHERE id = ?`
    )
    .get(id) as PengambilanIjazah | undefined;

  return row ? { ...row, status: normalisasiStatus(row.status) } : null;
}

export function createPengambilanIjazah(
  input: PengambilanIjazahPayload
): PengambilanIjazah {
  const status = normalisasiStatus(input.status);
  const tanggalAmbil =
    status === "Diambil" ? input.tanggalAmbil?.trim() || tanggalHariIni() : null;

  const hasil = getDb()
    .prepare(
      `INSERT INTO pengambilan_ijazah
         (nama_siswa, nisn, kelas, tahun_lulus, status, tanggal_ambil,
          diambil_oleh, petugas, catatan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.namaSiswa.trim(),
      input.nisn?.trim() || null,
      input.kelas?.trim() || null,
      input.tahunLulus?.trim() || null,
      status,
      tanggalAmbil,
      input.diambilOleh?.trim() || null,
      input.petugas?.trim() || null,
      input.catatan?.trim() || null
    );

  const tersimpan = getPengambilanIjazahById(Number(hasil.lastInsertRowid));
  if (!tersimpan) {
    throw new Error("Gagal menyimpan data pengambilan ijazah.");
  }
  return tersimpan;
}

export function updatePengambilanIjazah(
  id: number,
  input: Partial<PengambilanIjazahPayload>
): PengambilanIjazah | null {
  const petaKolom: Record<keyof PengambilanIjazahPayload, string> = {
    namaSiswa: "nama_siswa",
    nisn: "nisn",
    kelas: "kelas",
    tahunLulus: "tahun_lulus",
    status: "status",
    tanggalAmbil: "tanggal_ambil",
    diambilOleh: "diambil_oleh",
    petugas: "petugas",
    catatan: "catatan",
  };

  const set: string[] = [];
  const params: (string | null)[] = [];

  for (const [kunci, kolom] of Object.entries(petaKolom) as [
    keyof PengambilanIjazahPayload,
    string,
  ][]) {
    if (input[kunci] === undefined) continue;

    let nilai = input[kunci];

    if (kunci === "status") {
      nilai = normalisasiStatus(nilai as string | null | undefined);
    }

    if (kunci === "namaSiswa" && !String(nilai ?? "").trim()) {
      throw new Error("Nama siswa wajib diisi.");
    }

    if (typeof nilai === "string") {
      nilai = nilai.trim() || null;
    }

    set.push(`${kolom} = ?`);
    params.push(nilai ?? null);
  }

  if (set.length === 0) return getPengambilanIjazahById(id);

  getDb()
    .prepare(`UPDATE pengambilan_ijazah SET ${set.join(", ")} WHERE id = ?`)
    .run(...params, id);

  return getPengambilanIjazahById(id);
}

export function deletePengambilanIjazah(id: number): boolean {
  return (
    getDb()
      .prepare("DELETE FROM pengambilan_ijazah WHERE id = ?")
      .run(id).changes > 0
  );
}
