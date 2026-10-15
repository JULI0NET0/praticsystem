import type { SupabaseClient } from '@supabase/supabase-js'

// A Meta só permite mensagem "normal" até 24h depois da última mensagem da pessoa.
export const REPLY_WINDOW_MS = 24 * 60 * 60 * 1000

export type IgMessageKind =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'file'
  | 'share'
  | 'story'
  | 'template'
  | 'reaction'
  | 'other'
export type IgMessageSource = 'instagram' | 'automation' | 'panel' | 'import'

export interface IgMessageRow {
  mid: string | null
  igsid: string
  direction: 'in' | 'out'
  kind: IgMessageKind
  text: string | null
  attachments: IgAttachment[] | null
  source: IgMessageSource
  automation_id?: string | null
  created_at: string
  read_at?: string | null
}

export function replyWindow(lastInboundAt: string | null, now = Date.now()) {
  if (!lastInboundAt) return { open: false, closesAt: null as string | null }
  const closes = new Date(lastInboundAt).getTime() + REPLY_WINDOW_MS
  return { open: closes > now, closesAt: new Date(closes).toISOString() }
}

interface RawAttachment {
  type?: string
  payload?: { url?: string }
  image_data?: { url?: string }
  video_data?: { url?: string }
  file_url?: string
  // Mensagem com botões (enviada por automação): título + botões.
  generic_template?: { title?: string; cta?: Array<{ title?: string; url?: string; type?: string }> }
}

export interface IgAttachment {
  type: string
  url: string | null
  title?: string
}

function attachmentKind(type: string | undefined): IgMessageKind {
  switch (type) {
    case 'image':
    case 'animated_image':
      return 'image'
    case 'video':
    case 'ig_reel':
    case 'reel':
      return 'video'
    case 'audio':
      return 'audio'
    case 'file':
      return 'file'
    case 'share':
    case 'ig_post':
      return 'share'
    case 'story_mention':
      return 'story'
    case 'button':
    case 'template':
      return 'template'
    default:
      return 'other'
  }
}

// Normaliza o anexo para { type, url, title } (webhook e API de conversas usam formatos diferentes).
// Template vira um item por botão, com o texto do botão em `title`.
function normalizeAttachments(list: RawAttachment[] | undefined): IgAttachment[] | null {
  if (!list?.length) return null
  const out: IgAttachment[] = []
  for (const a of list) {
    if (a.generic_template) {
      for (const b of a.generic_template.cta || []) {
        out.push({ type: 'button', url: b.url || null, title: b.title || 'Botão' })
      }
      continue
    }
    out.push({
      type: a.type || (a.image_data ? 'image' : a.video_data ? 'video' : 'file'),
      url: a.payload?.url || a.image_data?.url || a.video_data?.url || a.file_url || null
    })
  }
  return out.length ? out : null
}

function templateTitle(list: RawAttachment[] | undefined): string | null {
  return list?.find((a) => a.generic_template)?.generic_template?.title || null
}

// Evento `message` do webhook (recebido ou echo).
export function parseWebhookMessage(message: {
  mid?: string
  text?: string
  attachments?: RawAttachment[]
  reply_to?: { story?: unknown }
  is_unsupported?: boolean
}): Pick<IgMessageRow, 'mid' | 'kind' | 'text' | 'attachments'> {
  const attachments = normalizeAttachments(message.attachments)
  let kind: IgMessageKind = 'text'
  if (attachments) kind = attachmentKind(attachments[0].type)
  else if (message.reply_to?.story) kind = 'story'
  else if (!message.text) kind = 'other'
  return { mid: message.mid || null, kind, text: message.text || null, attachments }
}

