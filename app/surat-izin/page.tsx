"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { api } from "@/lib/api-client";
import { KELAS_PENDAFTARAN } from "@/lib/constants";
import {
  bacaSesiSiswa,
  hapusSesiSiswa,
  STORAGE_KEYS,
} from "@/lib/storage";

export default function SuratIzinSiswaPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  const [formData, setFormData] = useState({
    nisn: "",
    namaLengkap: "",
    kelas: "VII A",
    jenisIzin: "Sakit",
    tanggalMulai: "",
    tanggalSelesai: "",
    alasan: "",
    namaWali: "",
    noTeleponWali: "",
    fotoBukti: "",
    tandaTanganWali: "",
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<{ id?: number; noReg?: string } | null>(null);

  useEffect(() => {
    const loggedIn = localStorage.getItem(STORAGE_KEYS.isLoggedIn);

    if (loggedIn !== "true") {
      alert("Anda harus login terlebih dahulu!");
      router.push("/login-siswa");
      return;
    }

    const sesi = bacaSesiSiswa();
    setIsAuthenticated(true);
    setFormData((prev) => ({
      ...prev,
      nisn: sesi.nisn || "0081234567",
      namaLengkap: sesi.nama || "Ahmad Fauzan",
      kelas: sesi.kelas || "VII A",
    }));
  }, [router]);

  // Fungsi Kompresi Foto Otomatis (Maksimal lebar 800px & Kualitas 0.6)
  const handleUploadFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800; // Kecilkan ukuran foto agar pas di memori browser
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height = (height * MAX_WIDTH) / width;
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Kompres ke format JPEG kualitas sedang (hemat memori)
            const compressedBase64 = canvas.toDataURL("image/jpeg", 0.6);
            setFormData((prev) => ({ ...prev, fotoBukti: compressedBase64 }));
          }
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fotoBukti) {
      alert("Harap lampirkan foto surat fisik bertanda tangan orang tua!");
      return;
    }

    if (!formData.namaWali.trim() || !formData.noTeleponWali.trim()) {
      alert("Harap lengkapi nama orang tua/wali dan nomor WhatsApp!");
      return;
    }

    if (!formData.tandaTanganWali) {
      alert("Harap bubuhkan tanda tangan digital orang tua/wali!");
      return;
    }

    try {
      const tersimpan = await api.createLeaveRequest({
        nama: formData.namaLengkap,
        nisn: formData.nisn,
        kelas: formData.kelas,
        jenis: formData.jenisIzin,
        tanggal: `${formData.tanggalMulai} s/d ${formData.tanggalSelesai}`,
        alasan: formData.alasan,
        status: "Menunggu Verifikasi",
        fotoBukti: formData.fotoBukti,
        namaWali: formData.namaWali,
        noTeleponWali: formData.noTeleponWali,
        tandaTanganWali: formData.tandaTanganWali,
      } as any);

      const idIzin = (tersimpan as any)?.id;
      const noReg = `IZN-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${String(idIzin || Date.now()).padStart(6,"0")}`;

      setSubmittedData({ id: idIzin, noReg });
      setIsSubmitted(true);
    } catch (err) {
      console.error(err);
      alert("Gagal mengirim pengajuan surat izin. Silakan coba lagi.");
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    isDrawingRef.current = true;
    let x = 0, y = 0;
    if ("touches" in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let x = 0, y = 0;
    if ("touches" in e) {
      e.preventDefault();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const endDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    setFormData((prev) => ({ ...prev, tandaTanganWali: dataUrl }));
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setFormData((prev) => ({ ...prev, tandaTanganWali: "" }));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Abaikan kegagalan jaringan; sesi lokal tetap dibersihkan.
    }
    hapusSesiSiswa();
    router.push("/login-siswa");
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#fafbfc] flex items-center justify-center font-sans">
        <p className="text-xs text-slate-400">Memeriksa autentikasi...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fafbfc] text-slate-800 font-sans py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div className="flex gap-4 items-center">
            <Link href="/" className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition">
              ← Beranda
            </Link>
            <Link href="/status-izin" className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition">
              🔍 Status Pengajuan Izin
            </Link>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 transition"
          >
            Keluar (Logout)
          </button>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-sm">
          <div className="text-center pb-6 border-b border-slate-100">
            <div className="w-14 h-14 mx-auto mb-2 p-1 flex items-center justify-center rounded-2xl bg-blue-50 border border-blue-200">
              <Logo priority className="h-full w-full rounded-xl object-contain" />
            </div>
            <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-3 py-1 rounded-full border border-sky-100">
              E-LAYANAN KESISWAAN
            </span>
            <h1 className="text-2xl font-black text-slate-900 mt-2">Formulir Surat Izin Siswa</h1>
            <p className="text-xs text-slate-500 mt-1">SMP Negeri 1 Kertak Hanyar</p>
          </div>

          {isSubmitted ? (
            <div className="py-10 text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-2xl mx-auto border border-emerald-100">
                ✓
              </div>
              <h2 className="text-xl font-bold text-slate-900">Permohonan Izin Berhasil Terkirim</h2>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Permohonan Anda telah terkirim dengan status <span className="font-bold">Menunggu Verifikasi</span>.
                <br />
                Surat resmi akan dikirimkan ke WhatsApp orang tua/wali setelah disetujui oleh Guru Piket/Wali Kelas.
              </p>
              {submittedData?.noReg && (
                <p className="text-xs font-semibold text-slate-700">No. Registrasi: {submittedData.noReg}</p>
              )}
              <div className="pt-2 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsSubmitted(false);
                    setSubmittedData(null);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition"
                >
                  Ajukan Surat Baru
                </button>
                <Link
                  href="/status-izin"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-sm"
                >
                  Cek Status Izin →
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">NISN Siswa</label>
                  <input
                    type="text"
                    disabled
                    value={formData.nisn}
                    className="w-full text-xs sm:text-sm border border-slate-200 bg-slate-50 text-slate-500 rounded-xl px-3.5 py-2.5 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap Siswa *</label>
                  <input
                    type="text"
                    required
                    value={formData.namaLengkap}
                    onChange={(e) => setFormData({ ...formData, namaLengkap: e.target.value })}
                    className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-600 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kelas</label>
                  <select
                    value={formData.kelas}
                    onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                    className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-600 bg-white"
                  >
                    {KELAS_PENDAFTARAN.map((kelas) => (
                      <option key={kelas} value={kelas}>
                        Kelas {kelas}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Keterangan</label>
                  <select
                    value={formData.jenisIzin}
                    onChange={(e) => setFormData({ ...formData, jenisIzin: e.target.value })}
                    className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-600 bg-white"
                  >
                    <option value="Sakit">Sakit</option>
                    <option value="Keperluan Keluarga">Keperluan Keluarga</option>
                    <option value="Tugas Luar Sekolah">Tugas Luar Sekolah</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mulai Tanggal</label>
                  <input
                    type="date"
                    required
                    value={formData.tanggalMulai}
                    onChange={(e) => setFormData({ ...formData, tanggalMulai: e.target.value })}
                    className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-600 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sampai Tanggal</label>
                  <input
                    type="date"
                    required
                    value={formData.tanggalSelesai}
                    onChange={(e) => setFormData({ ...formData, tanggalSelesai: e.target.value })}
                    className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-600 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Alasan Izin *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Tuliskan keterangan lengkap..."
                  value={formData.alasan}
                  onChange={(e) => setFormData({ ...formData, alasan: e.target.value })}
                  className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-600 transition"
                />
              </div>

              {/* Unggah Foto Surat */}
              <div className="bg-blue-50/50 border-2 border-dashed border-blue-200 rounded-2xl p-4">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  📎 Unggah Foto Surat Fisik Bertanda Tangan Orang Tua *
                </label>
                <p className="text-[11px] text-slate-500 mb-3">
                  Foto otomatis dikompres agar ringan dan cepat tersimpan di sistem.
                </p>
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={handleUploadFoto}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                />

                {formData.fotoBukti && (
                  <div className="mt-3 flex items-center gap-3 bg-white p-2.5 rounded-xl border border-blue-100">
                    <img
                      src={formData.fotoBukti}
                      alt="Pratinjau Foto"
                      className="w-14 h-14 object-cover rounded-lg border border-slate-200"
                    />
                    <div>
                      <p className="text-xs font-bold text-emerald-600">✓ Foto Siap Dikirim (Teroptimasi)</p>
                      <p className="text-[10px] text-slate-400">Ukuran foto diperkecil otomatis</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Konfirmasi Orang Tua / Wali */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 block mb-2">KONFIRMASI ORANG TUA / WALI</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nama Orang Tua / Wali *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nama orang tua/wali"
                      value={formData.namaWali}
                      onChange={(e) => setFormData({ ...formData, namaWali: e.target.value })}
                      className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-600 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">No. WhatsApp Wali *</label>
                    <input
                      type="tel"
                      required
                      placeholder="Contoh: 08123456789"
                      value={formData.noTeleponWali}
                      onChange={(e) => setFormData({ ...formData, noTeleponWali: e.target.value })}
                      className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-600 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Tanda Tangan Digital Orang Tua/Wali */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 block mb-2">TANDA TANGAN DIGITAL ORANG TUA / WALI *</span>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={200}
                    style={{ touchAction: "none" }}
                    className="w-full h-[160px] bg-white border border-slate-200 rounded-xl touch-none select-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={endDrawing}
                    onMouseLeave={endDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={endDrawing}
                  />
                  <div className="mt-2 flex justify-between items-center">
                    <p className="text-[10px] text-slate-500">Bubuhkan tanda tangan pada area di atas</p>
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 transition cursor-pointer relative z-10"
                    >
                      Hapus / Ulangi Tanda Tangan
                    </button>
                  </div>
                  {hasSignature && (
                    <p className="text-[10px] text-emerald-600 font-semibold mt-1">✓ Tanda tangan tersimpan</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-3 rounded-xl shadow-md transition hover:scale-[1.01] active:scale-[0.99] mt-2"
              >
                Kirim Pengajuan Izin →
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
