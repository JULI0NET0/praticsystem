"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User as AuthUser } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  avatar_url?: string;
  status_message?: string;
  emoji?: string;
  avatarUrl?: string;
  statusMessage?: string;
  phone?: string;
  workspace_settings?: {
    layout?: any[];
    greeting?: string;
    status?: string;
    pomodoro_points?: number;
    pomodoro_sessions_today?: number;
    pomodoro_last_date?: string;
  };
}

interface AuthContextType {
  currentUser: UserProfile | null;
  users: UserProfile[];
  loading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async (user: AuthUser) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        data.avatarUrl = data.avatar_url;
        data.statusMessage = data.status_message;
        setCurrentUser(data);
        return;
      }

      // Se deu erro ou não achou em users, tenta buscar em clients
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!clientError && clientData) {
        const clientProfile = {
          id: clientData.id,
          name: clientData.name,
          username: clientData.contact_name || clientData.name,
          email: clientData.portal_email || clientData.email,
          role: 'client',
          avatarUrl: '',
          statusMessage: ''
        };
        setCurrentUser(clientProfile as any);
      } else {
        console.error("Usuário não encontrado em users nem em clients.");
      }
    } catch (error) {
      console.error("Erro ao buscar perfil do usuário:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllUsers = useCallback(async () => {
    const { data } = await supabase.from('users').select('*');
    if (data) {
      const mappedUsers = data.map(u => ({ ...u, avatarUrl: u.avatar_url, statusMessage: u.status_message }));
      setUsers(mappedUsers);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfile]);

  useEffect(() => {
    if (currentUser && ['admin', 'board', 'social_media', 'filmmaker'].includes(currentUser.role)) {
      fetchAllUsers();
    }
  }, [currentUser, fetchAllUsers]);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) await fetchUserProfile(session.user);
  };

  return (
    <AuthContext.Provider value={{ currentUser, users, loading, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Para retrocompatibilidade durante a transição, podemos retornar o hook antigo ou lançar erro
    // Mas o objetivo é centralizar. 
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
