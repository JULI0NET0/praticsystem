"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from './useAuth';

interface TimeSession {
  id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  session_type: string;
}

export function useTimeTracker(currentUser: UserProfile | null) {
  const [currentSession, setCurrentSession] = useState<TimeSession | null>(null);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Calcula início do dia em São Paulo
  const getTodayStartSP = useCallback(() => {
    const now = new Date();
    const spFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
    const parts = spFormatter.formatToParts(now);
    const year = parts.find(p => p.type === 'year')!.value;
    const month = parts.find(p => p.type === 'month')!.value;
    const day = parts.find(p => p.type === 'day')!.value;
    // Meia-noite em São Paulo = 03:00 UTC (ou 02:00 em horário de verão)
    return `${year}-${month}-${day}T00:00:00-03:00`;
  }, []);

  // Busca minutos totais do dia
  const fetchTodayMinutes = useCallback(async () => {
    if (!currentUser) return;

    const todayStart = getTodayStartSP();

    const { data } = await supabase
      .from('time_logs')
      .select('start_time, end_time, duration_minutes')
      .eq('user_id', currentUser.id)
      .gte('start_time', todayStart);

    if (data) {
      let total = 0;
      data.forEach(log => {
        if (log.duration_minutes) {
          total += Number(log.duration_minutes);
        } else if (log.start_time && !log.end_time) {
          // Sessão ativa — calcula tempo decorrido
          const start = new Date(log.start_time).getTime();
          const now = Date.now();
          total += (now - start) / 60000;
        }
      });
      setTodayMinutes(Math.round(total));
    }
  }, [currentUser, getTodayStartSP]);

  // Clock-in: inicia sessão
  const clockIn = useCallback(async () => {
    if (!currentUser || isTracking) return;

    const { data, error } = await supabase
      .from('time_logs')
      .insert([{
        user_id: currentUser.id,
        start_time: new Date().toISOString(),
        session_type: 'work'
      }])
      .select()
      .single();

    if (data && !error) {
      sessionIdRef.current = data.id;
      setCurrentSession(data);
      setIsTracking(true);
    }
  }, [currentUser, isTracking]);

  // Clock-out: encerra sessão
  const clockOut = useCallback(async () => {
    if (!sessionIdRef.current) return;

    const { error } = await supabase
      .from('time_logs')
      .update({ end_time: new Date().toISOString() })
      .eq('id', sessionIdRef.current);

    if (!error) {
      sessionIdRef.current = null;
      setCurrentSession(null);
      setIsTracking(false);
      await fetchTodayMinutes();
    }
  }, [fetchTodayMinutes]);

  // Verifica se já existe sessão ativa ao carregar
  useEffect(() => {
    if (!currentUser) return;
    if (!['admin', 'board', 'social_media', 'filmmaker'].includes(currentUser.role)) return;

    const checkExistingSession = async () => {
      const { data } = await supabase
        .from('time_logs')
        .select('*')
        .eq('user_id', currentUser.id)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        sessionIdRef.current = data[0].id;
        setCurrentSession(data[0]);
        setIsTracking(true);
      }
    };

    checkExistingSession();
    fetchTodayMinutes();
  }, [currentUser, fetchTodayMinutes]);

  // Ticker: atualiza minutos do dia a cada 60s
  useEffect(() => {
    if (!isTracking) return;

    tickRef.current = setInterval(() => {
      fetchTodayMinutes();
    }, 60000);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [isTracking, fetchTodayMinutes]);

  // Heartbeat: verifica saúde da sessão a cada 5min
  useEffect(() => {
    if (!isTracking || !sessionIdRef.current) return;

    heartbeatRef.current = setInterval(async () => {
      // Simples ping — poderia atualizar um campo last_seen
      console.log('[TimeTracker] Heartbeat — sessão ativa:', sessionIdRef.current);
    }, 300000); // 5 minutos

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [isTracking]);

  // beforeunload: tenta encerrar sessão ao fechar a aba
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionIdRef.current) {
        // Usa sendBeacon para garantir que o request é enviado
        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/time_logs?id=eq.${sessionIdRef.current}`;
        const body = JSON.stringify({ end_time: new Date().toISOString() });
        navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Formata horas para exibição
  const todayHours = `${Math.floor(todayMinutes / 60)}h ${todayMinutes % 60}min`;

  return {
    currentSession,
    todayMinutes,
    todayHours,
    isTracking,
    clockIn,
    clockOut,
    fetchTodayMinutes,
  };
}
