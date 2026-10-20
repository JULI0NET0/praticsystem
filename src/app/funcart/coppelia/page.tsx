import type { Metadata, Viewport } from "next";
import CoppeliaProgram from "./CoppeliaProgram";
import { SESSIONS, sessionsForDate } from "./program";

export const metadata: Metadata = {
  title: "Coppélia — Programa | FUNCART",
  description:
    "Programa do ballet Coppélia e de A Casa de Brinquedos pela Escola Municipal de Dança de Londrina: elenco, atos e ficha técnica. 26 a 29 de novembro, 20h, Cine Teatro Ouro Verde.",
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
  const { dia, programa } = await searchParams;
  const today = sessionsForDate(new Date());
  // ?programa=1|2 era o link antigo: abre o Coppélia daquele programa.
  const requested =
    SESSIONS.find((x) => x.id === dia) ??
    SESSIONS.find((x) => x.kind === "coppelia" && x.programId === programa);
  const initial = requested?.id ?? today[0] ?? SESSIONS[0].id;

  return <CoppeliaProgram initial={initial} today={today} />;
}