// Mensagem da API de conversas (importação do histórico).
export function parseGraphMessage(
  msg: {
    id: string
    created_time: string
    from?: { id?: string; username?: string }
    to?: { data?: Array<{ id?: string; username?: string }> }
    message?: string
    attachments?: { data?: RawAttachment[] }
    shares?: { data?: Array<{ link?: string }> }
    story?: unknown
  },
  ownIds: { id: string; username?: string | null }
): IgMessageRow | null {
  const fromMe = msg.from?.id === ownIds.id || (!!ownIds.username && msg.from?.username === ownIds.username)
  const other = fromMe ? msg.to?.data?.[0] : msg.from
  if (!other?.id) return null

  let attachments = normalizeAttachments(msg.attachments?.data)
  const template = templateTitle(msg.attachments?.data)
  let kind: IgMessageKind = 'text'
  if (template !== null || attachments?.[0]?.type === 'button') kind = 'template'
  else if (attachments) kind = attachmentKind(attachments[0].type)
  else if (msg.shares?.data?.length) {
    kind = 'share'
    attachments = msg.shares.data.map((sh) => ({ type: 'share', url: sh.link || null }))
  } else if (msg.story) kind = 'story'
  else if (!msg.message) kind = 'other'

  const createdAt = new Date(msg.created_time).toISOString()
  return {
    mid: msg.id,
    igsid: other.id,
    direction: fromMe ? 'out' : 'in',
    kind,
    text: msg.message || template || null,
    attachments,
    source: 'import',
    created_at: createdAt,
    // Histórico importado entra como lido; só o que chegar daqui pra frente conta como novo.
    read_at: fromMe ? null : createdAt
  }
}

export interface ConversationSummary {
  igsid: string
  lastText: string | null
  lastKind: IgMessageKind
  lastDirection: 'in' | 'out'
  lastAt: string
  lastInboundAt: string | null
  unread: number
  needsReply: boolean
}

// Agrupa mensagens (em qualquer ordem) por contato, da conversa mais recente para a mais antiga.
export function summarizeConversations(
  rows: Array<Pick<IgMessageRow, 'igsid' | 'direction' | 'kind' | 'text' | 'created_at' | 'read_at'>>
): ConversationSummary[] {
  const sorted = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at))
  const map = new Map<string, ConversationSummary>()

  for (const r of sorted) {
    let c = map.get(r.igsid)
    if (!c) {
      c = {
        igsid: r.igsid,
        lastText: r.text,
        lastKind: r.kind,
        lastDirection: r.direction,
        lastAt: r.created_at,
        lastInboundAt: null,
        unread: 0,
        needsReply: r.direction === 'in'
      }
      map.set(r.igsid, c)
    }
    if (r.direction === 'in') {
      if (!c.lastInboundAt) c.lastInboundAt = r.created_at
      if (!r.read_at) c.unread++
    }
  }
  return [...map.values()]
}

export const KIND_LABEL: Record<IgMessageKind, string> = {
  text: 'Mensagem',
  image: 'Foto',
  video: 'Vídeo',
  audio: 'Áudio',
  file: 'Arquivo',
  share: 'Post compartilhado',
  story: 'Resposta ao story',
  template: 'Mensagem com botões',
  reaction: 'Reação',
  other: 'Conteúdo que a API não mostra'
}

export function previewText(kind: IgMessageKind, text: string | null): string {
  return text?.trim() || KIND_LABEL[kind]
}

// Grava uma mensagem. Envio próprio (automação/painel) sobrescreve o echo que chegou antes;
// echo e importação nunca sobrescrevem o que já existe.
export async function recordIgMessage(
  supabase: SupabaseClient,
  row: Partial<IgMessageRow> & Pick<IgMessageRow, 'igsid' | 'direction'>,
  options: { overwrite?: boolean } = {}
): Promise<void> {
  const payload = { kind: 'text', created_at: new Date().toISOString(), ...row }
  if (!payload.mid) {
    await supabase.from('ig_messages').insert(payload)
    return
  }
  await supabase
    .from('ig_messages')
    .upsert(payload, { onConflict: 'mid', ignoreDuplicates: !options.overwrite })
}
