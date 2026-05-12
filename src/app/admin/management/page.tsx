"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { usePresence } from "@/hooks/usePresence";
import { supabase } from "@/lib/supabase";
import {
  Activity, Clock, Users, Calendar, ChevronDown,
  Circle, Timer, BarChart3, TrendingUp
} from "lucide-react";

interface TimeLogEntry {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  session_type: string;
}

interface UserStats {
  user_id: string;
  name: string;
  avatar_url?: string;
  role: string;
  emoji?: string;
  todayMinutes: number;
  weekMinutes: number;
  monthMinutes: number;
  isOnline: boolean;
  lastSession?: string;
}

const formatMinutes = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${m}min`;
};

export default function ManagementPage() {
  const { currentUser, users } = useAuth();
  const { onlineUsers, isUserOnline } = usePresence();
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLogEntry[]>([]);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [loading, setLoading] = useState(true);

  const teamUsers = users.filter(u => ['admin', 'board', 'social_media', 'filmmaker'].includes(u.role));

  const getDateRange = useCallback((p: string) => {
    const now = new Date();
    const spDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now);
    const todayStart = `${spDate}T00:00:00-03:00`;

    if (p === 'today') return todayStart;

    const d = new Date(todayStart);
    if (p === 'week') d.setDate(d.getDate() - 7);
    if (p === 'month') d.setDate(d.getDate() - 30);
    return d.toISOString();
  }, []);

  const fetchStats = useCallback(async () => {
    if (teamUsers.length === 0) return;
    setLoading(true);

    const startDate = getDateRange('month'); // busca 30 dias para calcular tudo

    const { data } = await supabase
      .from('time_logs')
      .select('*')
      .gte('start_time', startDate)
      .order('start_time', { ascending: false });

    if (data) {
      setTimeLogs(data);

      const todayStart = getDateRange('today');
      const weekStart = getDateRange('week');

      const stats: UserStats[] = teamUsers.map(user => {
        const userLogs = data.filter(l => l.user_id === user.id);

        const calcMinutes = (from: string) => {
          return userLogs
            .filter(l => l.start_time >= from)
            .reduce((acc, l) => {
              if (l.duration_minutes) return acc + Number(l.duration_minutes);
              if (!l.end_time) {
                return acc + (Date.now() - new Date(l.start_time).getTime()) / 60000;
              }
              return acc;
            }, 0);
        };

        return {
          user_id: user.id,
          name: user.name,
          avatar_url: user.avatar_url,
          role: user.role,
          emoji: user.emoji,
          todayMinutes: Math.round(calcMinutes(todayStart)),
          weekMinutes: Math.round(calcMinutes(weekStart)),
          monthMinutes: Math.round(calcMinutes(startDate)),
          isOnline: isUserOnline(user.id),
          lastSession: userLogs[0]?.start_time
        };
      });

      setUserStats(stats.sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0)));
    }
    setLoading(false);
  }, [teamUsers, getDateRange, isUserOnline]);

  useEffect(() => {
    if (teamUsers.length > 0) fetchStats();
  }, [users.length, onlineUsers.length]);

  const totalOnline = onlineUsers.length;
  const totalHoursToday = userStats.reduce((acc, u) => acc + u.todayMinutes, 0);
  const avgDaily = userStats.length > 0 ? Math.round(totalHoursToday / userStats.length) : 0;

  const kpis = [
    { label: 'Online Agora', value: totalOnline.toString(), icon: Users, color: '#22C55E', sub: `de ${teamUsers.length} membros` },
    { label: 'Horas Hoje (Equipe)', value: formatMinutes(totalHoursToday), icon: Clock, color: 'var(--accent)', sub: 'total acumulado' },
    { label: 'Média/Pessoa Hoje', value: formatMinutes(avgDaily), icon: TrendingUp, color: '#8B5CF6', sub: 'por membro ativo' },
    { label: 'Sessões Hoje', value: timeLogs.filter(l => l.start_time >= getDateRange('today')).length.toString(), icon: Activity, color: '#F59E0B', sub: 'registros de trabalho' },
  ];

  if (!currentUser || !['admin', 'board'].includes(currentUser.role)) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Acesso restrito a administradores.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BarChart3 size={32} color="var(--accent)" />
          Gestão da Equipe
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
          Monitore a presença, horas trabalhadas e produtividade da equipe em tempo real.
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' }}>
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            style={{
              padding: '24px',
              borderRadius: '20px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column', gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{kpi.label}</span>
              <div style={{
                width: '36px', height: '36px', borderRadius: '12px',
                background: `${kpi.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <kpi.icon size={18} color={kpi.color} />
              </div>
            </div>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>{kpi.value}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{kpi.sub}</span>
          </motion.div>
        ))}
      </div>

      {/* Equipe Online */}
      <div style={{
        padding: '28px', borderRadius: '20px', background: 'var(--bg-secondary)',
        border: '1px solid var(--border)', marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Circle size={10} fill="#22C55E" color="#22C55E" /> Equipe Online
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['today', 'week', 'month'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: '6px 16px', borderRadius: '10px', border: 'none',
                  background: period === p ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                  color: period === p ? 'white' : 'var(--text-secondary)',
                  fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'
                }}
              >
                {p === 'today' ? 'Hoje' : p === 'week' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>Carregando dados...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {userStats.map((stat, i) => (
              <motion.div
                key={stat.user_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{
                  padding: '20px', borderRadius: '16px',
                  background: stat.isOnline ? 'rgba(34, 197, 94, 0.04)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${stat.isOnline ? 'rgba(34, 197, 94, 0.2)' : 'var(--border)'}`,
                  display: 'flex', gap: '16px', alignItems: 'center'
                }}
              >
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 700, fontSize: '1rem'
                  }}>
                    {stat.avatar_url
                      ? <img src={stat.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      : stat.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: '12px', height: '12px', borderRadius: '50%',
                    background: stat.isOnline ? '#22C55E' : '#6B7280',
                    border: '2px solid var(--bg-secondary)'
                  }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{stat.name}</span>
                    <span>{stat.emoji}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: stat.isOnline ? '#22C55E' : '#6B7280' }}>
                    {stat.isOnline ? 'Online agora' : 'Offline'}
                  </span>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block' }}>Hoje</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{formatMinutes(stat.todayMinutes)}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block' }}>Semana</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{formatMinutes(stat.weekMinutes)}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block' }}>Mês</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{formatMinutes(stat.monthMinutes)}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Tabela de Horas Detalhada */}
      <div style={{
        padding: '28px', borderRadius: '20px', background: 'var(--bg-secondary)',
        border: '1px solid var(--border)'
      }}>
        <h2 style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Timer size={20} color="var(--accent)" /> Registro de Horas
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px' }}>
            <thead>
              <tr>
                {['Membro', 'Hoje', 'Semana', 'Mês', 'Média/Dia', 'Status'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '12px 16px', fontSize: '0.75rem',
                    textTransform: 'uppercase', color: 'var(--text-secondary)',
                    letterSpacing: '0.05em', fontWeight: 600
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {userStats.map(stat => (
                <tr key={stat.user_id} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                  <td style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: '0.75rem', fontWeight: 700
                    }}>
                      {stat.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{stat.name}</span>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{stat.role}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 600 }}>{formatMinutes(stat.todayMinutes)}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 600 }}>{formatMinutes(stat.weekMinutes)}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 600 }}>{formatMinutes(stat.monthMinutes)}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                    {formatMinutes(stat.monthMinutes > 0 ? Math.round(stat.monthMinutes / 30) : 0)}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                      background: stat.isOnline ? 'rgba(34, 197, 94, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                      color: stat.isOnline ? '#22C55E' : '#6B7280'
                    }}>
                      {stat.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
