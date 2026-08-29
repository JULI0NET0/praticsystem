'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface ChatMessage {
  id: string
  content: string
  user: {
    name: string
    username?: string
    id: string
    avatar_url?: string
  }
  createdAt: string
  // campos persistidos no banco
  sender_id?: string
  receiver_id?: string | null
  channel?: string
  message_type?: string
  timestamp?: string
}

interface UseRealtimeChatProps {
  roomName: string
  username: string
  userId: string
  avatarUrl?: string
  onMessage?: (message: ChatMessage) => void
}

const EVENT_MESSAGE_TYPE = 'message'

export function useRealtimeChat({ roomName, username, userId, avatarUrl, onMessage }: UseRealtimeChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isConnected, setIsConnected] = useState(true)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const onMessageRef = useRef(onMessage)

  useEffect(() => {
    onMessageRef.current = onMessage
  })

  useEffect(() => {
    if (!roomName || !userId) return

    // Cria um identificador único de canal por montagem para evitar conflito de unsubscribe
    const channelId = `${roomName}:${userId.substring(0, 8)}:${Math.random().toString(36).substring(2, 7)}`
    const channel = supabase.channel(channelId, {
      config: {
        broadcast: { ack: false, self: false }
      }
    })

    // 1. Escuta broadcast instantâneo (baixa latência)
    channel.on('broadcast', { event: EVENT_MESSAGE_TYPE }, ({ payload }) => {
      const incoming = payload as ChatMessage
      if (!incoming || incoming.user?.id === userId) return

      setMessages(prev => {
        if (prev.some(m => m.id === incoming.id)) return prev
        return [...prev, incoming]
      })

      onMessageRef.current?.(incoming)
    })

    // 2. Escuta mudanças no Postgres da tabela chat_messages para resiliência total
    const isGeneral = roomName === 'chat:general'
    const dmParts = roomName.startsWith('chat:dm:') ? roomName.replace('chat:dm:', '').split(':') : []
    const otherUserId = dmParts.find(id => id !== userId)

    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      },
      (payload) => {
        const row = payload.new as any
        if (!row) return

        // Verifica se a mensagem pertence a esta sala ativa
        const matchesGeneral = isGeneral && row.channel === 'general'
        const matchesDm = !isGeneral && otherUserId && (
          (row.sender_id === userId && row.receiver_id === otherUserId) ||
          (row.sender_id === otherUserId && row.receiver_id === userId)
        )

        if (matchesGeneral || matchesDm) {
          const incoming: ChatMessage = {
            id: row.id,
            content: row.content,
            user: {
              id: row.sender_id,
              name: row.sender_id === userId ? username : '',
              avatar_url: row.sender_id === userId ? avatarUrl : undefined
            },
            createdAt: row.timestamp || row.created_at || new Date().toISOString(),
            sender_id: row.sender_id,
            receiver_id: row.receiver_id,
            channel: row.channel,
            message_type: row.message_type,
            timestamp: row.timestamp
          }

          setMessages(prev => {
            const existingIndex = prev.findIndex(m => m.id === incoming.id)
            if (existingIndex >= 0) {
              // Atualiza se necessário
              return prev
            }
            return [...prev, incoming]
          })

          if (row.sender_id !== userId) {
            onMessageRef.current?.(incoming)
          }
        }
      }
    )

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true)
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        setIsConnected(false)
      }
    })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomName, userId, username, avatarUrl])

  const sendMessage = useCallback(
    async (content: string, extras?: Partial<ChatMessage>) => {
      const messageId = crypto.randomUUID()
      const timestamp = new Date().toISOString()

      const message: ChatMessage = {
        id: messageId,
        content,
        user: { name: username, id: userId, avatar_url: avatarUrl },
        createdAt: timestamp,
        timestamp,
        ...extras,
      }

      // Optimistic update — aparece na tela imediatamente
      setMessages(prev => {
        if (prev.some(m => m.id === message.id)) return prev
        return [...prev, message]
      })

      // Tenta enviar via broadcast para preview instantâneo nos outros clientes
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: EVENT_MESSAGE_TYPE,
          payload: message,
        }).catch(() => {
          // Se falhar o broadcast, a persistência no banco garantirá a entrega via postgres_changes
        })
      }

      return message
    },
    [username, userId, avatarUrl]
  )

  const addPersistedMessage = useCallback((msg: ChatMessage) => {
    setMessages(prev => {
      if (prev.some(m => m.id === msg.id)) return prev
      return [...prev, msg]
    })
  }, [])

  const setInitialMessages = useCallback((msgs: ChatMessage[]) => {
    setMessages(msgs)
  }, [])

  return { messages, sendMessage, isConnected, addPersistedMessage, setInitialMessages }
}
