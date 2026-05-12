"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth, UserProfile } from '@/hooks/useAuth';

interface TimeSession {
  id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  session_type: string;
}

interface TimeTrackerContextType {
  currentSession: TimeSession | null;
  todayMinutes: number;
  todayHours: string;
  isTracking: boolean;
  clockIn: () => Promise<void>;
  clockOut: () => Promise<void>;
  fetchTodayMinutes: () => Promise<void>;
}

const TimeTrackerContext = createContext<TimeTrackerContextType | undefined>(undefined);

export function TimeTrackerProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const [currentSession, setCurrentSession] = useState<TimeSession | null>(null);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const sessionIdRef = useRef<string | null>(null);

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
    return `${year}-${month}-${day}T00:00:00-03:00`;
  }, []);

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
          const start = new Date(log.start_time).getTime();
          const now = Date.now();
          total += (now - start) / 60000;
        }
      });
      setTodayMinutes(Math.round(total));
    }
  }, [currentUser, getTodayStartSP]);

  const clockIn = async () => {
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
  };

  const clockOut = async () => {
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
  };

  useEffect(() => {
    if (!currentUser) {
      setIsTracking(false);
      setCurrentSession(null);
      setTodayMinutes(0);
      return;
    }
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

  useEffect(() => {
    if (!isTracking) return;
    const interval = setInterval(() => {
      fetchTodayMinutes();
    }, 60000);
    return () => clearInterval(interval);
  }, [isTracking, fetchTodayMinutes]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionIdRef.current) {
        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/time_logs?id=eq.${sessionIdRef.current}`;
        const body = JSON.stringify({ end_time: new Date().toISOString() });
        navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const todayHours = `${Math.floor(todayMinutes / 60)}h ${todayMinutes % 60}min`;

  return (
    <TimeTrackerContext.Provider value={{
      currentSession,
      todayMinutes,
      todayHours,
      isTracking,
      clockIn,
      clockOut,
      fetchTodayMinutes
    }}>
      {children}
    </TimeTrackerContext.Provider>
  );
}

export function useTimeTracker() {
  const context = useContext(TimeTrackerContext);
  if (context === undefined) {
    throw new Error('useTimeTracker must be used within a TimeTrackerProvider');
  }
  return context;
}
