import {
  Clapperboard,
  ImageIcon,
  Layers,
  Palette,
  Quote,
  Sparkles,
  Video,
  type LucideIcon,
} from 'lucide-react';

export interface ContentTypeDef {
  id: string;
  label: string;
  color: string;
  icon: LucideIcon;
}

/**
 * Vocabulário de FORMATO do conteúdo — único lugar que o define.
 * Espelha o formato de AGENDA_CATEGORIES em src/lib/agendaCategories.ts.
 *
 * Não confundir com o CANAL (Feed, Stories, TikTok), que vive em
 * CONTENT_CHANNELS e continua sendo gravado em `demands.type`. São duas
 * dimensões independentes: um Reels pode sair no Feed e no TikTok.
 */
export const CONTENT_TYPES: ContentTypeDef[] = [
  { id: 'video', label: 'Vídeo', color: '#5B84AD', icon: Video },
  { id: 'reels', label: 'Reels', color: '#A66189', icon: Clapperboard },
  { id: 'carrossel', label: 'Carrossel', color: '#38A3A5', icon: Layers },
  { id: 'imagem_frase', label: 'Imagem + Frase', color: '#D48B38', icon: ImageIcon },
  { id: 'frase', label: 'Frase', color: '#BE8A4A', icon: Quote },
  { id: 'criativo', label: 'Criativo', color: '#8F6593', icon: Palette },
  { id: 'extra', label: 'Conteúdo extra', color: '#788C5D', icon: Sparkles },
];

export const CONTENT_TYPE_IDS = CONTENT_TYPES.map((type) => type.id);

export function getContentType(id: string | null | undefined): ContentTypeDef | undefined {
  return CONTENT_TYPES.find((type) => type.id === id);
}

export function contentTypeLabel(id: string | null | undefined): string {
  return getContentType(id)?.label ?? '';
}
