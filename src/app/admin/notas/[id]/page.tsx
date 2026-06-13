'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Calendar, Tag, Users, Building2,
  X, Plus, Loader2, Check, Share2, Trash2, UserCircle,
  BookmarkCheck, User, Printer,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Note, Client } from '@/types/database';
import { useToast } from '@/components/CustomToast';
import TitleMention, { Mention } from '@/components/notas/TitleMention';

const BlockEditor = dynamic(() => import('@/components/notas/BlockEditor'), {
  ssr: false,
  loading: () => (
    <div style={{ padding: '32px 0', color: 'rgba(255,255,255,0.25)', fontSize: '1rem' }}>
      Carregando editor...
    </div>
  ),
});

type NoteState = Omit<Note, 'id' | 'created_at' | 'updated_at' | 'client' | 'author'>;

export default function NotaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { currentUser, users } = useAuth();
  const { showToast } = useToast();

  const [note, setNote] = useState<NoteState>({
    user_id: '',
    title: '',
    content: null,
    date: new Date().toISOString().split('T')[0],
    subjects: [],
    shared_with: [],
    share_all: false,
    pin_to_client: false,
    client_id: undefined,
  });
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [clients, setClients] = useState<Pick<Client, 'id' | 'name' | 'nome_fantasia'>[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    fetchNote();
    fetchClients();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchNote = async () => {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      setNote({
        user_id: data.user_id,
        title: data.title,
        content: data.content,
        date: data.date,
        subjects: data.subjects ?? [],
        shared_with: data.shared_with ?? [],
        share_all: data.share_all ?? false,
        pin_to_client: data.pin_to_client ?? false,
        client_id: data.client_id ?? undefined,
      });
      setIsOwner(data.user_id === currentUser?.id);
    }
    setLoading(false);
  };

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, name, nome_fantasia')
      .eq('status', 'active')
      .order('name');
    if (data) setClients(data as any);
  };

  const persist = useCallback(
    async (updated: NoteState) => {
      setSaving(true);
      const { error } = await supabase
        .from('notes')
        .update({
          title: updated.title,
          content: updated.content,
          date: updated.date,
          subjects: updated.subjects,
          shared_with: updated.shared_with,
          share_all: updated.share_all,
          pin_to_client: updated.pin_to_client,
          client_id: updated.client_id ?? null,
        })
        .eq('id', id);
      setSaving(false);
      if (!error) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    },
    [id],
  );

  const updateNote = useCallback(
    (patch: Partial<NoteState>) => {
      setNote(prev => {
        const updated = { ...prev, ...patch };
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => persist(updated), 900);
        return updated;
      });
    },
    [persist],
  );

  const addSubject = () => {
    const trimmed = newSubject.trim();
    if (!trimmed) return;
    setNewSubject('');
    updateNote({ subjects: [...(note.subjects ?? []), trimmed] });
  };

  const removeSubject = (s: string) =>
    updateNote({ subjects: (note.subjects ?? []).filter(x => x !== s) });

  const toggleUser = (userId: string) => {
    const shared = note.shared_with ?? [];
    updateNote({
      shared_with: shared.includes(userId)
        ? shared.filter(x => x !== userId)
        : [...shared, userId],
    });
  };

  const shareWithAll = () => updateNote({ share_all: true, shared_with: [] });
  const clearShare = () => updateNote({ share_all: false, shared_with: [] });

  const deleteNote = async () => {
    if (!confirm('Excluir esta nota permanentemente?')) return;
    await supabase.from('notes').delete().eq('id', id);
    showToast('Nota excluída', 'success');
    router.push('/admin/notas');
  };

  const canEdit = isOwner || (note.share_all) || (note.shared_with ?? []).includes(currentUser?.id ?? '');

  const handleExport = () => {
    const editorEl = document.querySelector('.block-editor-content');
    const html = editorEl?.innerHTML ?? '';
    const overlay = document.getElementById('note-print-overlay');
    if (!overlay) return;
    const contentEl = overlay.querySelector('#print-body');
    if (contentEl) contentEl.innerHTML = html;
    window.print();
  };
  const linkedClient = clients.find(c => c.id === note.client_id);
  const teamMembers = users.filter(u => u.id !== currentUser?.id);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
          <Loader2 size={32} color="var(--accent)" />
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
    >
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <Link
          href="/admin/notas"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem' }}
        >
          <ArrowLeft size={15} /> Notas
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {saving && (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                <Loader2 size={13} />
              </motion.div>
              Salvando
            </span>
          )}
          {saved && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ fontSize: '0.78rem', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <Check size={13} /> Salvo
            </motion.span>
          )}
          <button
            onClick={handleExport}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '5px 12px' }}
          >
            <Printer size={13} /> Exportar PDF
          </button>
          {isOwner && (
            <button
              onClick={deleteNote}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', padding: '4px 8px', borderRadius: '6px' }}
            >
              <Trash2 size={13} /> Excluir
            </button>
          )}
        </div>
      </div>

      {/* Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 272px', gap: '20px', alignItems: 'start' }}>

        {/* Editor */}
        <div className="glass-card" style={{ padding: 'clamp(20px, 4vw, 36px)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <TitleMention
            value={note.title}
            mentions={mentions}
            onChange={(title, newMentions) => { setMentions(newMentions); updateNote({ title }); }}
            placeholder="Título da nota..."
          />
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)' }} />
          <BlockEditor
            content={note.content}
            onChange={content => updateNote({ content })}
            editable={canEdit}
          />
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: isMobile ? 'static' : 'sticky', top: '24px' }}>

          {/* Date */}
          <SideSection icon={<Calendar size={13} />} label="Data">
            <input
              type="date"
              value={note.date ?? new Date().toISOString().split('T')[0]}
              onChange={e => updateNote({ date: e.target.value })}
              disabled={!canEdit}
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 10px', color: 'white', fontSize: '0.85rem', outline: 'none' }}
            />
          </SideSection>

          {/* Subjects */}
          <SideSection icon={<Tag size={13} />} label="Assuntos">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: note.subjects?.length ? '10px' : 0 }}>
              {(note.subjects ?? []).map(s => (
                <span key={s} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(217, 72, 15, 0.1)', color: 'var(--accent)', padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600, border: '1px solid rgba(217, 72, 15, 0.2)' }}>
                  {s}
                  {canEdit && (
                    <button onClick={() => removeSubject(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, display: 'flex', lineHeight: 1 }}>
                      <X size={10} />
                    </button>
                  )}
                </span>
              ))}
            </div>
            {canEdit && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addSubject()}
                  placeholder="Novo assunto..."
                  style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 10px', color: 'white', fontSize: '0.8rem', outline: 'none' }}
                />
                <button onClick={addSubject} style={{ background: 'var(--accent)', border: 'none', borderRadius: '8px', padding: '6px 10px', color: 'white', cursor: 'pointer' }}>
                  <Plus size={14} />
                </button>
              </div>
            )}
          </SideSection>

          {/* Share — only owner can change */}
          {isOwner && (
            <SideSection icon={<Share2 size={13} />} label="Compartilhar">
              {/* Quick buttons */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <button
                  onClick={shareWithAll}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    padding: '7px 10px', borderRadius: '8px', border: '1px solid',
                    fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                    borderColor: note.share_all ? 'var(--accent)' : 'var(--border)',
                    background: note.share_all ? 'rgba(217, 72, 15, 0.15)' : 'rgba(255,255,255,0.04)',
                    color: note.share_all ? 'var(--accent)' : 'var(--text-secondary)',
                  }}
                >
                  <Users size={13} /> Todo o time
                </button>
                <button
                  onClick={clearShare}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    padding: '7px 10px', borderRadius: '8px', border: '1px solid',
                    fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                    borderColor: !note.share_all && (note.shared_with ?? []).length === 0 ? 'rgba(255,255,255,0.15)' : 'var(--border)',
                    background: !note.share_all && (note.shared_with ?? []).length === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                    color: !note.share_all && (note.shared_with ?? []).length === 0 ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  <User size={13} /> Só eu
                </button>
              </div>

              {/* Individual members */}
              {!note.share_all && teamMembers.length > 0 && (
                <>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Ou escolha membros
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {teamMembers.map(user => {
                      const checked = (note.shared_with ?? []).includes(user.id);
                      return (
                        <label key={user.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '5px 0' }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleUser(user.id)}
                            style={{ accentColor: 'var(--accent)', width: '15px', height: '15px', flexShrink: 0 }}
                          />
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt={user.name} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(217,72,15,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <UserCircle size={14} color="var(--accent)" />
                              </div>
                            )}
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 500 }}>{user.name}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>@{user.username}</div>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}

              {note.share_all && (
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Todos os membros do time podem ver e editar esta nota.
                </p>
              )}
            </SideSection>
          )}

          {/* Client */}
          <SideSection icon={<Building2 size={13} />} label="Cliente vinculado">
            {canEdit ? (
              <select
                value={note.client_id ?? ''}
                onChange={e => updateNote({ client_id: e.target.value || undefined, pin_to_client: false })}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 10px', color: note.client_id ? 'white' : 'var(--text-secondary)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
              >
                <option value="">Nenhum cliente</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.nome_fantasia || c.name}</option>
                ))}
              </select>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                {linkedClient ? (linkedClient.nome_fantasia || linkedClient.name) : '—'}
              </p>
            )}

            {/* Pin to client record */}
            {note.client_id && canEdit && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px', cursor: 'pointer', padding: '10px 12px', borderRadius: '10px', border: '1px solid', transition: 'all 0.15s', borderColor: note.pin_to_client ? 'rgba(217,72,15,0.35)' : 'var(--border)', background: note.pin_to_client ? 'rgba(217,72,15,0.08)' : 'rgba(255,255,255,0.02)' }}>
                <BookmarkCheck size={16} color={note.pin_to_client ? 'var(--accent)' : 'var(--text-secondary)'} style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: note.pin_to_client ? 'var(--accent)' : 'white' }}>
                    Incluir no cadastro
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    Aparece na aba Notas do cliente
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={note.pin_to_client}
                  onChange={e => updateNote({ pin_to_client: e.target.checked })}
                  style={{ accentColor: 'var(--accent)', width: '15px', height: '15px', marginLeft: 'auto', flexShrink: 0 }}
                />
              </label>
            )}

            {note.client_id && (
              <Link href={`/admin/clients/${note.client_id}?tab=notas`} style={{ display: 'block', marginTop: '10px', fontSize: '0.75rem', color: 'var(--accent)', textDecoration: 'none' }}>
                Ver cadastro do cliente →
              </Link>
            )}
          </SideSection>

        </div>
      </div>

      {/* ── Print overlay (hidden on screen, visible on print) ─────────── */}
      <PrintOverlay note={note} linkedClient={linkedClient} />
    </motion.div>
  );
}

