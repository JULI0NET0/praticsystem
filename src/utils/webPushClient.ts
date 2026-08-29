/**
 * Helper client-side para disparar notificações Web Push para destinatários específicos.
 * Roda de forma assíncrona sem bloquear a UI.
 */
export async function sendPushNotification(params: {
  userId?: string
  userIds?: string[]
  title: string
  body: string
  url?: string
  type?: 'chat' | 'mention' | 'demand' | 'system'
  icon?: string
}) {
  try {
    const res = await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })
    return await res.json()
  } catch (err) {
    console.warn('[webPushClient] Falha ao despachar push:', err)
    return null
  }
}
