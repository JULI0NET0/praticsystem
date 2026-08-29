import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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

export async function POST(request: Request) {
  try {
    const {
      userId,
      userIds,
      title,
      body,
      url = '/admin/dashboard',
      type = 'system',
      icon = '/SIMBOLO-BRANCO.png',
      badge = '/SIMBOLO-BRANCO.png'
    } = await request.json()

    const targetUserIds: string[] = userIds || (userId ? [userId] : [])

    if (targetUserIds.length === 0 || !title) {
      return NextResponse.json(
        { error: 'userId/userIds e title são obrigatórios' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Configuração do servidor incompleta.' }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Busca todas as inscrições push dos usuários de destino
    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth')
      .in('user_id', targetUserIds)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum dispositivo inscrito para os usuários informados.',
        sent: 0
      })
    }

    const payload = JSON.stringify({
      title,
      body: body || '',
      url,
      type,
      icon,
      badge,
      tag: `pratic-${type}-${Date.now()}`,
      data: { url, type }
    })

    const staleIds: string[] = []
    let sentCount = 0
    let failCount = 0

    const sendPromises = subscriptions.map(async (sub) => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      }

      try {
        await webpush.sendNotification(pushConfig, payload, {
          TTL: 86400, // 24 horas no servidor de push
          urgency: type === 'mention' || type === 'demand' ? 'high' : 'normal'
        })
        sentCount++
      } catch (err: any) {
        failCount++
        // 410 (Gone) ou 404 (Not Found) indica que o usuário desinstalou ou cancelou o Push
        if (err.statusCode === 410 || err.statusCode === 404) {
          staleIds.push(sub.id)
        }
      }
    })

    await Promise.allSettled(sendPromises)

    // Remove tokens expirados/inválidos automaticamente
    if (staleIds.length > 0) {
      await supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .in('id', staleIds)
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      failed: failCount,
      cleanedStale: staleIds.length,
      total: subscriptions.length
    })
  } catch (err: any) {
    console.error('[WebPush Send Exception]', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
