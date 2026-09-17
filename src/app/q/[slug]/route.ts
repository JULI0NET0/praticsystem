import { NextResponse } from 'next/server'
import { getSupabaseAdmin, type QrLink } from '@/lib/qrlinks'

const FALLBACK_URL = '/'

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = getSupabaseAdmin()

  const { data: link } = await supabase
    .from('qr_links')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle<QrLink>()

  if (!link) {
    return NextResponse.redirect(new URL(FALLBACK_URL, request.url))
  }

  await supabase
    .from('qr_links')
    .update({ click_count: link.click_count + 1 })
    .eq('id', link.id)

  return NextResponse.redirect(link.destination_url)
}
