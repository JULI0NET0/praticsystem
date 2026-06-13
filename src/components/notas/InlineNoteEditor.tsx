'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Check, Loader2, Tag, X, Plus, Calendar,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/CustomToast';
import TitleMention, { Mention } from '@/components/notas/TitleMention';
import { NoteCardData } from '@/components/notas/NoteCard';

const BlockEditor = dynamic(() => import('@/components/notas/BlockEditor'), {
  ssr: false,
  loading: () => (
    <div style={{ padding: '24px 0', color: 'rgba(255,255,255,0.2)', fontSize: '0.95rem' }}>
      Carregando editor...
    </div>
  ),
});

interface InlineNoteEditorProps {
  clientId: string;
  noteId?: string | null;
  onClose: () => void;
  onSaved: (note: NoteCardData) => void;
}

interface NoteState {
  title: string;
  content: any;
  date: string;
  subjects: string[];
}

export default function InlineNoteEditor({ clientId, noteId, onClose, onSaved }: InlineNoteEditorProps) {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [state, setState] = useState<NoteState>({
    title: '',
    content: null,
    date: new Date().toISOString().split('T')[0],
    subjects: [],
  });
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [loading, setLoading] = useState(!!noteId);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [resolvedNoteId, setResolvedNoteId] = useState<string | null>(noteId ?? null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (noteId) loadNote(noteId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  const loadNote = async (id: string) => {
    const { data } = await supabase.from('notes').select('*').eq('id', id).single();
    if (data) {
      setState({
        title: data.title ?? '',
        content: data.content,
        date: data.date ?? new Date().toISOString().split('T')[0],
        subjects: data.subjects ?? [],
      });
    }
    setLoading(false);
  };

  const persist = useCallback(async (updated: NoteState) => {
    if (!currentUser) return;
    setSaving(true);

    let id = resolvedNoteId;

    if (!id) {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: currentUser.id,
          title: updated.title,
          content: updated.content,
          date: updated.date,
          subjects: updated.subjects,
          client_id: clientId,
          pin_to_client: true,
          share_all: false,
          shared_with: [],
        })
        .select('id')
        .single();

      if (!error && data) {
        id = data.id;
        setResolvedNoteId(id);
      }
    } else {
      await supabase
        .from('notes')
        .update({
          title: updated.title,
          content: updated.content,
          date: updated.date,
          subjects: updated.subjects,
        })
        .eq('id', id);
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [currentUser, clientId, resolvedNoteId]);

  const update = useCallback((patch: Partial<NoteState>) => {
    setState(prev => {
      const updated = { ...prev, ...patch };
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => persist(updated), 900);
      return updated;
    });
  }, [persist]);

  const addSubject = () => {
    const t = newSubject.trim();
    if (!t) return;
    setNewSubject('');
    update({ subjects: [...state.subjects, t] });
  };

  const removeSubject = (s: string) =>
    update({ subjects: state.subjects.filter(x => x !== s) });

  const handleClose = async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      await persist(state);
    }
    if (resolvedNoteId) {
      const { data } = await supabase
        .from('notes')
        .select('id, title, content, date, subjects, updated_at, created_at, pin_to_client')
        .eq('id', resolvedNoteId)
        .single();
      if (data) onSaved(data as NoteCardData);
    }
    onClose();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
          <Loader2 size={28} color="var(--accent)" />
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
    >
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <button
          onClick={handleClose}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.875rem', padding: '4px 0' }}
        >
          <ArrowLeft size={15} />
          {noteId ? 'Voltar para notas' : 'Descartar'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {saving && (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                <Loader2 size={13} />
              </motion.div>
              Salvando
            </span>
          )}
          {saved && (
            <span style={{ fontSize: '0.78rem', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Check size={13} /> Salvo
            </span>
          )}
        </div>
      </div>

      {/* Editor card */}
      <div className="glass-card" style={{ padding: 'clamp(18px, 3vw, 32px)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Title */}
        <TitleMention
          value={state.title}
          mentions={mentions}
          onChange={(title, m) => { setMentions(m); update({ title }); }}
          placeholder="Título da nota..."
        />
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)' }} />

        {/* Body */}
        <BlockEditor
          content={state.content}
          onChange={content => update({ content })}
        />
      </div>

      {/* Metadata row */}
      <div className="glass-card" style={{ padding: '14px 16px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>

        {/* Date */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '140px' }}>
          <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Calendar size={11} /> Data
          </label>
          <input
            type="date"
            value={state.date}
            onChange={e => update({ date: e.target.value })}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 10px', color: 'white', fontSize: '0.85rem', outline: 'none' }}
          />
        </div>

        {/* Subjects */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '200px' }}>
          <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Tag size={11} /> Assuntos
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            {state.subjects.map(s => (
              <span key={s} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(217,72,15,0.1)', color: 'var(--accent)', padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600, border: '1px solid rgba(217,72,15,0.2)' }}>
                {s}
                <button onClick={() => removeSubject(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, display: 'flex', lineHeight: 1 }}>
                  <X size={10} />
                </button>
              </span>
            ))}
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                value={newSubject}
                onChange={e => setNewSubject(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSubject()}
                placeholder="+ Assunto"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px 8px', color: 'white', fontSize: '0.8rem', outline: 'none', width: '110px' }}
              />
              <button onClick={addSubject} style={{ background: 'var(--accent)', border: 'none', borderRadius: '8px', padding: '4px 8px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <Plus size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
