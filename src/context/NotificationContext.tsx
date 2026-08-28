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

  // Escuta broadcast de chat e menções em tempo real
  useEffect(() => {
    if (!currentUser?.id) return

    // Escuta eventos na tabela notifications do Supabase
    const dbChannel = supabase
      .channel(`realtime:notifications:${currentUser.id}`)
      .on(
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
      .subscribe()

    // Escuta broadcast de chat geral e direto
    const chatChannel = supabase.channel('chat:general')
      .on('broadcast', { event: 'message' }, ({ payload }: { payload: any }) => {
        if (!payload || !payload.user || payload.user.id === currentUser.id) return

        const isMention = payload.content && (
          payload.content.includes(`@${currentUser.name}`) ||
          payload.content.includes(`@${currentUser.username}`) ||
          payload.content.includes('@todos') ||
          payload.content.includes('@canal')
        )

        const senderAvatar = payload.user.avatarUrl || payload.user.avatar_url

        pushNotification({
          title: isMention ? `🏷️ ${payload.user.name} mencionou você` : `💬 ${payload.user.name}`,
          message: payload.content || 'Enviou uma nova mensagem.',
          type: isMention ? 'mention' : 'chat',
          avatarUrl: senderAvatar,
          actionUrl: '/admin/chat',
          actionLabel: 'Abrir Chat'
        })
      })
      .subscribe()

    // Escuta canais de DM para todos os outros usuários
    const dmChannels: ReturnType<typeof supabase.channel>[] = []
    if (users && users.length > 0) {
      for (const other of users) {
        if (other.id === currentUser.id) continue
        const dmRoom = `chat:dm:${[currentUser.id, other.id].sort().join(':')}`
        const dmCh = supabase.channel(dmRoom)
          .on('broadcast', { event: 'message' }, ({ payload }: { payload: any }) => {
            if (!payload || !payload.user || payload.user.id === currentUser.id) return
            const senderAvatar = payload.user.avatarUrl || payload.user.avatar_url
            pushNotification({
              title: `💬 Mensagem de ${payload.user.name}`,
              message: payload.content || 'Enviou uma nova mensagem direta.',
              type: 'chat',
              avatarUrl: senderAvatar,
              actionUrl: `/admin/chat?user=${payload.user.id}`,
              actionLabel: 'Responder'
            })
          })
          .subscribe()
        dmChannels.push(dmCh)
      }
    }

    return () => {
      supabase.removeChannel(dbChannel)
      supabase.removeChannel(chatChannel)
      dmChannels.forEach(c => supabase.removeChannel(c))
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

