import { NextResponse } from 'next/server'
import { getSupabaseAdmin, requireIgSession } from '@/lib/instagram'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireIgSession())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 })
  }

  const allowedFields = [
    'name',
    'is_active',
    'post_id',
    'keywords',
    'match_mode',
    'comment_reply_text',
    'dm_message_text',
    'dm_button_text',
    'dm_button_url',
    'use_button'
  ] as const

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const field of allowedFields) {
    if (field in body) updates[field] = body[field]
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('ig_automations')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ automation: data })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireIgSession())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { id } = await params
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('ig_automations').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
