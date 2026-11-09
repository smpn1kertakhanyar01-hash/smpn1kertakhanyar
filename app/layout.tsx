import type { Metadata } from "next";
import TombolWA from "@/components/TombolWA";
import "./globals.css";

export const metadata: Metadata = {
  title: "E-Layanan Kesiswaan - SMPN 1 Kertak Hanyar",
  description:
    "Portal Layanan Digital Kesiswaan, Presensi, dan Informasi Resmi SMP Negeri 1 Kertak Hanyar",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="antialiased selection:bg-blue-600 selection:text-white">
        {children}
        <TombolWA />
      </body>
    </html>
  );
}
