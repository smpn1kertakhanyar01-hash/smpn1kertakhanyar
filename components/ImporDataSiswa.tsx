"use client";

import { useRef, useState } from "react";
import {
  KONTEN_TEMPLATE_CSV_SISWA,
  NAMA_FILE_TEMPLATE_CSV_SISWA,
  parseCsvSiswa,
  simpanSiswaImpor,
  tentukanSiswaBaru,
} from "@/lib/siswa-store";
import type { Siswa } from "@/lib/types";

interface Props {
  /** Daftar siswa yang sedang ditampilkan, dipakai untuk mencegah NISN ganda. */
  daftarSiswaSaatIni?: Siswa[];
  /** Dipanggil setelah impor agar halaman induk menyegarui tabelnya. */
  onSelesaiImpor?: (jumlahBaru: number) => void;
}

/**
 * Tombol unduh template dan impor CSV massal untuk PPDB. Seluruh proses
 * parsing berlangsung di browser dengan FileReader; tidak ada unggahan file
 * ke server maupun dependensi pustaka tambahan.
 */
export default function ImporDataSiswa({
  daftarSiswaSaatIni = [],
  onSelesaiImpor,
}: Props) {
  const inputFileRef = useRef<HTMLInputElement>(null);
  const [memproses, setMemproses] = useState(false);

  const unduhTemplate = () => {
    const blob = new Blob([KONTEN_TEMPLATE_CSV_SISWA], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const tautan = document.createElement("a");
    tautan.href = url;
    tautan.download = NAMA_FILE_TEMPLATE_CSV_SISWA;
    document.body.appendChild(tautan);
    tautan.click();
    document.body.removeChild(tautan);
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const kosongkanInput = () => {
    if (inputFileRef.current) inputFileRef.current.value = "";
  };

  const handlePilihFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMemproses(true);
    const pembaca = new FileReader();

    pembaca.onload = (event) => {
      try {
        const isi = event.target?.result;
        if (typeof isi !== "string") {
          alert("Gagal membaca isi file CSV. Silakan coba lagi.");
          return;
        }

        const hasilParse = parseCsvSiswa(isi);
        if (hasilParse.length === 0) {
          alert(
            "File CSV tidak berisi data siswa yang valid. Gunakan template yang disediakan."
          );
          return;
        }

        const siswaBaru = tentukanSiswaBaru(hasilParse, daftarSiswaSaatIni);
        if (siswaBaru.length === 0) {
          alert(
            "Semua NISN dalam file CSV sudah terdaftar. Tidak ada data baru untuk diimpor."
          );
          return;
        }

        simpanSiswaImpor(siswaBaru, daftarSiswaSaatIni);
        onSelesaiImpor?.(siswaBaru.length);
        alert(
          `Berhasil mengimpor ${siswaBaru.length} data siswa baru ke sistem!`
        );
      } catch (error) {
        console.error("Gagal mengimpor data siswa:", error);
        alert("Gagal mengimpor data siswa. Periksa kembali format file CSV.");
      } finally {
        setMemproses(false);
        kosongkanInput();
      }
    };

    pembaca.onerror = () => {
      alert("Gagal membaca file CSV. Silakan coba lagi.");
      setMemproses(false);
      kosongkanInput();
    };

    pembaca.readAsText(file, "UTF-8");
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={inputFileRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handlePilihFile}
        className="hidden"
        aria-label="Pilih file CSV data siswa"
      />
      <button
        type="button"
        onClick={unduhTemplate}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
      >
        Unduh Template CSV
      </button>
      <button
        type="button"
        onClick={() => inputFileRef.current?.click()}
        disabled={memproses}
        className="rounded-lg bg-blue-600 px-3 py-2 text-[11px] font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:bg-blue-400"
      >
        {memproses ? "Mengimpor..." : "Impor Data Siswa (CSV)"}
      </button>
    </div>
  );
}
