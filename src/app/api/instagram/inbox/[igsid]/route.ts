import { NextResponse } from 'next/server'
import {
  getIgConfig,
  getSupabaseAdmin,
  logIgEvent,
  requireIgSession,
  sendInstagramMessage
} from '@/lib/instagram'
import { recordIgMessage, replyWindow } from '@/lib/instagramInbox'

async function lastInboundAt(supabase: ReturnType<typeof getSupabaseAdmin>, igsid: string) {
  const { data } = await supabase
    .from('ig_messages')
    .select('created_at')
    .eq('igsid', igsid)
    .eq('direction', 'in')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.created_at ?? null
}

// Conversa aberta: mensagens, dados do contato, automações que o atingiram e janela de 24h.
export async function GET(_request: Request, { params }: { params: Promise<{ igsid: string }> }) {
  if (!(await requireIgSession())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { igsid } = await params
  const supabase = getSupabaseAdmin()

  const [messagesRes, contactRes, queueRes] = await Promise.all([
    supabase
      .from('ig_messages')
      .select('id, mid, direction, kind, text, attachments, source, automation_id, created_at, read_at')
      .eq('igsid', igsid)
      .order('created_at', { ascending: false })
      .limit(300),
    supabase.from('ig_contacts').select('*').eq('igsid', igsid).maybeSingle(),
    supabase
      .from('ig_message_queue')
      .select('automation_id, status, created_at, ig_automations(name)')
      .eq('igsid', igsid)
      .order('created_at', { ascending: false })
      .limit(20)
  ])

  if (messagesRes.error) {
    return NextResponse.json({ error: messagesRes.error.message }, { status: 500 })
  }

  const messages = (messagesRes.data || []).reverse()
  const lastIn = [...messages].reverse().find((m) => m.direction === 'in')?.created_at ?? null

  // Abrir a conversa marca as recebidas como lidas.
  if (messages.some((m) => m.direction === 'in' && !m.read_at)) {
    await supabase
      .from('ig_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('igsid', igsid)
      .eq('direction', 'in')
      .is('read_at', null)
  }

  const automations = new Map<string, { id: string; name: string; lastAt: string; status: string }>()
  for (const q of queueRes.data || []) {
    if (!q.automation_id || automations.has(q.automation_id)) continue
    const rel = q.ig_automations as { name?: string } | { name?: string }[] | null
    const name = (Array.isArray(rel) ? rel[0]?.name : rel?.name) || 'Automação'
    automations.set(q.automation_id, { id: q.automation_id, name, lastAt: q.created_at, status: q.status })
  }

  return NextResponse.json({
    messages,
    contact: contactRes.data ?? null,
    automations: [...automations.values()],
    window: replyWindow(lastIn)
  })
}

// Resposta pelo painel.
export async function POST(request: Request, { params }: { params: Promise<{ igsid: string }> }) {
  if (!(await requireIgSession())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { igsid } = await params
  const body = await request.json().catch(() => null)
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  if (!text) return NextResponse.json({ error: 'Escreva a mensagem.' }, { status: 400 })
  if (text.length > 1000) {
    return NextResponse.json({ error: 'A mensagem passa de 1000 caracteres.' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const config = await getIgConfig(supabase)
  if (!config) return NextResponse.json({ error: 'Instagram não conectado.' }, { status: 409 })

  const window = replyWindow(await lastInboundAt(supabase, igsid))
  if (!window.open) {
    return NextResponse.json(
      { error: 'Passaram 24h desde a última mensagem dessa pessoa. O Instagram só libera nova resposta quando ela escrever de novo.' },
      { status: 409 }
    )
  }

  try {
    const sent = await sendInstagramMessage({
      igUserId: config.ig_user_id,
      accessToken: config.access_token,
      recipient: { id: igsid },
      text
    })
    const createdAt = new Date().toISOString()
    await recordIgMessage(
      supabase,
      { mid: sent?.message_id ?? null, igsid, direction: 'out', text, source: 'panel', created_at: createdAt },
      { overwrite: true }
    )
    return NextResponse.json({ ok: true, created_at: createdAt })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await logIgEvent('error', 'inbox_reply_failed', { igsid, error: message })
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
