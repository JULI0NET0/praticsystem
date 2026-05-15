'use client'

import type { ChatMessage } from '@/hooks/useRealtimeChat'

interface ChatMessageItemProps {
  message: ChatMessage
  isOwnMessage: boolean
  showHeader: boolean
  compact?: boolean
}

const formatTime = (ts: string) =>
  new Date(ts).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })

export function ChatMessageItem({ message, isOwnMessage, showHeader, compact = false }: ChatMessageItemProps) {
  const avatarSize = compact ? 26 : 32
  const fontSize = compact ? '0.82rem' : '0.88rem'
  const padding = compact ? '8px 12px' : '10px 14px'

  return (
    <div
      style={{
        display: 'flex',
        gap: compact ? '8px' : '10px',
        padding: '3px 0',
        flexDirection: isOwnMessage ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
      }}
    >
      {!isOwnMessage && (
        <div
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: '50%',
            flexShrink: 0,
            marginTop: '2px',
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: compact ? '0.6rem' : '0.7rem',
            fontWeight: 700,
          }}
        >
          {message.user.name.substring(0, 2).toUpperCase()}
        </div>
      )}

      <div style={{ maxWidth: '75%' }}>
        {showHeader && !isOwnMessage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)' }}>
              {message.user.name.split(' ')[0]}
            </span>
            <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
              {formatTime(message.createdAt)}
            </span>
          </div>
        )}

        <div
          style={{
            padding,
            borderRadius: isOwnMessage ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
            background: isOwnMessage ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
            color: isOwnMessage ? 'white' : 'var(--text-primary)',
            fontSize,
            lineHeight: 1.45,
            border: isOwnMessage ? 'none' : '1px solid var(--border)',
            wordBreak: 'break-word',
          }}
        >
          {message.content}
        </div>

        {isOwnMessage && (
          <span
            style={{
              fontSize: '0.55rem',
              color: 'var(--text-secondary)',
              display: 'block',
              textAlign: 'right',
              marginTop: '2px',
            }}
          >
            {formatTime(message.createdAt)}
          </span>
        )}
      </div>
    </div>
  )
}
