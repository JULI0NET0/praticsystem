import { NextResponse } from 'next/server'
import { IG_GRAPH_BASE, getSupabaseAdmin, logIgEvent, subscribeToWebhooks } from '@/lib/instagram'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const oauthError = searchParams.get('error_description') || searchParams.get('error')

  if (oauthError || !code) {
    return NextResponse.redirect(
      `${origin}/automacao-instagram?ig_error=${encodeURIComponent(oauthError || 'sem_code')}`
    )
  }

  try {
    // 1. Troca o "code" por um token de curta duração
    const tokenForm = new URLSearchParams({
      client_id: process.env.IG_APP_ID || '',
      client_secret: process.env.IG_APP_SECRET || '',
      grant_type: 'authorization_code',
      redirect_uri: process.env.IG_OAUTH_REDIRECT_URI || '',
      code
    })

    const shortRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      body: tokenForm
    })
    const shortData = await shortRes.json()

    if (!shortRes.ok || !shortData.access_token) {
      throw new Error(shortData?.error_message || 'Falha ao trocar código por token')
    }

    // 2. Troca o token de curta duração por um de longa duração (60 dias)
    const longUrl = new URL(`${IG_GRAPH_BASE}/access_token`)
    longUrl.searchParams.set('grant_type', 'ig_exchange_token')
    longUrl.searchParams.set('client_secret', process.env.IG_APP_SECRET || '')
    longUrl.searchParams.set('access_token', shortData.access_token)

    const longRes = await fetch(longUrl.toString())
    const longData = await longRes.json()

    if (!longRes.ok || !longData.access_token) {
      throw new Error(longData?.error?.message || 'Falha ao gerar token de longa duração')
    }

    const expiresAt = new Date(
      Date.now() + (longData.expires_in ?? 5184000) * 1000
    ).toISOString()

    // 3. Busca o username da conta conectada
    const meUrl = new URL(`${IG_GRAPH_BASE}/me`)
    meUrl.searchParams.set('fields', 'user_id,username')
    meUrl.searchParams.set('access_token', longData.access_token)
    const meRes = await fetch(meUrl.toString())
    const meData = await meRes.json().catch(() => ({}))

    const supabase = getSupabaseAdmin()
    // Só existe uma conexão por vez: limpa a anterior antes de salvar a nova
    await supabase.from('ig_config').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('ig_config').insert({
      ig_user_id: meData.user_id || shortData.user_id,
      ig_username: meData.username || null,
      access_token: longData.access_token,
      token_expires_at: expiresAt
    })

    await logIgEvent('info', 'oauth_connected', { username: meData.username })

    // Sem isso, a conta fica conectada mas a Meta não entrega nenhum
    // evento de webhook (comentários/mensagens) pra ela.
    try {
      await subscribeToWebhooks(meData.user_id || shortData.user_id, longData.access_token)
    } catch (err) {
      await logIgEvent('error', 'webhook_subscribe_failed', {
        error: err instanceof Error ? err.message : String(err)
      })
    }

    return NextResponse.redirect(`${origin}/automacao-instagram?ig_connected=1`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await logIgEvent('error', 'oauth_callback_error', { error: message })
    return NextResponse.redirect(
      `${origin}/automacao-instagram?ig_error=${encodeURIComponent(message)}`
    )
  }
}
