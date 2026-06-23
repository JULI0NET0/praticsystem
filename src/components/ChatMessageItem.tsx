'use client'

import type { ChatMessage } from '@/hooks/useRealtimeChat'

interface ChatMessageItemProps {
  message: ChatMessage
  isOwnMessage: boolean
  showHeader: boolean
  compact?: boolean
  sendError?: boolean
}

const formatTime = (ts: string) =>
  new Date(ts).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })

function renderContent(content: string, isOwnMessage: boolean) {
  const parts = content.split(/(@\S+)/g)
  return parts.map((part, i) =>
    /^@\S+/.test(part) ? (
      <span
        key={i}
        style={{
          fontWeight: 700,
          color: isOwnMessage ? 'white' : 'var(--accent)',
          background: isOwnMessage ? 'rgba(0,0,0,0.22)' : 'rgba(217, 72, 15, 0.15)',
          borderRadius: '4px',
          padding: '1px 5px',
          display: 'inline-block',
          lineHeight: 'inherit',
        }}
      >
        {part}
      </span>
    ) : part
  )
}

function Avatar({ name, avatarUrl, size, fontSize }: { name: string; avatarUrl?: string; size: number; fontSize: string }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        marginTop: '2px',
        background: 'var(--accent)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize,
        fontWeight: 700,
      }}
    >
      {avatarUrl ? (
        <img src={avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
      ) : (
        name.substring(0, 2).toUpperCase()
      )}
    </div>
  )
}

export function ChatMessageItem({ message, isOwnMessage, showHeader, compact = false, sendError = false }: ChatMessageItemProps) {
  const avatarSize = compact ? 26 : 32
  const fontSize = compact ? '0.82rem' : '0.88rem'
  const avatarFontSize = compact ? '0.6rem' : '0.7rem'
  const padding = compact ? '8px 12px' : '10px 14px'

  return (
    <div
      style={{
        display: 'flex',
        gap: compact ? '8px' : '10px',
        padding: showHeader ? '6px 0 1px' : '1px 0',
        flexDirection: isOwnMessage ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
      }}
    >
      {/* Avatar — mostra só na primeira mensagem do grupo; spacer nas demais para alinhar */}
      {!isOwnMessage && (
        showHeader
          ? <Avatar
              name={message.user.name}
              avatarUrl={message.user.avatar_url}
              size={avatarSize}
              fontSize={avatarFontSize}
            />
          : <div style={{ width: avatarSize, height: avatarSize, flexShrink: 0 }} />
      )}

      <div style={{ maxWidth: '75%' }}>
        {showHeader && !isOwnMessage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
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
          {renderContent(message.content, isOwnMessage)}
        </div>

        {isOwnMessage && (
          <div style={{ textAlign: 'right', marginTop: '2px' }}>
            <span style={{ fontSize: '0.55rem', color: 'var(--text-secondary)' }}>
              {formatTime(message.createdAt)}
            </span>
            {sendError && (
              <span style={{ fontSize: '0.6rem', color: '#EF4444', marginLeft: '6px', fontWeight: 600 }}>
                ⚠ Não salvo
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
