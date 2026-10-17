import { NextResponse } from 'next/server'
import { getSupabaseAdmin, requireIgSession } from '@/lib/instagram'
import { IG_POSTS_BUCKET, mediaKindFromMime } from '@/lib/instagramPosts'

// Devolve uma URL assinada para o navegador enviar a mídia direto ao Storage
// (vídeos passam do limite de corpo das funções da Vercel).
export async function POST(request: Request) {
  if (!(await requireIgSession())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }
  const body = await request.json().catch(() => null)
  const filename = typeof body?.filename === 'string' ? body.filename : ''
  const contentType = typeof body?.content_type === 'string' ? body.content_type : ''
  const kind = mediaKindFromMime(contentType)
  if (!kind) return NextResponse.json({ error: 'Envie uma imagem ou um vídeo.' }, { status: 400 })

  const ext = (filename.split('.').pop() || (kind === 'video' ? 'mp4' : 'jpg')).toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext || 'bin'}`

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.storage.from(IG_POSTS_BUCKET).createSignedUploadUrl(path)
  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Falha ao preparar o envio.' }, { status: 500 })
  }
  const { data: pub } = supabase.storage.from(IG_POSTS_BUCKET).getPublicUrl(path)
  return NextResponse.json({ path, token: data.token, public_url: pub.publicUrl, kind })
}
