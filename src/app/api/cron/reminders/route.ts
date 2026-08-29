import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import webpush from 'web-push'

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:contato@agenciapratic.com'

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
  } catch (err) {
    console.error('[WebPush VAPID Config Error]', err)
  }
}

function getSaoPauloDateIso() {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  const parts = formatter.formatToParts(now)
  const day = parts.find(p => p.type === 'day')?.value || '01'
  const month = parts.find(p => p.type === 'month')?.value || '01'
  const year = parts.find(p => p.type === 'year')?.value || '2026'
  return `${year}-${month}-${day}`
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'morning'

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Configuração do servidor incompleta.' }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const today = getSaoPauloDateIso()

    // 1. Busca todas as demandas de hoje
    const { data: demands, error: demandsError } = await supabaseAdmin
      .from('demands')
      .select('id, title, status, status_category, due_date, due_time, assignee_ids, assign_all_team')
      .eq('due_date', today)

    if (demandsError) {
      return NextResponse.json({ error: demandsError.message }, { status: 500 })
    }

    // 2. Busca todos os usuários
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, name, username, role')

    if (usersError || !users) {
      return NextResponse.json({ error: usersError?.message || 'Erro ao listar usuários' }, { status: 500 })
    }

    // 3. Busca todas as subscriptions ativas
    const { data: subscriptions, error: subsError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth')

    if (subsError || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, message: 'Nenhuma inscrição push encontrada.', sent: 0 })
    }

    let sentCount = 0
    const staleIds: string[] = []

    for (const user of users) {
      const userSubs = subscriptions.filter(s => s.user_id === user.id)
      if (userSubs.length === 0) continue

      // Demandas do usuário hoje
      const userDemands = (demands || []).filter(d => {
        if (d.assign_all_team) return true
        if (Array.isArray(d.assignee_ids) && d.assignee_ids.includes(user.id)) return true
        return false
      })

      if (userDemands.length === 0) continue

      let title = ''
      let body = ''

      if (type === 'morning') {
        const count = userDemands.filter(d => d.status !== 'done' && d.status_category !== 'concluido').length
        if (count === 0) continue
        title = `☀️ Bom dia, ${user.name.split(' ')[0]}!`
        body = `Você tem ${count} demanda${count > 1 ? 's' : ''} programada${count > 1 ? 's' : ''} para hoje.`
      } else if (type === 'evening') {
        const doneCount = userDemands.filter(d => d.status === 'done' || d.status_category === 'concluido').length
        const pendingCount = userDemands.length - doneCount
        title = `📋 Fechamento do Dia (17h)`
        body = pendingCount > 0
          ? `${doneCount} concluídas e ${pendingCount} pendência${pendingCount > 1 ? 's' : ''} restante${pendingCount > 1 ? 's' : ''}.`
          : `Excelente! Todas as ${doneCount} tarefas de hoje foram concluídas! 🎉`
      } else {
        continue
      }

      const payload = JSON.stringify({
        title,
        body,
        url: '/admin/demands',
        type: 'demand',
        icon: '/SIMBOLO-BRANCO.png',
        badge: '/SIMBOLO-BRANCO.png',
        tag: `pratic-summary-${type}-${today}`,
        data: { url: '/admin/demands' }
      })

      for (const sub of userSubs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            { TTL: 86400 }
          )
          sentCount++
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            staleIds.push(sub.id)
          }
        }
      }
    }

    if (staleIds.length > 0) {
      await supabaseAdmin.from('push_subscriptions').delete().in('id', staleIds)
    }

    return NextResponse.json({
      success: true,
      type,
      sentCount,
      date: today
    })
  } catch (err: any) {
    console.error('[Cron Reminders Exception]', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
