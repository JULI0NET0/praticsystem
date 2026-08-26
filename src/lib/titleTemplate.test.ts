import { describe, expect, it } from 'vitest';
import { DEFAULT_TITLE_TEMPLATES, renderTitleTemplate } from './titleTemplate';

describe('renderTitleTemplate', () => {
  it('substitui todas as variáveis', () => {
    expect(
      renderTitleTemplate('{tipo} {n} — {cliente} ({canal}) {data} {mes}', {
        tipo: 'Vídeo',
        n: 1,
        cliente: 'Luane',
        canal: 'Feed',
        data: '2026-09-03',
        mes: '2026-09',
      }),
    ).toBe('Vídeo 01 — Luane (Feed) 03/09 Setembro');
  });

  it('formata o sequencial com zero à esquerda', () => {
    expect(renderTitleTemplate('Post {n}', { n: 7 })).toBe('Post 07');
    expect(renderTitleTemplate('Post {n}', { n: 12 })).toBe('Post 12');
    // String já formatada passa intacta
    expect(renderTitleTemplate('Post {n}', { n: '003' })).toBe('Post 003');
  });

  it('variável sem valor não deixa espaço duplo', () => {
    // O caso do plano: "Post {tipo} {n}" sem tipo viraria "Post  01"
    expect(renderTitleTemplate('Post {tipo} {n}', { n: 1 })).toBe('Post 01');
  });

  it('variável sem valor não deixa separador órfão', () => {
    expect(
      renderTitleTemplate(DEFAULT_TITLE_TEMPLATES.post, { n: 1, cliente: 'Luane' }),
    ).toBe('Post 01 — Luane');

    // Sem cliente, o travessão do fim tem que sumir junto
    expect(renderTitleTemplate('Post {n} — {cliente}', { n: 1 })).toBe('Post 01');

    // Sem o primeiro pedaço, o traço da frente também
    expect(renderTitleTemplate('{tipo} — {cliente}', { cliente: 'Luane' })).toBe('Luane');
  });

  it('remove parênteses que ficaram vazios', () => {
    expect(renderTitleTemplate('Post {n} ({canal})', { n: 2 })).toBe('Post 02');
  });

  it('ignora variável desconhecida', () => {
    expect(renderTitleTemplate('Post {n} {inexistente}', { n: 1 })).toBe('Post 01');
  });

  it('template vazio devolve vazio', () => {
    expect(renderTitleTemplate('', { cliente: 'Luane' })).toBe('');
    expect(renderTitleTemplate('   ', { cliente: 'Luane' })).toBe('');
  });

  it('template sem variável passa intacto', () => {
    expect(renderTitleTemplate('Conteúdo do mês', {})).toBe('Conteúdo do mês');
  });

  it('cobre os padrões de captação e roteiro', () => {
    const vars = { n: 1, cliente: 'Luane' };
    expect(renderTitleTemplate(DEFAULT_TITLE_TEMPLATES.captura, vars)).toBe('Captação 01 — Luane');
    expect(renderTitleTemplate(DEFAULT_TITLE_TEMPLATES.roteiro, vars)).toBe('Roteiro 01 — Luane');
  });
});
