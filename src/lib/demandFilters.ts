import type { Demand, DemandFilters } from '@/types/demandas';

/**
 * Post de cronograma: a mesma regra da seção "Conteúdos" de um cronograma.
 * Captação e roteiro ficam de fora — são tarefas de produção.
 */
export function isScheduledContent(demand: Demand): boolean {
  if (!demand.plan_id) return false;
  return demand.plan_role !== 'captacao' && demand.plan_role !== 'roteiro';
}

export interface DemandFilterContext {
  /** Preenchido só quando `filters.todayOnly` está ligado. */
  todayIso: string | null;
  /** Nome e nome fantasia do cliente, já em minúsculas. */
  clientHaystack: string;
  /**
   * Ids dos cronogramas que ainda existem.
   * `null` = a lista ainda não carregou; a visão Conteúdos não mostra nada
   * até saber quais cronogramas estão cadastrados.
   */
  registeredPlanIds: ReadonlySet<string> | null;
}

/** Predicado único da lista visível. Responsável só entra se estiver preenchido. */
export function demandMatchesFilters(
  demand: Demand,
  filters: DemandFilters,
  ctx: DemandFilterContext,
): boolean {
  const scheduled = isScheduledContent(demand);

  if (filters.lane === 'conteudo') {
    if (!scheduled || !demand.plan_id) return false;
    if (!ctx.registeredPlanIds?.has(demand.plan_id)) return false;
  } else if (scheduled) {
    return false;
  }

  // Escopo (clientes / internas) só vale nas gerais. Todo post de cronograma
  // é de cliente, e essa aba some na visão Conteúdos.
  if (filters.lane !== 'conteudo' && filters.scope !== 'all' && demand.scope !== filters.scope) {
    return false;
  }
  if (filters.clientId && demand.client_id !== filters.clientId) return false;
  if (filters.status && demand.status !== filters.status) return false;
  if (filters.priority && demand.priority !== filters.priority) return false;
  if (filters.contentType && demand.content_type !== filters.contentType) return false;
  if (filters.hideCompleted && demand.status_category === 'fechado') return false;
  if (ctx.todayIso && demand.due_date !== ctx.todayIso) return false;
  if (filters.assigneeId) {
    const mine = demand.assignee_ids?.includes(filters.assigneeId) || demand.assign_all_team;
    if (!mine) return false;
  }

  const term = filters.search.trim().toLowerCase();
  if (term) {
    const haystack = `${demand.title} ${ctx.clientHaystack}`;
    if (!haystack.toLowerCase().includes(term)) return false;
  }

  return true;
}
