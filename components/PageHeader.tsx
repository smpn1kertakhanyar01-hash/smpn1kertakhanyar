import type { ReactNode } from "react";
import Logo from "@/components/Logo";

const HEADER_KELAS =
  "bg-white border-b border-slate-200 px-6 sm:px-12 py-3.5 flex justify-between items-center sticky top-0 z-50";
const BADGE_KELAS =
  "w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center font-black text-blue-700 text-xs shadow-sm";
const JUDUL_KELAS = "font-extrabold text-slate-900 text-sm leading-tight";
const SUBJUDUL_KELAS = "text-[11px] font-medium text-blue-600";
const MOTTO_KELAS =
  "text-xs font-semibold tracking-wider text-blue-700 mt-1.5 leading-snug text-balance";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  badgeText?: string;
  className?: string;
  badgeClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  motto?: string;
  mottoClassName?: string;
}

export default function PageHeader({
  title,
  subtitle,
  children,
  badgeText,
  className = HEADER_KELAS,
  badgeClassName = BADGE_KELAS,
  titleClassName = JUDUL_KELAS,
  subtitleClassName = SUBJUDUL_KELAS,
  motto,
  mottoClassName = MOTTO_KELAS,
}: PageHeaderProps) {
  return (
    <header className={className}>
      <div className="flex items-center gap-3">
        <div className={badgeClassName}>
          {badgeText ?? (
            <Logo
              priority
              className="h-full w-full rounded-xl object-contain"
            />
          )}
        </div>
        <div>
          <h1 className={titleClassName}>{title}</h1>
          <p className={subtitleClassName}>{subtitle}</p>
          {motto && <p className={mottoClassName}>{motto}</p>}
        </div>
      </div>
      {children}
    </header>
  );
}
