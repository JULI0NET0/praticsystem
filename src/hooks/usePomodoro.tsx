"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/CustomToast';

export const WORK_MS  = 25 * 60 * 1000;
export const BREAK_MS =  5 * 60 * 1000;

const STORAGE_KEY = 'pratic-pomodoro';

interface StoredState {
  mode: 'work' | 'break';
  isRunning: boolean;
  phaseEndTime: number | null;
  pausedTimeLeft: number | null;
  totalPoints: number;
  sessionsToday: number;
  lastDate: string;
}

export interface PomodoroContextType {
  mode: 'work' | 'break';
  isRunning: boolean;
  phaseEndTime: number | null;
  pausedTimeLeft: number | null;
  totalPoints: number;
  sessionsToday: number;
  justCompleted: boolean;
  /** Returns current ms remaining — call inside a render tick loop for display */
  timeLeftMs: () => number;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  switchMode: (m: 'work' | 'break') => void;
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

function readStorage(): Partial<StoredState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStorage(patch: Partial<StoredState>) {
  try {
    const current = readStorage();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...patch }));
  } catch {}
}

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const today = new Date().toISOString().split('T')[0];

  const [mode, setMode]                   = useState<'work' | 'break'>(() => (readStorage().mode ?? 'work'));
  const [isRunning, setIsRunning]         = useState(() => readStorage().isRunning ?? false);
  const [phaseEndTime, setPhaseEndTime]   = useState<number | null>(() => readStorage().phaseEndTime ?? null);
  const [pausedTimeLeft, setPausedTimeLeft] = useState<number | null>(() => readStorage().pausedTimeLeft ?? null);
  const [totalPoints, setTotalPoints]     = useState(() => readStorage().totalPoints ?? 0);
  const [sessionsToday, setSessionsToday] = useState(() => {
    const s = readStorage();
    return s.lastDate === today ? (s.sessionsToday ?? 0) : 0;
  });
  const [justCompleted, setJustCompleted] = useState(false);

  // Refs so the background ticker always reads latest values without restarting
  const modeRef          = useRef(mode);
  const phaseEndTimeRef  = useRef(phaseEndTime);
  const totalPointsRef   = useRef(totalPoints);
  const sessionsRef      = useRef(sessionsToday);
  const isRunningRef     = useRef(isRunning);

  useEffect(() => { modeRef.current = mode; },               [mode]);
  useEffect(() => { phaseEndTimeRef.current = phaseEndTime; }, [phaseEndTime]);
  useEffect(() => { totalPointsRef.current = totalPoints; },  [totalPoints]);
  useEffect(() => { sessionsRef.current = sessionsToday; },   [sessionsToday]);
  useEffect(() => { isRunningRef.current = isRunning; },      [isRunning]);

  // Sync points from DB when user loads (DB is source of truth for points)
  useEffect(() => {
    if (!currentUser) return;
    const dbDate     = currentUser.workspace_settings?.pomodoro_last_date;
    const dbPoints   = currentUser.workspace_settings?.pomodoro_points ?? 0;
    const dbSessions = dbDate === today ? (currentUser.workspace_settings?.pomodoro_sessions_today ?? 0) : 0;
    setTotalPoints(dbPoints);
    setSessionsToday(dbSessions);
    writeStorage({ totalPoints: dbPoints, sessionsToday: dbSessions, lastDate: today });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const savePointsToDB = useCallback(async (pts: number, sessions: number) => {
    if (!currentUser) return;
    await supabase.from('users').update({
      workspace_settings: {
        ...currentUser.workspace_settings,
        pomodoro_points: pts,
        pomodoro_sessions_today: sessions,
        pomodoro_last_date: today,
      }
    }).eq('id', currentUser.id);
  }, [currentUser, today]);

  const handlePhaseComplete = useCallback(() => {
    const currentMode    = modeRef.current;
    const currentPoints  = totalPointsRef.current;
    const currentSessions = sessionsRef.current;

    if (currentMode === 'work') {
      const newPoints   = currentPoints + 10;
      const newSessions = currentSessions + 1;

      setMode('break');
      setIsRunning(false);
      setPhaseEndTime(null);
      setPausedTimeLeft(BREAK_MS);
      setTotalPoints(newPoints);
      setSessionsToday(newSessions);
      setJustCompleted(true);

      writeStorage({ mode: 'break', isRunning: false, phaseEndTime: null, pausedTimeLeft: BREAK_MS, totalPoints: newPoints, sessionsToday: newSessions, lastDate: today });
      savePointsToDB(newPoints, newSessions).catch(console.error);
      showToast(`+10 pts! 🍅 Pomodoro #${newSessions} concluído!`, 'success');
    } else {
      setMode('work');
      setIsRunning(false);
      setPhaseEndTime(null);
      setPausedTimeLeft(WORK_MS);
      setJustCompleted(true);

      writeStorage({ mode: 'work', isRunning: false, phaseEndTime: null, pausedTimeLeft: WORK_MS, lastDate: today });
      showToast('Pausa concluída! Hora de focar 💪', 'success');
    }

    setTimeout(() => setJustCompleted(false), 2500);
  }, [savePointsToDB, showToast, today]);

  // Background ticker — runs in layout, survives page navigation
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      if (isRunningRef.current && phaseEndTimeRef.current && Date.now() >= phaseEndTimeRef.current) {
        handlePhaseComplete();
      }
    }, 250);
    return () => clearInterval(id);
  }, [isRunning, handlePhaseComplete]);

  const timeLeftMs = useCallback((): number => {
    if (!isRunningRef.current) {
      return pausedTimeLeft ?? (modeRef.current === 'work' ? WORK_MS : BREAK_MS);
    }
    if (!phaseEndTimeRef.current) return 0;
    return Math.max(0, phaseEndTimeRef.current - Date.now());
  }, [pausedTimeLeft]);

  const start = useCallback(() => {
    const remaining = pausedTimeLeft ?? (modeRef.current === 'work' ? WORK_MS : BREAK_MS);
    const endTime = Date.now() + remaining;
    setIsRunning(true);
    setPhaseEndTime(endTime);
    setPausedTimeLeft(null);
    writeStorage({ isRunning: true, phaseEndTime: endTime, pausedTimeLeft: null });
  }, [pausedTimeLeft]);

  const pause = useCallback(() => {
    const remaining = phaseEndTimeRef.current ? Math.max(0, phaseEndTimeRef.current - Date.now()) : null;
    setIsRunning(false);
    setPhaseEndTime(null);
    setPausedTimeLeft(remaining);
    writeStorage({ isRunning: false, phaseEndTime: null, pausedTimeLeft: remaining });
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setPhaseEndTime(null);
    setPausedTimeLeft(null);
    writeStorage({ isRunning: false, phaseEndTime: null, pausedTimeLeft: null });
  }, []);

  const skip = useCallback(() => {
    if (isRunningRef.current) return;
    const next: 'work' | 'break' = modeRef.current === 'work' ? 'break' : 'work';
    setMode(next);
    setIsRunning(false);
    setPhaseEndTime(null);
    setPausedTimeLeft(null);
    writeStorage({ mode: next, isRunning: false, phaseEndTime: null, pausedTimeLeft: null });
  }, []);

  const switchMode = useCallback((m: 'work' | 'break') => {
    if (isRunningRef.current) return;
    setMode(m);
    setIsRunning(false);
    setPhaseEndTime(null);
    setPausedTimeLeft(null);
    writeStorage({ mode: m, isRunning: false, phaseEndTime: null, pausedTimeLeft: null });
  }, []);

  return (
    <PomodoroContext.Provider value={{
      mode, isRunning, phaseEndTime, pausedTimeLeft,
      totalPoints, sessionsToday, justCompleted,
      timeLeftMs, start, pause, reset, skip, switchMode,
    }}>
      {children}
    </PomodoroContext.Provider>
  );
}

export function usePomodoro() {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error('usePomodoro must be inside PomodoroProvider');
  return ctx;
}
