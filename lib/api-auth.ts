import { getSessionUser } from "@/lib/db";
import type { PeranPengguna, SesiPengguna } from "@/lib/types";

export interface SesiTerotorisasi extends SesiPengguna {
  token: string;
}

export function ambilBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;

  const [skema, token] = header.trim().split(/\s+/);
  if (skema?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export function sesiDariPermintaan(
  request: Request,
  peran?: PeranPengguna
): SesiTerotorisasi | null {
  const token = ambilBearerToken(request);
  if (!token) return null;

  const sesi = getSessionUser(token);
  if (!sesi) return null;
  if (peran && sesi.role !== peran) return null;

  return { ...sesi, token };
}

/** Sesi guru yang khusus memiliki peran staf Tata Usaha. */
export function sesiAdminTu(request: Request): SesiTerotorisasi | null {
  const sesi = sesiDariPermintaan(request, "guru");
  if (!sesi || sesi.staffRole !== "ADMIN_TU") return null;
  return sesi;
}
