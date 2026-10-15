import { NextResponse } from 'next/server'
import {
  IG_GRAPH_BASE,
  getIgConfig,
  getSupabaseAdmin,
  logIgEvent,
  requireIgSession
} from '@/lib/instagram'

// Renova o token de longa duração (60 dias) antes de vencer.
// Chamado diariamente pelo cron da Vercel (que envia CRON_SECRET) ou manualmente
// pelo painel (sessão admin). `?force=1` renova mesmo longe do vencimento.
const REFRESH_WINDOW_DAYS = 15

async function handle(request: Request) {
  const authHeader = request.headers.get('authorization') || ''
  const secrets = [process.env.IG_CRON_SECRET, process.env.CRON_SECRET].filter(Boolean)
  const isCron = secrets.some(s => authHeader === `Bearer ${s}`)
  const isSession = await requireIgSession()

  if (!isCron && !isSession) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const force = new URL(request.url).searchParams.get('force') === '1'
  const supabase = getSupabaseAdmin()
  const config = await getIgConfig(supabase)
  if (!config) {
    return NextResponse.json({ skipped: true, reason: 'Instagram não conectado.' })
  }

  const expiresAt = new Date(config.token_expires_at).getTime()
  const daysLeft = (expiresAt - Date.now()) / 86_400_000

  if (expiresAt <= Date.now()) {
    await logIgEvent('error', 'token_expired', { expires_at: config.token_expires_at })
    return NextResponse.json(
      { error: 'Token já expirou. Reconecte a conta em Configurações.' },
      { status: 409 }
    )
  }

  if (!force && daysLeft > REFRESH_WINDOW_DAYS) {
    return NextResponse.json({ skipped: true, reason: 'Token ainda longe do vencimento.', daysLeft })
  }

  const url = new URL(`${IG_GRAPH_BASE}/refresh_access_token`)
  url.searchParams.set('grant_type', 'ig_refresh_token')
  url.searchParams.set('access_token', config.access_token)

  const res = await fetch(url.toString())
  const data = await res.json().catch(() => ({}))

  if (!res.ok || !data.access_token) {
    const message = data?.error?.message || `Instagram API respondeu ${res.status}`
    await logIgEvent('error', 'token_refresh_failed', { error: message, daysLeft })
    return NextResponse.json({ error: message }, { status: 502 })
  }

  const newExpiresAt = new Date(Date.now() + (data.expires_in ?? 5184000) * 1000).toISOString()
  const { error } = await supabase
    .from('ig_config')
    .update({
      access_token: data.access_token,
      token_expires_at: newExpiresAt,
      updated_at: new Date().toISOString()
    })
    .eq('id', config.id)

  if (error) {
    await logIgEvent('error', 'token_refresh_save_failed', { error: error.message })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logIgEvent('info', 'token_refreshed', { expires_at: newExpiresAt })
  return NextResponse.json({ refreshed: true, expires_at: newExpiresAt })
}

export const GET = handle
export const POST = handle
