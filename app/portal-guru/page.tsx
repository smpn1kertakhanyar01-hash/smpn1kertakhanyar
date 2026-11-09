import { redirect } from "next/navigation";

// Next.js 16 dengan Cache Components tidak mengizinkan `dynamic = "force-dynamic"`.
// `instant = false` membuat rute ini boleh memblokir dan dirender saat request.
export const instant = false;

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PortalGuruPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = new URLSearchParams();

  for (const [kunci, nilai] of Object.entries(params)) {
    if (Array.isArray(nilai)) {
      nilai.forEach((item) => query.append(kunci, item));
    } else if (nilai !== undefined) {
      query.set(kunci, nilai);
    }
  }

  const suffix = query.toString();
  redirect(`/dashboard-guru${suffix ? `?${suffix}` : ""}`);
}
