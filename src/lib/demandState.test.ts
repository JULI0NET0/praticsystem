import { describe, expect, it } from 'vitest';
import { deriveStatusFields } from './demandState';
import type { DemandStatus } from '@/types/demandas';

const STATUSES: DemandStatus[] = [
  { id: 'pending', label: 'A fazer', color: '#888', category: 'nao_iniciado', position: 0 },
  { id: 'review', label: 'Em revisão', color: '#c80', category: 'ativo', position: 1 },
  { id: 'completed', label: 'Concluído', color: '#678', category: 'fechado', position: 2 },
];

const NOW = new Date('2026-08-26T12:00:00.000Z');

describe('deriveStatusFields', () => {
  it('marca como concluída ao mover para um status fechado', () => {
    const result = deriveStatusFields({ status: 'completed' }, STATUSES, NOW);
    expect(result.status_category).toBe('fechado');
    expect(result.completed_at).toBe('2026-08-26T12:00:00.000Z');
  });

  it('desmarca ao voltar para um status aberto', () => {
    // O caso do bug: sem isto, `status` virava 'pending' mas
    // `status_category` continuava 'fechado' até o servidor responder,
    // e o item seguia riscado e com o check preenchido.
    const result = deriveStatusFields({ status: 'pending' }, STATUSES, NOW);
    expect(result.status_category).toBe('nao_iniciado');
    expect(result.completed_at).toBeNull();
  });

  it('status intermediário não conta como concluído', () => {
    const result = deriveStatusFields({ status: 'review' }, STATUSES, NOW);
    expect(result.status_category).toBe('ativo');
    expect(result.completed_at).toBeNull();
  });

  it('não mexe em patch que não toca no status', () => {
    const patch = { title: 'Outro título' };
    expect(deriveStatusFields(patch, STATUSES, NOW)).toEqual(patch);
  });

  it('devolve o patch intacto se o status não estiver no catálogo', () => {
    const patch = { status: 'inexistente' };
    expect(deriveStatusFields(patch, STATUSES, NOW)).toEqual(patch);
  });

  it('preserva os demais campos do patch', () => {
    const result = deriveStatusFields(
      { status: 'completed', priority: 'high' },
      STATUSES,
      NOW,
    );
    expect(result.priority).toBe('high');
    expect(result.status).toBe('completed');
  });
});
