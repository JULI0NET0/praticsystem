'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Escuta mensagens novas da tabela `chat_messages` e incrementa contadores de não-lidos
 * para canais/DMs que não estejam abertos no momento.
 * Retorna `unread` (por chave: 'general' ou userId), `clearUnread` e `totalUnread`.
 */
export function useUnreadCounts(
  currentUserId: string | undefined,
  _teamUserIds: string[],
  activeChat: string
) {
  const [unread, setUnread] = useState<Record<string, number>>({})
  const activeChatRef = useRef(activeChat)
  useEffect(() => { activeChatRef.current = activeChat }, [activeChat])

  useEffect(() => {
    if (!currentUserId) return

    const channelId = `realtime:unread:${currentUserId.substring(0, 8)}:${Math.random().toString(36).substring(2, 7)}`
    const channel = supabase.channel(channelId)

    // Escuta novas mensagens no Postgres em tempo real
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      },
      (payload) => {
        const row = payload.new as any
        if (!row || row.sender_id === currentUserId) return

        // Canal Geral
        if (row.channel === 'general') {
          if (activeChatRef.current !== 'general') {
            setUnread(prev => ({ ...prev, general: (prev.general ?? 0) + 1 }))
          }
        }
        // Mensagem Direta direcionada ao usuário logado
        else if (row.channel === 'dm' && row.receiver_id === currentUserId) {
          const senderId = row.sender_id
          if (activeChatRef.current !== senderId) {
            setUnread(prev => ({ ...prev, [senderId]: (prev[senderId] ?? 0) + 1 }))
          }
        }
      }
    )

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId])

  const clearUnread = useCallback((key: string) => {
    setUnread(prev => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const totalUnread = Object.values(unread).reduce((s, n) => s + n, 0)

  return { unread, clearUnread, totalUnread }
}
