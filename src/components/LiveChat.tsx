"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { MessageSquare, X, Send, Hash, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { usePresence } from "@/hooks/usePresence";
import { useTimeTracker } from "@/hooks/useTimeTracker";
import { useRealtimeChat, type ChatMessage } from "@/hooks/useRealtimeChat";
import { useChatScroll } from "@/hooks/useChatScroll";
import { ChatMessageItem } from "@/components/ChatMessageItem";
import { supabase } from "@/lib/supabase";
import { usePathname } from "next/navigation";

export default function LiveChat() {
  const { currentUser, users } = useAuth();
  const { onlineUsers, isUserOnline } = usePresence();
  const { isTracking, todayHours, clockIn, clockOut } = useTimeTracker();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [activeChat, setActiveChat] = useState<'general' | string>('general');
  const [message, setMessage] = useState("");
  const [dbMessages, setDbMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState<string | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [showSidebar, setShowSidebar] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);
  const typingChannelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { containerRef, scrollToBottom } = useChatScroll();

  const teamUsers = useMemo(
    () => users.filter(u => u.id !== currentUser?.id && ['admin', 'board', 'social_media', 'filmmaker'].includes(u.role)),
    [users, currentUser?.id]
  );

  // Canal de broadcast por conversa ativa
  const roomName = activeChat === 'general' ? 'chat:general' : `chat:dm:${[currentUser?.id, activeChat].sort().join(':')}`

  const { messages: realtimeMessages, sendMessage, isConnected } = useRealtimeChat({
    roomName,
    username: currentUser?.name ?? '',
    userId: currentUser?.id ?? '',
    onMessage: (msg) => {
      if (!isOpen) setUnreadCount(prev => prev + 1);
      persistNotification(msg);
    },
  });

  const persistNotification = useCallback(async (msg: ChatMessage) => {
    if (!currentUser) return;
    const sender = users.find(u => u.id === msg.user.id);
    await supabase.from('notifications').insert([{
      user_id: currentUser.id,
      title: msg.user.id ? `Mensagem de ${sender?.name}` : 'Nova mensagem no Canal Geral',
      message: msg.content.substring(0, 80),
      type: 'mention',
    }]);
  }, [currentUser, users]);

  // Carregar mensagens do banco ao abrir ou trocar de conversa
  useEffect(() => {
    if (!currentUser) return;

    const fetchMessages = async () => {
      let query = supabase
        .from('chat_messages')
        .select('*')
        .order('timestamp', { ascending: true })
        .limit(200);

      if (activeChat === 'general') {
        query = query.eq('channel', 'general').is('receiver_id', null);
      } else {
        query = query.or(
          `and(sender_id.eq.${currentUser.id},receiver_id.eq.${activeChat}),and(sender_id.eq.${activeChat},receiver_id.eq.${currentUser.id})`
        );
      }

      const { data } = await query;
      if (data) {
        setDbMessages(data.map(m => ({
          id: m.id,
          content: m.content,
          user: { name: users.find(u => u.id === m.sender_id)?.name ?? 'Desconhecido', id: m.sender_id },
          createdAt: m.timestamp,
          ...m,
        })));
      }
    };

    fetchMessages();
  }, [activeChat, currentUser?.id, users]);

  // Mesclar mensagens do banco + realtime sem duplicatas
  const allMessages = useMemo(() => {
    const merged = [...dbMessages, ...realtimeMessages];
    const seen = new Set<string>();
    return merged
      .filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; })
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [dbMessages, realtimeMessages]);

  // Scroll ao receber mensagem
  useEffect(() => {
    scrollToBottom();
  }, [allMessages, isOpen, activeChat]);

  // Limpar unread ao abrir
  useEffect(() => {
    if (isOpen) setUnreadCount(0);
  }, [isOpen]);

  // Canal de typing
  useEffect(() => {
    const typingChannel = supabase.channel('chat:typing:widget');
    typingChannel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user_id !== currentUser?.id) {
          setIsTyping(payload.name);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setIsTyping(null), 2500);
        }
      })
      .subscribe();
    typingChannelRef.current = typingChannel;

    return () => { supabase.removeChannel(typingChannel); };
  }, [currentUser?.id]);

  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !currentUser || !isConnected) return;

    const content = message.trim();
    setMessage("");
    setShowMentions(false);

    // 1. Broadcast instantâneo via Supabase Realtime (já faz optimistic update internamente)
    const sent = await sendMessage(content);
    if (!sent) return;

    // 2. Persistir no banco em background
    supabase.from('chat_messages').insert([{
      id: sent.id,
      sender_id: currentUser.id,
      receiver_id: activeChat === 'general' ? null : activeChat,
      content,
      channel: activeChat === 'general' ? 'general' : 'dm',
      message_type: content.includes('@') ? 'mention' : 'text',
      timestamp: sent.createdAt,
    }]).then(async () => {
      // Notificações de @ menção
      const mentions = content.match(/@(\S+)/g);
      if (mentions) {
        for (const mention of mentions) {
          const username = mention.replace('@', '');
          const mentioned = users.find(u => u.name.toLowerCase().includes(username.toLowerCase()));
          if (mentioned && mentioned.id !== currentUser.id) {
            await supabase.from('notifications').insert([{
              user_id: mentioned.id,
              title: 'Menção no Chat',
              message: `${currentUser.name} mencionou você: "${content.substring(0, 60)}"`,
              type: 'mention',
            }]);
          }
        }
      }
    });
  }, [message, currentUser, activeChat, isConnected, sendMessage, users]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMessage(val);

    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1 && !val.substring(lastAt + 1).includes(' ')) {
      setShowMentions(true);
      setMentionFilter(val.substring(lastAt + 1));
    } else {
      setShowMentions(false);
    }

    typingChannelRef.current?.send({
      type: 'broadcast', event: 'typing',
      payload: { user_id: currentUser?.id, name: currentUser?.name },
    });
  };

  const insertMention = (userName: string) => {
    const lastAt = message.lastIndexOf('@');
    setMessage(message.substring(0, lastAt) + `@${userName} `);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const filteredMentionUsers = teamUsers.filter(u => u.name.toLowerCase().includes(mentionFilter.toLowerCase()));
  const activeMember = activeChat === 'general' ? null : users.find(u => u.id === activeChat);

  if (!currentUser || !['admin', 'board', 'social_media', 'filmmaker'].includes(currentUser.role)) return null;
  if (pathname === '/admin/chat') return null;

  return (
    <div className="hide-mobile" style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 10000 }}>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
            onClick={() => setIsOpen(true)}
            style={{
              width: '52px', height: '52px', borderRadius: '16px',
              background: 'linear-gradient(135deg, var(--accent), #e85d26)',
              color: 'white', border: 'none',
              boxShadow: '0 6px 20px rgba(217, 72, 15, 0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', position: 'relative',
            }}
          >
            <MessageSquare size={22} />
            {(unreadCount > 0 || onlineUsers.length > 1) && (
              <div style={{
                position: 'absolute', top: '-6px', right: '-6px',
                minWidth: '20px', height: '20px', borderRadius: '10px',
                background: unreadCount > 0 ? '#EF4444' : '#22C55E',
                color: 'white', fontSize: '0.6rem', fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 5px', border: '2px solid var(--bg-primary)',
              }}>
                {unreadCount > 0 ? unreadCount : onlineUsers.length}
              </div>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{
              width: 'min(640px, calc(100vw - 32px))',
              height: 'min(520px, calc(100vh - 100px))',
              background: 'rgba(12, 12, 12, 0.96)',
              backdropFilter: 'blur(30px)',
              borderRadius: '20px',
              border: '1px solid var(--border)',
              display: 'flex',
              boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
              overflow: 'hidden',
            }}
          >
            {/* Sidebar */}
            {showSidebar && (
              <div style={{
                width: '220px', minWidth: '220px', borderRight: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.015)',
              }}>
                <div style={{
                  padding: '12px', borderBottom: '1px solid var(--border)',
                  background: isTracking ? 'rgba(34, 197, 94, 0.04)' : 'transparent',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em', fontWeight: 600 }}>
                      <Clock size={9} style={{ marginRight: '3px', verticalAlign: 'middle' }} />Hoje
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{todayHours}</span>
                  </div>
                  <button
                    onClick={isTracking ? clockOut : clockIn}
                    style={{
                      width: '100%', padding: '6px', borderRadius: '8px', border: 'none',
                      background: isTracking ? 'rgba(239, 68, 68, 0.12)' : 'rgba(34, 197, 94, 0.12)',
                      color: isTracking ? '#EF4444' : '#22C55E',
                      fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    {isTracking ? '⏹ Parar' : '▶ Iniciar'}
                  </button>
                </div>

                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                  <h4 style={{ fontWeight: 800, fontSize: '0.9rem' }}>Mensagens</h4>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                  <button
                    onClick={() => setActiveChat('general')}
                    style={{
                      width: '100%', padding: '10px', borderRadius: '10px', border: 'none',
                      background: activeChat === 'general' ? 'rgba(217, 72, 15, 0.12)' : 'transparent',
                      color: activeChat === 'general' ? 'var(--accent)' : 'var(--text-secondary)',
                      display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                      marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600,
                    }}
                  >
                    <Hash size={16} /> Canal Geral
                  </button>

                  <p style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--text-secondary)', padding: '10px 8px 6px', letterSpacing: '0.05em', fontWeight: 600 }}>
                    Equipe ({onlineUsers.length})
                  </p>

                  {teamUsers.map(user => {
                    const online = isUserOnline(user.id);
                    return (
                      <button
                        key={user.id}
                        onClick={() => setActiveChat(user.id)}
                        style={{
                          width: '100%', padding: '8px', borderRadius: '10px', border: 'none',
                          background: activeChat === user.id ? 'rgba(217, 72, 15, 0.12)' : 'transparent',
                          color: activeChat === user.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                          display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                          marginBottom: '2px', opacity: online ? 1 : 0.5,
                        }}
                      >
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            background: 'var(--accent)', fontSize: '0.7rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700,
                          }}>
                            {user.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div style={{
                            position: 'absolute', bottom: -1, right: -1, width: '8px', height: '8px',
                            background: online ? '#22C55E' : '#6B7280', borderRadius: '50%',
                            border: '2px solid rgba(12,12,12,0.96)',
                          }} />
                        </div>
                        <span style={{ fontWeight: 500, fontSize: '0.8rem', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {user.name.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Área de Mensagens */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              {/* Header */}
              <div style={{
                padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: '1px solid var(--border)', background: 'rgba(217,72,15,0.03)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={() => setShowSidebar(!showSidebar)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: '4px' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                  </button>
                  {activeChat === 'general'
                    ? <Hash size={16} color="var(--accent)" />
                    : activeMember && (
                      <div style={{ position: 'relative' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.65rem', fontWeight: 700 }}>
                          {activeMember.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div style={{ position: 'absolute', bottom: -1, right: -1, width: '7px', height: '7px', background: isUserOnline(activeMember.id) ? '#22C55E' : '#6B7280', borderRadius: '50%', border: '2px solid rgba(12,12,12,0.96)' }} />
                      </div>
                    )}
                  <div>
                    <h4 style={{ fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.2 }}>
                      {activeChat === 'general' ? 'Canal Geral' : activeMember?.name}
                    </h4>
                    {activeChat !== 'general' && activeMember && (
                      <span style={{ fontSize: '0.65rem', color: isUserOnline(activeMember.id) ? '#22C55E' : '#6B7280' }}>
                        {isUserOnline(activeMember.id) ? 'Online' : 'Offline'}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                  <X size={16} />
                </button>
              </div>

              {/* Messages */}
              <div ref={containerRef} style={{ flex: 1, padding: '12px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                {allMessages.length === 0 && (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px', opacity: 0.4 }}>
                    <MessageSquare size={28} />
                    <p style={{ fontSize: '0.8rem' }}>Nenhuma mensagem</p>
                  </div>
                )}
                {allMessages.map((msg, index) => {
                  const prev = index > 0 ? allMessages[index - 1] : null;
                  const showHeader = !prev || prev.user.id !== msg.user.id;
                  return (
                    <ChatMessageItem
                      key={msg.id}
                      message={msg}
                      isOwnMessage={msg.user.id === currentUser?.id}
                      showHeader={showHeader}
                      compact
                    />
                  );
                })}
              </div>

              {/* Typing */}
              {isTyping && (
                <div style={{ padding: '0 16px 6px', fontSize: '0.7rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  {isTyping} está digitando...
                </div>
              )}

              {/* Input */}
              <form onSubmit={handleSendMessage} style={{ padding: '12px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', position: 'relative' }}>
                <AnimatePresence>
                  {showMentions && filteredMentionUsers.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                      style={{
                        position: 'absolute', bottom: '100%', left: '12px', right: '64px',
                        background: 'rgba(18,18,18,0.98)', border: '1px solid var(--border)',
                        borderRadius: '10px', padding: '6px', maxHeight: '130px', overflowY: 'auto',
                        boxShadow: '0 -8px 24px rgba(0,0,0,0.3)',
                      }}
                    >
                      {filteredMentionUsers.map(u => (
                        <button
                          key={u.id} type="button" onClick={() => insertMention(u.name)}
                          style={{
                            width: '100%', padding: '6px 10px', border: 'none', borderRadius: '6px',
                            background: 'transparent', color: 'var(--text-primary)', textAlign: 'left',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(217,72,15,0.1)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.55rem', fontWeight: 700 }}>
                            {u.name.substring(0, 2).toUpperCase()}
                          </div>
                          {u.name}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <input
                  ref={inputRef}
                  type="text" value={message} onChange={handleInputChange}
                  placeholder={isConnected ? "Mensagem... (@ para mencionar)" : "Conectando..."}
                  disabled={!isConnected}
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                    borderRadius: '10px', padding: '8px 14px', color: 'white', outline: 'none', fontSize: '0.82rem',
                    opacity: isConnected ? 1 : 0.5,
                  }}
                />
                <button
                  type="submit"
                  disabled={!isConnected || !message.trim()}
                  style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: isConnected && message.trim() ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                    border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: isConnected && message.trim() ? 'pointer' : 'default', flexShrink: 0,
                    transition: 'background 0.2s',
                  }}
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
