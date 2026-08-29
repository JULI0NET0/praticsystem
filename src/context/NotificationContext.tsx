'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { playSound, triggerHaptic } from '@/utils/audio'
import { useAppBadge } from '@/hooks/useAppBadge'

export type NotificationType = 'chat' | 'mention' | 'demand' | 'system' | 'success' | 'warning' | 'error'

export interface InAppNotification {
  id: string
  title: string
  message: string
  type: NotificationType
  avatarUrl?: string
  actionUrl?: string
  actionLabel?: string
  createdAt: number
  read?: boolean
  meta?: Record<string, any>
}

interface NotificationContextType {
  activeBanners: InAppNotification[]
  notifications: InAppNotification[]
  unreadCount: number
  pushNotification: (notif: Omit<InAppNotification, 'id' | 'createdAt'>) => void
  dismissBanner: (id: string) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

const DEFAULT_ICON = '/SIMBOLO-BRANCO.png'

function useSafeAuth() {
  try {
    return useAuth()
  } catch {
    return { currentUser: null, users: [] }
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { currentUser, users } = useSafeAuth()
  const [activeBanners, setActiveBanners] = useState<InAppNotification[]>([])
  const [notifications, setNotifications] = useState<InAppNotification[]>([])

  const unreadCount = notifications.filter(n => !n.read).length
  useAppBadge(unreadCount)

  const dismissBanner = useCallback((id: string) => {
    setActiveBanners(prev => prev.filter(b => b.id !== id))
  }, [])

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
    setActiveBanners([])
  }, [])

  const pushNotification = useCallback((notif: Omit<InAppNotification, 'id' | 'createdAt'>) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    const newNotification: InAppNotification = {
      ...notif,
      id,
      createdAt: Date.now(),
      read: false
    }

    // 1. Som e Vibração
    const soundType = notif.type === 'mention' ? 'mention' : notif.type === 'demand' ? 'info' : notif.type === 'chat' ? 'chat' : 'info'
    playSound(soundType as any)

    if (notif.type === 'mention') {
      triggerHaptic([60, 40, 60])
    } else {
      triggerHaptic([40])
    }

    // 2. Banner In-App Flutuante (máximo 2 simultâneos)
    setActiveBanners(prev => [newNotification, ...prev.slice(0, 1)])

    // 3. Histórico de Notificações
    setNotifications(prev => [newNotification, ...prev.slice(0, 49)])

    // 4. Notificação Nativa do SO se a aba estiver em segundo plano ou minimizada
    if (typeof window !== 'undefined' && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      if (document.hidden) {
        try {
          const osNotif = new Notification(notif.title, {
            body: notif.message,
            icon: notif.avatarUrl || DEFAULT_ICON,
            badge: DEFAULT_ICON,
            tag: `pratic-${notif.type}-${id}`,
            silent: true // Som já gerado pelo SoundManager
          })

          osNotif.onclick = () => {
            window.focus()
            if (notif.actionUrl) {
              router.push(notif.actionUrl)
            }
            osNotif.close()
          }
        } catch {
          // Silencioso em caso de restrição do navegador
        }
      }
    }

    // Dispara evento window global para compatibilidade com outros componentes legados
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('new-notification', { detail: newNotification }))
    }
  }, [router])

  // Escuta notificações e mensagens de chat em tempo real
  useEffect(() => {
    if (!currentUser?.id) return

    const channelId = `realtime:notifs_hub:${currentUser.id}:${Math.random().toString(36).substring(2, 7)}`
    const channel = supabase.channel(channelId)

    // 1. Escuta eventos na tabela notifications
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${currentUser.id}`
      },
      payload => {
        const row = payload.new as any
        if (row) {
          pushNotification({
            title: row.title || 'Nova Notificação',
            message: row.message || '',
            type: (row.type as NotificationType) || 'system',
            actionUrl: row.action_url || (row.type === 'demand' ? '/admin/demands' : '/admin/chat')
          })
        }
      }
    )

    // 2. Escuta novas mensagens na tabela chat_messages
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      },
      payload => {
        const row = payload.new as any
        if (!row || row.sender_id === currentUser.id) return

        const sender = users.find(u => u.id === row.sender_id)
        const senderName = sender?.username ? `@${sender.username}` : (sender?.name || 'Colega')
        const senderAvatar = sender?.avatar_url || sender?.avatarUrl

        const isMention = row.content && (
          row.content.includes(`@${currentUser.name}`) ||
          (currentUser.username && row.content.includes(`@${currentUser.username}`)) ||
          row.content.includes('@todos') ||
          row.content.includes('@canal')
        )

        // Se for Canal Geral
        if (row.channel === 'general') {
          // No canal geral, só exibe banner popup se for menção ou se for mensagem geral
          if (isMention) {
            pushNotification({
              title: `🏷️ ${senderName} mencionou você no Geral`,
              message: row.content || 'Nova menção.',
              type: 'mention',
              avatarUrl: senderAvatar,
              actionUrl: '/admin/chat',
              actionLabel: 'Abrir Chat'
            })
          }
        }
        // Se for Mensagem Direta (DM) para o usuário logado
        else if (row.channel === 'dm' && row.receiver_id === currentUser.id) {
          pushNotification({
            title: `💬 Mensagem de ${senderName}`,
            message: row.content || 'Enviou uma nova mensagem direta.',
            type: isMention ? 'mention' : 'chat',
            avatarUrl: senderAvatar,
            actionUrl: `/admin/chat?user=${row.sender_id}`,
            actionLabel: 'Responder'
          })
        }
      }
    )

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUser?.id, currentUser?.name, currentUser?.username, users, pushNotification])

  return (
    <NotificationContext.Provider
      value={{
        activeBanners,
        notifications,
        unreadCount,
        pushNotification,
        dismissBanner,
        markAsRead,
        markAllAsRead,
        clearAll
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

const fallbackContext: NotificationContextType = {
  activeBanners: [],
  notifications: [],
  unreadCount: 0,
  pushNotification: () => {},
  dismissBanner: () => {},
  markAsRead: () => {},
  markAllAsRead: () => {},
  clearAll: () => {}
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  return context || fallbackContext
}

