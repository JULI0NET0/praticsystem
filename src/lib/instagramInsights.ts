import { IG_GRAPH_BASE } from '@/lib/instagram'
import { toDayKey } from '@/lib/instagramStats'

// Números do perfil. Usa só a permissão básica já aprovada pela Meta
// (instagram_business_manage_insights bloqueou a conexão em ago/2026 — ver e4fc6ca).

export interface ProfileDay {
  date: string // YYYY-MM-DD (São Paulo)
  label: string // DD/MM
  seguidores: number // novos seguidores no dia (saldo informado pela Meta)
  alcance: number
}

export interface ProfileInsights {
  followers: number
  follows: number
  media: number
  newFollowers30d: number
  reach30d: number | null
  profileViews30d: number | null
  days: ProfileDay[]
}

interface InsightValue {
  value: number
  end_time: string
}

// A Meta fecha o dia às 07:00 UTC (meia-noite no Pacífico): o valor com end_time no dia D
// é o do dia anterior. Junta as séries por esse dia.
export function mergeDailySeries(series: { seguidores: InsightValue[]; alcance: InsightValue[] }): ProfileDay[] {
  const map = new Map<string, ProfileDay>()
  const dayOf = (endTime: string) => toDayKey(new Date(new Date(endTime).getTime() - 12 * 3_600_000))

  for (const key of ['seguidores', 'alcance'] as const) {
    for (const v of series[key]) {
      const date = dayOf(v.end_time)
      const day = map.get(date) ?? { date, label: `${date.slice(8, 10)}/${date.slice(5, 7)}`, seguidores: 0, alcance: 0 }
      day[key] = v.value ?? 0
      map.set(date, day)
    }
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
}

async function getJson(url: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  const data = await res.json().catch(() => ({}))
  return res.ok ? data : null
}

export async function fetchProfileInsights(accessToken: string): Promise<ProfileInsights | null> {
  try {
    const until = Math.floor(Date.now() / 1000)
    const since = until - 29 * 86_400
    const range = `period=day&since=${since}&until=${until}`

    const [me, daily, totals] = await Promise.all([
      getJson(`${IG_GRAPH_BASE}/me?fields=followers_count,follows_count,media_count`, accessToken),
      getJson(`${IG_GRAPH_BASE}/me/insights?metric=follower_count,reach&${range}`, accessToken),
      getJson(`${IG_GRAPH_BASE}/me/insights?metric=reach,profile_views&metric_type=total_value&${range}`, accessToken)
    ])
    if (!me) return null

    type Metric = { name: string; values?: InsightValue[]; total_value?: { value: number } }
    const metrics: Metric[] = daily?.data || []
    const seguidores = metrics.find((m) => m.name === 'follower_count')?.values || []
    const alcance = metrics.find((m) => m.name === 'reach')?.values || []
    const totalOf = (name: string) =>
      (totals?.data as Metric[] | undefined)?.find((m) => m.name === name)?.total_value?.value ?? null

    return {
      followers: me.followers_count ?? 0,
      follows: me.follows_count ?? 0,
      media: me.media_count ?? 0,
      newFollowers30d: seguidores.reduce((n, v) => n + (v.value ?? 0), 0),
      reach30d: totalOf('reach'),
      profileViews30d: totalOf('profile_views'),
      days: mergeDailySeries({ seguidores, alcance })
    }
  } catch {
    return null
  }
}
