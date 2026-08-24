"use client";

import OfferPage from "@/components/bio/OfferPage";

export default function PraticClubContent() {
  return (
    <OfferPage
      title="Pratic Club"
      tagline="Aulas semanais e trilhas de IA aplicada."
      description="Uma comunidade paga pra quem quer aprender IA aplicada de verdade, na prática, sem enrolação — com vaga de fundador pra quem entrar agora."
      highlights={[
        "Aulas semanais ao vivo",
        "Trilhas práticas, direto ao ponto",
        "Vaga de fundador — condição especial pra quem entra agora",
      ]}
      ctaLabel="Entrar no Club"
    />
  );
}
