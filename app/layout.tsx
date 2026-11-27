import type { Metadata, Viewport } from "next";
import TombolWA from "@/components/TombolWA";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "E-Layanan Kesiswaan - SMPN 1 Kertak Hanyar",
  description:
    "Portal Layanan Digital Kesiswaan, Presensi, dan Informasi Resmi SMP Negeri 1 Kertak Hanyar",
  icons: {
    icon: "/logo-sekolah.png",
    shortcut: "/logo-sekolah.png",
    apple: "/logo-sekolah.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="max-w-[100vw] antialiased selection:bg-blue-600 selection:text-white">
        {children}
        <TombolWA />
      </body>
    </html>
  );
}
