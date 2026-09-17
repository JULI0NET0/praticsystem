import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdmin, buildShortUrl, type QrLink } from '@/lib/qrlinks'

const updateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  destination_url: z.string().trim().url('Informe uma URL válida.').optional(),
  client_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional()
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dados inválidos.' }, { status: 400 })
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar.' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('qr_links')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'QR Code não encontrado.' }, { status: 404 })
  }

  const origin = new URL(request.url).origin
  const link = data as QrLink
  return NextResponse.json({ ...link, short_url: buildShortUrl(origin, link.slug) })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = getSupabaseAdmin()

  const { error } = await supabase.from('qr_links').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
