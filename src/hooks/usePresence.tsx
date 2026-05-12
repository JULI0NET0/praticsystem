"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/hooks/useAuth';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface PresenceUser {
  user_id: string;
  name: string;
  role: string;
  avatar_url?: string;
  emoji?: string;
  online_at: string;
}

interface PresenceContextType {
  onlineUsers: PresenceUser[];
  isConnected: boolean;
  isUserOnline: (userId: string) => boolean;
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

export function PresenceProvider({ children, currentUser }: { children: React.ReactNode, currentUser: UserProfile | null }) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const syncPresence = useCallback(() => {
    if (!channelRef.current) return;
    const state = channelRef.current.presenceState<PresenceUser>();
    const users: PresenceUser[] = [];

    Object.values(state).forEach((presences) => {
      if (Array.isArray(presences) && presences.length > 0) {
        users.push(presences[0]);
      }
    });

    setOnlineUsers(users);
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setIsConnected(false);
      setOnlineUsers([]);
      return;
    }
    
    if (!['admin', 'board', 'social_media', 'filmmaker'].includes(currentUser.role)) return;

    // Garante que não temos duplicidade de canal
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase.channel('presence:team', {
      config: { presence: { key: currentUser.id } }
    });

    const trackData = {
      user_id: currentUser.id,
      name: currentUser.name,
      role: currentUser.role,
      avatar_url: currentUser.avatar_url || null,
      emoji: currentUser.emoji || null,
      online_at: new Date().toISOString(),
    };

    channel
      .on('presence', { event: 'sync' }, () => syncPresence())
      .on('presence', { event: 'join' }, () => syncPresence())
      .on('presence', { event: 'leave' }, () => syncPresence())
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(trackData);
          setIsConnected(true);
        }
      });

    channelRef.current = channel;

    // Heartbeat
    const heartbeat = setInterval(async () => {
      if (channelRef.current) {
        try {
          await channelRef.current.track({
            ...trackData,
            online_at: new Date().toISOString(),
          });
        } catch (e) {}
      }
    }, 25000);

    const handleVisibilityChange = async () => {
      if (!channelRef.current) return;
      if (document.visibilityState === 'visible') {
        await channelRef.current.track({
          ...trackData,
          online_at: new Date().toISOString(),
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [currentUser?.id, syncPresence]);

  const isUserOnline = useCallback((userId: string) => {
    return onlineUsers.some(u => u.user_id === userId);
  }, [onlineUsers]);

  return (
    <PresenceContext.Provider value={{ onlineUsers, isConnected, isUserOnline }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  const context = useContext(PresenceContext);
  if (context === undefined) {
    throw new Error('usePresence must be used within a PresenceProvider');
  }
  return context;
}
