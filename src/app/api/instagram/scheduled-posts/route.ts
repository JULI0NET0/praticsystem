import { NextResponse } from 'next/server'
import { getSupabaseAdmin, requireIgSession } from '@/lib/instagram'
import { validatePostInput, type IgPostType, type IgPostMedia } from '@/lib/instagramPosts'

export async function GET() {
  if (!(await requireIgSession())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('ig_scheduled_posts')
    .select('*')
    .order('scheduled_at', { ascending: false })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ posts: data ?? [] })
}

export async function POST(request: Request) {
  if (!(await requireIgSession())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 })

  const input = {
    post_type: body.post_type as IgPostType,
    media: body.media as IgPostMedia[],
    caption: typeof body.caption === 'string' && body.caption.trim() ? body.caption : null,
    cover_url: typeof body.cover_url === 'string' && body.cover_url ? body.cover_url : null,
    scheduled_at: String(body.scheduled_at ?? '')
  }
  const invalid = validatePostInput(input)
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('ig_scheduled_posts')
    .insert({
      ...input,
      media: input.media.map((m) => ({ url: m.url, kind: m.kind })),
      scheduled_at: new Date(input.scheduled_at).toISOString(),
      share_to_feed: typeof body.share_to_feed === 'boolean' ? body.share_to_feed : true
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ post: data })
}
