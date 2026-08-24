"use client";

import OfferPage from "@/components/bio/OfferPage";

export default function AgenciaPraticContent() {
  return (
    <OfferPage
      title="Agência Pratic"
      tagline="Conteúdo que constrói marca de verdade."
      description="Da estratégia ao conteúdo em si — a Agência Pratic cuida de tudo pra sua marca crescer com consistência, sem depender de sorte."
      highlights={[
        "Desenvolvimento web e landing pages de alta performance",
        "Gestão de tráfego pago (Meta Ads e Google Ads)",
        "Identidade visual e conteúdo estratégico",
      ]}
      ctaLabel="Falar com a Agência Pratic"
    />
  );
}
