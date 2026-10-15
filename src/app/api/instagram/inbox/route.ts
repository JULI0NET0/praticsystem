import { NextResponse } from 'next/server'
import { getIgConfig, getSupabaseAdmin, requireIgSession } from '@/lib/instagram'
import { summarizeConversations } from '@/lib/instagramInbox'

function isMissingTable(code?: string) {
  return code === '42P01' || code === 'PGRST205'
}

// Lista de conversas: última mensagem, não lidas e quem precisa de resposta.
export async function GET() {
  if (!(await requireIgSession())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const [{ data: rows, error }, config] = await Promise.all([
    supabase
      .from('ig_messages')
      .select('igsid, direction, kind, text, created_at, read_at')
      .order('created_at', { ascending: false })
      .limit(1000),
    getIgConfig(supabase)
  ])

  if (error) {
    return NextResponse.json(
      {
        error: isMissingTable(error.code)
          ? 'Rode a migração migration_instagram_messages.sql no Supabase para ativar a caixa de entrada.'
          : error.message,
        needsMigration: isMissingTable(error.code)
      },
      { status: isMissingTable(error.code) ? 409 : 500 }
    )
  }

  const conversations = summarizeConversations(rows || []).filter((c) => c.igsid !== config?.ig_user_id)
  const igsids = conversations.map((c) => c.igsid)

  const { data: contacts } = igsids.length
    ? await supabase
        .from('ig_contacts')
        .select('igsid, username, name, profile_pic_url, is_follower')
        .in('igsid', igsids)
    : { data: [] }

  const byId = new Map((contacts || []).map((c) => [c.igsid, c]))
  return NextResponse.json({
    conversations: conversations.map((c) => ({ ...c, contact: byId.get(c.igsid) ?? null }))
  })
}