function SideSection({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="glass-card" style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {icon} {label}
      </div>
      {children}
    </div>
  );
}

// ─── Print overlay ─────────────────────────────────────────────────────────

function PrintOverlay({
  note,
  linkedClient,
}: {
  note: Partial<import('@/types/database').Note>;
  linkedClient?: Pick<Client, 'id' | 'name' | 'nome_fantasia'>;
}) {
  const formattedDate = note.date
    ? new Date(note.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const exportedAt = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <style>{`
        @media print {
          body > * { visibility: hidden !important; }

          #note-print-overlay,
          #note-print-overlay * { visibility: visible !important; }

          #note-print-overlay {
            display: block !important;
            position: fixed !important;
            inset: 0 !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            z-index: 99999;
          }

          @page {
            size: A4 portrait;
            margin: 0;
          }

          /* Body content */
          #print-body { color: #1a1a1a !important; font-size: 10.5pt; line-height: 1.75; }
          #print-body > * + * { margin-top: 5pt; }
          #print-body h1 { font-size: 16pt; font-weight: 700; color: #111 !important; margin: 14pt 0 4pt; }
          #print-body h2 { font-size: 13pt; font-weight: 700; color: #111 !important; margin: 12pt 0 3pt; }
          #print-body h3 { font-size: 11pt; font-weight: 700; color: #333 !important; margin: 10pt 0 2pt; }
          #print-body p { margin: 0 0 5pt; }
          #print-body ul, #print-body ol { padding-left: 18pt; margin: 4pt 0 6pt; }
          #print-body li { margin: 2pt 0; }
          #print-body blockquote { border-left: 3pt solid #d9480f; padding: 5pt 12pt; margin: 8pt 0; color: #555; background: #fff8f5; }
          #print-body pre { background: #f5f5f5 !important; border-radius: 4pt; padding: 10pt; font-size: 8.5pt; overflow: hidden; }
          #print-body pre code { font-family: "Courier New", monospace; color: #222; background: none; padding: 0; }
          #print-body :not(pre) > code { background: #f0f0f0; padding: 1pt 4pt; border-radius: 2pt; font-size: 8.5pt; font-family: "Courier New", monospace; color: #c0392b; }
          #print-body ul[data-type="taskList"] { list-style: none; padding: 0; }
          #print-body ul[data-type="taskList"] > li { display: flex; align-items: flex-start; gap: 6pt; }
          #print-body ul[data-type="taskList"] > li[data-checked="true"] > div { text-decoration: line-through; color: #999; }
          #print-body .editor-mention { background: #fff0eb; color: #d9480f; border-radius: 3pt; padding: 0 4pt; font-weight: 600; font-size: 0.95em; }
          #print-body strong { font-weight: 700; }
          #print-body em { font-style: italic; }
          #print-body s { text-decoration: line-through; }
          #print-body hr { border: none; border-top: 1pt solid #e0e0e0; margin: 12pt 0; }
          #print-body img { max-width: 100%; border-radius: 4pt; margin: 6pt 0; }
        }
      `}</style>

      <div id="note-print-overlay" style={{ display: 'none' }}>
        <div style={{
          fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
          color: '#1a1a1a',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}>

          {/* ── Header ── */}
          <div style={{
            padding: '18pt 22mm 14pt',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '16pt',
            flexShrink: 0,
            borderBottom: '2.5pt solid #d9480f',
          }}>
            {/* Symbol logo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/SIMBOLO-PRETO.png"
              alt="Pratic"
              style={{ height: '28pt', width: 'auto', objectFit: 'contain', flexShrink: 0, marginTop: '2pt' }}
            />

            {/* Meta: label + date */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '7pt', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#d9480f', marginBottom: '2pt' }}>
                Nota
              </div>
              <div style={{ fontSize: '9pt', color: '#888', fontWeight: 400 }}>
                {formattedDate}
              </div>
            </div>
          </div>

          {/* ── Title block ── */}
          <div style={{ padding: '14pt 22mm 0', flexShrink: 0 }}>
            <h1 style={{
              fontSize: '22pt',
              fontWeight: 800,
              color: '#111',
              margin: '0 0 10pt',
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
            }}>
              {note.title || 'Sem título'}
            </h1>

            {/* Orange rule */}
            <div style={{ height: '2.5pt', background: 'linear-gradient(90deg, #d9480f 0%, #f76b35 60%, transparent 100%)', borderRadius: '2pt' }} />
            <div style={{ height: '0.5pt', background: '#ececec', marginTop: '3pt' }} />
          </div>

          {/* ── Meta block (logo + cliente + assuntos + data) ── */}
          <div style={{
            margin: '10pt 22mm 0',
            padding: '10pt 14pt',
            background: '#fafafa',
            border: '0.5pt solid #ebebeb',
            borderRadius: '5pt',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16pt',
            flexShrink: 0,
          }}>
            {/* Left: meta info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4pt' }}>
              {linkedClient && (
                <div style={{ fontSize: '8.5pt', color: '#444', display: 'flex', alignItems: 'baseline', gap: '5pt' }}>
                  <span style={{ fontWeight: 700, color: '#d9480f', textTransform: 'uppercase', fontSize: '7pt', letterSpacing: '0.08em' }}>Cliente</span>
                  {linkedClient.nome_fantasia || linkedClient.name}
                </div>
              )}
              {(note.subjects?.length ?? 0) > 0 && (
                <div style={{ fontSize: '8.5pt', color: '#444', display: 'flex', alignItems: 'baseline', gap: '5pt' }}>
                  <span style={{ fontWeight: 700, color: '#d9480f', textTransform: 'uppercase', fontSize: '7pt', letterSpacing: '0.08em' }}>Assuntos</span>
                  {note.subjects!.join(' · ')}
                </div>
              )}
              <div style={{ fontSize: '7.5pt', color: '#bbb', marginTop: '1pt' }}>
                Exportado em {exportedAt}
              </div>
            </div>

            {/* Right: logo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-horizontal-preta.png"
              alt="Pratic System"
              style={{ height: '16pt', width: 'auto', objectFit: 'contain', opacity: 0.45, flexShrink: 0 }}
            />
          </div>

          {/* ── Body ── */}
          <div
            id="print-body"
            style={{
              padding: '16pt 22mm 24pt',
              flex: 1,
              fontSize: '10.5pt',
              lineHeight: 1.75,
              color: '#1a1a1a',
            }}
          />
        </div>
      </div>
    </>
  );
}
