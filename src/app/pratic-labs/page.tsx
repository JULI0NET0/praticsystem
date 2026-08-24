import type { Metadata } from "next";
import PraticLabsContent from "./PraticLabsContent";

export const metadata: Metadata = {
  title: "Pratic Labs — IA & Automações",
  description:
    "Implementação e manutenção de IA & automações no dia a dia do seu negócio — sistema, não achismo.",
};

export default function PraticLabsPage() {
  return <PraticLabsContent />;
}
