import { NextResponse } from 'next/server'
import { getSupabaseAdmin, logIgEvent } from '@/lib/instagram'

const FALLBACK_URL = 'https://www.instagram.com/'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ queueId: string }> }
) {
  const { queueId } = await params
  const supabase = getSupabaseAdmin()

  const { data: item } = await supabase
    .from('ig_message_queue')
    .select('id, automation_id, igsid, button_url')
    .eq('id', queueId)
    .maybeSingle()

  if (!item?.button_url) {
    return NextResponse.redirect(FALLBACK_URL)
  }

  const { error } = await supabase.from('ig_link_clicks').insert({
    queue_id: item.id,
    automation_id: item.automation_id,
    igsid: item.igsid
  })

  if (error) {
    await logIgEvent('error', 'click_tracking_failed', { error: error.message, queueId })
  }

  return NextResponse.redirect(item.button_url)
}
