'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface ChatMessage {
  id: string
  content: string
  user: {
    name: string
    id: string
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
  onMessage?: (message: ChatMessage) => void
}

const EVENT_MESSAGE_TYPE = 'message'

export function useRealtimeChat({ roomName, username, userId, onMessage }: UseRealtimeChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const onMessageRef = useRef(onMessage)
  useEffect(() => { onMessageRef.current = onMessage })

  useEffect(() => {
    const channel = supabase.channel(roomName)

    channel
      .on('broadcast', { event: EVENT_MESSAGE_TYPE }, ({ payload }) => {
        const incoming = payload as ChatMessage
        // ignora mensagens próprias (já adicionadas via optimistic update)
        if (incoming.user.id === userId) return
        setMessages(prev => {
          if (prev.some(m => m.id === incoming.id)) return prev
          return [...prev, incoming]
        })
        onMessageRef.current?.(incoming)
      })
      .subscribe(status => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomName, userId])

  const sendMessage = useCallback(
    async (content: string, extras?: Partial<ChatMessage>) => {
      if (!channelRef.current || !isConnected) return null

      const message: ChatMessage = {
        id: crypto.randomUUID(),
        content,
        user: { name: username, id: userId },
        createdAt: new Date().toISOString(),
        ...extras,
      }

      // optimistic update — aparece na tela imediatamente
      setMessages(prev => [...prev, message])

      await channelRef.current.send({
        type: 'broadcast',
        event: EVENT_MESSAGE_TYPE,
        payload: message,
      })

      return message
    },
    [isConnected, username, userId]
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
