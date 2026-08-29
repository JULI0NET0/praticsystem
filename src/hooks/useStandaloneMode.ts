'use client'

import { useEffect, useState } from 'react'

export interface StandaloneModeInfo {
  /** iPhone, iPad, ou iPad que se disfarça de Mac (iPadOS 13+ com touch) */
  isIOS: boolean
  /** App já rodando instalado (Add to Home Screen / instalado via navegador) */
  isStandalone: boolean
  /**
   * Proxy para "iOS < 16.4" (versão mínima com suporte a Web Push em PWA
   * instalada) — não dá pra checar a versão do iOS de forma confiável só
   * pela UA, então usamos feature-detection: standalone no iOS mas sem
   * PushManager é sinal de versão antiga.
   */
  isOldIOSStandalone: boolean
  /** Ainda não terminou de detectar (evita flash de UI no primeiro render) */
  ready: boolean
}

function detectIOS() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const isClassicIOS = /iPhone|iPad|iPod/.test(ua)
  // iPadOS 13+ reporta UA de "Macintosh", mas tem touch — Mac de verdade não tem.
  const isIPadOS13Plus =
    /Macintosh/.test(ua) && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1
  return isClassicIOS || isIPadOS13Plus
}

function detectStandalone() {
  if (typeof window === 'undefined') return false
  const mediaStandalone = window.matchMedia?.('(display-mode: standalone)').matches
  // Propriedade legada específica do Safari iOS, não existe no lib.dom.d.ts padrão
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return Boolean(mediaStandalone || iosStandalone)
}

export function useStandaloneMode(): StandaloneModeInfo {
  const [info, setInfo] = useState<StandaloneModeInfo>({
    isIOS: false,
    isStandalone: false,
    isOldIOSStandalone: false,
    ready: false,
  })

  useEffect(() => {
    const isIOS = detectIOS()
    const isStandalone = detectStandalone()
    const isOldIOSStandalone = isIOS && isStandalone && typeof window !== 'undefined' && !('PushManager' in window)
    setInfo({ isIOS, isStandalone, isOldIOSStandalone, ready: true })
  }, [])

  return info
}
