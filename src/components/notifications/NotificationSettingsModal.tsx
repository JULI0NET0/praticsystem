'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Clock, Sun, Moon, Check, X, Sparkles, Send } from 'lucide-react'
import {
  getStoredReminderSettings,
  saveReminderSettings,
  ReminderSettings,
  DEFAULT_REMINDER_SETTINGS
} from '@/hooks/useDemandReminders'
import { useNotifications } from '@/context/NotificationContext'
import { playSound } from '@/utils/audio'

import { useAuth } from '@/hooks/useAuth'
import { useWebPush } from '@/hooks/useWebPush'
import { sendPushNotification } from '@/utils/webPushClient'

interface NotificationSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

function useSafeAuth() {
  try {
    return useAuth()
  } catch {
    return { currentUser: null }
  }
}

export default function NotificationSettingsModal({ isOpen, onClose }: NotificationSettingsModalProps) {
  const { currentUser } = useSafeAuth()
  const { isSubscribed, subscribeToPush } = useWebPush(currentUser?.id)
  const { pushNotification } = useNotifications()
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_REMINDER_SETTINGS)
  const [saved, setSaved] = useState(false)
  const [pushStatus, setPushStatus] = useState<string>('default')

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof Notification !== 'undefined') {
      setPushStatus(Notification.permission)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setSettings(getStoredReminderSettings())
      setSaved(false)
    }
  }, [isOpen])

  const handleToggle = (key: keyof ReminderSettings) => {
    const updated = { ...settings, [key]: !settings[key] }
    setSettings(updated)
    saveReminderSettings(updated)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleEnablePush = async () => {
    if (currentUser?.id) {
      const success = await subscribeToPush(currentUser.id)
      if (typeof Notification !== 'undefined') {
        setPushStatus(Notification.permission)
      }
      if (success) {
        playSound('success')
        pushNotification({
          title: '🔔 Notificações Ativadas!',
          message: 'Seu dispositivo agora receberá alertas e Web Push mesmo com o app fechado.',
          type: 'system'
        })
      }
    }
  }

  const handleTestNotification = async () => {
    playSound('success')

    // 1. Notificação In-App
    pushNotification({
      title: '⏰ Teste de Lembrete',
      message: 'Seus lembretes de tarefas e prazos estão funcionando perfeitamente!',
      type: 'demand',
      actionUrl: '/admin/demands'
    })

    // 2. Disparo de Web Push real
    if (currentUser?.id && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      await sendPushNotification({
        userId: currentUser.id,
        title: '🚀 Teste Web Push Prátic',
        body: 'Notificação do sistema operacional funcionando!',
        url: '/admin/demands',
        type: 'demand'
      }).catch(() => {})
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(8px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-6"
            style={{
              background: 'var(--color-surface-raised, #18181b)',
              border: '1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.1))',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Bell size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    Preferências de Lembretes
                    <Sparkles size={14} className="text-amber-400" />
                  </h3>
                  <p className="text-xs text-zinc-400">Personalize como e quando ser notificado</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Fechar"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Status do Web Push */}
            {pushStatus !== 'granted' ? (
              <div className="mt-3.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2">
                <div className="text-xs text-amber-200 leading-snug">
                  <span className="font-bold">Push não ativado:</span> Ative para receber no celular/PC com o app fechado.
                </div>
                <button
                  type="button"
                  onClick={handleEnablePush}
                  className="shrink-0 py-1.5 px-3 rounded-lg text-xs font-bold text-black bg-amber-400 hover:bg-amber-300 transition-colors shadow-sm"
                >
                  Ativar
                </button>
              </div>
            ) : (
              <div className="mt-3.5 py-1.5 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <Check size={14} />
                <span>Notificações Push ativas neste dispositivo</span>
              </div>
            )}

            {/* Lista de Opções */}
            <div className="py-4 flex flex-col gap-3.5">
              {/* 1. Na Hora Real */}
              <div
                onClick={() => handleToggle('onTime')}
                className="flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all duration-150 select-none hover:bg-white/5"
                style={{
                  background: settings.onTime ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
                  border: settings.onTime ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid var(--border, rgba(255,255,255,0.06))'
                }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${settings.onTime ? 'text-amber-400 bg-amber-400/20' : 'text-zinc-400 bg-white/5'}`}>
                    <Clock size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-white">Lembrar na hora exata</h4>
                    <p className="text-[11px] text-zinc-400">Notifica no minuto exato do prazo da tarefa</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${settings.onTime ? 'bg-amber-400 border-amber-400 text-black' : 'border-zinc-600 bg-transparent'}`}>
                  {settings.onTime && <Check size={14} strokeWidth={3} />}
                </div>
              </div>

              {/* 2. 15 minutos antes */}
              <div
                onClick={() => handleToggle('before15m')}
                className="flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all duration-150 select-none hover:bg-white/5"
                style={{
                  background: settings.before15m ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                  border: settings.before15m ? '1px solid rgba(59, 130, 246, 0.25)' : '1px solid var(--border, rgba(255,255,255,0.06))'
                }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${settings.before15m ? 'text-blue-400 bg-blue-400/20' : 'text-zinc-400 bg-white/5'}`}>
                    <Clock size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-white">Lembrar 15 min antes</h4>
                    <p className="text-[11px] text-zinc-400">Aviso prévio para preparar a entrega</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${settings.before15m ? 'bg-blue-500 border-blue-500 text-white' : 'border-zinc-600 bg-transparent'}`}>
                  {settings.before15m && <Check size={14} strokeWidth={3} />}
                </div>
              </div>

              {/* 3. Resumo Matinal 08:00 */}
              <div
                onClick={() => handleToggle('morning8h')}
                className="flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all duration-150 select-none hover:bg-white/5"
                style={{
                  background: settings.morning8h ? 'rgba(234, 179, 8, 0.08)' : 'transparent',
                  border: settings.morning8h ? '1px solid rgba(234, 179, 8, 0.25)' : '1px solid var(--border, rgba(255,255,255,0.06))'
                }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${settings.morning8h ? 'text-yellow-400 bg-yellow-400/20' : 'text-zinc-400 bg-white/5'}`}>
                    <Sun size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-white">Resumo Matinal (08:00)</h4>
                    <p className="text-[11px] text-zinc-400">Visão geral das demandas programadas para o dia</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${settings.morning8h ? 'bg-yellow-500 border-yellow-500 text-black' : 'border-zinc-600 bg-transparent'}`}>
                  {settings.morning8h && <Check size={14} strokeWidth={3} />}
                </div>
              </div>

              {/* 4. Resumo Vespertino 17:00 */}
              <div
                onClick={() => handleToggle('evening17h')}
                className="flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all duration-150 select-none hover:bg-white/5"
                style={{
                  background: settings.evening17h ? 'rgba(168, 85, 247, 0.08)' : 'transparent',
                  border: settings.evening17h ? '1px solid rgba(168, 85, 247, 0.25)' : '1px solid var(--border, rgba(255,255,255,0.06))'
                }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${settings.evening17h ? 'text-purple-400 bg-purple-400/20' : 'text-zinc-400 bg-white/5'}`}>
                    <Moon size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-white">Fechamento do Dia (17:00)</h4>
                    <p className="text-[11px] text-zinc-400">Balanço das tarefas feitas e pendências restantes</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${settings.evening17h ? 'bg-purple-500 border-purple-500 text-white' : 'border-zinc-600 bg-transparent'}`}>
                  {settings.evening17h && <Check size={14} strokeWidth={3} />}
                </div>
              </div>
            </div>

            {/* Rodapé e Teste */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleTestNotification}
                className="flex items-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
              >
                <Send size={13} />
                Testar Alerta
              </button>

              <button
                type="button"
                onClick={onClose}
                className="py-2 px-4 rounded-xl text-xs font-bold text-black bg-amber-400 hover:bg-amber-300 transition-colors shadow-sm"
              >
                {saved ? 'Salvo!' : 'Concluir'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
