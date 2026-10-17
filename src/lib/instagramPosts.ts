// Tipos e validação das publicações agendadas (sem dependência de servidor,
// para usar no painel e nas rotas).

export type IgPostType = 'reel' | 'image' | 'carousel' | 'story'
export type IgPostStatus = 'pending' | 'publishing' | 'published' | 'failed' | 'canceled'
export type IgMediaKind = 'image' | 'video'

export interface IgPostMedia {
  url: string
  kind: IgMediaKind
}

export interface IgScheduledPost {
  id: string
  post_type: IgPostType
  media: IgPostMedia[]
  caption: string | null
  cover_url: string | null
  share_to_feed: boolean
  scheduled_at: string
  status: IgPostStatus
  attempts: number
  error: string | null
  media_id: string | null
  permalink: string | null
  started_at: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export const IG_POSTS_BUCKET = 'ig-posts'
export const IG_CAPTION_MAX = 2200
export const IG_CAROUSEL_MIN = 2
export const IG_CAROUSEL_MAX = 10
// Publicação que ficou "publicando" além disso morreu no meio (timeout da função).
export const IG_PUBLISHING_STALE_MS = 15 * 60 * 1000

export const POST_TYPE_LABEL: Record<IgPostType, string> = {
  reel: 'Reel',
  image: 'Imagem',
  carousel: 'Carrossel',
  story: 'Story'
}

export const POST_STATUS_LABEL: Record<IgPostStatus, string> = {
  pending: 'Agendado',
  publishing: 'Publicando',
  published: 'Publicado',
  failed: 'Falhou',
  canceled: 'Cancelado'
}

export interface PostInput {
  post_type: IgPostType
  media: IgPostMedia[]
  caption?: string | null
  cover_url?: string | null
  scheduled_at: string
}

// Devolve a mensagem de erro, ou null se a publicação é válida.
export function validatePostInput(input: PostInput, now: number = Date.now()): string | null {
  const { post_type, media } = input
  if (!['reel', 'image', 'carousel', 'story'].includes(post_type)) return 'Tipo de publicação inválido.'
  if (!Array.isArray(media) || media.length === 0) return 'Envie ao menos uma mídia.'
  for (const m of media) {
    if (!m || typeof m.url !== 'string' || !/^https:\/\//.test(m.url)) return 'Mídia sem URL https pública.'
    if (m.kind !== 'image' && m.kind !== 'video') return 'Tipo de mídia inválido.'
  }

  if (post_type === 'reel' && (media.length !== 1 || media[0].kind !== 'video')) {
    return 'Reel precisa de exatamente 1 vídeo.'
  }
  if (post_type === 'image' && (media.length !== 1 || media[0].kind !== 'image')) {
    return 'Imagem precisa de exatamente 1 foto.'
  }
  if (post_type === 'story' && media.length !== 1) return 'Story aceita 1 foto ou 1 vídeo.'
  if (post_type === 'carousel' && (media.length < IG_CAROUSEL_MIN || media.length > IG_CAROUSEL_MAX)) {
    return `Carrossel precisa de ${IG_CAROUSEL_MIN} a ${IG_CAROUSEL_MAX} mídias.`
  }

  if (input.caption && input.caption.length > IG_CAPTION_MAX) {
    return `Legenda passa de ${IG_CAPTION_MAX} caracteres.`
  }
  if (input.cover_url && !/^https:\/\//.test(input.cover_url)) return 'Capa precisa de URL https.'

  const when = new Date(input.scheduled_at).getTime()
  if (Number.isNaN(when)) return 'Data/hora inválida.'
  // Tolerância de 1 min para "publicar agora".
  if (when < now - 60_000) return 'A data/hora já passou.'
  return null
}

export function mediaKindFromMime(mime: string): IgMediaKind | null {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  return null
}

export function isStalePublishing(startedAt: string | null, now: number = Date.now()): boolean {
  if (!startedAt) return true
  return now - new Date(startedAt).getTime() > IG_PUBLISHING_STALE_MS
}
