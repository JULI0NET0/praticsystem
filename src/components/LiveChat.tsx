"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, X, Send, Minus, Maximize2, Users, Hash, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { usePresence } from "@/hooks/usePresence";
import { useTimeTracker } from "@/hooks/useTimeTracker";
import { supabase } from "@/lib/supabase";

interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  content: string;
  channel: string;
  message_type: string;
  timestamp: string;
}

export default function LiveChat() {
  const { currentUser, users } = useAuth();
  const { onlineUsers, isUserOnline } = usePresence(currentUser);
  const { isTracking, todayHours, clockIn, clockOut } = useTimeTracker(currentUser);

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeChat, setActiveChat] = useState<'general' | string>('general');
  const [message, setMessage] = useState("");
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState<string | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingChannelRef = useRef<any>(null);

  // Buscar mensagens
  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .order('timestamp', { ascending: true });
    if (data) setLocalMessages(data);
  }, []);

  // Setup realtime
  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel('public:chat_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
        setLocalMessages(prev => [...prev, payload.new as ChatMessage]);
      })
      .subscribe();

    // Canal de broadcast para typing indicator
    const typingChannel = supabase.channel('chat:typing');
    typingChannel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user_id !== currentUser?.id) {
          setIsTyping(payload.name);
          setTimeout(() => setIsTyping(null), 3000);
        }
      })
      .subscribe();
    typingChannelRef.current = typingChannel;

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(typingChannel);
    };
  }, [fetchMessages, currentUser?.id]);

  // Filtrar mensagens
  const filteredMessages = localMessages.filter(msg => {
    if (activeChat === 'general') return msg.channel === 'general' && !msg.receiver_id;
    return (
      (msg.sender_id === currentUser?.id && msg.receiver_id === activeChat) ||
      (msg.sender_id === activeChat && msg.receiver_id === currentUser?.id)
    );
  });

  const activeMember = activeChat === 'general' ? null : users.find(u => u.id === activeChat);

  // Scroll automático
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [filteredMessages, isOpen, isMinimized, activeChat]);

  // Enviar mensagem
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !currentUser) return;

    // Detectar menções para notificação
    const mentionRegex = /@(\w+)/g;
    const mentions = message.match(mentionRegex);

    await supabase.from('chat_messages').insert([{
      sender_id: currentUser.id,
      receiver_id: activeChat === 'general' ? null : activeChat,
      content: message,
      channel: activeChat === 'general' ? 'general' : 'dm',
      message_type: mentions ? 'mention' : 'text',
      timestamp: new Date().toISOString()
    }]);

    // Criar notificações para menções
    if (mentions) {
      for (const mention of mentions) {
        const username = mention.replace('@', '');
        const mentionedUser = users.find(u => u.name.toLowerCase().includes(username.toLowerCase()));
        if (mentionedUser) {
          await supabase.from('notifications').insert([{
            user_id: mentionedUser.id,
            title: 'Menção no Chat',
            message: `${currentUser.name} mencionou você: "${message.substring(0, 60)}..."`,
            type: 'mention'
          }]);
        }
      }
    }

    setMessage("");
    setShowMentions(false);
  };

  // Typing indicator broadcast
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMessage(val);

    // Detectar @ para menções
    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1 && lastAt === val.length - 1 || (lastAt !== -1 && !val.substring(lastAt).includes(' '))) {
      setShowMentions(true);
      setMentionFilter(val.substring(lastAt + 1));
    } else {
      setShowMentions(false);
    }

    // Broadcast typing
    typingChannelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: currentUser?.id, name: currentUser?.name }
    });
  };

  const insertMention = (userName: string) => {
    const lastAt = message.lastIndexOf('@');
    setMessage(message.substring(0, lastAt) + `@${userName} `);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  };

  const teamUsers = users.filter(u => u.id !== currentUser?.id && ['admin', 'board', 'social_media', 'filmmaker'].includes(u.role));
  const filteredMentionUsers = teamUsers.filter(u => u.name.toLowerCase().includes(mentionFilter.toLowerCase()));

  // Não renderizar para clientes
  if (!currentUser || !['admin', 'board', 'social_media', 'filmmaker'].includes(currentUser.role)) return null;

  return (
    <div style={{ position: 'fixed', bottom: '32px', right: '32px', zIndex: 10000 }}>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            style={{
              width: '64px', height: '64px', borderRadius: '24px',
              background: 'var(--accent)', color: 'white', border: 'none',
              boxShadow: '0 10px 30px rgba(217, 72, 15, 0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', position: 'relative'
            }}
          >
            <MessageSquare size={28} />
            {onlineUsers.length > 1 && (
              <div style={{
                position: 'absolute', top: '-4px', right: '-4px',
                width: '22px', height: '22px', borderRadius: '50%',
                background: '#22C55E', color: 'white', fontSize: '0.65rem',
                fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid var(--bg-primary)'
              }}>
                {onlineUsers.length}
              </div>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: 100, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.9 }}
            style={{
              width: '680px',
              height: isMinimized ? '70px' : '560px',
              background: 'rgba(15, 15, 15, 0.95)',
              backdropFilter: 'blur(30px)',
              borderRadius: '24px',
              border: '1px solid var(--border)',
              display: 'flex',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              overflow: 'hidden',
              transition: 'height 0.3s ease'
            }}
          >
            {/* Sidebar do Chat */}
            {!isMinimized && (
              <div style={{
                width: '240px', borderRight: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)'
              }}>
                {/* Time Tracker Mini */}
                <div style={{
                  padding: '16px', borderBottom: '1px solid var(--border)',
                  background: isTracking ? 'rgba(34, 197, 94, 0.05)' : 'transparent'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em', fontWeight: 600 }}>
                      <Clock size={10} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Hoje
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{todayHours}</span>
                  </div>
                  <button
                    onClick={isTracking ? clockOut : clockIn}
                    style={{
                      width: '100%', padding: '8px', borderRadius: '10px', border: 'none',
                      background: isTracking ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                      color: isTracking ? '#EF4444' : '#22C55E',
                      fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    {isTracking ? '⏹ Parar Registro' : '▶ Iniciar Registro'}
                  </button>
                </div>

                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                  <h4 style={{ fontWeight: 800, fontSize: '1rem' }}>Mensagens</h4>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                  {/* Canal Geral */}
                  <button
                    onClick={() => setActiveChat('general')}
                    style={{
                      width: '100%', padding: '12px', borderRadius: '12px', border: 'none',
                      background: activeChat === 'general' ? 'rgba(217, 72, 15, 0.15)' : 'transparent',
                      color: activeChat === 'general' ? 'var(--accent)' : 'var(--text-secondary)',
                      display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
                      transition: 'all 0.2s', marginBottom: '8px'
                    }}
                  >
                    <Hash size={18} /> <span style={{ fontWeight: 600 }}>Canal Geral</span>
                  </button>

                  <p style={{
                    fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)',
                    padding: '16px 8px 8px', letterSpacing: '0.05em', fontWeight: 600
                  }}>
                    Equipe ({onlineUsers.length} online)
                  </p>

                  {teamUsers.map(user => {
                    const online = isUserOnline(user.id);
                    return (
                      <button
                        key={user.id}
                        onClick={() => setActiveChat(user.id)}
                        style={{
                          width: '100%', padding: '10px', borderRadius: '12px', border: 'none',
                          background: activeChat === user.id ? 'rgba(217, 72, 15, 0.15)' : 'transparent',
                          color: activeChat === user.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                          display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
                          transition: 'all 0.2s', marginBottom: '4px', opacity: online ? 1 : 0.5
                        }}
                      >
                        <div style={{ position: 'relative' }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: 'var(--accent)', fontSize: '0.8rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                          }}>
                            {user.avatar_url
                              ? <img src={user.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                              : user.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div style={{
                            position: 'absolute', bottom: 0, right: 0,
                            width: '8px', height: '8px',
                            background: online ? '#22C55E' : '#6B7280',
                            borderRadius: '50%', border: '2px solid rgba(15,15,15,0.95)'
                          }} />
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <span style={{ fontWeight: 500, fontSize: '0.85rem', display: 'block' }}>{user.name}</span>
                          <span style={{ fontSize: '0.65rem', color: online ? '#22C55E' : '#6B7280' }}>
                            {online ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Área de Mensagens */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Header */}
              <div style={{
                padding: '16px 24px',
                background: 'rgba(217, 72, 15, 0.05)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {activeChat === 'general'
                    ? <Hash size={18} color="var(--accent)" />
                    : activeMember && (
                      <div style={{ position: 'relative' }}>
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem'
                        }}>
                          {activeMember.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div style={{
                          position: 'absolute', bottom: -1, right: -1, width: '8px', height: '8px',
                          background: isUserOnline(activeMember.id) ? '#22C55E' : '#6B7280',
                          borderRadius: '50%', border: '2px solid rgba(15,15,15,0.95)'
                        }} />
                      </div>
                    )}
                  <div>
                    <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      {activeChat === 'general' ? 'Canal Geral' : activeMember?.name}
                    </h4>
                    {activeChat !== 'general' && activeMember && (
                      <span style={{ fontSize: '0.7rem', color: isUserOnline(activeMember.id) ? '#22C55E' : '#6B7280' }}>
                        {isUserOnline(activeMember.id) ? 'Online agora' : 'Offline'}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setIsMinimized(!isMinimized)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    {isMinimized ? <Maximize2 size={16} /> : <Minus size={16} />}
                  </button>
                  <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <X size={16} />
                  </button>
                </div>
              </div>

              {!isMinimized && (
                <>
                  {/* Messages */}
                  <div ref={scrollRef} style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filteredMessages.length === 0 && (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px', opacity: 0.5 }}>
                        <MessageSquare size={32} />
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Nenhuma mensagem ainda</p>
                      </div>
                    )}
                    {filteredMessages.map((msg) => {
                      const isMe = msg.sender_id === currentUser?.id;
                      const sender = users.find(u => u.id === msg.sender_id);
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, scale: 0.9, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          style={{
                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                            maxWidth: '85%', display: 'flex', flexDirection: 'column',
                            alignItems: isMe ? 'flex-end' : 'flex-start'
                          }}
                        >
                          {!isMe && activeChat === 'general' && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--accent)', marginBottom: '4px', fontWeight: 600 }}>
                              {sender?.name}
                            </span>
                          )}
                          <div style={{
                            padding: '10px 14px',
                            borderRadius: isMe ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                            background: isMe ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                            color: isMe ? 'white' : 'var(--text-primary)',
                            fontSize: '0.85rem',
                            border: isMe ? 'none' : '1px solid var(--border)'
                          }}>
                            {msg.content}
                          </div>
                          <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {formatTime(msg.timestamp)}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Typing indicator */}
                  {isTyping && (
                    <div style={{ padding: '0 20px 8px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      {isTyping} está digitando...
                    </div>
                  )}

                  {/* Input */}
                  <form onSubmit={handleSendMessage} style={{ padding: '16px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px', position: 'relative' }}>
                    {/* Mentions dropdown */}
                    <AnimatePresence>
                      {showMentions && filteredMentionUsers.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          style={{
                            position: 'absolute', bottom: '100%', left: '16px', right: '70px',
                            background: 'rgba(20,20,20,0.98)', border: '1px solid var(--border)',
                            borderRadius: '12px', padding: '8px', maxHeight: '150px', overflowY: 'auto',
                            boxShadow: '0 -10px 30px rgba(0,0,0,0.4)'
                          }}
                        >
                          {filteredMentionUsers.map(u => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => insertMention(u.name)}
                              style={{
                                width: '100%', padding: '8px 12px', border: 'none', borderRadius: '8px',
                                background: 'transparent', color: 'var(--text-primary)', textAlign: 'left',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                                fontSize: '0.85rem'
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(217,72,15,0.1)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <div style={{
                                width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontSize: '0.65rem', fontWeight: 700
                              }}>
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
                      type="text"
                      value={message}
                      onChange={handleInputChange}
                      placeholder="Mensagem... (use @ para mencionar)"
                      style={{
                        flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                        borderRadius: '12px', padding: '10px 16px', color: 'white', outline: 'none'
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        width: '40px', height: '40px', padding: 0, borderRadius: '12px',
                        background: 'var(--accent)', border: 'none', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                      }}
                    >
                      <Send size={18} />
                    </button>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
