'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ChatMessage } from './useRealtimeChat'

const EVENT = 'message'

/**
 * Subscreve simultaneamente a todos os canais de chat relevantes.
 * Incrementa contadores de não-lidos para conversas que não estão ativas.
 * Retorna `unread` (por chave: 'general' ou userId) e `clearUnread`.
 */
export function useUnreadCounts(
  currentUserId: string | undefined,
  teamUserIds: string[],
  activeChat: string
) {
  const [unread, setUnread] = useState<Record<string, number>>({})
  // Ref para evitar stale closure no handler sem recriar subscriptions
  const activeChatRef = useRef(activeChat)
  useEffect(() => { activeChatRef.current = activeChat }, [activeChat])

  // Chave estável para dependência do efeito
  const teamKey = teamUserIds.slice().sort().join(',')

  useEffect(() => {
    if (!currentUserId) return

    const channels: ReturnType<typeof supabase.channel>[] = []

    const makeHandler = (convKey: string) => ({ payload }: { payload: unknown }) => {
      const msg = payload as ChatMessage
      if (msg.user?.id === currentUserId) return
      if (activeChatRef.current === convKey) return
      setUnread(prev => ({ ...prev, [convKey]: (prev[convKey] ?? 0) + 1 }))
    }

    // Geral
    const genCh = supabase.channel('chat:general')
    genCh.on('broadcast', { event: EVENT }, makeHandler('general')).subscribe()
    channels.push(genCh)

    // DMs — um canal por membro da equipe
    for (const otherId of teamUserIds) {
      const room = `chat:dm:${[currentUserId, otherId].sort().join(':')}`
      const dmCh = supabase.channel(room)
      dmCh.on('broadcast', { event: EVENT }, makeHandler(otherId)).subscribe()
      channels.push(dmCh)
    }

    return () => { channels.forEach(c => supabase.removeChannel(c)) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, teamKey])

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
