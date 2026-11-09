import { NextResponse } from "next/server";
import { COOKIE_PERAN_PEGAWAI, COOKIE_SESI_GURU } from "@/lib/constants";
import { ambilBearerToken } from "@/lib/api-auth";
import { deleteAuthSession } from "@/lib/db";

export async function POST(request: Request) {
  const token = ambilBearerToken(request);
  if (token) deleteAuthSession(token);

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(COOKIE_SESI_GURU);
  response.cookies.delete(COOKIE_PERAN_PEGAWAI);
  return response;
}
