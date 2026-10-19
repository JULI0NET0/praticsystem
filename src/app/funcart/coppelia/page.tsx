import type { Metadata, Viewport } from "next";
import CoppeliaProgram from "./CoppeliaProgram";
import { PROGRAMS, programForDate, type Program } from "./program";

export const metadata: Metadata = {
  title: "Coppélia — Programa | FUNCART",
  description:
    "Programa do ballet Coppélia pela Escola Municipal de Dança de Londrina: elenco, atos e ficha técnica. 26 a 29 de novembro, 20h, Cine Teatro Ouro Verde.",
  openGraph: {
    title: "Coppélia — Programa do espetáculo",
    description: "Escola Municipal de Dança de Londrina · 26 a 29 de novembro · 20h · Cine Teatro Ouro Verde",
    images: ["/funcart/coppelia/capa-p1-braco-erguido.webp"],
  },
};

export const viewport: Viewport = {
  themeColor: "#f6eedf",
};

export default async function CoppeliaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { programa } = await searchParams;
  const today = programForDate(new Date());
  const requested = PROGRAMS.find((p) => p.id === programa)?.id;
  const initial: Program["id"] = requested ?? today ?? "1";

  return <CoppeliaProgram initial={initial} today={today} />;
}
