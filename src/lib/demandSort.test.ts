import { describe, expect, it } from 'vitest';
import { compareDemandsInGroup, isDemandDone } from './demandSort';
import type { Demand, DemandPriority } from '@/types/demandas';

function demand(
  id: string,
  overrides: Partial<Demand> & { priority?: DemandPriority } = {},
): Demand {
  return {
    id,
    title: id,
    client_id: null,
    scope: 'internal',
    status: 'pending',
    status_category: 'nao_iniciado',
    priority: 'none',
    assignee_ids: [],
    assign_all_team: false,
    position: 0,
    created_at: '2026-08-25T00:00:00Z',
    ...overrides,
  };
}

const order = (list: Demand[]) => [...list].sort(compareDemandsInGroup).map((d) => d.id);

describe('compareDemandsInGroup', () => {
  it('joga as concluídas para o fim, mesmo sendo urgentes', () => {
    expect(
      order([
        demand('feita', { status_category: 'fechado', priority: 'urgent' }),
        demand('aberta', { priority: 'low' }),
      ]),
    ).toEqual(['aberta', 'feita']);
  });

  it('entre abertas, urgente vem primeiro', () => {
    expect(
      order([
        demand('baixa', { priority: 'low' }),
        demand('urgente', { priority: 'urgent' }),
        demand('media', { priority: 'medium' }),
      ]),
    ).toEqual(['urgente', 'media', 'baixa']);
  });

  it('empatada a prioridade, o prazo mais próximo vem antes', () => {
    expect(
      order([
        demand('depois', { due_date: '2026-09-10' }),
        demand('antes', { due_date: '2026-08-27' }),
        demand('sem_prazo'),
      ]),
    ).toEqual(['antes', 'depois', 'sem_prazo']);
  });

  it('mantém a ordem relativa entre concluídas', () => {
    expect(
      order([
        demand('f1', { status_category: 'fechado', priority: 'low' }),
        demand('f2', { status_category: 'fechado', priority: 'urgent' }),
      ]),
    ).toEqual(['f2', 'f1']);
  });

  it('respeita o predicado injetado, segurando a demanda no lugar', () => {
    const feita = demand('feita', { status_category: 'fechado', priority: 'urgent' });
    const aberta = demand('aberta', { priority: 'low' });

    // Durante a animação, 'feita' é ordenada como se ainda estivesse aberta
    const segurada = new Set(['feita']);
    const comHold = (d: Demand) => (segurada.has(d.id) ? !isDemandDone(d) : isDemandDone(d));

    expect(
      [feita, aberta].sort((a, b) => compareDemandsInGroup(a, b, comHold)).map((d) => d.id),
    ).toEqual(['feita', 'aberta']);

    // Terminada a animação, volta a afundar
    expect(
      [feita, aberta].sort(compareDemandsInGroup).map((d) => d.id),
    ).toEqual(['aberta', 'feita']);
  });
});
