import type { Demand, DemandStatus } from '@/types/demandas';

/**
 * Espelha, no cliente, o que a trigger `demands_sync_derived` faz no banco.
 *
 * `status_category` e `completed_at` são derivados de `status` pela trigger,
 * então uma atualização otimista que mande só `{ status }` deixa os dois
 * desatualizados até o servidor responder. Como toda a interface lê o estado
 * de conclusão de `status_category`, isso aparecia como bug visível: ao
 * desmarcar, o item continuava riscado e com o check preenchido até a resposta
 * chegar; ao concluir, o risco só começava depois dela.
 *
 * Devolve o patch enriquecido para uso LOCAL. O que vai para o banco continua
 * sendo o patch original — lá quem manda é a trigger.
 */
export function deriveStatusFields(
  patch: Partial<Demand>,
  statuses: DemandStatus[],
  now: Date = new Date(),
): Partial<Demand> {
  if (!patch.status) return patch;

  const category = statuses.find((status) => status.id === patch.status)?.category;
  if (!category) return patch;

  return {
    ...patch,
    status_category: category,
    completed_at: category === 'fechado' ? now.toISOString() : null,
  };
}
