import { NextResponse } from 'next/server'
import { getSupabaseAdmin, type QrLink } from '@/lib/qrlinks'

const FALLBACK_URL = '/'

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = getSupabaseAdmin()

  // Seleciona somente os campos essenciais para máxima performance
  const { data: link } = await supabase
    .from('qr_links')
    .select('id, destination_url, click_count')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle<Pick<QrLink, 'id' | 'destination_url' | 'click_count'>>()

  if (!link) {
    return NextResponse.redirect(new URL(FALLBACK_URL, request.url))
  }

  // Incremento assíncrono em background sem atrasar a resposta ao usuário
  supabase
    .from('qr_links')
    .update({ click_count: (link.click_count ?? 0) + 1 })
    .eq('id', link.id)
    .then()

  // Redirecionamento temporário imediato (307) sem cache para manter dinâmico
  return NextResponse.redirect(link.destination_url, {
    status: 307,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  })
}
