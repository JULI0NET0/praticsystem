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

interface SendMessageParams {
  igUserId: string
  accessToken: string
  recipient: { id: string } | { comment_id: string }
  text: string
  buttonText?: string | null
  buttonUrl?: string | null
}

export async function sendInstagramMessage(params: SendMessageParams) {
  const { igUserId, accessToken, recipient, text, buttonText, buttonUrl } = params

  const message =
    buttonText && buttonUrl
      ? {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'button',
              text,
              buttons: [{ type: 'web_url', url: buttonUrl, title: buttonText }]
            }
          }
        }
      : { text }

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
      subscribed_fields: 'comments,messages',
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

export interface IgAutomation {
  id: string
  name: string
  is_active: boolean
  post_id: string | null
  keywords: string[]
  match_mode: 'contains' | 'exact'
  comment_reply_text: string | null
  dm_message_text: string
  dm_button_text: string | null
  dm_button_url: string | null
  created_at: string
  updated_at: string
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
