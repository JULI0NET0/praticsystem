"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User as AuthUser } from '@supabase/supabase-js';

// Estendendo o tipo User baseado no que a aplicação espera
export interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  avatar_url?: string;
  status_message?: string;
  // Campos mapeados para a UI antiga
  avatarUrl?: string; 
  statusMessage?: string;
  phone?: string;
  workspace_settings?: {
    layout?: any[];
    greeting?: string;
    status?: string;
  };
}

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Busca a sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // Escuta mudanças de auth (login, logout, etc)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (user: AuthUser) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      // Mapeia para suportar o código legado do frontend
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
  };

  // Carrega todos os usuários para o switcher (Apenas para admins, na vida real teríamos RLS limitando)
  useEffect(() => {
    if (currentUser && ['admin', 'board'].includes(currentUser.role)) {
      supabase.from('users').select('*').then(({ data }) => {
        if (data) {
          const mappedUsers = data.map(u => ({ ...u, avatarUrl: u.avatar_url, statusMessage: u.status_message }));
          setUsers(mappedUsers);
        }
      });
    }
  }, [currentUser]);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return { currentUser, logout, users, loading };
}
