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
      comment_reply_texts: Array.isArray(body.comment_reply_texts)
        ? body.comment_reply_texts.map((t: unknown) => String(t).trim()).filter(Boolean)
        : [],
      dm_message_text: body.dm_message_text,
      dm_button_text: body.dm_button_text || null,
      dm_button_url: body.dm_button_url || null,
      cta_type: ['link', 'quick_reply'].includes(body.cta_type) ? body.cta_type : 'button',
      require_follow: body.require_follow ?? false,
      follow_gate_message: body.follow_gate_message || null,
      follow_gate_button_text: body.follow_gate_button_text || null,
      linked_material_id: body.linked_material_id || null
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ automation: data })
}
