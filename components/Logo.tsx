import Image from "next/image";

interface LogoProps {
  className?: string;
  priority?: boolean;
}

export default function Logo({ className, priority = false }: LogoProps) {
  return (
    <Image
      src="/logo.jpg"
      alt="Logo SMPN 1 Kertak Hanyar"
      width={512}
      height={512}
      sizes="56px"
      priority={priority}
      className={className}
    />
  );
}
