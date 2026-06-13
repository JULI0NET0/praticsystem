'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FileText, Loader2, User, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Note } from '@/types/database';
import SearchInput from '@/components/ui/SearchInput';
import Spotlight from '@/components/Spotlight';
import { useToast } from '@/components/CustomToast';
import NoteCard from '@/components/notas/NoteCard';

type Tab = 'mine' | 'shared';

export default function NotasPage() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tab, setTab] = useState<Tab>('mine');

  const fetchNotes = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      let query = supabase
        .from('notes')
        .select('*, client:clients(id, name, nome_fantasia)')
        .order('updated_at', { ascending: false });

      if (tab === 'mine') {
        query = query.eq('user_id', currentUser.id);
      } else {
        // shared_with individual OR share_all (todo o time)
        query = query.neq('user_id', currentUser.id).or(`shared_with.cs.{${currentUser.id}},share_all.eq.true`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setNotes((data ?? []) as unknown as Note[]);
    } catch {
      showToast('Erro ao carregar notas', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUser, tab, showToast]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const filteredNotes = notes.filter(n =>
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.subjects?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 700, marginBottom: '8px' }}>Notas</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.8rem, 2vw, 1rem)' }}>
            Suas notas pessoais e compartilhadas com o time.
          </p>
        </div>
        <Link href="/admin/notas/create">
          <Spotlight as="div" className="btn btn-accent">
            <Plus size={18} /> Nova Nota
          </Spotlight>
        </Link>
      </div>

      <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Tabs + Search */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex', gap: '4px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '10px', padding: '4px', flexShrink: 0,
          }}>
            {([
              { key: 'mine', label: 'Minhas', icon: User },
              { key: 'shared', label: 'Compartilhadas', icon: Users },
            ] as const).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 14px', borderRadius: '8px', border: 'none',
                  fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
                  background: tab === t.key ? 'var(--accent)' : 'transparent',
                  color: tab === t.key ? 'white' : 'var(--text-secondary)',
                  transition: 'all 0.2s',
                }}
              >
                <t.icon size={14} /> {t.label}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Buscar notas..." />
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
              <Loader2 size={32} color="var(--accent)" />
            </motion.div>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <FileText size={48} style={{ opacity: 0.15, marginBottom: '16px', display: 'block', margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              {tab === 'mine'
                ? 'Nenhuma nota ainda. Crie a sua primeira!'
                : 'Nenhuma nota foi compartilhada com você.'}
            </p>
            {tab === 'mine' && (
              <Link href="/admin/notas/create" className="btn btn-accent" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                <Plus size={16} /> Criar nota
              </Link>
            )}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
            gap: '16px',
          }}>
            <AnimatePresence mode="popLayout">
              {filteredNotes.map((note, idx) => (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.035 }}
                >
                  <NoteCard note={note} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

