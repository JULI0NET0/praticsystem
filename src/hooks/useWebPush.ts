'use client'

import { useState, useEffect, useCallback } from 'react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function useWebPush(currentUserId?: string) {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  // 1. Registra o Service Worker no carregamento
  useEffect(() => {
    if (typeof window === 'undefined') return

    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    if (supported && !VAPID_PUBLIC_KEY) {
      console.error('[WebPush] NEXT_PUBLIC_VAPID_PUBLIC_KEY não configurada — Web Push desativado.')
    }
    setIsSupported(supported && !!VAPID_PUBLIC_KEY)

    if (supported) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // Verifica se já existe inscrição ativa
          return reg.pushManager.getSubscription()
        })
        .then((sub) => {
          setIsSubscribed(!!sub)
        })
        .catch((err) => {
          console.warn('[WebPush] Falha ao registrar Service Worker:', err)
        })
    }
  }, [])

  // 2. Função para Inscrever o Dispositivo
  const subscribeToPush = useCallback(
    async (userId?: string) => {
      const targetUserId = userId || currentUserId
      if (!isSupported || !targetUserId) return false

      setLoading(true)
      try {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          setLoading(false)
          return false
        }

        const registration = await navigator.serviceWorker.ready
        let subscription = await registration.pushManager.getSubscription()

        if (!subscription) {
          if (!VAPID_PUBLIC_KEY) {
            console.error('[WebPush] NEXT_PUBLIC_VAPID_PUBLIC_KEY não configurada — Web Push desativado.')
            setLoading(false)
            return false
          }
          const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey
          })
        }

        // Salva a inscrição no Supabase via API
        const subJson = subscription.toJSON()
        const res = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: targetUserId,
            subscription: {
              endpoint: subJson.endpoint,
              keys: subJson.keys
            },
            userAgent: navigator.userAgent
          })
        })

        if (res.ok) {
          setIsSubscribed(true)
          setLoading(false)
          return true
        }
      } catch (err) {
        console.error('[WebPush] Erro ao inscrever no Push:', err)
      }

      setLoading(false)
      return false
    },
    [isSupported, currentUserId]
  )

  // 3. Função para Cancelar Inscrição
  const unsubscribeFromPush = useCallback(async () => {
    if (!isSupported) return false

    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        })
        await subscription.unsubscribe()
        setIsSubscribed(false)
      }
      setLoading(false)
      return true
    } catch (err) {
      console.error('[WebPush] Erro ao cancelar Push:', err)
      setLoading(false)
      return false
    }
  }, [isSupported])

  return {
    isSupported,
    isSubscribed,
    loading,
    subscribeToPush,
    unsubscribeFromPush
  }
}
