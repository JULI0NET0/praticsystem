'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FileText, Loader2, User, Users, Share2, Globe } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Note } from '@/types/database';
import SearchInput from '@/components/ui/SearchInput';
import Spotlight from '@/components/Spotlight';
import { useToast } from '@/components/CustomToast';
import NoteCard from '@/components/notas/NoteCard';

type Tab = 'mine' | 'shared' | 'team' | 'all';

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
      const notesQuery = supabase
        .from('notes')
        .select('*')
        .or(`user_id.eq.${currentUser.id},shared_with.cs.{${currentUser.id}},share_all.eq.true`);

      const [notesRes, clientsRes] = await Promise.all([
        notesQuery,
        supabase.from('clients').select('id, name, nome_fantasia')
      ]);

      if (notesRes.error) throw notesRes.error;

      const mappedNotes = (notesRes.data ?? []).map(note => ({
        ...note,
        client: (clientsRes.data ?? []).find(c => c.id === note.client_id) || null
      }));

      setNotes(mappedNotes as unknown as Note[]);
    } catch (err: any) {
      console.error('Erro ao carregar notas:', err);
      showToast('Erro ao carregar notas: ' + (err.message || ''), 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUser, showToast]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const handleDeleteNote = async (noteToDelete: any) => {
    const confirm = window.confirm(`Tem certeza que deseja excluir a nota "${noteToDelete.title || 'Sem título'}"?`);
    if (!confirm) return;
    try {
      const { error } = await supabase.from('notes').delete().eq('id', noteToDelete.id);
      if (error) throw error;
      setNotes(prev => prev.filter(n => n.id !== noteToDelete.id));
      showToast('Nota excluída com sucesso', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao excluir nota: ' + (err.message || ''), 'error');
    }
  };

  const handleTogglePin = async (noteToToggle: any) => {
    if (!currentUser) return;
    const isPinned = (noteToToggle.subjects ?? []).includes('_pinned:true');
    let newSubjects = [...(noteToToggle.subjects ?? [])];
    if (isPinned) {
      newSubjects = newSubjects.filter(s => s !== '_pinned:true');
    } else {
      newSubjects.push('_pinned:true');
    }
    
    // Atualizar quem alterou
    newSubjects = newSubjects.filter(s => !s.startsWith('_last_edited_by:'));
    newSubjects.push(`_last_edited_by:${currentUser.name || 'Usuário'}`);

    try {
      const { error } = await supabase
        .from('notes')
        .update({ subjects: newSubjects })
        .eq('id', noteToToggle.id);

      if (error) throw error;
      
      setNotes(prev =>
        prev.map(n =>
          n.id === noteToToggle.id
            ? { ...n, subjects: newSubjects, updated_at: new Date().toISOString() }
            : n
        )
      );
      showToast(isPinned ? 'Nota desafixada' : 'Nota fixada no topo', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao atualizar fixação: ' + (err.message || ''), 'error');
    }
  };

  const tabFiltered = notes.filter(n => {
    if (tab === 'mine') return n.user_id === currentUser?.id;
    if (tab === 'shared') return n.user_id !== currentUser?.id && n.shared_with?.includes(currentUser?.id || '');
    if (tab === 'team') return n.share_all === true;
    return true; // 'all'
  });

  const filteredNotes = tabFiltered
    .filter(n =>
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.subjects?.some(s => !s.startsWith('_') && s.toLowerCase().includes(searchTerm.toLowerCase())),
    )
    .sort((a, b) => {
      const aPinned = (a.subjects ?? []).includes('_pinned:true');
      const bPinned = (b.subjects ?? []).includes('_pinned:true');
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      
      const aTime = new Date(a.updated_at || 0).getTime();
      const bTime = new Date(b.updated_at || 0).getTime();
      return bTime - aTime;
    });

  const getEmptyMessage = () => {
    switch (tab) {
      case 'mine':
        return 'Nenhuma nota criada por você ainda.';
      case 'shared':
        return 'Nenhuma nota compartilhada diretamente com você.';
      case 'team':
        return 'Nenhuma nota compartilhada com o time.';
      default:
        return 'Nenhuma nota disponível.';
    }
  };

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
              { key: 'shared', label: 'Compartilhadas', icon: Share2 },
              { key: 'team', label: 'Time', icon: Globe },
              { key: 'all', label: 'Todas', icon: FileText },
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
              {getEmptyMessage()}
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
                  transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                >
                  <NoteCard 
                    note={note} 
                    onDelete={note.user_id === currentUser?.id ? handleDeleteNote : undefined} 
                    onTogglePin={handleTogglePin}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

