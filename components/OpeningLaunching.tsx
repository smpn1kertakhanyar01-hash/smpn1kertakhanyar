"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Logo from "@/components/Logo";

/** Kunci localStorage agar layar peresmian hanya tampil sekali per browser. */
export const OPENING_STORAGE_KEY = "has_launched_smpn1";

/** Event untuk memunculkan kembali layar peresmian (khusus demo/presentasi). */
export const OPENING_RESET_EVENT = "smpn1:reset-opening";

const DURASI_HITUNG_MUNDUR = 3;
const DURASI_CELEBRATION = 1400;
const DURASI_FADE_OUT = 1500;

type FaseOpening = "standby" | "hitung" | "resmi" | "fade-out" | "selesai";

const WARNA_CONFETTI = [
  "#2563eb",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#06b6d4",
];

const CONFETTI = Array.from({ length: 42 }, (_, index) => ({
  id: index,
  left: (index * 17 + 7) % 100,
  delay: (index % 10) * 0.07,
  duration: 1.8 + ((index * 7) % 12) / 10,
  arah:
    index % 3 === 0
      ? "opening-confetti--kiri"
      : index % 3 === 1
        ? "opening-confetti--kanan"
        : "",
  warna: WARNA_CONFETTI[index % WARNA_CONFETTI.length],
}));

