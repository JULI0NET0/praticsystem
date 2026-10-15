import { NextResponse } from 'next/server'
import { IG_GRAPH_BASE, getIgConfig, getSupabaseAdmin, logIgEvent, requireIgSession } from '@/lib/instagram'
import { parseGraphMessage, type IgMessageRow } from '@/lib/instagramInbox'

// Importa o histórico de DMs pela API de conversas do Instagram.
// Uma página de conversas por chamada; o painel chama de novo com `after` até acabar.
// A Meta recusa pedidos grandes ("reduce the amount of data"), então a lista de
// conversas e as mensagens de cada uma vêm em chamadas separadas.
const CONVERSATIONS_PER_PAGE = 10
const MESSAGE_LIMITS = [25, 10]
const MESSAGE_FIELDS = 'id,created_time,from,to,message,attachments,shares,story'

type GraphMessage = Parameters<typeof parseGraphMessage>[0]

async function fetchConversationMessages(conversationId: string, token: string): Promise<GraphMessage[]> {
  for (const limit of MESSAGE_LIMITS) {
    const res = await fetch(
      `${IG_GRAPH_BASE}/${conversationId}?fields=messages.limit(${limit}){${MESSAGE_FIELDS}}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await res.json().catch(() => ({}))
    if (res.ok) return data.messages?.data || []
  }
  return []
}

export const maxDuration = 60

export async function POST(request: Request) {
  if (!(await requireIgSession())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const config = await getIgConfig(supabase)
  if (!config) return NextResponse.json({ error: 'Instagram não conectado.' }, { status: 409 })

  const body = await request.json().catch(() => ({}))
  const after = typeof body?.after === 'string' ? body.after : null

  const url = new URL(`${IG_GRAPH_BASE}/me/conversations`)
  url.searchParams.set('platform', 'instagram')
  url.searchParams.set('fields', 'id,updated_time,participants')
  url.searchParams.set('limit', String(CONVERSATIONS_PER_PAGE))
  if (after) url.searchParams.set('after', after)

  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${config.access_token}` } })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = data?.error?.message || `Instagram API respondeu ${res.status}`
    await logIgEvent('error', 'inbox_import_failed', { error: message })
    return NextResponse.json({ error: message }, { status: 502 })
  }

  const own = { id: config.ig_user_id, username: config.ig_username }
  const rows: IgMessageRow[] = []
  const contacts = new Map<string, string | null>()

  for (const conv of data.data || []) {
    for (const p of conv.participants?.data || []) {
      if (p.id && p.id !== own.id && p.username !== own.username) contacts.set(p.id, p.username ?? null)
    }
    for (const msg of await fetchConversationMessages(conv.id, config.access_token)) {
      const row = parseGraphMessage(msg, own)
      if (row && row.igsid !== own.id) rows.push(row)
    }
  }

  let imported = 0
  if (rows.length) {
    // Reimportar atualiza só o que veio da importação; o que o webhook, as automações
    // ou o painel gravaram (com origem e status de leitura próprios) fica como está.
    const { data: kept } = await supabase
      .from('ig_messages')
      .select('mid')
      .in('mid', rows.map((r) => r.mid as string))
      .neq('source', 'import')
    const keep = new Set((kept || []).map((k) => k.mid))
    const toWrite = rows.filter((r) => !keep.has(r.mid))

    const { data: inserted, error } = await supabase
      .from('ig_messages')
      .upsert(toWrite, { onConflict: 'mid' })
      .select('id')
    if (error) {
      const missing = error.code === '42P01' || error.code === 'PGRST205'
      return NextResponse.json(
        { error: missing ? 'Rode a migração migration_instagram_messages.sql no Supabase antes de importar.' : error.message },
        { status: missing ? 409 : 500 }
      )
    }
    imported = inserted?.length ?? 0
  }

  // Quem só existe na DM também vira contato (sem sobrescrever quem já existe), com as datas
  // reais da conversa — senão todos apareceriam como "novos hoje" no painel.
  if (contacts.size) {
    const span = new Map<string, { first: string; last: string }>()
    for (const r of rows) {
      const cur = span.get(r.igsid)
      if (!cur) span.set(r.igsid, { first: r.created_at, last: r.created_at })
      else {
        if (r.created_at < cur.first) cur.first = r.created_at
        if (r.created_at > cur.last) cur.last = r.created_at
      }
    }
    const now = new Date().toISOString()
    await supabase.from('ig_contacts').upsert(
      [...contacts].map(([igsid, username]) => ({
        igsid,
        username,
        source: 'dm',
        first_seen_at: span.get(igsid)?.first ?? now,
        last_seen_at: span.get(igsid)?.last ?? now
      })),
      { onConflict: 'igsid', ignoreDuplicates: true }
    )
  }

  const next = data.paging?.next ? data.paging?.cursors?.after ?? null : null
  await logIgEvent('info', 'inbox_import', { conversations: data.data?.length ?? 0, imported })
  return NextResponse.json({ conversations: data.data?.length ?? 0, imported, next })
}
