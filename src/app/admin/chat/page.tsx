"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, Send, Hash, Search, Users, Phone, Video, MoreVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { usePresence } from "@/hooks/usePresence";
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

export default function ChatPage() {
  const { currentUser, users } = useAuth();
  const { onlineUsers, isUserOnline } = usePresence();

  const [activeChat, setActiveChat] = useState<'general' | string>('general');
  const [message, setMessage] = useState("");
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState<string | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingChannelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const teamUsers = users.filter(u => u.id !== currentUser?.id && ['admin', 'board', 'social_media', 'filmmaker'].includes(u.role));
  const filteredTeam = searchQuery ? teamUsers.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase())) : teamUsers;

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .order('timestamp', { ascending: true })
      .limit(500);
    if (data) setLocalMessages(data);
  }, []);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel('chat_page_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
        setLocalMessages(prev => [...prev, payload.new as ChatMessage]);
      })
      .subscribe();

    const typingChannel = supabase.channel('chat:typing:page');
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

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(typingChannel);
    };
  }, [currentUser?.id]);

  const filteredMessages = localMessages.filter(msg => {
    if (activeChat === 'general') return msg.channel === 'general' && !msg.receiver_id;
    return (msg.sender_id === currentUser?.id && msg.receiver_id === activeChat) || (msg.sender_id === activeChat && msg.receiver_id === currentUser?.id);
  });

  const activeMember = activeChat === 'general' ? null : users.find(u => u.id === activeChat);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [filteredMessages, activeChat]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !currentUser) return;

    const mentionRegex = /@(\S+)/g;
    const mentions = message.match(mentionRegex);

    await supabase.from('chat_messages').insert([{
      sender_id: currentUser.id,
      receiver_id: activeChat === 'general' ? null : activeChat,
      content: message,
      channel: activeChat === 'general' ? 'general' : 'dm',
      message_type: mentions ? 'mention' : 'text',
      timestamp: new Date().toISOString()
    }]);

    if (mentions) {
      for (const mention of mentions) {
        const username = mention.replace('@', '');
        const mentioned = users.find(u => u.name.toLowerCase().includes(username.toLowerCase()));
        if (mentioned && mentioned.id !== currentUser.id) {
          await supabase.from('notifications').insert([{
            user_id: mentioned.id,
            title: 'Menção no Chat',
            message: `${currentUser.name}: "${message.substring(0, 60)}"`,
            type: 'mention'
          }]);
        }
      }
    }

    setMessage("");
    setShowMentions(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
      payload: { user_id: currentUser?.id, name: currentUser?.name }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const insertMention = (userName: string) => {
    const lastAt = message.lastIndexOf('@');
    setMessage(message.substring(0, lastAt) + `@${userName} `);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Hoje';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const filteredMentionUsers = teamUsers.filter(u => u.name.toLowerCase().includes(mentionFilter.toLowerCase()));

  // Agrupar mensagens por dia
  const groupedMessages: { date: string; messages: ChatMessage[] }[] = [];
  filteredMessages.forEach(msg => {
    const dateKey = formatDate(msg.timestamp);
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === dateKey) {
      last.messages.push(msg);
    } else {
      groupedMessages.push({ date: dateKey, messages: [msg] });
    }
  });

  // Conta mensagens não lidas por DM
  const getUnreadCount = (userId: string) => {
    return localMessages.filter(m => m.sender_id === userId && m.receiver_id === currentUser?.id).length;
  };

  if (!currentUser || !['admin', 'board', 'social_media', 'filmmaker'].includes(currentUser.role)) {
    return <div style={{ padding: '60px', textAlign: 'center' }}><p style={{ color: 'var(--text-secondary)' }}>Acesso restrito.</p></div>;
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 80px)', margin: '-20px -32px', overflow: 'hidden' }}>
      {/* Sidebar de Canais */}
      <div style={{
        width: '280px', minWidth: '280px', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.01)'
      }}>
        <div style={{ padding: '24px 20px 16px' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MessageSquare size={22} color="var(--accent)" /> Chat
          </h2>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar membro..."
              style={{
                width: '100%', padding: '8px 12px 8px 34px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', outline: 'none', fontSize: '0.8rem'
              }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px' }}>
          {/* Canal Geral */}
          <p style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--text-secondary)', padding: '8px 8px 4px', letterSpacing: '0.05em', fontWeight: 700 }}>Canais</p>
          <button
            onClick={() => setActiveChat('general')}
            style={{
              width: '100%', padding: '12px', borderRadius: '12px', border: 'none',
              background: activeChat === 'general' ? 'rgba(217, 72, 15, 0.1)' : 'transparent',
              color: activeChat === 'general' ? 'var(--accent)' : 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
              marginBottom: '4px', fontSize: '0.9rem', fontWeight: 600
            }}
          >
            <Hash size={18} /> Canal Geral
            <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
              {onlineUsers.length} online
            </span>
          </button>

          {/* DMs */}
          <p style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--text-secondary)', padding: '16px 8px 4px', letterSpacing: '0.05em', fontWeight: 700 }}>
            Mensagens Diretas
          </p>

          {filteredTeam.map(user => {
            const online = isUserOnline(user.id);
            const isActive = activeChat === user.id;
            return (
              <button
                key={user.id}
                onClick={() => setActiveChat(user.id)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '12px', border: 'none',
                  background: isActive ? 'rgba(217, 72, 15, 0.1)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
                  marginBottom: '2px', transition: 'all 0.15s'
                }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'var(--accent)', fontSize: '0.8rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700
                  }}>
                    {user.avatar_url
                      ? <img src={user.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} alt="" />
                      : user.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{
                    position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px',
                    background: online ? '#22C55E' : '#6B7280', borderRadius: '50%',
                    border: '2px solid var(--bg-primary)'
                  }} />
                </div>
                <div style={{ flex: 1, textAlign: 'left', overflow: 'hidden' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block' }}>{user.name}</span>
                  <span style={{ fontSize: '0.65rem', color: online ? '#22C55E' : '#6B7280' }}>
                    {online ? 'Online' : 'Offline'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Área Principal de Chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header do Chat */}
        <div style={{
          padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {activeChat === 'general' ? (
              <>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(217,72,15,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Hash size={20} color="var(--accent)" />
                </div>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: '1.05rem' }}>Canal Geral</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{onlineUsers.length} membros online</span>
                </div>
              </>
            ) : activeMember && (
              <>
                <div style={{ position: 'relative' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>
                    {activeMember.avatar_url
                      ? <img src={activeMember.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} alt="" />
                      : activeMember.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px', background: isUserOnline(activeMember.id) ? '#22C55E' : '#6B7280', borderRadius: '50%', border: '2px solid var(--bg-primary)' }} />
                </div>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: '1.05rem' }}>{activeMember.name} {activeMember.emoji}</h3>
                  <span style={{ fontSize: '0.75rem', color: isUserOnline(activeMember.id) ? '#22C55E' : '#6B7280' }}>
                    {isUserOnline(activeMember.id) ? 'Online agora' : 'Offline'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mensagens */}
        <div ref={scrollRef} style={{ flex: 1, padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {filteredMessages.length === 0 && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', opacity: 0.4 }}>
              <MessageSquare size={40} />
              <p style={{ fontSize: '0.9rem' }}>Inicie uma conversa!</p>
            </div>
          )}

          {groupedMessages.map((group) => (
            <div key={group.date}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0 12px' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{group.date}</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              </div>

              {group.messages.map((msg) => {
                const isMe = msg.sender_id === currentUser?.id;
                const sender = users.find(u => u.id === msg.sender_id);
                return (
                  <div key={msg.id} style={{ display: 'flex', gap: '10px', padding: '4px 0', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                    {!isMe && (
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0, marginTop: '2px',
                        background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: '0.7rem', fontWeight: 700
                      }}>
                        {sender?.avatar_url
                          ? <img src={sender.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} alt="" />
                          : sender?.name?.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div style={{ maxWidth: '65%' }}>
                      {!isMe && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)' }}>{sender?.name}</span>
                          <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{formatTime(msg.timestamp)}</span>
                        </div>
                      )}
                      <div style={{
                        padding: '10px 14px',
                        borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: isMe ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                        color: isMe ? 'white' : 'var(--text-primary)',
                        fontSize: '0.88rem', lineHeight: 1.5,
                        border: isMe ? 'none' : '1px solid var(--border)'
                      }}>
                        {msg.content}
                      </div>
                      {isMe && (
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', display: 'block', textAlign: 'right', marginTop: '2px' }}>
                          {formatTime(msg.timestamp)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Typing */}
        {isTyping && (
          <div style={{ padding: '0 24px 8px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            <span style={{ display: 'inline-flex', gap: '3px', alignItems: 'center' }}>
              {isTyping} está digitando
              <span style={{ display: 'inline-flex', gap: '2px' }}>
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-secondary)', animation: 'pulse 1.4s infinite' }} />
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-secondary)', animation: 'pulse 1.4s infinite 0.2s' }} />
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-secondary)', animation: 'pulse 1.4s infinite 0.4s' }} />
              </span>
            </span>
          </div>
        )}

        {/* Input Area */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', position: 'relative' }}>
          <AnimatePresence>
            {showMentions && filteredMentionUsers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                style={{
                  position: 'absolute', bottom: '100%', left: '24px', right: '24px',
                  background: 'rgba(18,18,18,0.98)', border: '1px solid var(--border)',
                  borderRadius: '12px', padding: '8px', maxHeight: '160px', overflowY: 'auto',
                  boxShadow: '0 -10px 30px rgba(0,0,0,0.3)'
                }}
              >
                {filteredMentionUsers.map(u => (
                  <button
                    key={u.id} type="button"
                    onClick={() => insertMention(u.name)}
                    style={{
                      width: '100%', padding: '8px 12px', border: 'none', borderRadius: '8px',
                      background: 'transparent', color: 'var(--text-primary)', textAlign: 'left',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(217,72,15,0.1)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.65rem', fontWeight: 700 }}>
                      {u.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span style={{ fontWeight: 600 }}>{u.name}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>{u.role}</span>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Escreva sua mensagem... (@ para mencionar)"
              rows={1}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                borderRadius: '14px', padding: '12px 16px', color: 'white', outline: 'none',
                fontSize: '0.88rem', resize: 'none', lineHeight: 1.4, maxHeight: '120px',
                fontFamily: 'inherit'
              }}
            />
            <button type="submit" style={{
              width: '44px', height: '44px', borderRadius: '14px',
              background: message.trim() ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
              border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: message.trim() ? 'pointer' : 'default', transition: 'all 0.2s', flexShrink: 0
            }}>
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
