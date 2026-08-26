import ContentPlanView from "@/components/cronogramas/ContentPlanView";

// Server component fino: `params` é uma Promise no Next 16, e componente
// client não pode ser async. Resolve aqui e passa o id adiante.
export default async function ContentPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ContentPlanView planId={id} />;
}
