import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdmin, slugifyQrTitle, buildShortUrl, type QrLink } from '@/lib/qrlinks'

const createSchema = z.object({
  title: z.string().trim().min(1, 'Título é obrigatório.'),
  destination_url: z.string().trim().url('Informe uma URL válida.'),
  client_id: z.string().uuid().nullable().optional()
})

function withShortUrl(origin: string, link: QrLink) {
  return { ...link, short_url: buildShortUrl(origin, link.slug) }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const clientId = searchParams.get('client_id')

  const supabase = getSupabaseAdmin()
  let query = supabase.from('qr_links').select('*').order('created_at', { ascending: false })
  if (clientId) query = query.eq('client_id', clientId)

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json((data as QrLink[]).map((link) => withShortUrl(origin, link)))
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dados inválidos.' }, { status: 400 })
  }

  const { title, destination_url, client_id } = parsed.data
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('qr_links')
    .insert({
      title,
      destination_url,
      client_id: client_id ?? null,
      slug: slugifyQrTitle(title)
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const origin = new URL(request.url).origin
  return NextResponse.json(withShortUrl(origin, data as QrLink), { status: 201 })
}
