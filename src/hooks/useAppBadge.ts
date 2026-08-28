'use client'

import { useEffect, useRef } from 'react'

const BASE_TITLE = 'Agência Prátic - Sistema de Gestão'

export function useAppBadge(unreadCount: number) {
  const originalTitleRef = useRef(BASE_TITLE)

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (!originalTitleRef.current || originalTitleRef.current === BASE_TITLE) {
        const titleWithoutCount = document.title.replace(/^\(\d+\)\s*(💬|🔔)?\s*/, '')
        if (titleWithoutCount) {
          originalTitleRef.current = titleWithoutCount
        }
      }
    }
  }, [])

  useEffect(() => {
    // 1. Atualiza App Badge Nativo (PWA / macOS Dock / Windows Taskbar)
    if (typeof navigator !== 'undefined') {
      try {
        if ('setAppBadge' in navigator && typeof (navigator as any).setAppBadge === 'function') {
          if (unreadCount > 0) {
            (navigator as any).setAppBadge(unreadCount).catch(() => {})
          } else {
            (navigator as any).clearAppBadge?.().catch(() => {})
          }
        }
      } catch {
        // Ignora navegadores sem suporte
      }
    }

    // 2. Atualiza título da aba do navegador dinamicamente
    if (typeof document !== 'undefined') {
      const cleanTitle = originalTitleRef.current || BASE_TITLE
      if (unreadCount > 0) {
        document.title = `(${unreadCount}) 🔔 ${cleanTitle}`
      } else {
        document.title = cleanTitle
      }
    }
  }, [unreadCount])
}
