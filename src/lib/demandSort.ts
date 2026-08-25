import { PRIORITY_ORDER, type Demand } from '@/types/demandas';

export const isDemandDone = (demand: Demand): boolean =>
  demand.status_category === 'fechado';

/**
 * Ordem dentro de um grupo da visualização em lista:
 *   1. concluídas afundam para o fim — o que está feito sai da frente;
 *   2. depois prioridade (urgente primeiro);
 *   3. depois prazo mais próximo.
 *
 * `isDone` é injetável para que a lista possa segurar uma demanda no lugar
 * enquanto a animação de conclusão roda, e só então deixá-la descer.
 */
export function compareDemandsInGroup(
  a: Demand,
  b: Demand,
  isDone: (demand: Demand) => boolean = isDemandDone,
): number {
  const doneA = isDone(a) ? 1 : 0;
  const doneB = isDone(b) ? 1 : 0;
  if (doneA !== doneB) return doneA - doneB;

  const priorityA = PRIORITY_ORDER[a.priority] ?? 9;
  const priorityB = PRIORITY_ORDER[b.priority] ?? 9;
  if (priorityA !== priorityB) return priorityA - priorityB;

  return (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999');
}
