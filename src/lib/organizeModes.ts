export type OrganizeMode = 'reuniao' | 'resumido' | 'resumo' | 'topicos';

export const DEFAULT_ORGANIZE_MODE: OrganizeMode = 'reuniao';

export const ORGANIZE_MODE_LABELS: Record<OrganizeMode, string> = {
  reuniao: 'Reunião detalhada',
  resumido: 'Reunião resumida',
  resumo: 'Só resumo',
  topicos: 'Anotação em tópicos',
};

export const ORGANIZE_MODE_DESCRIPTIONS: Record<OrganizeMode, string> = {
  reuniao: 'Título, participantes, tópicos, insights e tarefas — o formato completo.',
  resumido: 'Título, resumo curto e tarefas — sem tópicos e insights detalhados.',
  resumo: 'Só um parágrafo resumindo a reunião, sem listas nem seções.',
  topicos: 'Anotações rápidas em bullets, sem parágrafos.',
};

export function isOrganizeMode(value: unknown): value is OrganizeMode {
  return value === 'reuniao' || value === 'resumido' || value === 'resumo' || value === 'topicos';
}
