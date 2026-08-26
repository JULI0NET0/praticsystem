// ============================================================================
// Nomes das demandas geradas por um cronograma.
//
// O formato é dado do plano (post_title_template etc.), não código, para
// mudar "Post 01" para "Post Vídeo 01 — Luane" não exigir deploy.
// ============================================================================

export interface TitleVars {
  cliente?: string | null;
  tipo?: string | null;
  canal?: string | null;
  /** Sequencial já formatado ("01") ou número. */
  n?: string | number | null;
  /** 'YYYY-MM-DD' — sai como "03/09". */
  data?: string | null;
  /** 'YYYY-MM' — sai como "Setembro". */
  mes?: string | null;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function shortDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return match ? `${match[3]}/${match[2]}` : iso;
}

function monthName(monthRef: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(monthRef);
  if (!match) return monthRef;
  return MONTHS[Number(match[2]) - 1] ?? monthRef;
}

function resolve(name: string, vars: TitleVars): string {
  switch (name) {
    case 'cliente':
      return vars.cliente?.trim() ?? '';
    case 'tipo':
      return vars.tipo?.trim() ?? '';
    case 'canal':
      return vars.canal?.trim() ?? '';
    case 'n':
      return vars.n === null || vars.n === undefined
        ? ''
        : typeof vars.n === 'number'
          ? String(vars.n).padStart(2, '0')
          : vars.n;
    case 'data':
      return vars.data ? shortDate(vars.data) : '';
    case 'mes':
      return vars.mes ? monthName(vars.mes) : '';
    default:
      return '';
  }
}

/**
 * Troca `{variavel}` pelo valor. Variável desconhecida ou sem valor é
 * removida JUNTO com o separador solto à volta — senão `Post {tipo} {n}`
 * sem tipo viraria "Post  01", com espaço duplo, e
 * `Post {n} — {cliente}` sem cliente terminaria num traço órfão.
 */
export function renderTitleTemplate(template: string, vars: TitleVars): string {
  if (!template.trim()) return '';

  const filled = template.replace(/\{(\w+)\}/g, (_, name: string) => resolve(name, vars));

  return filled
    // separadores que sobraram entre espaços (— – - · |)
    .replace(/\s+[—–\-·|]\s+(?=[—–\-·|]|$)/g, ' ')
    .replace(/^\s*[—–\-·|]\s*/, '')
    .replace(/\s*[—–\-·|]\s*$/, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Padrões usados quando o cronograma não define os seus. */
export const DEFAULT_TITLE_TEMPLATES = {
  post: 'Post {tipo} {n} — {cliente}',
  captura: 'Captação {n} — {cliente}',
  roteiro: 'Roteiro {n} — {cliente}',
} as const;

/** Variáveis oferecidas na ajuda do wizard. */
export const TITLE_VARIABLES: { token: string; description: string }[] = [
  { token: '{cliente}', description: 'Nome do cliente' },
  { token: '{tipo}', description: 'Formato (Vídeo, Reels…)' },
  { token: '{canal}', description: 'Canal (Feed, Stories…)' },
  { token: '{n}', description: 'Sequencial (01, 02…)' },
  { token: '{data}', description: 'Data (03/09)' },
  { token: '{mes}', description: 'Competência (Setembro)' },
];
