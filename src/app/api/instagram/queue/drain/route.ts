import { NextResponse } from 'next/server'
import {
  getIgConfig,
  getSiteOrigin,
  getSupabaseAdmin,
  logIgEvent,
  sendInstagramMessage
} from '@/lib/instagram'

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization') || ''
  const expected = `Bearer ${process.env.IG_CRON_SECRET}`
  if (!process.env.IG_CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const config = await getIgConfig(supabase)
  if (!config) {
    return NextResponse.json({ skipped: true, reason: 'Instagram não conectado.' })
  }

  const hourlyCap = Number(process.env.IG_HOURLY_SEND_CAP || 60)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { count: sentLastHour } = await supabase
    .from('ig_message_queue')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'sent')
    .gte('sent_at', oneHourAgo)

  const remainingQuota = hourlyCap - (sentLastHour || 0)
  if (remainingQuota <= 0) {
    return NextResponse.json({ skipped: true, reason: 'Teto por hora atingido.', sentLastHour })
  }

  const { data: pending, error: pendingError } = await supabase
    .from('ig_message_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(remainingQuota)

  if (pendingError) {
    return NextResponse.json({ error: pendingError.message }, { status: 500 })
  }

  let sent = 0
  let failed = 0

  for (const item of pending || []) {
    await supabase.from('ig_message_queue').update({ status: 'sending' }).eq('id', item.id)

    try {
      const recipient = item.comment_id ? { comment_id: item.comment_id } : { id: item.igsid }

      // O botão da DM aponta pro nosso redirect (conta o clique) em vez do
      // link final direto, pra alimentar o funil de resultados.
      const trackedButtonUrl = item.button_url
        ? `${getSiteOrigin()}/api/instagram/click/${item.id}`
        : null

      await sendInstagramMessage({
        igUserId: config.ig_user_id,
        accessToken: config.access_token,
        recipient,
        text: item.message_text,
        buttonText: item.button_text,
        buttonUrl: trackedButtonUrl
      })

      await supabase
        .from('ig_message_queue')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', item.id)

      sent++
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await supabase
        .from('ig_message_queue')
        .update({
          status: 'failed',
          attempts: (item.attempts || 0) + 1,
          error: message.slice(0, 500)
        })
        .eq('id', item.id)

      await logIgEvent('error', 'queue_send_failed', { queueId: item.id, error: message })
      failed++
    }
  }

  return NextResponse.json({ processed: (pending || []).length, sent, failed })
}
