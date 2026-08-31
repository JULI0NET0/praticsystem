'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Share, PlusSquare, X, Smartphone } from 'lucide-react'
import { useStandaloneMode } from '@/hooks/useStandaloneMode'

const DISMISS_KEY = 'pratic_ios_install_prompt_dismissed_v1'
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

/**
 * No iOS, Web Push só funciona com o app instalado (Add to Home Screen) em
 * standalone, a partir do iOS 16.4. Fora disso o Safari nem expõe
 * PushManager — pedir a permissão nativa não adianta nada. Este banner
 * substitui o pedido de push nesse caso, orientando a instalar primeiro.
 */
export default function IOSInstallPrompt() {
  const { isIOS, isStandalone, isOldIOSStandalone, ready } = useStandaloneMode()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!ready || !isIOS) return
    if (isStandalone && !isOldIOSStandalone) return

    const lastDismissed = localStorage.getItem(DISMISS_KEY)
    if (lastDismissed && Date.now() - Number(lastDismissed) < SEVEN_DAYS_MS) return

    const timer = setTimeout(() => setVisible(true), 4000)
    return () => clearTimeout(timer)
  }, [ready, isIOS, isStandalone, isOldIOSStandalone])

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString())
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <aside
          aria-label="Instalar o Pratic na tela de início"
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
            <button
              type="button"
              aria-label="Fechar"
              onClick={handleDismiss}
              className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={14} />
            </button>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0 text-blue-400">
                <Smartphone size={20} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Instale o Pratic</h4>
                {isOldIOSStandalone ? (
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    Notificações push exigem iOS 16.4 ou mais recente. Atualize o iOS nas
                    Configurações do seu iPhone/iPad para ativá-las.
                  </p>
                ) : (
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    No iPhone/iPad, as notificações só funcionam com o app instalado. Toque em{' '}
                    <Share size={12} className="inline -mt-0.5 mx-0.5" aria-hidden /> Compartilhar
                    e depois em <PlusSquare size={12} className="inline -mt-0.5 mx-0.5" aria-hidden />{' '}
                    &quot;Adicionar à Tela de Início&quot;.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end pt-3">
              <button
                type="button"
                onClick={handleDismiss}
                className="py-2 px-3 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors"
              >
                Entendi
              </button>
            </div>
          </motion.div>
        </aside>
      )}
    </AnimatePresence>
  )
}
