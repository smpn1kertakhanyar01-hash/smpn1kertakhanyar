import crypto from "node:crypto";
import { PERAN_PEGAWAI } from "./constants";
import { AKUN_DEMO_SISWA, AKUN_SISWA_SEED } from "./data";
import type { Pengguna, SesiPengguna } from "./types";

/** Username petugas yang selalu dapat login lewat portal pegawai. */
export const USERNAME_PETUGAS_FALLBACK = [
  "guru",
  "admintu",
  "petugas.smpn1kh",
] as const;

/** Kata sandi petugas yang diterima untuk seluruh username di atas. */
export const PASSWORD_PETUGAS_FALLBACK = [
  "@Smpn1KH#",
  "adminTUkece",
] as const;

export function cariAkunPetugasFallback(
  identifier: string,
  password: string
): Pengguna | null {
  const username = identifier.trim().toLowerCase();
  const usernameCocok = (USERNAME_PETUGAS_FALLBACK as readonly string[]).includes(
    username
  );

  if (
    !usernameCocok ||
    !(PASSWORD_PETUGAS_FALLBACK as readonly string[]).includes(password)
  ) {
    return null;
  }

  return {
    id: -1,
    username,
    role: "guru",
    staffRole: "ADMIN_TU",
    nama: "Petugas Tata Usaha & Kesiswaan",
  };
}

export function cariAkunSiswaFallback(
  identifier: string,
  password: string
): Pengguna | null {
  const nisn = identifier.trim();

  if (
    nisn.toLowerCase() === AKUN_DEMO_SISWA.nisn.toLowerCase() &&
    password === AKUN_DEMO_SISWA.sandi
  ) {
    return {
      id: -999,
      username: AKUN_DEMO_SISWA.nisn,
      role: "siswa",
      nama: AKUN_DEMO_SISWA.nama,
      nisn: AKUN_DEMO_SISWA.nisn,
      kelas: AKUN_DEMO_SISWA.kelas,
    };
  }

  const indeks = AKUN_SISWA_SEED.findIndex((akun) => akun.nisn === nisn);
  if (indeks === -1) return null;

  const akun = AKUN_SISWA_SEED[indeks];
  const sandiFormula = `smp${akun.nisn.slice(-4)}`;
  if (password !== akun.sandi && password !== sandiFormula) return null;

  return {
    id: -(indeks + 10),
    username: akun.nisn,
    role: "siswa",
    nama: akun.nama,
    nisn: akun.nisn,
    kelas: akun.kelas,
  };
}

/**
 * Sesi stateless untuk akun darurat (fallback).
 *
 * Di Vercel, SQLite tidak dapat diandalkan untuk menyimpan `auth_sessions`
 * (read-only/stateless). Token fallback ditandatangani dengan HMAC sehingga
 * tetap dapat diverifikasi di instance serverless mana pun tanpa database.
 */
const PREFIX_TOKEN = "smpn1-fallback";
const MASA_BERLAKU_MS = 7 * 24 * 60 * 60 * 1000;

interface PayloadSesiFallback {
  userId: number;
  role: "guru" | "siswa";
  staffRole?: string;
  username: string;
  nama: string;
  exp: number;
}

function ambilKunci(): string {
  return (
    process.env.AUTH_SECRET ??
    process.env.SESSION_SECRET ??
    "smpn1kh-fallback-session-v1"
  );
}

function buatTandaTangan(isi: string): string {
  return crypto.createHmac("sha256", ambilKunci()).update(isi).digest("base64url");
}

function samaAman(nilaiA: string, nilaiB: string): boolean {
  const bufferA = Buffer.from(nilaiA);
  const bufferB = Buffer.from(nilaiB);
  return (
    bufferA.length === bufferB.length &&
    crypto.timingSafeEqual(bufferA, bufferB)
  );
}

export function buatTokenSesiFallback(user: Pengguna): string {
  const payload: PayloadSesiFallback = {
    userId: user.id,
    role: user.role,
    ...(user.staffRole ? { staffRole: user.staffRole } : {}),
    username: user.username,
    nama: user.nama,
    exp: Date.now() + MASA_BERLAKU_MS,
  };

  const isi = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${PREFIX_TOKEN}.${isi}.${buatTandaTangan(isi)}`;
}

export function apakahTokenSesiFallback(token: string): boolean {
  return token.startsWith(`${PREFIX_TOKEN}.`);
}

export function bacaTokenSesiFallback(token: string): SesiPengguna | null {
  const bagian = token.split(".");
  if (bagian.length !== 3 || bagian[0] !== PREFIX_TOKEN) return null;

  const [, isi, tandaTangan] = bagian;
  if (!samaAman(tandaTangan, buatTandaTangan(isi))) return null;

  let payload: PayloadSesiFallback;
  try {
    payload = JSON.parse(
      Buffer.from(isi, "base64url").toString("utf8")
    ) as PayloadSesiFallback;
  } catch {
    return null;
  }

  if (!payload.exp || payload.exp <= Date.now()) return null;
  if (payload.role !== "guru" && payload.role !== "siswa") return null;

  const staffRole =
    payload.staffRole &&
    (PERAN_PEGAWAI as readonly string[]).includes(payload.staffRole)
      ? (payload.staffRole as SesiPengguna["staffRole"])
      : undefined;

  return {
    userId: payload.userId,
    role: payload.role,
    ...(staffRole ? { staffRole } : {}),
    username: payload.username,
    nama: payload.nama,
  };
}
