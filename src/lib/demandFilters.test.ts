import { describe, expect, it } from 'vitest';
import { demandMatchesFilters, isScheduledContent } from './demandFilters';
import { EMPTY_DEMAND_FILTERS, type Demand, type DemandFilters } from '@/types/demandas';

function demand(overrides: Partial<Demand> = {}): Demand {
  return {
    id: 'd1',
    title: 'Fazer arte',
    client_id: 'c1',
    scope: 'client',
    status: 'pending',
    status_category: 'nao_iniciado',
    priority: 'none',
    assignee_ids: ['u1'],
    assign_all_team: false,
    position: 0,
    created_at: '2026-08-25T00:00:00Z',
    ...overrides,
  };
}

const plans = new Set(['plan-1']);

function match(
  item: Demand,
  filters: Partial<DemandFilters> = {},
  registeredPlanIds: ReadonlySet<string> | null = plans,
) {
  return demandMatchesFilters(item, { ...EMPTY_DEMAND_FILTERS, ...filters }, {
    todayIso: filters.todayOnly ? '2026-10-09' : null,
    clientHaystack: 'acme studio',
    registeredPlanIds,
  });
}

describe('isScheduledContent', () => {
  it('reconhece o post de um cronograma', () => {
    expect(isScheduledContent(demand({ plan_id: 'plan-1', plan_role: 'post' }))).toBe(true);
    expect(isScheduledContent(demand({ plan_id: 'plan-1', plan_role: null }))).toBe(true);
  });

  it('deixa captação, roteiro e demanda avulsa de fora', () => {
    expect(isScheduledContent(demand({ plan_id: 'plan-1', plan_role: 'captacao' }))).toBe(false);
    expect(isScheduledContent(demand({ plan_id: 'plan-1', plan_role: 'roteiro' }))).toBe(false);
    expect(isScheduledContent(demand())).toBe(false);
  });
});

describe('demandMatchesFilters', () => {
  it('nas gerais esconde o post e mantém captação, roteiro e avulsa', () => {
    expect(match(demand({ plan_id: 'plan-1', plan_role: 'post' }))).toBe(false);
    expect(match(demand({ plan_id: 'plan-1', plan_role: 'captacao' }))).toBe(true);
    expect(match(demand({ plan_id: 'plan-1', plan_role: 'roteiro' }))).toBe(true);
    expect(match(demand())).toBe(true);
  });

  it('em conteúdos mostra o post de cronograma cadastrado, de qualquer responsável', () => {
    const post = demand({
      id: 'post',
      plan_id: 'plan-1',
      plan_role: 'post',
      assignee_ids: ['outra-pessoa'],
    });
    expect(match(post, { lane: 'conteudo' })).toBe(true);
    expect(match(demand({ plan_id: 'plan-1', plan_role: 'captacao' }), { lane: 'conteudo' })).toBe(false);
    expect(match(demand(), { lane: 'conteudo' })).toBe(false);
  });

  it('em conteúdos ignora post de cronograma que não existe mais', () => {
    const post = demand({ plan_id: 'apagado', plan_role: 'post' });
    expect(match(post, { lane: 'conteudo' })).toBe(false);
  });

  it('em conteúdos não mostra nada enquanto os cronogramas não carregam', () => {
    const post = demand({ plan_id: 'plan-1', plan_role: 'post' });
    expect(match(post, { lane: 'conteudo' }, null)).toBe(false);
  });

  it('em conteúdos o responsável só filtra quando está preenchido', () => {
    const post = demand({ plan_id: 'plan-1', plan_role: 'post', assignee_ids: ['u2'] });
    expect(match(post, { lane: 'conteudo', assigneeId: 'u1' })).toBe(false);
    expect(match(post, { lane: 'conteudo', assigneeId: 'u2' })).toBe(true);
    expect(match(
      demand({ plan_id: 'plan-1', plan_role: 'post', assignee_ids: [], assign_all_team: true }),
      { lane: 'conteudo', assigneeId: 'u1' },
    )).toBe(true);
  });

  it('em conteúdos ignora o escopo internas, que some dessa visão', () => {
    const post = demand({ plan_id: 'plan-1', plan_role: 'post', scope: 'client' });
    expect(match(post, { lane: 'conteudo', scope: 'internal' })).toBe(true);
  });

  it('nas gerais o escopo continua valendo', () => {
    expect(match(demand({ scope: 'internal' }), { scope: 'client' })).toBe(false);
    expect(match(demand({ scope: 'client' }), { scope: 'client' })).toBe(true);
  });
});
