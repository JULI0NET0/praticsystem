import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const IG_GRAPH_BASE = 'https://graph.instagram.com/v25.0'

export function getSiteOrigin(): string {
  const redirectUri = process.env.IG_OAUTH_REDIRECT_URI
  if (!redirectUri) throw new Error('IG_OAUTH_REDIRECT_URI não configurada.')
  return new URL(redirectUri).origin
}
export const IG_SESSION_COOKIE = 'ig_admin_session'

export function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Configuração do Supabase incompleta.')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

export function hasValidIgSession(cookieValue: string | undefined | null): boolean {
  const expected = process.env.IG_SESSION_SECRET
  if (!expected || !cookieValue) return false
  return cookieValue === expected
}

// Uso em Server Components e Route Handlers (lê o cookie via next/headers).
export async function requireIgSession(): Promise<boolean> {
  const cookieStore = await cookies()
  return hasValidIgSession(cookieStore.get(IG_SESSION_COOKIE)?.value)
}

export async function logIgEvent(
  level: 'info' | 'error',
  event: string,
  payload?: unknown
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()
    await supabase.from('ig_logs').insert({ level, event, payload: payload ?? null })
  } catch (err) {
    console.error('[ig_logs insert failed]', err)
  }
}

export interface IgConfig {
  id: string
  ig_user_id: string
  ig_username: string | null
  access_token: string
  token_expires_at: string
  connected_at: string
  updated_at: string
}

export async function getIgConfig(supabase: SupabaseClient): Promise<IgConfig | null> {
  const { data } = await supabase
    .from('ig_config')
    .select('*')
    .order('connected_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

export type IgCtaType = 'link' | 'button' | 'quick_reply'

interface SendMessageParams {
  igUserId: string
  accessToken: string
  recipient: { id: string } | { comment_id: string }
  text: string
  buttonText?: string | null
  ctaType?: IgCtaType
  // 'link': URL aberta direto pelo botão (web_url).
  buttonUrl?: string | null
  // 'button' / 'quick_reply': o webhook usa esse valor pra saber a qual
  // envio o toque se refere.
  payload?: string | null
}

export async function sendInstagramMessage(params: SendMessageParams) {
  const { igUserId, accessToken, recipient, text, buttonText, ctaType, buttonUrl, payload } = params

  let message: Record<string, unknown>
  if (buttonText && ctaType === 'link' && buttonUrl) {
    message = {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'button',
          text,
          buttons: [{ type: 'web_url', url: buttonUrl, title: buttonText }]
        }
      }
    }
  } else if (buttonText && ctaType === 'quick_reply' && payload) {
    message = {
      text,
      quick_replies: [{ content_type: 'text', title: buttonText, payload }]
    }
  } else if (buttonText && payload) {
    message = {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'button',
          text,
          buttons: [{ type: 'postback', title: buttonText, payload }]
        }
      }
    }
  } else {
    message = { text }
  }

  const res = await fetch(`${IG_GRAPH_BASE}/${igUserId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ recipient, message })
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error?.message || `Instagram API respondeu ${res.status}`)
  }
  return data
}

export async function subscribeToWebhooks(igUserId: string, accessToken: string) {
  const res = await fetch(`${IG_GRAPH_BASE}/${igUserId}/subscribed_apps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      subscribed_fields: 'comments,messages,messaging_postbacks',
      access_token: accessToken
    })
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error?.message || `Instagram API respondeu ${res.status}`)
  }
  return data
}

export async function replyToComment(commentId: string, accessToken: string, text: string) {
  const res = await fetch(`${IG_GRAPH_BASE}/${commentId}/replies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ message: text })
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error?.message || `Instagram API respondeu ${res.status}`)
  }
  return data
}

export async function checkUserFollowsBusiness(
  igsid: string,
  accessToken: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `${IG_GRAPH_BASE}/${igsid}?fields=is_user_follow_business,name,username&access_token=${accessToken}`,
      { method: 'GET' }
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      // Erro de permissão/consentimento ou falha da API: libera para não travar o lead
      await logIgEvent('info', 'follow_check_error_fallback', {
        igsid,
        status: res.status,
        error: data?.error
      })
      return true
    }

    if (typeof data?.is_user_follow_business === 'boolean') {
      return data.is_user_follow_business
    }

    // Se o campo não vier por restrição de consentimento, libera por segurança
    return true
  } catch (err) {
    await logIgEvent('error', 'follow_check_exception', {
      igsid,
      error: err instanceof Error ? err.message : String(err)
    })
    return true
  }
}

export interface IgAutomation {
  id: string
  name: string
  is_active: boolean
  post_id: string | null
  keywords: string[]
  match_mode: 'contains' | 'exact'
  /** @deprecated legado — leia via comment_reply_texts / pickRandomCommentReply */
  comment_reply_text: string | null
  comment_reply_texts: string[]
  dm_message_text: string
  dm_button_text: string | null
  dm_button_url: string | null
  cta_type: IgCtaType
  require_follow?: boolean
  follow_gate_message?: string | null
  follow_gate_button_text?: string | null
  linked_material_id?: string | null
  created_at: string
  updated_at: string
}

// Escolhe uma variação aleatória de resposta pública pro comentário, pra não
// repetir sempre o mesmo texto (evita parecer um robô). Cai no campo legado
// comment_reply_text para automações criadas antes da migração de variações.
export function pickRandomCommentReply(automation: IgAutomation): string | null {
  const variations = (automation.comment_reply_texts || []).map((t) => t.trim()).filter(Boolean)
  if (variations.length > 0) {
    return variations[Math.floor(Math.random() * variations.length)]
  }
  return automation.comment_reply_text || null
}

export function findMatchingAutomation(
  automations: IgAutomation[],
  commentText: string,
  mediaId: string | undefined
): IgAutomation | null {
  const normalized = commentText.toLowerCase().trim()

  for (const automation of automations) {
    if (automation.post_id && automation.post_id !== mediaId) continue

    const matched = (automation.keywords || []).some((rawKeyword) => {
      const keyword = rawKeyword.toLowerCase().trim()
      if (!keyword) return false
      return automation.match_mode === 'exact'
        ? normalized === keyword
        : normalized.includes(keyword)
    })

    if (matched) return automation
  }

  return null
}

export type IgMaterialType = 'text' | 'file' | 'link'

export interface IgMaterial {
  id: string
  slug: string
  title: string
  description: string | null
  cover_image_path: string | null
  material_type: IgMaterialType
  copy_text: string | null
  file_path: string | null
  file_name: string | null
  file_size_bytes: number | null
  external_url: string | null
  is_active: boolean
  view_count: number
  created_at: string
  updated_at: string
}

export const IG_MATERIALS_BUCKET = 'ig-materials'

export function getMaterialPublicUrl(supabase: SupabaseClient, path: string): string {
  return supabase.storage.from(IG_MATERIALS_BUCKET).getPublicUrl(path).data.publicUrl
}

// Gera um slug amigável a partir do título + sufixo aleatório curto, pra
// garantir unicidade sem precisar consultar o banco antes de inserir.
export function slugifyMaterialTitle(title: string): string {
  const base = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${base || 'material'}-${suffix}`
}

