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

      if (error) throw error;

      if (data) {
        data.avatarUrl = data.avatar_url;
        data.statusMessage = data.status_message;
        setCurrentUser(data);
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
    if (currentUser && ['admin', 'board'].includes(currentUser.role)) {
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
