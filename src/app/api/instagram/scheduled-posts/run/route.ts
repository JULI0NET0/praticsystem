import { NextResponse } from 'next/server'
import { getIgConfig, getSupabaseAdmin, logIgEvent, requireIgSession } from '@/lib/instagram'
import { publishScheduledPost } from '@/lib/instagramPublish'
import { IG_PUBLISHING_STALE_MS, type IgScheduledPost } from '@/lib/instagramPosts'

// Publica o que já venceu. Chamado a cada minuto pelo pg_cron do Supabase
// (Bearer IG_CRON_SECRET) ou manualmente pelo painel (sessão admin).
export const maxDuration = 300

// Para de pegar novas publicações perto do limite da função.
const BUDGET_MS = 200_000
const MAX_PER_RUN = 3

async function handle(request: Request) {
  const authHeader = request.headers.get('authorization') || ''
  const secrets = [process.env.IG_CRON_SECRET, process.env.CRON_SECRET].filter(Boolean)
  const isCron = secrets.some((s) => authHeader === `Bearer ${s}`)
  if (!isCron && !(await requireIgSession())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const startedAt = Date.now()
  const supabase = getSupabaseAdmin()

  // Publicação que travou no meio vira falha: não reenviamos sozinhos para não
  // duplicar o post no perfil.
  await supabase
    .from('ig_scheduled_posts')
    .update({
      status: 'failed',
      error: 'Interrompida no meio da publicação. Confira o perfil antes de reagendar.',
      updated_at: new Date().toISOString()
    })
    .eq('status', 'publishing')
    .lt('started_at', new Date(Date.now() - IG_PUBLISHING_STALE_MS).toISOString())

  const config = await getIgConfig(supabase)
  if (!config?.access_token) {
    return NextResponse.json({ skipped: true, reason: 'Instagram não conectado.' })
  }
  if (new Date(config.token_expires_at).getTime() <= Date.now()) {
    await logIgEvent('error', 'scheduled_post_token_expired', {})
    return NextResponse.json({ error: 'Token expirado. Reconecte a conta.' }, { status: 409 })
  }

  const { data: due } = await supabase
    .from('ig_scheduled_posts')
    .select('id')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(MAX_PER_RUN)

  const results: { id: string; status: string; error?: string }[] = []

  for (const row of due ?? []) {
    if (Date.now() - startedAt > BUDGET_MS) break

    // Reivindica de forma atômica: se outra execução pegou antes, o UPDATE não casa.
    const { data: claimed } = await supabase
      .from('ig_scheduled_posts')
      .update({
        status: 'publishing',
        started_at: new Date().toISOString(),
        error: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', row.id)
      .eq('status', 'pending')
      .select('*')
      .maybeSingle()
    if (!claimed) continue
    const post = claimed as IgScheduledPost

    // attempts é só contador informativo; o runner não reenvia sozinho.
    try {
      const { mediaId, permalink } = await publishScheduledPost(post, {
        igUserId: config.ig_user_id,
        accessToken: config.access_token
      })
      await supabase
        .from('ig_scheduled_posts')
        .update({
          status: 'published',
          attempts: post.attempts + 1,
          media_id: mediaId,
          permalink,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', post.id)
      await logIgEvent('info', 'scheduled_post_published', { id: post.id, type: post.post_type, mediaId })
      results.push({ id: post.id, status: 'published' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao publicar'
      await supabase
        .from('ig_scheduled_posts')
        .update({
          status: 'failed',
          attempts: post.attempts + 1,
          error: message,
          updated_at: new Date().toISOString()
        })
        .eq('id', post.id)
      await logIgEvent('error', 'scheduled_post_failed', { id: post.id, type: post.post_type, error: message })
      results.push({ id: post.id, status: 'failed', error: message })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}

export const GET = handle
export const POST = handle
