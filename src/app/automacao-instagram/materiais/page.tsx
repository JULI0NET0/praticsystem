import { redirect } from "next/navigation";

// O cadastro de materiais agora é uma aba do PraticChat; esta rota só mantém links antigos.
export default function MaterialsPage() {
  redirect("/automacao-instagram?tab=materials");
}
