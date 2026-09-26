import { describe, expect, it } from 'vitest';
import { markdownToHtml } from './markdownToHtml';

describe('markdownToHtml – tabelas', () => {
  const md = [
    '## Painel por frente',
    '',
    '| Frente | Status | O que falta / bloqueio |',
    '|---|---|---|',
    '| Web: Pessoa Física | ✅ | Recibo, **orçamento**, perfil |',
    '| App nativo (só PF) | ⬜ | Nada criado; o compartilhado (`core`, `db`) já serve |',
    '| Seleção em lote | – | |',
    '',
    '---',
    '',
    '## Web: Pessoa Física',
  ].join('\n');

  it('converte tabela GFM em <table> com cabeçalho', () => {
    const html = markdownToHtml(md);
    expect(html).toContain('<table><tbody>');
    expect(html.match(/<th>/g)).toHaveLength(3);
    expect(html.match(/<tr>/g)).toHaveLength(4);
    expect(html).toContain('<th><p>O que falta / bloqueio</p></th>');
    expect(html).toContain('<td><p>✅</p></td>');
  });

  it('aplica formatação inline dentro das células', () => {
    const html = markdownToHtml(md);
    expect(html).toContain('<code>core</code>');
    expect(html).toContain('<strong>orçamento</strong>');
  });

  it('preenche células vazias e mantém o que vem depois da tabela', () => {
    const html = markdownToHtml(md);
    expect(html).toContain('<td><p>–</p></td><td><p></p></td>');
    expect(html).toContain('<hr />');
    expect(html).toContain('<h2>Web: Pessoa Física</h2>');
  });

  it('respeita pipe escapado e normaliza colunas pelo cabeçalho', () => {
    const html = markdownToHtml('| a | b |\n|:---|---:|\n| x \\| y | z | extra |\n| só |');
    expect(html).toContain('<td><p>x | y</p></td><td><p>z</p></td></tr>');
    expect(html).toContain('<tr><td><p>só</p></td><td><p></p></td></tr>');
  });

  it('linha com pipes sem separador continua sendo parágrafo', () => {
    const html = markdownToHtml('| a | b |\n| c | d |');
    expect(html).not.toContain('<table>');
    expect(html).toContain('<p>| a | b |</p>');
  });
});
