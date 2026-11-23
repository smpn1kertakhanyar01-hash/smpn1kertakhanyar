"use client";

/**
 * Alias `/dashboard-tu` untuk Dashboard Tata Usaha.
 * Halaman utama berada di `/admin-tu` agar tautan lama tetap berfungsi.
 * Protected oleh peran `SMPN1KH_USER_ROLE === "tu"`.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminTuPage from "../admin-tu/page";
import {
  bacaPeranPenggunaLokal,
  PERAN_PENGGUNA_LOKAL_KEY,
} from "@/lib/storage";

export default function DashboardTuPage() {
  const router = useRouter();
  const [diizinkan, setDiizinkan] = useState(false);

  useEffect(() => {
    // Sesi lama dimigrasikan sebelum pengecekan hak akses.
    bacaPeranPenggunaLokal();
    const peran = window.localStorage.getItem(PERAN_PENGGUNA_LOKAL_KEY);

    if (peran !== "tu") {
      router.replace("/dashboard-guru?akses=ditolak");
      return;
    }

    setDiizinkan(true);
  }, [router]);

  if (!diizinkan) {
    return (
      <main className="min-h-screen bg-[#f8fbff] flex items-center justify-center text-xs font-semibold text-slate-500">
        Memeriksa akses Tata Usaha...
      </main>
    );
  }

  return <AdminTuPage />;
}
