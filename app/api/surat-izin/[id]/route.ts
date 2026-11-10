/**
 * Alias endpoint persetujuan/penolakan surat izin (`/api/surat-izin/[id]`).
 * Logika utama berada di `PATCH /api/leave-requests/[id]` agar keputusan
 * guru/TU hanya memiliki satu sumber kebenaran.
 */
export { PATCH } from "../../leave-requests/[id]/route";
