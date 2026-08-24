import type { Metadata } from "next";
import AgenciaPraticContent from "./AgenciaPraticContent";

export const metadata: Metadata = {
  title: "Agência Pratic — Conteúdo",
  description:
    "Conteúdo estratégico para marcas que querem crescer com consistência.",
};

export default function AgenciaPraticPage() {
  return <AgenciaPraticContent />;
}
