// Agregações do painel do Instagram. Funções puras para poderem ser testadas.

export interface DailyPoint {
  date: string // YYYY-MM-DD no fuso de São Paulo
  label: string // DD/MM
  contatos: number
  dms: number
  cliques: number
}

const dayKey = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

export function toDayKey(iso: string | Date): string {
  return dayKey.format(typeof iso === 'string' ? new Date(iso) : iso)
}

// Série diária dos últimos `days` dias (hoje incluído), com zero nos dias sem evento.
export function buildDailySeries(
  input: { contatos: string[]; dms: string[]; cliques: string[] },
  days: number,
  now: Date
): DailyPoint[] {
  const points: DailyPoint[] = []
  const index = new Map<string, DailyPoint>()

  for (let i = days - 1; i >= 0; i--) {
    const date = toDayKey(new Date(now.getTime() - i * 86_400_000))
    if (index.has(date)) continue
    const point = { date, label: `${date.slice(8, 10)}/${date.slice(5, 7)}`, contatos: 0, dms: 0, cliques: 0 }
    points.push(point)
    index.set(date, point)
  }

  for (const key of ['contatos', 'dms', 'cliques'] as const) {
    for (const iso of input[key]) {
      if (!iso) continue
      const point = index.get(toDayKey(iso))
      if (point) point[key]++
    }
  }

  return points
}

export interface AutomationStats {
  comments: number
  sent: number
  clicks: number
}

export function statsByAutomation(
  queue: Array<{ automation_id: string | null; status: string; comment_id: string | null }>,
  clicks: Array<{ automation_id: string | null }>
): Record<string, AutomationStats> {
  const out: Record<string, AutomationStats> = {}
  const get = (id: string) => (out[id] ??= { comments: 0, sent: 0, clicks: 0 })

  for (const row of queue) {
    if (!row.automation_id) continue
    const s = get(row.automation_id)
    if (row.comment_id) s.comments++
    if (row.status === 'sent') s.sent++
  }
  for (const row of clicks) {
    if (row.automation_id) get(row.automation_id).clicks++
  }
  return out
}

// Nomes técnicos de ig_logs em frases para o painel. Eventos sem tradução ficam de fora.
const EVENT_LABELS: Record<string, string> = {
  comment_matched: 'Comentário acionou uma automação',
  follow_gate_prompted: 'Pedido para seguir o perfil enviado',
  follow_gate_retry_rejected: 'Contato tocou em "já sigo" sem seguir',
  oauth_connected: 'Conta do Instagram conectada',
  token_refreshed: 'Token do Instagram renovado',
  token_refresh_failed: 'Falha ao renovar o token do Instagram',
  token_expired: 'Token do Instagram expirou',
  queue_send_failed: 'Falha ao enviar uma DM',
  comment_reply_failed: 'Falha ao responder um comentário',
  followup_send_failed: 'Falha ao enviar o link após o toque',
  gate_send_failed: 'Falha ao enviar o pedido para seguir',
  webhook_subscribe_failed: 'Falha ao inscrever a conta nos webhooks',
  reel_published: 'Reel publicado',
  reel_publish_failed: 'Falha ao publicar Reel'
}

export function describeLogEvent(event: string): string | null {
  return EVENT_LABELS[event] ?? null
}