export default function OpeningLaunching() {
  // `mounted` sengaja dimulai false agar render server & klien identik.
  const [mounted, setMounted] = useState(false);
  const [tampil, setTampil] = useState(false);
  const [fase, setFase] = useState<FaseOpening>("standby");
  const [sisaDetik, setSisaDetik] = useState(DURASI_HITUNG_MUNDUR);
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const bersihkanTimer = useCallback(() => {
    timerRefs.current.forEach((timer) => clearTimeout(timer));
    timerRefs.current = [];
  }, []);

  const tampilkanResmi = useCallback(() => {
    setFase("resmi");

    try {
      window.localStorage.setItem(OPENING_STORAGE_KEY, "true");
    } catch {
      // Abaikan bila localStorage tidak tersedia (mode privat/penuh).
    }

    // Tampilkan confetti sejenak sebelum layar memudar.
    const timerCelebration = setTimeout(() => {
      setFase("fade-out");

      const timerFade = setTimeout(() => {
        setTampil(false);
        setFase("selesai");
      }, DURASI_FADE_OUT);
      timerRefs.current.push(timerFade);
    }, DURASI_CELEBRATION);
    timerRefs.current.push(timerCelebration);
  }, []);

  const mulaiStandby = useCallback(() => {
    bersihkanTimer();
    setFase("standby");
    setSisaDetik(DURASI_HITUNG_MUNDUR);
    setTampil(true);
  }, [bersihkanTimer]);

  const mulaiPeresmian = () => {
    bersihkanTimer();
    setFase("hitung");

    const jalankanHitungMundur = (nilai: number) => {
      if (nilai <= 0) {
        tampilkanResmi();
        return;
      }

      setSisaDetik(nilai);
      const timer = setTimeout(
        () => jalankanHitungMundur(nilai - 1),
        1000
      );
      timerRefs.current.push(timer);
    };

    jalankanHitungMundur(DURASI_HITUNG_MUNDUR);
  };

  // Tandai komponen sudah terpasang di browser (menghindari hydration mismatch).
  useEffect(() => {
    // Pola ini memang butuh setState setelah mount agar render server & klien identik.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);

    return bersihkanTimer;
  }, [bersihkanTimer]);

  // Setelah mounted, cek localStorage sebelum menampilkan overlay.
  useEffect(() => {
    if (!mounted) return;

    let sudahPernahLaunching = false;
    try {
      sudahPernahLaunching =
        window.localStorage.getItem(OPENING_STORAGE_KEY) === "true";
    } catch {
      sudahPernahLaunching = false;
    }

    if (!sudahPernahLaunching) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      mulaiStandby();
    }
  }, [mounted, mulaiStandby]);

  // Cegah halaman di belakang overlay ikut ter-scroll.
  useEffect(() => {
    if (!tampil) return;

    const overflowSebelumnya = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflowSebelumnya;
    };
  }, [tampil]);

  // Tombol rahasia di footer memicu event ini untuk mengulang peresmian.
  useEffect(() => {
    const handleReset = () => {
      try {
        window.localStorage.removeItem(OPENING_STORAGE_KEY);
      } catch {
        // Abaikan bila localStorage tidak tersedia.
      }
      mulaiStandby();
    };

    window.addEventListener(OPENING_RESET_EVENT, handleReset);
    return () => window.removeEventListener(OPENING_RESET_EVENT, handleReset);
  }, [mulaiStandby]);

  if (!mounted || !tampil) return null;

  const fadeOut = fase === "fade-out";
  const sedangHitung = fase === "hitung";
  const sedangResmi = fase === "resmi" || fadeOut;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Peresmian Portal E-Layanan Kesiswaan SMP Negeri 1 Kertak Hanyar"
      className={`fixed inset-0 z-[10000] flex items-center justify-center overflow-hidden bg-white px-4 transition-opacity ease-out ${
        fadeOut ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{ transitionDuration: `${DURASI_FADE_OUT}ms` }}
    >
      {/* Ornamen latar lembut */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-100/70 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -bottom-24 h-80 w-80 rounded-full bg-emerald-100/60 blur-3xl"
      />

      {sedangResmi ? (
        <>
          {/* Confetti sambutan */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            {CONFETTI.map((confetti) => (
              <span
                key={confetti.id}
                className={`opening-confetti ${confetti.arah}`}
                style={{
                  left: `${confetti.left}%`,
                  backgroundColor: confetti.warna,
                  animationDuration: `${confetti.duration}s`,
                  animationDelay: `${confetti.delay}s`,
                }}
              />
            ))}
          </div>

          <div
            className="relative w-full max-w-md text-center"
            role="status"
            aria-live="polite"
          >
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-blue-100 bg-white p-2 shadow-lg shadow-blue-100/60">
              <Logo priority className="h-full w-full rounded-2xl object-contain" />
            </div>

            <div className="text-5xl" aria-hidden="true">
              🎉
            </div>
            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">
              Selamat
            </p>
            <h1 className="mt-2 text-2xl font-black leading-tight tracking-tight text-slate-900 sm:text-3xl">
              RESMI DILUNCURKAN!
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-xs font-semibold leading-relaxed text-slate-500 sm:text-sm">
              Portal E-Layanan &amp; Informasi Kesiswaan SMP Negeri 1 Kertak
              Hanyar siap digunakan.
            </p>
          </div>
        </>
      ) : (
        <div className="relative w-full max-w-md text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-blue-100 bg-white p-2 shadow-lg shadow-blue-100/60">
            <Logo priority className="h-full w-full rounded-2xl object-contain" />
          </div>

          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">
            Peresmian / Launching
          </p>
          <h1 className="mt-2 text-xl font-black leading-tight tracking-tight text-slate-900 sm:text-2xl">
            SMP NEGERI 1 KERTAK HANYAR
          </h1>
          <p className="mt-2 text-xs font-semibold text-slate-500 sm:text-sm">
            E-Layanan &amp; Portal Informasi Kesiswaan
          </p>

          <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-amber-600 sm:text-sm">
            SETITIK TINTA SEJUTA MAKNA
          </p>

          {sedangHitung ? (
            <div className="mt-8 flex flex-col items-center">
              <div className="relative flex h-40 w-40 items-center justify-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-blue-100/80 [animation-duration:2s]" />
                <span className="absolute inset-4 rounded-full border border-blue-200 bg-white shadow-inner" />
                <span
                  key={sisaDetik}
                  className="opening-countdown-pop relative text-7xl font-black tabular-nums text-blue-700"
                  aria-live="polite"
                  aria-label={`Peresmian dimulai dalam ${sisaDetik} detik`}
                >
                  {sisaDetik}
                </span>
              </div>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                Bersiap...
              </p>
            </div>
          ) : (
            <div className="mt-8">
              <button
                type="button"
                onClick={mulaiPeresmian}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-sm font-black text-white shadow-xl shadow-blue-200 transition hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700 hover:shadow-2xl active:translate-y-0 active:scale-[0.98] sm:text-base"
              >
                <span
                  aria-hidden="true"
                  className="text-lg transition group-hover:-translate-y-0.5 group-hover:scale-110"
                >
                  🚀
                </span>
                Tekan untuk Memulai Peresmian
              </button>
              <p className="mt-3 text-[11px] font-medium text-slate-400">
                Hitung mundur akan dimulai setelah tombol ditekan.
              </p>
            </div>
          )}

          <p className="mt-8 text-[10px] text-slate-300">
            Selamat datang di layanan digital SMP Negeri 1 Kertak Hanyar
          </p>
        </div>
      )}
    </div>
  );
}
