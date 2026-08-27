import { describe, expect, it } from 'vitest';
import { convertTipTapToHtml } from './tiptapToHtml';

describe('tiptapToHtml', () => {
  it('converte nós de texto simples e escapa HTML', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Olá <mundo> & amigos' }],
        },
      ],
    };
    const html = convertTipTapToHtml(doc);
    expect(html).toContain('&lt;mundo&gt; &amp; amigos');
    expect(html).toContain('<p');
  });

  it('aplica marcas de formatação como negrito, itálico e links', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Negrito', marks: [{ type: 'bold' }] },
            { type: 'text', text: ' ' },
            { type: 'text', text: 'Link', marks: [{ type: 'link', attrs: { href: 'https://exemplo.com' } }] },
          ],
        },
      ],
    };
    const html = convertTipTapToHtml(doc);
    expect(html).toContain('<strong>Negrito</strong>');
    expect(html).toContain('href="https://exemplo.com"');
  });

  it('renderiza listas de tarefas com checkboxes marcados e desmarcados', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'taskList',
          content: [
            {
              type: 'taskItem',
              attrs: { checked: true },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Feito' }] }],
            },
            {
              type: 'taskItem',
              attrs: { checked: false },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Pendente' }] }],
            },
          ],
        },
      ],
    };
    const html = convertTipTapToHtml(doc);
    expect(html).toContain('line-through');
    expect(html).toContain('Feito');
    expect(html).toContain('Pendente');
  });

  it('renderiza avisos (callouts) e menções', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'callout',
          attrs: { icon: '🎯' },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Foco no mês' }] }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'mention', attrs: { label: 'julio' } }],
        },
      ],
    };
    const html = convertTipTapToHtml(doc);
    expect(html).toContain('🎯');
    expect(html).toContain('Foco no mês');
    expect(html).toContain('@julio');
  });
});
