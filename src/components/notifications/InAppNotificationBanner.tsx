'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { X, MessageSquare, AtSign, CheckSquare, Bell, ArrowRight } from 'lucide-react'
import { useNotifications, InAppNotification } from '@/context/NotificationContext'

const AUTO_DISMISS_TIME = 5000 // 5 segundos

function SingleBanner({ banner }: { banner: InAppNotification }) {
  const router = useRouter()
  const { dismissBanner, markAsRead } = useNotifications()
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 100 - (elapsed / AUTO_DISMISS_TIME) * 100)
      setProgress(remaining)
      if (remaining <= 0) {
        clearInterval(interval)
        dismissBanner(banner.id)
      }
    }, 50)

    return () => clearInterval(interval)
  }, [banner.id, dismissBanner])

  const handleClick = () => {
    markAsRead(banner.id)
    dismissBanner(banner.id)
    if (banner.actionUrl) {
      router.push(banner.actionUrl)
    }
  }

  const getIcon = () => {
    switch (banner.type) {
      case 'mention':
        return <AtSign size={16} className="text-purple-400" />
      case 'demand':
        return <CheckSquare size={16} className="text-emerald-400" />
      case 'chat':
        return <MessageSquare size={16} className="text-blue-400" />
      default:
        return <Bell size={16} className="text-amber-400" />
    }
  }

  return (
    <motion.div
      layout
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.6, bottom: 0.1 }}
      onDragEnd={(_, info) => {
        if (info.offset.y < -25 || info.velocity.y < -200) {
          dismissBanner(banner.id)
        }
      }}
      initial={{ opacity: 0, y: -70, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.92, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      className="relative overflow-hidden rounded-2xl cursor-pointer select-none group"
      style={{
        background: 'var(--color-surface-raised, rgba(20, 20, 22, 0.88))',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.1))',
        boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.06)',
      }}
      onClick={handleClick}
    >
      <div className="flex items-center gap-3.5 p-3.5 sm:p-4">
        {/* Avatar ou Ícone com Badge */}
        <div className="relative shrink-0">
          {banner.avatarUrl ? (
            <img
              src={banner.avatarUrl}
              alt={banner.title}
              className="w-10 h-10 rounded-full object-cover border border-white/10"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center p-2 bg-black/40 border border-white/10"
            >
              <img
                src="/SIMBOLO-BRANCO.png"
                alt="Prátic"
                className="w-full h-full object-contain"
              />
            </div>
          )}
          <div
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
            style={{
              background: 'var(--color-surface-sunken, #121214)',
              border: '1.5px solid var(--color-surface-raised, #1c1c1f)'
            }}
          >
            {getIcon()}
          </div>
        </div>

        {/* Conteúdo Textual */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-2">
            <h4
              className="text-xs sm:text-sm font-semibold truncate text-white"
              style={{ letterSpacing: '-0.01em' }}
            >
              {banner.title}
            </h4>
            <span className="text-[10px] text-zinc-400 font-mono shrink-0">agora</span>
          </div>
          <p className="text-xs text-zinc-300 mt-0.5 line-clamp-2 leading-snug">
            {banner.message}
          </p>
        </div>

        {/* Ação e Botão Fechar */}
        <div className="flex items-center gap-1 shrink-0">
          {banner.actionUrl && (
            <div className="hidden sm:flex items-center text-[11px] font-medium text-amber-400 group-hover:translate-x-0.5 transition-transform">
              <ArrowRight size={14} />
            </div>
          )}
          <button
            type="button"
            aria-label="Dispensar notificação"
            onClick={(e) => {
              e.stopPropagation()
              dismissBanner(banner.id)
            }}
            className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Barra de Progresso Suave na Base */}
      <div className="h-[2px] w-full bg-white/5 overflow-hidden">
        <div
          className="h-full transition-all ease-linear"
          style={{
            width: `${progress}%`,
            background: banner.type === 'mention'
              ? 'linear-gradient(90deg, #a855f7, #ec4899)'
              : banner.type === 'demand'
              ? 'linear-gradient(90deg, #10b981, #3b82f6)'
              : 'linear-gradient(90deg, #f59e0b, #d97706)'
          }}
        />
      </div>
    </motion.div>
  )
}

export default function InAppNotificationBanner() {
  const { activeBanners } = useNotifications()

  return (
    <aside
      aria-label="Notificações em tempo real"
      style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 999999,
        width: '92%',
        maxWidth: '420px',
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}
    >
      <div style={{ pointerEvents: 'auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <AnimatePresence mode="sync">
          {activeBanners.map(banner => (
            <SingleBanner key={banner.id} banner={banner} />
          ))}
        </AnimatePresence>
      </div>
    </aside>
  )
}
