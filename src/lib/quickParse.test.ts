import { describe, expect, it } from 'vitest';
import {
  activeMarkerQuery,
  applyMarkerCompletion,
  parseQuickInput,
  splitMentions,
  type QuickCatalogs,
} from './quickParse';

// Quarta-feira, 26 de agosto de 2026
const NOW = new Date(2026, 7, 26, 12, 0, 0);

const CATALOGS: QuickCatalogs = {
  clients: [
    { id: 'c1', label: 'Cold Joias' },
    { id: 'c2', label: 'Recloset Bazar', alias: 'Recloset Comercio LTDA' },
  ],
  users: [
    { id: 'u1', label: 'Julio' },
    { id: 'u2', label: 'Ana Paula' },
  ],
};

const parse = (input: string) => parseQuickInput(input, CATALOGS, NOW);

describe('parseQuickInput', () => {
  it('devolve o título intacto quando não há atalhos', () => {
    const r = parse('Ajustar o banner da home');
    expect(r.title).toBe('Ajustar o banner da home');
    expect(r.clientId).toBeNull();
    expect(r.assigneeIds).toEqual([]);
    expect(r.tokens).toEqual([]);
  });

  it('casa nome de cliente com espaço e o remove do título', () => {
    const r = parse('Ajustar banner #Cold Joias');
    expect(r.clientId).toBe('c1');
    expect(r.title).toBe('Ajustar banner');
  });

  it('aceita o nome alternativo do cliente', () => {
    expect(parse('Post #Recloset Comercio LTDA').clientId).toBe('c2');
  });

  it('aceita vários responsáveis', () => {
    const r = parse('Gravar vídeo @Julio @Ana Paula');
    expect(r.assigneeIds).toEqual(['u1', 'u2']);
    expect(r.title).toBe('Gravar vídeo');
  });

  it('lê prioridade, data e hora juntos', () => {
    const r = parse('Enviar proposta #Cold Joias @Julio sexta 14h P1');
    expect(r.clientId).toBe('c1');
    expect(r.assigneeIds).toEqual(['u1']);
    expect(r.priority).toBe('urgent');
    expect(r.dueDate).toBe('2026-08-28');
    expect(r.dueTime).toBe('14:00');
    expect(r.title).toBe('Enviar proposta');
  });

  it('entende as várias formas de hora', () => {
    expect(parse('Reunião 14:30').dueTime).toBe('14:30');
    expect(parse('Reunião 9h').dueTime).toBe('09:00');
    expect(parse('Reunião 9h30').dueTime).toBe('09:30');
    expect(parse('Reunião às 8h').dueTime).toBe('08:00');
  });

  it('não confunde data numérica com hora', () => {
    const r = parse('Entrega 03/09');
    expect(r.dueDate).toBe('2026-09-03');
    expect(r.dueTime).toBeNull();
    expect(r.title).toBe('Entrega');
  });

  it('ignora marcador que não corresponde a ninguém', () => {
    const r = parse('Falar com #Inexistente');
    expect(r.clientId).toBeNull();
    expect(r.title).toBe('Falar com #Inexistente');
  });

  it('ignora @ no meio de palavra (e-mail)', () => {
    const r = parse('Responder julio@empresa.com');
    expect(r.assigneeIds).toEqual([]);
    expect(r.title).toBe('Responder julio@empresa.com');
  });

  it('não engole números que não são hora nem data', () => {
    const r = parse('Criar 3 variações do post');
    expect(r.dueTime).toBeNull();
    expect(r.dueDate).toBeNull();
    expect(r.title).toBe('Criar 3 variações do post');
  });
});

describe('activeMarkerQuery', () => {
  it('detecta o nome em digitação no cursor', () => {
    const text = 'Banner #Col';
    expect(activeMarkerQuery(text, text.length)).toEqual({
      marker: '#',
      query: 'Col',
      start: 7,
    });
  });

  it('devolve null sem marcador e em e-mail', () => {
    expect(activeMarkerQuery('Banner novo', 11)).toBeNull();
    expect(activeMarkerQuery('julio@empresa', 13)).toBeNull();
  });
});

describe('applyMarkerCompletion', () => {
  it('troca o trecho parcial pelo nome completo', () => {
    const text = 'Banner #Col';
    expect(applyMarkerCompletion(text, text.length, 'Cold Joias')).toEqual({
      text: 'Banner #Cold Joias ',
      caret: 19,
    });
  });
});

describe('splitMentions', () => {
  const split = (text: string) => splitMentions(text, CATALOGS);

  it('marca colaborador com @ e cliente com #', () => {
    expect(split('Falar com @Julio sobre #Cold Joias')).toEqual([
      { kind: 'text', value: 'Falar com ' },
      { kind: 'user', value: '@Julio' },
      { kind: 'text', value: ' sobre ' },
      { kind: 'client', value: '#Cold Joias' },
    ]);
  });

  it('casa o nome inteiro, não só a primeira palavra', () => {
    expect(split('@Ana Paula revisa')).toEqual([
      { kind: 'user', value: '@Ana Paula' },
      { kind: 'text', value: ' revisa' },
    ]);
  });

  it('prefere o nome mais longo', () => {
    const catalogs: QuickCatalogs = {
      clients: [],
      users: [
        { id: 'u1', label: 'Ana' },
        { id: 'u2', label: 'Ana Paula' },
      ],
    };
    expect(splitMentions('@Ana Paula', catalogs)).toEqual([
      { kind: 'user', value: '@Ana Paula' },
    ]);
  });

  it('não destaca marcador desconhecido nem e-mail', () => {
    expect(split('avisar julio@empresa.com sobre #Nada')).toEqual([
      { kind: 'text', value: 'avisar julio@empresa.com sobre #Nada' },
    ]);
  });

  it('devolve texto puro quando não há menção', () => {
    expect(split('sem mencao alguma')).toEqual([
      { kind: 'text', value: 'sem mencao alguma' },
    ]);
  });
});
