'use client'

import { useEffect, useCallback } from 'react'
import { playSound } from '@/utils/audio'
import type { ChatMessage } from './useRealtimeChat'

const ICON = '/SIMBOLO-BRANCO.png'

export function useChatNotifications(currentUserId: string | undefined) {
  // Pede permissão uma vez ao montar
  useEffect(() => {
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'default') Notification.requestPermission()
  }, [])

  // chatVisible = se o painel de chat está aberto e visível pelo usuário
  const notify = useCallback(
    (msg: ChatMessage, chatVisible: boolean) => {
      if (!currentUserId || msg.user.id === currentUserId) return

      const isMention = msg.content.includes('@')

      // Som — toca sempre (mesmo com chat aberto, como Slack/WhatsApp)
      playSound(isMention ? 'mention' : 'chat')

      // Vibração no celular
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(isMention ? [80, 40, 80] : [60])
      }

      // Notificação de browser — só quando o chat está fechado ou a aba em background
      if ((!chatVisible || document.hidden) && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const title = isMention
          ? `${msg.user.name} mencionou você`
          : msg.user.name

        const n = new Notification(title, {
          body: msg.content.substring(0, 100),
          icon: ICON,
          badge: ICON,
          // Agrupa por remetente — substitui notif anterior do mesmo usuário
          tag: `chat-${msg.user.id}`,
          // Menções ficam visíveis até o usuário interagir
          requireInteraction: isMention,
          silent: true, // som já foi tocado pela Web Audio API
        })

        n.onclick = () => {
          window.focus()
          n.close()
        }
      }
    },
    [currentUserId]
  )

  return { notify }
}
