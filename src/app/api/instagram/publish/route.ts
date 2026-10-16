import { NextResponse } from 'next/server'
import {
  getIgConfig,
  getSupabaseAdmin,
  logIgEvent,
  publishInstagramReel,
  requireIgSession
} from '@/lib/instagram'

// Pode levar minutos: a Meta processa o vídeo antes de publicar.
export const maxDuration = 300

export async function POST(request: Request) {
  if (!(await requireIgSession())) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const videoUrl = typeof body?.video_url === 'string' ? body.video_url : ''
  if (!/^https:\/\//.test(videoUrl)) {
    return NextResponse.json({ error: 'video_url (https pública) é obrigatória.' }, { status: 400 })
  }
  const caption = typeof body?.caption === 'string' ? body.caption.slice(0, 2200) : null
  const coverUrl = typeof body?.cover_url === 'string' ? body.cover_url : null
  const shareToFeed = typeof body?.share_to_feed === 'boolean' ? body.share_to_feed : undefined

  const supabase = getSupabaseAdmin()
  const config = await getIgConfig(supabase)
  if (!config?.access_token) {
    return NextResponse.json({ error: 'Instagram não conectado.' }, { status: 404 })
  }

  try {
    const result = await publishInstagramReel({
      igUserId: config.ig_user_id,
      accessToken: config.access_token,
      videoUrl,
      caption,
      coverUrl,
      shareToFeed
    })
    await logIgEvent('info', 'reel_published', { ...result, videoUrl })
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao publicar Reel'
    await logIgEvent('error', 'reel_publish_failed', { videoUrl, error: message })
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
