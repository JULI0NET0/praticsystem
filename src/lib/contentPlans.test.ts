import { describe, expect, it } from 'vitest';
import { resolvePlanItems } from './contentPlans';
import { DEFAULT_TITLE_TEMPLATES } from './titleTemplate';
import type { ContentPlanDraft } from '@/types/cronogramas';

function draft(overrides: Partial<ContentPlanDraft> = {}): ContentPlanDraft {
  return {
    clientId: 'c1',
    contractId: null,
    title: 'Conteúdo',
    monthRef: '2026-09',
    periodKind: 'month',
    weeks: 4,
    startDate: '2026-09-01',
    postsPerWeek: 1,
    weekdays: [1], // só segundas
    channels: ['FEED'],
    firstDate: '',
    contentTypes: ['video', 'frase'],
    scriptLeadDays: 3,
    postTitleTemplate: DEFAULT_TITLE_TEMPLATES.post,
    captureTitleTemplate: DEFAULT_TITLE_TEMPLATES.captura,
    scriptTitleTemplate: DEFAULT_TITLE_TEMPLATES.roteiro,
    contentTemplateId: null,
    captureTemplateId: null,
    scriptTemplateId: null,
    includeCapture: false,
    captureFrequency: null,
    ...overrides,
  };
}

const posts = (items: ReturnType<typeof resolvePlanItems>) =>
  items.filter((item) => item.role === 'post');

describe('resolvePlanItems', () => {
  it('gira os formatos em rodízio quando não há override', () => {
    const items = posts(resolvePlanItems(draft(), 'Luane'));
    expect(items.map((item) => item.contentType)).toEqual([
      'video', 'frase', 'video', 'frase',
    ]);
  });

  // Setembro/2026 começa numa terça, então as segundas são 07, 14, 21 e 28.
  it('o override vence o rodízio só naquela data', () => {
    const items = posts(resolvePlanItems(draft(), 'Luane', { '2026-09-14': 'reels' }));
    expect(items[0].contentType).toBe('video'); // 07/09, sem override
    expect(items[1].contentType).toBe('reels'); // 14/09, sobrescrito
    expect(items[2].contentType).toBe('video'); // 21/09, segue o rodízio
  });

  it('o nome acompanha o formato escolhido', () => {
    const items = posts(resolvePlanItems(draft(), 'Luane', { '2026-09-14': 'reels' }));
    expect(items[0].title).toBe('Post Vídeo 01 — Luane');
    expect(items[1].title).toBe('Post Reels 02 — Luane');
  });

  it('override de data que não existe mais é ignorado', () => {
    const semOverride = posts(resolvePlanItems(draft(), 'Luane'));
    const comOrfao = posts(resolvePlanItems(draft(), 'Luane', { '2030-01-01': 'reels' }));
    expect(comOrfao).toEqual(semOverride);
  });

  it('sem formatos marcados, o nome sai sem a variável e sem espaço duplo', () => {
    const items = posts(resolvePlanItems(draft({ contentTypes: [] }), 'Luane'));
    expect(items[0].contentType).toBeNull();
    expect(items[0].title).toBe('Post 01 — Luane');
  });

  it('roteiro e captação vêm antes dos posts, nessa ordem', () => {
    const items = resolvePlanItems(
      draft({ includeCapture: true, captureFrequency: '1x meia-diária' }),
      'Luane',
    );
    expect(items[0].role).toBe('roteiro');
    expect(items[1].role).toBe('captacao');
    expect(items[2].role).toBe('post');
  });

  it('o roteiro cai antes da captação que ele serve', () => {
    const items = resolvePlanItems(
      draft({ includeCapture: true, captureFrequency: '1x meia-diária', scriptLeadDays: 3 }),
      'Luane',
    );
    const roteiro = items.find((item) => item.role === 'roteiro')!;
    const captacao = items.find((item) => item.role === 'captacao')!;
    expect(roteiro.date < captacao.date).toBe(true);
  });

  it('captação e roteiro não recebem formato', () => {
    const items = resolvePlanItems(
      draft({ includeCapture: true, captureFrequency: '1x meia-diária' }),
      'Luane',
    );
    for (const item of items.filter((i) => i.role !== 'post')) {
      expect(item.contentType).toBeNull();
    }
  });

  it('respeita a primeira publicação', () => {
    const items = posts(resolvePlanItems(draft({ firstDate: '2026-09-14' }), 'Luane'));
    expect(items.every((item) => item.date >= '2026-09-14')).toBe(true);
  });

  // O caso que apareceu em uso: o wizard abre no mês corrente e o usuário
  // escolhe a primeira publicação no mês seguinte. Se a competência não for
  // junto, o período inteiro é cortado e a prévia vem vazia.
  it('primeira publicação fora da competência zera tudo', () => {
    const items = resolvePlanItems(
      draft({ monthRef: '2026-09', firstDate: '2026-10-05' }),
      'Luane',
    );
    expect(items).toHaveLength(0);
  });

  it('com a competência acompanhando a data, volta a gerar', () => {
    const items = posts(
      resolvePlanItems(draft({ monthRef: '2026-10', firstDate: '2026-10-05' }), 'Luane'),
    );
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.date >= '2026-10-05')).toBe(true);
  });

  it('sem dia da semana marcado não gera nada', () => {
    expect(resolvePlanItems(draft({ weekdays: [] }), 'Luane')).toHaveLength(0);
  });

  it('permite sobrescrever o título individual de posts e itens de produção', () => {
    const items = resolvePlanItems(
      draft({ includeCapture: true, captureFrequency: '1x meia-diária' }),
      'Luane',
      {},
      {
        'post-2026-09-07': 'Lançamento Especial Luane',
        'roteiro-2026-09-01-0': 'Roteiro Gravação Institucional',
        'captacao-2026-09-04-0': 'Diária Vídeos Luane Setembro',
      },
    );

    const postItem = items.find((i) => i.role === 'post' && i.date === '2026-09-07');
    const roteiroItem = items.find((i) => i.role === 'roteiro');
    const captacaoItem = items.find((i) => i.role === 'captacao');
    const secondPost = items.find((i) => i.role === 'post' && i.date === '2026-09-14');

    expect(postItem?.title).toBe('Lançamento Especial Luane');
    expect(roteiroItem?.title).toBe('Roteiro Gravação Institucional');
    expect(captacaoItem?.title).toBe('Diária Vídeos Luane Setembro');
    // Itens sem override continuam com o nome derivado do template
    expect(secondPost?.title).toBe('Post Frase 02 — Luane');
  });
});
