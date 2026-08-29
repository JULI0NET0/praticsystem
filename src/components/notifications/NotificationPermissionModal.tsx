'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Sparkles, X, Check } from 'lucide-react'
import { playSound } from '@/utils/audio'

import { useAuth } from '@/hooks/useAuth'
import { useWebPush } from '@/hooks/useWebPush'
import { useStandaloneMode } from '@/hooks/useStandaloneMode'

const PROMPT_DISMISS_KEY = 'pratic_notif_prompt_dismissed_v1'
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

function useSafeAuth() {
  try {
    return useAuth()
  } catch {
    return { currentUser: null }
  }
}

export default function NotificationPermissionModal() {
  const { currentUser } = useSafeAuth()
  const { isSupported, subscribeToPush } = useWebPush(currentUser?.id)
  const { isIOS, isStandalone, isOldIOSStandalone, ready: standaloneReady } = useStandaloneMode()
  const [visible, setVisible] = useState(false)
  const [granted, setGranted] = useState(false)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return
    // Sem suporte real (falta PushManager, ou VAPID não configurada), não
    // faz sentido pedir a permissão nativa — ela seria concedida e a
    // inscrição falharia silenciosamente depois (ver useWebPush.ts).
    if (!isSupported) return
    // iOS fora do modo instalado (ou instalado numa versão antiga demais)
    // não tem PushManager de verdade — quem cobre esse caso é o
    // IOSInstallPrompt, não este modal.
    if (!standaloneReady) return
    if (isIOS && (!isStandalone || isOldIOSStandalone)) return

    // Só exibe se ainda estiver como 'default' (nem concedido, nem bloqueado)
    if (Notification.permission === 'default') {
      const lastDismissed = localStorage.getItem(PROMPT_DISMISS_KEY)
      if (lastDismissed && Date.now() - Number(lastDismissed) < SEVEN_DAYS_MS) {
        return
      }

      // Delay de 4 segundos após carregar a página para não sobrecarregar na entrada
      const timer = setTimeout(() => {
        setVisible(true)
      }, 4000)

      return () => clearTimeout(timer)
    }
  }, [isSupported, standaloneReady, isIOS, isStandalone, isOldIOSStandalone])

  const handleRequestPermission = async () => {
    if (typeof Notification === 'undefined') return

    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        setGranted(true)
        playSound('success')
        // Registra o dispositivo no Web Push em segundo plano
        if (currentUser?.id) {
          subscribeToPush(currentUser.id).catch(() => {})
        }
        setTimeout(() => {
          setVisible(false)
        }, 1500)
      } else if (permission === 'denied') {
        // Bloqueio explícito: não há como reabrir o prompt nativo via JS.
        // Mostra a instrução de reativação manual em vez de só fechar.
        setDenied(true)
      } else {
        setVisible(false)
      }
    } catch {
      setVisible(false)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem(PROMPT_DISMISS_KEY, Date.now().toString())
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <aside
          aria-label="Permissão de notificações"
          className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-[9999] max-w-[360px] w-[calc(100vw-32px)]"
        >
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="p-4 sm:p-5 rounded-2xl relative overflow-hidden"
            style={{
              background: 'var(--color-surface-raised, rgba(24, 24, 27, 0.94))',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.12))',
              boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
            }}
          >
            {/* Fechar rápido */}
            <button
              type="button"
              aria-label="Fechar convite"
              onClick={handleDismiss}
              className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={14} />
            </button>

            {granted ? (
              <div className="flex items-center gap-3 py-2 text-emerald-400">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Check size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Notificações ativadas!</h4>
                  <p className="text-xs text-zinc-400">Você receberá avisos em tempo real.</p>
                </div>
              </div>
            ) : denied ? (
              <div className="flex flex-col gap-2 py-1">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0 text-red-400">
                    <Bell size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Permissão bloqueada</h4>
                    <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                      Seu navegador bloqueou as notificações. Para ativar depois, abra as
                      configurações do site (ícone de cadeado/informações ao lado do endereço)
                      e permita &quot;Notificações&quot;.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="self-end py-1.5 px-3 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors"
                >
                  Entendi
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
                    <Bell size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                      Notificações do Sistema
                      <Sparkles size={13} className="text-amber-400" />
                    </h4>
                    <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                      Receba avisos instantâneos de mensagens, menções e novas demandas mesmo com a aba em segundo plano.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleRequestPermission}
                    className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-black bg-amber-400 hover:bg-amber-300 transition-all duration-150 shadow-sm active:scale-[0.98]"
                  >
                    Ativar Notificações
                  </button>
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="py-2 px-3 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors"
                  >
                    Agora não
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </aside>
      )}
    </AnimatePresence>
  )
}
