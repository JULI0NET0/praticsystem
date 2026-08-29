'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/context/NotificationContext'
import { sendPushNotification } from '@/utils/webPushClient'

export interface ReminderSettings {
  onTime: boolean
  before15m: boolean
  morning8h: boolean
  evening17h: boolean
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  onTime: true,
  before15m: false,
  morning8h: true,
  evening17h: true
}

export const REMINDER_SETTINGS_KEY = 'pratic_reminder_settings_v1'

export function getStoredReminderSettings(): ReminderSettings {
  if (typeof window === 'undefined') return DEFAULT_REMINDER_SETTINGS
  try {
    const raw = localStorage.getItem(REMINDER_SETTINGS_KEY)
    if (raw) return { ...DEFAULT_REMINDER_SETTINGS, ...JSON.parse(raw) }
  } catch {}
  return DEFAULT_REMINDER_SETTINGS
}

export function saveReminderSettings(settings: ReminderSettings) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(REMINDER_SETTINGS_KEY, JSON.stringify(settings))
  } catch {}
}

function getTodayIso() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getCurrentTimeHHMM() {
  const d = new Date()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function getTimePlus15Minutes() {
  const d = new Date(Date.now() + 15 * 60 * 1000)
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function useSafeAuth() {
  try {
    return useAuth()
  } catch {
    return { currentUser: null }
  }
}

export function useDemandReminders() {
  const { currentUser } = useSafeAuth()
  const { pushNotification } = useNotifications()
  const lastCheckRef = useRef<string>('')

  useEffect(() => {
    if (!currentUser?.id) return

    const checkReminders = async () => {
      const today = getTodayIso()
      const nowHHMM = getCurrentTimeHHMM()
      const plus15HHMM = getTimePlus15Minutes()

      // Evita rodar mais de uma vez no mesmo minuto
      if (lastCheckRef.current === nowHHMM) return
      lastCheckRef.current = nowHHMM

      const settings = getStoredReminderSettings()

      try {
        // 1. Busca demandas de hoje atribuídas ao usuário ou a toda equipe
        const { data: demands, error } = await supabase
          .from('demands')
          .select('id, title, due_date, due_time, status, status_category, assignee_ids, assign_all_team')
          .eq('due_date', today)

        if (error || !demands) return

        const myDemands = demands.filter(d => {
          if (d.status === 'done' || d.status_category === 'concluido') return false
          if (d.assign_all_team) return true
          if (Array.isArray(d.assignee_ids) && d.assignee_ids.includes(currentUser.id)) return true
          return false
        })

        // A. Lembrete na Hora Real (Due Time exato)
        if (settings.onTime) {
          for (const d of myDemands) {
            if (!d.due_time) continue
            // Formato normalizado HH:MM
            const dTime = d.due_time.substring(0, 5)

            if (dTime === nowHHMM) {
              const alertKey = `reminder_ontime_${d.id}_${today}_${nowHHMM}`
              if (!sessionStorage.getItem(alertKey)) {
                sessionStorage.setItem(alertKey, '1')

                // Notificação In-App
                pushNotification({
                  title: `⏰ Prazo Agora: ${d.title}`,
                  message: `Sua tarefa agendada para as ${nowHHMM} atingiu o horário.`,
                  type: 'demand',
                  actionUrl: '/admin/demands',
                  actionLabel: 'Ver Demanda'
                })

                // Disparo de Push
                sendPushNotification({
                  userId: currentUser.id,
                  title: `⏰ Prazo Agora (${nowHHMM})`,
                  body: d.title,
                  url: '/admin/demands',
                  type: 'demand'
                }).catch(() => {})
              }
            }
          }
        }

        // B. Lembrete Antecipado (15 min antes)
        if (settings.before15m) {
          for (const d of myDemands) {
            if (!d.due_time) continue
            const dTime = d.due_time.substring(0, 5)

            if (dTime === plus15HHMM) {
              const alertKey = `reminder_15m_${d.id}_${today}_${dTime}`
              if (!sessionStorage.getItem(alertKey)) {
                sessionStorage.setItem(alertKey, '1')

                pushNotification({
                  title: `⏳ Vence em 15 min: ${d.title}`,
                  message: `Prazo às ${dTime}. Prepare a entrega!`,
                  type: 'demand',
                  actionUrl: '/admin/demands',
                  actionLabel: 'Abrir'
                })

                sendPushNotification({
                  userId: currentUser.id,
                  title: `⏳ Vence em 15 min (${dTime})`,
                  body: d.title,
                  url: '/admin/demands',
                  type: 'demand'
                }).catch(() => {})
              }
            }
          }
        }

        // C. Resumo Matinal das 08:00 (Local se o app estiver aberto)
        if (settings.morning8h && nowHHMM === '08:00') {
          const morningKey = `summary_morning_${today}`
          if (!localStorage.getItem(morningKey)) {
            localStorage.setItem(morningKey, '1')
            const count = myDemands.length
            if (count > 0) {
              pushNotification({
                title: `☀️ Bom dia, ${currentUser.name}!`,
                message: `Você tem ${count} tarefa${count > 1 ? 's' : ''} programada${count > 1 ? 's' : ''} para hoje.`,
                type: 'demand',
                actionUrl: '/admin/demands'
              })
            }
          }
        }

        // D. Resumo Vespertino das 17:00 (Local se o app estiver aberto)
        if (settings.evening17h && nowHHMM === '17:00') {
          const eveningKey = `summary_evening_${today}`
          if (!localStorage.getItem(eveningKey)) {
            localStorage.setItem(eveningKey, '1')
            const remaining = myDemands.length
            pushNotification({
              title: `📋 Fechamento do Dia (17h)`,
              message: remaining > 0
                ? `Você ainda tem ${remaining} tarefa${remaining > 1 ? 's' : ''} pendente${remaining > 1 ? 's' : ''} para hoje.`
                : `Parabéns! Todas as tarefas de hoje foram concluídas! 🎉`,
              type: 'demand',
              actionUrl: '/admin/demands'
            })
          }
        }
      } catch (err) {
        console.warn('[useDemandReminders] Erro ao checar lembretes:', err)
      }
    }

    // Checa a cada 20 segundos
    const timer = setInterval(checkReminders, 20000)
    checkReminders()

    return () => clearInterval(timer)
  }, [currentUser?.id, currentUser?.name, pushNotification])
}
