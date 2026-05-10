"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Minus, Maximize2, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

export default function LiveChat() {
  const { currentUser, users } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeChat, setActiveChat] = useState<'geral' | string>('geral');
  const [message, setMessage] = useState("");
  const [localMessages, setLocalMessages] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    
    // Configurar realtime
    const channel = supabase
      .channel('public:chat_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
        setLocalMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMessages = async () => {
    const { data } = await supabase.from('chat_messages').select('*').order('timestamp');
    if (data) setLocalMessages(data.map(m => ({...m, senderId: m.sender_id, receiverId: m.receiver_id})));
  };

  const filteredMessages = localMessages.filter(msg => {
    if (activeChat === 'geral') return !msg.receiverId;
    return (msg.senderId === currentUser?.id && msg.receiverId === activeChat) || 
           (msg.senderId === activeChat && msg.receiverId === currentUser?.id);
  });

  const activeMember = activeChat === 'geral' ? null : users.find(u => u.id === activeChat);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredMessages, isOpen, isMinimized, activeChat]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !currentUser) return;

    const { error } = await supabase.from('chat_messages').insert([{
      sender_id: currentUser.id,
      receiver_id: activeChat === 'geral' ? null : activeChat,
      content: message,
      timestamp: new Date().toISOString()
    }]);

    if (!error) setMessage("");
  };

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
              cursor: 'pointer'
            }}
          >
            <MessageSquare size={28} />
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
              width: '650px', // Aumentado para acomodar a sidebar
              height: isMinimized ? '70px' : '550px',
              background: 'rgba(15, 15, 15, 0.95)',
              backdropFilter: 'blur(30px)',
              borderRadius: '24px',
              border: '1px solid var(--border)',
              display: 'flex',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              overflow: 'hidden',
              transition: 'all 0.3s ease'
            }}
          >
            {/* Sidebar do Chat */}
            <div style={{ 
              width: '240px', 
              borderRight: '1px solid var(--border)', 
              display: 'flex', 
              flexDirection: 'column',
              background: 'rgba(255,255,255,0.02)'
            }}>
              <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border)' }}>
                <h4 style={{ fontWeight: 800, fontSize: '1rem' }}>Mensagens</h4>
              </div>
              
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                <button 
                  onClick={() => setActiveChat('geral')}
                  style={{ 
                    width: '100%', padding: '12px', borderRadius: '12px', border: 'none',
                    background: activeChat === 'geral' ? 'rgba(217, 72, 15, 0.15)' : 'transparent',
                    color: activeChat === 'geral' ? 'var(--accent)' : 'var(--text-secondary)',
                    display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
                    transition: 'all 0.2s', marginBottom: '8px'
                  }}
                >
                  <Users size={18} /> <span style={{ fontWeight: 600 }}>Canal Geral</span>
                </button>

                <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', padding: '16px 8px 8px', letterSpacing: '0.05em' }}>Membros Online</p>
                
                {users.filter(u => u.id !== currentUser?.id).map(user => (
                  <button 
                    key={user.id}
                    onClick={() => setActiveChat(user.id)}
                    style={{ 
                      width: '100%', padding: '10px', borderRadius: '12px', border: 'none',
                      background: activeChat === user.id ? 'rgba(217, 72, 15, 0.15)' : 'transparent',
                      color: activeChat === user.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                      display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
                      transition: 'all 0.2s', marginBottom: '4px'
                    }}
                  >
                    <div style={{ position: 'relative' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        {user.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div style={{ position: 'absolute', bottom: 0, right: 0, width: '8px', height: '8px', background: '#22C55E', borderRadius: '50%', border: '2px solid var(--bg-primary)' }} />
                    </div>
                    <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>{user.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Area de Mensagens */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Chat Header */}
              <div style={{ 
                padding: '16px 24px', 
                background: 'rgba(217, 72, 15, 0.05)', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                borderBottom: '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                    {activeChat === 'geral' ? 'Canal Geral' : activeMember?.name}
                  </h4>
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
                  <div 
                    ref={scrollRef}
                    style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}
                  >
                    {filteredMessages.map((msg) => {
                      const isMe = msg.senderId === currentUser?.id;
                      const sender = users.find(u => u.id === msg.senderId);
                      return (
                        <motion.div 
                          key={msg.id} 
                          initial={{ opacity: 0, scale: 0.9, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          style={{ 
                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                            maxWidth: '85%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isMe ? 'flex-end' : 'flex-start'
                          }}
                        >
                          {!isMe && activeChat === 'geral' && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--accent)', marginBottom: '4px', fontWeight: 600 }}>{sender?.name}</span>
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
                        </motion.div>
                      );
                    })}
                  </div>

                  <form 
                    onSubmit={handleSendMessage}
                    style={{ padding: '16px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px' }}
                  >
                    <input 
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Sua mensagem..."
                      style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px 16px', color: 'white', outline: 'none' }}
                    />
                    <button type="submit" className="btn btn-accent" style={{ width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
