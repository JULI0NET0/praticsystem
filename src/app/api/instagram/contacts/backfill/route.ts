import { NextResponse } from 'next/server'
import { getIgConfig, getSupabaseAdmin, logIgEvent, requireIgSession } from '@/lib/instagram'
import { fetchIgProfile } from '@/lib/instagramContacts'

// Completa @, nome e foto de contatos antigos que ficaram só com o IGSID.
// Processa um lote por chamada para não estourar o limite da API nem o tempo da função.
const BATCH = 25

export async function POST() {
  if (!(await requireIgSession())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const config = await getIgConfig(supabase)
  if (!config) {
    return NextResponse.json({ error: 'Instagram não conectado.' }, { status: 409 })
  }

  const { data: pending, error } = await supabase
    .from('ig_contacts')
    .select('igsid')
    .is('profile_synced_at', null)
    .order('last_seen_at', { ascending: false })
    .limit(BATCH)

  if (error) {
    const missingColumn = error.code === '42703' || error.code === 'PGRST204'
    return NextResponse.json(
      {
        error: missingColumn
          ? 'Rode a migração migration_instagram_contacts_v2.sql no Supabase antes de atualizar os perfis.'
          : error.message
      },
      { status: missingColumn ? 409 : 500 }
    )
  }

  let updated = 0
  let failed = 0
  const nowIso = new Date().toISOString()

  for (const { igsid } of pending || []) {
    const profile = await fetchIgProfile(igsid, config.access_token)
    const patch: Record<string, unknown> = { profile_synced_at: nowIso }
    if (profile) {
      if (profile.username) patch.username = profile.username
      if (profile.name) patch.name = profile.name
      if (profile.profile_pic_url) patch.profile_pic_url = profile.profile_pic_url
      if (profile.is_follower !== null) patch.is_follower = profile.is_follower
      updated++
    } else {
      // Sem consentimento/perfil indisponível: marca como tentado para não repetir sempre.
      failed++
    }
    await supabase.from('ig_contacts').update(patch).eq('igsid', igsid)
  }

  const { count: remaining } = await supabase
    .from('ig_contacts')
    .select('igsid', { count: 'exact', head: true })
    .is('profile_synced_at', null)

  await logIgEvent('info', 'contacts_backfill', { updated, failed, remaining })
  return NextResponse.json({ updated, failed, remaining: remaining ?? 0 })
}
