"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from './useAuth';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface PresenceUser {
  user_id: string;
  name: string;
  role: string;
  avatar_url?: string;
  emoji?: string;
  online_at: string;
}

export function usePresence(currentUser: UserProfile | null) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const syncPresence = useCallback((channel: RealtimeChannel) => {
    const state = channel.presenceState<PresenceUser>();
    const users: PresenceUser[] = [];

    Object.values(state).forEach((presences) => {
      if (Array.isArray(presences) && presences.length > 0) {
        users.push(presences[0]);
      }
    });

    setOnlineUsers(users);
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    // Apenas roles administrativas
    if (!['admin', 'board', 'social_media', 'filmmaker'].includes(currentUser.role)) return;

    const channel = supabase.channel('presence:team', {
      config: { presence: { key: currentUser.id } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        syncPresence(channel);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log(`[Presence] ${newPresences[0]?.name} entrou`);
        syncPresence(channel);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log(`[Presence] ${leftPresences[0]?.name} saiu`);
        syncPresence(channel);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
            avatar_url: currentUser.avatar_url || null,
            emoji: currentUser.emoji || null,
            online_at: new Date().toISOString(),
          });
          setIsConnected(true);
        }
      });

    channelRef.current = channel;

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [currentUser, syncPresence]);

  const isUserOnline = useCallback((userId: string) => {
    return onlineUsers.some(u => u.user_id === userId);
  }, [onlineUsers]);

  return { onlineUsers, isConnected, isUserOnline };
}
