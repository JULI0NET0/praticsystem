import type { Metadata } from "next";
import ConsultoriaContent from "./ConsultoriaContent";

export const metadata: Metadata = {
  title: "Consultoria de IA — Pratic",
  description:
    "Diagnóstico pontual: avaliamos onde a IA realmente encaixa no seu negócio antes de qualquer implementação.",
};

export default function ConsultoriaPage() {
  return <ConsultoriaContent />;
}
