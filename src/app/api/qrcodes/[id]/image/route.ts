import { NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { getSupabaseAdmin, buildShortUrl, type QrLink } from '@/lib/qrlinks'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = getSupabaseAdmin()

  const { data } = await supabase.from('qr_links').select('slug').eq('id', id).maybeSingle<Pick<QrLink, 'slug'>>()
  if (!data) {
    return NextResponse.json({ error: 'QR Code não encontrado.' }, { status: 404 })
  }

  const origin = new URL(request.url).origin
  const shortUrl = buildShortUrl(origin, data.slug)
  const png = await QRCode.toBuffer(shortUrl, { width: 512, margin: 2 })

  return new NextResponse(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      // A imagem só depende do slug, que nunca muda depois de criado —
      // o destino por trás pode mudar sem invalidar o cache.
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  })
}
