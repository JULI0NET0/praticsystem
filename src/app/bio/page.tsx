import type { Metadata } from "next";
import BioContent from "./BioContent";

export const metadata: Metadata = {
  title: "Pratic — Conteúdo, IA & Automações",
  description:
    "Agência Pratic (conteúdo), Pratic Labs (IA & automações) e Consultoria de IA — escolha por onde começar.",
};

export default function BioPage() {
  return <BioContent />;
}
