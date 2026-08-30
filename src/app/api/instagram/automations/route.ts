import { NextResponse } from 'next/server'
import { getSupabaseAdmin, requireIgSession } from '@/lib/instagram'

export async function GET() {
  if (!(await requireIgSession())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('ig_automations')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ automations: data })
}

export async function POST(request: Request) {
  if (!(await requireIgSession())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body?.name || !body?.dm_message_text || !Array.isArray(body?.keywords) || body.keywords.length === 0) {
    return NextResponse.json(
      { error: 'Preencha nome, ao menos uma palavra-chave e a mensagem da DM.' },
      { status: 400 }
    )
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('ig_automations')
    .insert({
      name: body.name,
      is_active: body.is_active ?? true,
      post_id: body.post_id || null,
      keywords: body.keywords,
      match_mode: body.match_mode === 'exact' ? 'exact' : 'contains',
      comment_reply_text: body.comment_reply_text || null,
      dm_message_text: body.dm_message_text,
      dm_button_text: body.dm_button_text || null,
      dm_button_url: body.dm_button_url || null,
      use_button: body.use_button ?? true
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ automation: data })
}
