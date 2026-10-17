import { NextResponse } from 'next/server'
import { getSupabaseAdmin, requireIgSession } from '@/lib/instagram'
import { validatePostInput, type IgScheduledPost } from '@/lib/instagramPosts'

type Ctx = { params: Promise<{ id: string }> }

// Edita (legenda e horário) ou cancela. Só mexe em publicações ainda agendadas
// ou que falharam; o filtro por status no UPDATE evita corrida com o runner.
export async function PATCH(request: Request, { params }: Ctx) {
  if (!(await requireIgSession())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }
  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 })

  const supabase = getSupabaseAdmin()
  const { data: current } = await supabase.from('ig_scheduled_posts').select('*').eq('id', id).maybeSingle()
  if (!current) return NextResponse.json({ error: 'Publicação não encontrada.' }, { status: 404 })
  const post = current as IgScheduledPost

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.action === 'cancel') {
    patch.status = 'canceled'
  } else {
    const caption = 'caption' in body ? (typeof body.caption === 'string' && body.caption.trim() ? body.caption : null) : post.caption
    const scheduledAt = typeof body.scheduled_at === 'string' ? body.scheduled_at : post.scheduled_at
    const invalid = validatePostInput({
      post_type: post.post_type,
      media: post.media,
      caption,
      cover_url: post.cover_url,
      scheduled_at: scheduledAt
    })
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })
    patch.caption = caption
    patch.scheduled_at = new Date(scheduledAt).toISOString()
    // "Reagendar" uma que falhou/cancelou volta para a fila.
    patch.status = 'pending'
    patch.error = null
  }

  const { data, error } = await supabase
    .from('ig_scheduled_posts')
    .update(patch)
    .eq('id', id)
    .in('status', ['pending', 'failed', 'canceled'])
    .select()
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Esta publicação não pode mais ser alterada.' }, { status: 409 })
  return NextResponse.json({ post: data })
}

export async function DELETE(_request: Request, { params }: Ctx) {
  if (!(await requireIgSession())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }
  const { id } = await params
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('ig_scheduled_posts')
    .delete()
    .eq('id', id)
    .neq('status', 'publishing')
    .select('id')
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Não foi possível excluir (publicando agora?).' }, { status: 409 })
  return NextResponse.json({ ok: true })
}
