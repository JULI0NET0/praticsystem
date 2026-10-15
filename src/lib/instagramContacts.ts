import type { SupabaseClient } from '@supabase/supabase-js'
import { IG_GRAPH_BASE } from '@/lib/instagram'

export type IgContactSource = 'comment' | 'dm' | 'button'

export interface IgProfile {
  username: string | null
  name: string | null
  profile_pic_url: string | null
  is_follower: boolean | null
}

export interface IgContactRow {
  igsid: string
  username: string | null
  name?: string | null
  profile_pic_url?: string | null
  source?: IgContactSource | null
  interactions?: number | null
  is_follower?: boolean | null
  profile_synced_at?: string | null
}

const PROFILE_FIELDS = ['name,username,profile_pic,is_user_follow_business', 'name,username']

// Perfil de quem já interagiu com a conta (comentou ou mandou DM).
// Melhor esforço: sem consentimento ou com erro da API, devolve null.

export async function fetchIgProfile(igsid: string, accessToken: string): Promise<IgProfile | null> {
  try {
    // Contas profissionais não têm profile_pic/is_user_follow_business (erro 100):
    // tenta de novo só com @ e nome.
    let data: Record<string, unknown> | null = null
    for (const fields of PROFILE_FIELDS) {
      const res = await fetch(`${IG_GRAPH_BASE}/${igsid}?fields=${fields}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      const body = await res.json().catch(() => ({}))
      if (res.ok) {
        data = body
        break
      }
      if (body?.error?.code !== 100) return null
    }
    if (!data) return null
    return {
      username: (data.username as string) || null,
      name: (data.name as string) || null,
      profile_pic_url: (data.profile_pic as string) || null,
      is_follower: typeof data.is_user_follow_business === 'boolean' ? data.is_user_follow_business : null
    }
  } catch {
    return null
  }
}

// Só busca o perfil quando ainda falta @ ou nome: evita uma chamada à API a cada DM.
export function needsProfile(existing: Partial<IgContactRow> | null, knownUsername?: string | null): boolean {
  if (!existing) return true
  return !(existing.username || knownUsername) || !existing.name
}

// Monta a linha do upsert sem apagar dado de perfil que já existia.
export function buildContactRow(
  igsid: string,
  existing: Partial<IgContactRow> | null,
  input: { username?: string | null; source: IgContactSource },
  profile: IgProfile | null,
  nowIso: string
): Record<string, unknown> {
  const row: Record<string, unknown> = {
    igsid,
    username: input.username || profile?.username || existing?.username || null,
    name: profile?.name || existing?.name || null,
    profile_pic_url: profile?.profile_pic_url || existing?.profile_pic_url || null,
    source: existing?.source || input.source,
    interactions: (existing?.interactions ?? 0) + 1,
    last_seen_at: nowIso
  }
  if (profile) {
    row.profile_synced_at = nowIso
    if (profile.is_follower !== null) row.is_follower = profile.is_follower
  }
  return row
}

// PostgREST devolve PGRST204 (ou o Postgres 42703) quando a coluna ainda não existe:
// a migração v2 de contatos não foi rodada.
function isMissingColumn(error: { code?: string } | null): boolean {
  return !!error && (error.code === 'PGRST204' || error.code === '42703')
}

// Registra uma interação do contato, completando @, nome e foto quando faltam.
// Devolve `isNew` quando é a primeira vez que essa pessoa aparece.
export async function touchContact(
  supabase: SupabaseClient,
  params: { igsid: string; username?: string | null; source: IgContactSource; accessToken?: string | null }
): Promise<{ isNew: boolean }> {
  const nowIso = new Date().toISOString()

  const { data: existing, error: selectError } = await supabase
    .from('ig_contacts')
    .select('igsid, username, name, profile_pic_url, source, interactions')
    .eq('igsid', params.igsid)
    .maybeSingle()

  if (isMissingColumn(selectError)) {
    await supabase
      .from('ig_contacts')
      .upsert(
        { igsid: params.igsid, username: params.username ?? null, last_seen_at: nowIso },
        { onConflict: 'igsid' }
      )
    return { isNew: false }
  }

  const profile =
    params.accessToken && needsProfile(existing, params.username)
      ? await fetchIgProfile(params.igsid, params.accessToken)
      : null

  const row = buildContactRow(params.igsid, existing, params, profile, nowIso)
  await supabase.from('ig_contacts').upsert(row, { onConflict: 'igsid' })
  return { isNew: !existing && !selectError }
}
