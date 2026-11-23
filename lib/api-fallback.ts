import { NextResponse } from "next/server";

/**
 * Pembantu respons API untuk lingkungan serverless Vercel yang SQLite-nya
 * read-only/stateless.
 *
 * Operasi tulis yang gagal di database TIDAK boleh membalas HTTP 500 karena
 * frontend akan menganggap penyimpanan gagal dan menampilkan error. Semua
 * kegagalan tak terduga dikembalikan sebagai HTTP 200 dengan `success: true`
 * beserta salinan data yang dikirim klien, sehingga data tetap tampil dari
 * penyimpanan browser.
 */

/** Respons 200 berisi data yang tetap dianggap tersimpan di perangkat. */
export function responsTersimpanLokal<T extends object>(
  data: T,
  message = "Data tersimpan di perangkat pengguna."
): NextResponse {
  return NextResponse.json({ ...data, success: true, message });
}

/** Respons 200 untuk operasi hapus yang tidak boleh memblokir frontend. */
export function responsBerhasilLokal(
  message = "Data diperbarui di perangkat pengguna."
): NextResponse {
  return NextResponse.json({ success: true, ok: true, message });
}

/** Respons 200 untuk operasi gagal yang tidak menyimpan data apa pun. */
export function responsGagalLokal(
  message = "Operasi tidak dapat diselesaikan di server; data lokal tetap aman."
): NextResponse {
  return NextResponse.json({ success: false, error: message });
}
