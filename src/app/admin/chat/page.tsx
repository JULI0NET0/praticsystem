"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { MessageSquare, Send, Hash, Search, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { usePresence } from "@/hooks/usePresence";
import { useRealtimeChat, type ChatMessage } from "@/hooks/useRealtimeChat";
import { useChatScroll } from "@/hooks/useChatScroll";
import { ChatMessageItem } from "@/components/ChatMessageItem";
import { supabase } from "@/lib/supabase";

export default function ChatPage() {
  const { currentUser, users } = useAuth();
  const { onlineUsers, isUserOnline } = usePresence();

  const [activeChat, setActiveChat] = useState<'general' | string>('general');
  const [message, setMessage] = useState("");
  const [dbMessages, setDbMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState<string | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingChannelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { containerRef, scrollToBottom } = useChatScroll();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const openChat = useCallback((id: string) => {
    setActiveChat(id);
    setMobileChatOpen(true);
  }, []);

  const teamUsers = useMemo(
    () => users.filter(u => u.id !== currentUser?.id && ['admin', 'board', 'social_media', 'filmmaker'].includes(u.role)),
    [users, currentUser?.id]
  );
  const filteredTeam = searchQuery
    ? teamUsers.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : teamUsers;

  const roomName = activeChat === 'general'
    ? 'chat:general'
    : `chat:dm:${[currentUser?.id, activeChat].sort().join(':')}`

  const { messages: realtimeMessages, sendMessage, isConnected } = useRealtimeChat({
    roomName,
    username: currentUser?.name ?? '',
    userId: currentUser?.id ?? '',
  });

  // Carregar histórico do banco ao trocar de conversa
  useEffect(() => {
    if (!currentUser) return;

    const fetchMessages = async () => {
      let query = supabase
        .from('chat_messages')
        .select('*')
        .order('timestamp', { ascending: true })
        .limit(500);

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

  // Mesclar banco + realtime sem duplicatas, ordenado
  const allMessages = useMemo(() => {
    const merged = [...dbMessages, ...realtimeMessages];
    const seen = new Set<string>();
    return merged
      .filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; })
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [dbMessages, realtimeMessages]);

  // Agrupar por dia
  const groupedMessages = useMemo(() => {
    const formatDate = (ts: string) => {
      const d = new Date(ts);
      const today = new Date();
      if (d.toDateString() === today.toDateString()) return 'Hoje';
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    };

    const groups: { date: string; messages: ChatMessage[] }[] = [];
    allMessages.forEach(msg => {
      const dateKey = formatDate(msg.createdAt);
      const last = groups[groups.length - 1];
      if (last && last.date === dateKey) last.messages.push(msg);
      else groups.push({ date: dateKey, messages: [msg] });
    });
    return groups;
  }, [allMessages]);

  useEffect(() => { scrollToBottom(); }, [allMessages, activeChat]);

  // Typing channel
  useEffect(() => {
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
    return () => { supabase.removeChannel(typingChannel); };
  }, [currentUser?.id]);

  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !currentUser || !isConnected) return;

    const content = message.trim();
    setMessage("");
    setShowMentions(false);

    const sent = await sendMessage(content);
    if (!sent) return;

    // Persistir no banco em background
    supabase.from('chat_messages').insert([{
      id: sent.id,
      sender_id: currentUser.id,
      receiver_id: activeChat === 'general' ? null : activeChat,
      content,
      channel: activeChat === 'general' ? 'general' : 'dm',
      message_type: content.includes('@') ? 'mention' : 'text',
      timestamp: sent.createdAt,
    }]).then(async () => {
      const mentions = content.match(/@(\S+)/g);
      if (mentions) {
        for (const mention of mentions) {
          const username = mention.replace('@', '');
          const mentioned = users.find(u =>
            u.username?.toLowerCase() === username.toLowerCase() ||
            u.name.toLowerCase().includes(username.toLowerCase())
          );
          if (mentioned && mentioned.id !== currentUser.id) {
            await supabase.from('notifications').insert([{
              user_id: mentioned.id,
              title: 'Menção no Chat',
              message: `${currentUser.name}: "${content.substring(0, 60)}"`,
              type: 'mention',
            }]);
          }
        }
      }
    }).catch(() => {
      setFailedIds(prev => new Set(prev).add(sent.id));
    });
  }, [message, currentUser, activeChat, isConnected, sendMessage, users]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
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

  if (!currentUser || !['admin', 'board', 'social_media', 'filmmaker'].includes(currentUser.role)) {
    return <div style={{ padding: '60px', textAlign: 'center' }}><p style={{ color: 'var(--text-secondary)' }}>Acesso restrito.</p></div>;
  }

  return (
    <div style={{
      display: 'flex',
      height: isMobile ? 'calc(100dvh - 56px - 70px)' : 'calc(100vh - 80px)',
      margin: isMobile ? '-16px -16px 0' : '-20px -32px',
      overflow: 'hidden',
    }}>
      {/* Sidebar — oculta no mobile quando chat está aberto */}
      <div style={{
        width: isMobile ? '100%' : '280px',
        minWidth: isMobile ? '100%' : '280px',
        borderRight: isMobile ? 'none' : '1px solid var(--border)',
        display: isMobile && mobileChatOpen ? 'none' : 'flex',
        flexDirection: 'column',
        background: 'rgba(255,255,255,0.01)',
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
              style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.8rem' }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px' }}>
          <p style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--text-secondary)', padding: '8px 8px 4px', letterSpacing: '0.05em', fontWeight: 700 }}>Canais</p>
          <button
            onClick={() => openChat('general')}
            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', background: activeChat === 'general' ? 'rgba(217, 72, 15, 0.1)' : 'transparent', color: activeChat === 'general' ? 'var(--accent)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '4px', fontSize: '0.9rem', fontWeight: 600 }}
          >
            <Hash size={18} /> Canal Geral
            <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{onlineUsers.length} online</span>
          </button>

          <p style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--text-secondary)', padding: '16px 8px 4px', letterSpacing: '0.05em', fontWeight: 700 }}>Mensagens Diretas</p>
          {filteredTeam.map(user => {
            const online = isUserOnline(user.id);
            const isActive = activeChat === user.id;
            return (
              <button
                key={user.id} onClick={() => openChat(user.id)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: 'none', background: isActive ? 'rgba(217, 72, 15, 0.1)' : 'transparent', color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '2px', transition: 'all 0.15s' }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>
                    {user.avatar_url
                      ? <img src={user.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} alt="" />
                      : user.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', background: online ? '#22C55E' : '#6B7280', borderRadius: '50%', border: '2px solid var(--bg-primary)' }} />
                </div>
                <div style={{ flex: 1, textAlign: 'left', overflow: 'hidden' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block' }}>{user.name}</span>
                  <span style={{ fontSize: '0.65rem', color: online ? '#22C55E' : '#6B7280' }}>{online ? 'Online' : 'Offline'}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Área Principal — oculta no mobile enquanto sidebar está visível */}
      <div style={{ flex: 1, display: isMobile && !mobileChatOpen ? 'none' : 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <div style={{ padding: isMobile ? '12px 16px' : '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '14px' }}>
            {isMobile && (
              <button
                onClick={() => setMobileChatOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', marginLeft: '-4px' }}
              >
                <ChevronLeft size={22} />
              </button>
            )}
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
          {!isConnected && (
            <span style={{ fontSize: '0.7rem', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />
              Reconectando...
            </span>
          )}
        </div>

        {/* Mensagens */}
        <div ref={containerRef} style={{ flex: 1, padding: isMobile ? '12px 16px' : '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {allMessages.length === 0 && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', opacity: 0.4 }}>
              <MessageSquare size={40} />
              <p style={{ fontSize: '0.9rem' }}>Inicie uma conversa!</p>
            </div>
          )}
          {groupedMessages.map(group => (
            <div key={group.date}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0 12px' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{group.date}</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              </div>
              {group.messages.map((msg, index) => {
                const prev = index > 0 ? group.messages[index - 1] : null;
                const showHeader = !prev || prev.user.id !== msg.user.id;
                return (
                  <ChatMessageItem
                    key={msg.id}
                    message={msg}
                    isOwnMessage={msg.user.id === currentUser?.id}
                    showHeader={showHeader}
                    sendError={failedIds.has(msg.id)}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Typing */}
        {isTyping && (
          <div style={{ padding: isMobile ? '0 16px 6px' : '0 24px 8px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            <span style={{ display: 'inline-flex', gap: '3px', alignItems: 'center' }}>
              {isTyping} está digitando
              <span style={{ display: 'inline-flex', gap: '2px' }}>
                {[0, 0.2, 0.4].map((delay, i) => (
                  <span key={i} style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-secondary)', animation: `pulse 1.4s infinite ${delay}s` }} />
                ))}
              </span>
            </span>
          </div>
        )}

        {/* Input */}
        <div style={{ padding: isMobile ? '10px 16px' : '16px 24px', borderTop: '1px solid var(--border)', position: 'relative' }}>
          <AnimatePresence>
            {showMentions && filteredMentionUsers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                style={{ position: 'absolute', bottom: '100%', left: isMobile ? '16px' : '24px', right: isMobile ? '16px' : '24px', background: 'rgba(18,18,18,0.98)', border: '1px solid var(--border)', borderRadius: '12px', padding: '8px', maxHeight: '160px', overflowY: 'auto', boxShadow: '0 -10px 30px rgba(0,0,0,0.3)' }}
              >
                {filteredMentionUsers.map(u => (
                  <button
                    key={u.id} type="button" onClick={() => insertMention(u.username || u.name.split(' ')[0])}
                    style={{ width: '100%', padding: '8px 12px', border: 'none', borderRadius: '8px', background: 'transparent', color: 'var(--text-primary)', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(217,72,15,0.1)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.65rem', fontWeight: 700 }}>
                      {u.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span style={{ fontWeight: 600 }}>{u.name}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                        @{u.username || u.name.split(' ')[0]}
                      </span>
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
              placeholder={isConnected ? "Escreva sua mensagem... (@ para mencionar)" : "Conectando..."}
              rows={1}
              disabled={!isConnected}
              style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '14px', padding: '12px 16px', color: 'white', outline: 'none', fontSize: '0.88rem', resize: 'none', lineHeight: 1.4, maxHeight: '120px', fontFamily: 'inherit', opacity: isConnected ? 1 : 0.5 }}
            />
            <button
              type="submit"
              disabled={!isConnected || !message.trim()}
              style={{ width: '44px', height: '44px', borderRadius: '14px', background: isConnected && message.trim() ? 'var(--accent)' : 'rgba(255,255,255,0.05)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isConnected && message.trim() ? 'pointer' : 'default', transition: 'all 0.2s', flexShrink: 0 }}
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
