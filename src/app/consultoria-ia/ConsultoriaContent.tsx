"use client";

import OfferPage from "@/components/bio/OfferPage";

export default function ConsultoriaContent() {
  return (
    <OfferPage
      title="Consultoria de IA"
      tagline="Diagnóstico direto, sem enrolação."
      description="Antes de implementar qualquer automação, a gente senta e avalia onde a IA realmente encaixa no seu negócio — sem venda casada, sem achismo."
      highlights={[
        "Avaliação do seu negócio ponto a ponto",
        "Prioridades claras de onde a IA realmente ajuda",
        "Recomendação objetiva — inclusive se a resposta for 'ainda não'",
      ]}
      ctaLabel="Agendar diagnóstico"
    />
  );
}
