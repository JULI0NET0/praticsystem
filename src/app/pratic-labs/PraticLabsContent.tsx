"use client";

import OfferPage from "@/components/bio/OfferPage";

export default function PraticLabsContent() {
  return (
    <OfferPage
      title="Pratic Labs"
      tagline="IA & automações, implementadas e mantidas de verdade."
      description="Diferente da consultoria pontual, a Pratic Labs é quem constrói e acompanha as automações no dia a dia do seu negócio — sistema rodando, não relatório engavetado."
      highlights={[
        "Diagnóstico → implementação → manutenção contínua",
        "Automações sob medida, não templates genéricos",
        "Acompanhamento recorrente, não projeto de uma vez só",
      ]}
      ctaLabel="Falar com a Pratic Labs"
    />
  );
}
