import type { Metadata } from "next";
import PraticClubContent from "./PraticClubContent";

export const metadata: Metadata = {
  title: "Pratic Club — Pratic",
  description:
    "Aulas semanais e trilhas de IA aplicada — assinatura com vaga de fundador.",
};

export default function PraticClubPage() {
  return <PraticClubContent />;
}
