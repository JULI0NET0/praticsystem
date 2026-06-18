'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Calendar, Tag, Users, Building2,
  X, Plus, Loader2, Check, Share2, Trash2, UserCircle,
  BookmarkCheck, User, Printer, FileDown,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Note, Client } from '@/types/database';
import { useToast } from '@/components/CustomToast';
import TitleMention, { Mention } from '@/components/notas/TitleMention';
import CustomModal from '@/components/CustomModal';

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
  const [exporting, setExporting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
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
      .select('id, name, nome_fantasia, sequential_id')
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
    setIsDeleteModalOpen(false);
    await supabase.from('notes').delete().eq('id', id);
    showToast('Nota excluída', 'success');
    router.push('/admin/notas');
  };

  const canEdit = isOwner || (note.share_all) || (note.shared_with ?? []).includes(currentUser?.id ?? '');

  const handleExport = async () => {
    const editorEl = document.querySelector('.block-editor-content');
    const html = editorEl?.innerHTML ?? '';
    const overlay = document.getElementById('note-print-overlay') as HTMLElement | null;
    if (!overlay) return;
    const contentEl = overlay.querySelector('#print-body') as HTMLElement | null;
    if (contentEl) contentEl.innerHTML = html;

    setExporting(true);

    // Posiciona o overlay fora da tela mas visível (necessário para html2canvas)
    // Substituir checkboxes nativos por spans (html2canvas não renderiza input corretamente)
    overlay.querySelectorAll<HTMLElement>('ul[data-type="taskList"] > li').forEach(li => {
      const checked = li.dataset.checked === 'true';
      const input = li.querySelector('input[type="checkbox"]');
      if (!input) return;
      const box = document.createElement('span');
      box.style.cssText = [
        'display:inline-block', 'width:12px', 'height:12px',
        'border-radius:2px', 'flex-shrink:0', 'vertical-align:middle',
        checked
          ? 'background:#d9480f;border:1.5px solid #d9480f'
          : 'background:#ffffff;border:1.5px solid #bbb',
      ].join(';');
      if (checked) {
        box.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      }
      input.parentNode?.replaceChild(box, input);
    });

    const prevCss = overlay.style.cssText;
    overlay.style.cssText = [
      'display:block',
      'position:fixed',
      'left:-99999px',
      'top:0',
      'width:794px',
      'background:#ffffff',
      'z-index:-1',
    ].join(';');

    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(overlay, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794,
        windowWidth: 794,
      });

      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const imgData   = canvas.toDataURL('image/png');
      const pdfWidth  = 210;
      const pdfHeight = (canvas.height / canvas.width) * pdfWidth;
      const pageH     = 297;

      // +1mm de epsilon para evitar falso multi-página por arredondamento float
      if (pdfHeight <= pageH + 1) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pageH);
      } else {
        let yOffset = 0;
        while (yOffset < pdfHeight) {
          pdf.addImage(imgData, 'PNG', 0, -yOffset, pdfWidth, pdfHeight);
          yOffset += pageH;
          if (yOffset < pdfHeight) pdf.addPage();
        }
      }

      // Add clickable links on top of the image in the PDF
      const linkElements = overlay.querySelectorAll('a');
      const scaleFactor = 210 / 794;
      const overlayRect = overlay.getBoundingClientRect();

      linkElements.forEach(aEl => {
        const href = aEl.getAttribute('href');
        if (!href) return;
        
        const aRect = aEl.getBoundingClientRect();
        
        const x = (aRect.left - overlayRect.left) * scaleFactor;
        const y = (aRect.top - overlayRect.top) * scaleFactor;
        const w = aRect.width * scaleFactor;
        const h = aRect.height * scaleFactor;
        
        const pageIndex = Math.floor(y / pageH);
        const localY = y - (pageIndex * pageH);
        
        const totalPages = pdf.getNumberOfPages();
        if (pageIndex < totalPages) {
          pdf.setPage(pageIndex + 1);
          pdf.link(x, localY, w, h, { url: href });
        }
      });

      // Filename: "Título · 13.06.pdf"
      const safeName = (note.title || 'nota').replace(/[/\\?%*:|"<>]/g, '-').trim();
      const rawDate  = note.date ?? new Date().toISOString().split('T')[0];
      const [, mm, dd] = rawDate.split('-');
      const safeDate = `${dd}.${mm}`;
      pdf.save(`${safeName} · ${safeDate}.pdf`);

    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      overlay.style.cssText = prevCss;
      setExporting(false);
    }
  };

  const handleExportMarkdown = () => {
    if (!note.content) return;
    try {
      const markdownText = convertJSONToMarkdown(note.content);
      const fullMd = `# ${note.title || 'Sem título'}\n\n${markdownText}`;
      const blob = new Blob([fullMd], { type: 'text/markdown;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      const safeName = (note.title || 'nota').replace(/[/\\?%*:|"<>]/g, '-').trim();
      const rawDate  = note.date ?? new Date().toISOString().split('T')[0];
      const [, mm, dd] = rawDate.split('-');
      const safeDate = `${dd}.${mm}`;

      link.href = url;
      link.setAttribute('download', `${safeName} · ${safeDate}.md`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('Markdown exportado!', 'success');
    } catch (err) {
      console.error('Error exporting MD:', err);
      showToast('Erro ao exportar Markdown', 'error');
    }
  };

  function convertJSONToMarkdown(node: any): string {
    if (!node) return '';
    if (node.type === 'text') {
      let text = node.text || '';
      if (node.marks) {
        node.marks.forEach((mark: any) => {
          if (mark.type === 'bold') text = `**${text}**`;
          if (mark.type === 'italic') text = `*${text}*`;
          if (mark.type === 'strike') text = `~~${text}~~`;
          if (mark.type === 'code') text = `\`${text}\``;
          if (mark.type === 'link') text = `[${text}](${mark.attrs?.href})`;
        });
      }
      return text;
    }

    const childrenText = Array.isArray(node.content)
      ? node.content.map((child: any) => convertJSONToMarkdown(child)).join('')
      : '';

    switch (node.type) {
      case 'doc':
        return Array.isArray(node.content)
          ? node.content.map((child: any) => convertJSONToMarkdown(child)).join('\n\n')
          : '';
      case 'paragraph':
        return childrenText;
      case 'heading': {
        const level = node.attrs?.level || 1;
        return `${'#'.repeat(level)} ${childrenText}`;
      }
      case 'blockquote':
        return childrenText
          .split('\n')
          .map((line: string) => `> ${line}`)
          .join('\n');
      case 'codeBlock': {
        const lang = node.attrs?.language || '';
        return `\`\`\`${lang}\n${childrenText}\n\`\`\``;
      }
      case 'horizontalRule':
        return '---';
      case 'bulletList':
        return Array.isArray(node.content)
          ? node.content.map((li: any) => `* ${convertJSONToMarkdown(li).trim()}`).join('\n')
          : '';
      case 'orderedList':
        return Array.isArray(node.content)
          ? node.content.map((li: any, idx: number) => `${idx + 1}. ${convertJSONToMarkdown(li).trim()}`).join('\n')
          : '';
      case 'listItem':
        return Array.isArray(node.content)
          ? node.content.map((child: any) => convertJSONToMarkdown(child)).join('\n')
          : '';
      case 'taskList':
        return Array.isArray(node.content)
          ? node.content.map((li: any) => convertJSONToMarkdown(li)).join('\n')
          : '';
      case 'taskItem': {
        const checked = node.attrs?.checked || false;
        return `- [${checked ? 'x' : ' '}] ${childrenText.trim()}`;
      }
      case 'callout': {
        const emoji = node.attrs?.icon || '💡';
        return `> ${emoji} ${childrenText.trim()}`;
      }
      case 'fileBlock': {
        const name = node.attrs?.name || 'arquivo';
        const url = node.attrs?.url || '';
        return `[Arquivo: ${name}](${url})`;
      }
      case 'image': {
        const src = node.attrs?.src || '';
        const alt = node.attrs?.alt || '';
        return `![${alt}](${src})`;
      }
      default:
        return childrenText;
    }
  }
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
            disabled={exporting}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: '8px', cursor: exporting ? 'wait' : 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '5px 12px', opacity: exporting ? 0.6 : 1 }}
          >
            {exporting
              ? <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><Loader2 size={13} /></motion.div> Gerando PDF...</>
              : <><Printer size={13} /> Exportar PDF</>
            }
          </button>
          <button
            onClick={handleExportMarkdown}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '5px 12px' }}
            title="Exportar como Markdown (.md)"
          >
            <FileDown size={13} /> Exportar MD
          </button>
          {isOwner && (
            <button
              onClick={() => setIsDeleteModalOpen(true)}
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
                {clients.map((c, idx) => {
                  const seq = (c as any).sequential_id || idx + 1;
                  return (
                    <option key={c.id} value={c.id}>
                      {seq} - {c.nome_fantasia || c.name}
                    </option>
                  );
                })}
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

      <CustomModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={deleteNote}
        title="Excluir nota"
        message="Tem certeza que deseja excluir esta nota permanentemente? Esta ação não pode ser desfeita."
        type="confirm"
        confirmText="Excluir"
        cancelText="Cancelar"
      />
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

  const exportedAt = new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const hasClient   = !!linkedClient;
  const hasMeta     = hasClient || (note.subjects?.length ?? 0) > 0;

  return (
    <>
      <style>{`
        /* ═══════════════════════════════════════════════════════════════
           Estilos de tela (usados pelo html2canvas) — prefixados para
           não afetar o resto da UI enquanto o overlay está hidden.
           ═══════════════════════════════════════════════════════════════ */

        #note-print-overlay #print-body {
          color: #1a1a1a; font-size: 14px; line-height: 1.8;
          font-family: "Helvetica Neue", Arial, sans-serif;
        }
        #note-print-overlay #print-body > * + * { margin-top: 5px; }
        #note-print-overlay #print-body h1 { font-size: 20px; font-weight: 700; color: #111; margin: 16px 0 4px; }
        #note-print-overlay #print-body h2 { font-size: 17px; font-weight: 700; color: #111; margin: 13px 0 3px; }
        #note-print-overlay #print-body h3 { font-size: 15px; font-weight: 700; color: #333; margin: 10px 0 2px; }
        #note-print-overlay #print-body p { margin: 0 0 5px; }
        #note-print-overlay #print-body ul,
        #note-print-overlay #print-body ol { padding-left: 24px; margin: 4px 0 6px; }
        #note-print-overlay #print-body li { margin: 3px 0; }
        #note-print-overlay #print-body blockquote {
          border-left: 4px solid #d9480f; padding: 6px 14px; margin: 10px 0;
          color: #555; background: #fff8f5; border-radius: 0 4px 4px 0;
        }
        #note-print-overlay #print-body pre {
          background: #f6f6f6 !important; border-radius: 4px;
          padding: 10px 12px; font-size: 11px; margin: 8px 0;
        }
        #note-print-overlay #print-body pre code {
          font-family: "Courier New", monospace; color: #222; background: none; padding: 0;
        }
        #note-print-overlay #print-body :not(pre) > code {
          background: #f0f0f0; padding: 1px 4px; border-radius: 2px;
          font-size: 11px; font-family: "Courier New", monospace; color: #c0392b;
        }
        #note-print-overlay #print-body strong { font-weight: 700; }
        #note-print-overlay #print-body em { font-style: italic; }
        #note-print-overlay #print-body s { text-decoration: line-through; }
        #note-print-overlay #print-body hr { border: none; border-top: 1px solid #e8e8e8; margin: 14px 0; }
        #note-print-overlay #print-body img { max-width: 100%; border-radius: 4px; margin: 8px 0; display: block; }
        #note-print-overlay #print-body .editor-mention {
          background: #fff0eb; color: #d9480f; border-radius: 3px; padding: 0 4px; font-weight: 600;
        }

        /* Callout Styles in PDF */
        #note-print-overlay #print-body .editor-callout {
          display: flex; gap: 12px; padding: 12px 14px; border-radius: 6px; margin: 10px 0; align-items: flex-start;
        }
        #note-print-overlay #print-body .callout-orange { background: rgba(217, 72, 15, 0.06); border-left: 4px solid #d9480f; }
        #note-print-overlay #print-body .callout-blue { background: rgba(30, 144, 255, 0.06); border-left: 4px solid #1e90ff; }
        #note-print-overlay #print-body .callout-green { background: rgba(34, 197, 94, 0.06); border-left: 4px solid #22c55e; }
        #note-print-overlay #print-body .callout-red { background: rgba(239, 68, 68, 0.06); border-left: 4px solid #ef4444; }
        #note-print-overlay #print-body .callout-icon { font-size: 14px; user-select: none; line-height: 1.4; }
        #note-print-overlay #print-body .callout-content { flex: 1; min-width: 0; color: #1a1a1a !important; }
        #note-print-overlay #print-body .callout-content p { margin: 0; color: #1a1a1a !important; }

        /* LinkCard Styles in PDF */
        #note-print-overlay #print-body .editor-link-card {
          display: flex; background: #fafafa; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; text-decoration: none; color: #1a1a1a !important; margin: 10px 0;
        }
        #note-print-overlay #print-body .link-card-info { flex: 1; padding: 10px 14px; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
        #note-print-overlay #print-body .link-card-title { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px; color: #111 !important; }
        #note-print-overlay #print-body .link-card-desc { font-size: 11px; color: #666 !important; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4; margin-bottom: 4px; }
        #note-print-overlay #print-body .link-card-meta { display: flex; align-items: center; gap: 4px; }
        #note-print-overlay #print-body .link-card-favicon { width: 12px; height: 12px; border-radius: 2px; }
        #note-print-overlay #print-body .link-card-domain { font-size: 10px; color: #888 !important; }
        #note-print-overlay #print-body .link-card-image-wrap { width: 100px; min-height: 100%; position: relative; flex-shrink: 0; background: #f0f0f0; border-left: 1px solid #e0e0e0; }
        #note-print-overlay #print-body .link-card-image { width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0; }

        /* Anchor/Link styling in PDF */
        #note-print-overlay #print-body .editor-link, 
        #note-print-overlay #print-body a {
          color: #d9480f !important; text-decoration: underline !important;
        }

        /* Task list — corrige checkboxes para html2canvas */
        #note-print-overlay #print-body ul[data-type="taskList"] {
          list-style: none !important; padding: 0 !important; margin: 4px 0;
        }
        #note-print-overlay #print-body ul[data-type="taskList"] > li {
          display: flex !important; list-style: none !important;
          align-items: flex-start; gap: 8px; margin: 5px 0;
        }
        #note-print-overlay #print-body ul[data-type="taskList"] > li::marker { display: none; }
        #note-print-overlay #print-body ul[data-type="taskList"] > li > label {
          display: flex !important; align-items: center; flex-shrink: 0; padding-top: 2px;
        }
        #note-print-overlay #print-body ul[data-type="taskList"] > li > label input[type="checkbox"] {
          -webkit-appearance: none !important; appearance: none !important;
          width: 13px !important; height: 13px !important; margin: 0 !important;
          border: 1.5px solid #bbb !important; border-radius: 2px !important;
          background: #fff !important; display: inline-block !important;
          position: relative !important; flex-shrink: 0 !important;
        }
        #note-print-overlay #print-body ul[data-type="taskList"] > li[data-checked="true"] > label input[type="checkbox"] {
          background: #d9480f !important; border-color: #d9480f !important;
        }
        #note-print-overlay #print-body ul[data-type="taskList"] > li[data-checked="true"] > label input[type="checkbox"]::after {
          content: ''; position: absolute;
          left: 3px; top: 1px; width: 4px; height: 6px;
          border: 2px solid #fff; border-top: none; border-left: none;
          transform: rotate(44deg);
        }
        #note-print-overlay #print-body ul[data-type="taskList"] > li > div { flex: 1; padding-top: 1px; }
        #note-print-overlay #print-body ul[data-type="taskList"] > li[data-checked="true"] > div {
          text-decoration: line-through; color: #aaa;
        }

        /* ═══════════════════════════════════════════════════════════════
           @media print — fallback para window.print()
           ═══════════════════════════════════════════════════════════════ */
        @media print {
          body > * { visibility: hidden !important; }
          #note-print-overlay, #note-print-overlay * { visibility: visible !important; }
          #note-print-overlay {
            display: block !important; position: fixed !important;
            inset: 0 !important; background: #fff !important;
            padding: 0 !important; margin: 0 !important; z-index: 99999;
          }
          @page { size: A4 portrait; margin: 0; }
          #print-body { color: #1a1a1a !important; font-size: 10.5pt; line-height: 1.8; }
          #print-body ul[data-type="taskList"] { list-style: none !important; padding: 0 !important; }
          #print-body ul[data-type="taskList"] > li { display: flex !important; align-items: flex-start; gap: 7pt; margin: 4pt 0; }
          #print-body ul[data-type="taskList"] > li > label input[type="checkbox"] {
            -webkit-appearance: none !important; appearance: none !important;
            width: 9pt !important; height: 9pt !important; margin: 0 !important;
            border: 1.5pt solid #bbb !important; border-radius: 2pt !important;
            background: #fff !important; display: inline-block !important; position: relative !important;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
          }
          #print-body ul[data-type="taskList"] > li[data-checked="true"] > label input[type="checkbox"] {
            background: #d9480f !important; border-color: #d9480f !important;
          }
          #print-body ul[data-type="taskList"] > li[data-checked="true"] > div { text-decoration: line-through; color: #aaa; }
          #print-body ul[data-type="taskList"] > li > div { flex: 1; }
          #print-body .editor-mention { background: #fff0eb; color: #d9480f; border-radius: 3pt; padding: 0 4pt; font-weight: 600; }
          #print-body strong { font-weight: 700; }
          #print-body em { font-style: italic; }
          #print-body hr { border: none; border-top: 1pt solid #e8e8e8; margin: 14pt 0; }
          #print-body blockquote { border-left: 3pt solid #d9480f; padding: 6pt 14pt; margin: 10pt 0; color: #555; background: #fff8f5; }
          #print-body img { max-width: 100%; border-radius: 4pt; margin: 8pt 0; display: block; }
        }
      `}</style>

      <div id="note-print-overlay" style={{ display: 'none' }}>
        <div style={{ fontFamily: '"Helvetica Neue", Arial, sans-serif', color: '#1a1a1a', display: 'flex', flexDirection: 'column', minHeight: '1123px', width: '794px', background: '#fff' }}>

          {/* ── Header ── */}
          <div style={{ padding: '16pt 22mm 14pt', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            {/* Horizontal logo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-horizontal-preta.png"
              alt="Pratic System"
              style={{ height: '16pt', width: 'auto', objectFit: 'contain', flexShrink: 0 }}
            />
            {/* NOTA + date */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '6.5pt', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#d9480f' }}>
                Nota
              </div>
              <div style={{ fontSize: '8.5pt', color: '#999', marginTop: '2pt' }}>
                {formattedDate}
              </div>
            </div>
          </div>

          {/* ── Orange line — dentro das margens ── */}
          <div style={{ padding: '0 22mm', flexShrink: 0 }}>
            <div style={{ height: '1.5px', background: 'linear-gradient(90deg, #d9480f 0%, #f76b35 60%, rgba(217,72,15,0) 100%)', borderRadius: '1px' }} />
          </div>

          {/* ── Title ── */}
          <div style={{ padding: '18pt 22mm 0', flexShrink: 0 }}>
            <h1 style={{ fontSize: '26pt', fontWeight: 800, color: '#111', margin: 0, lineHeight: 1.15, letterSpacing: '-0.03em' }}>
              {note.title || 'Sem título'}
            </h1>
          </div>

          {/* ── Sub-header: pills only (data já está no cabeçalho) ── */}
          <div style={{ padding: '8pt 22mm 0', flexShrink: 0 }}>
            {/* Pills */}
            {hasMeta && (
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '5pt' }}>
                {hasClient && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5pt', background: '#fff3ef', border: '0.75px solid #ffd4be', borderRadius: '4px', padding: '3px 9px' }}>
                    <span style={{ fontSize: '6pt', fontWeight: 800, color: '#d9480f', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Cliente</span>
                    <span style={{ fontSize: '8.5pt', color: '#333', fontWeight: 500 }}>{linkedClient!.nome_fantasia || linkedClient!.name}</span>
                  </div>
                )}
                {(note.subjects ?? []).map(s => (
                  <div key={s} style={{ display: 'inline-flex', alignItems: 'center', background: '#f4f4f4', border: '0.75px solid #e4e4e4', borderRadius: '4px', padding: '3px 9px', fontSize: '8pt', color: '#555' }}>
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Divider before body ── */}
          <div style={{ margin: '12pt 22mm 0', height: '0.5px', background: '#eaeaea', flexShrink: 0 }} />

          {/* ── Body — populated by handleExport() ── */}
          <div id="print-body" style={{ padding: '14pt 22mm 0', flex: 1, fontSize: '10.5pt', lineHeight: 1.8, color: '#1a1a1a' }} />

          {/* ── Footer ── */}
          <div style={{ margin: '24pt 22mm 18pt', padding: '10pt 0 0', borderTop: '0.5px solid #e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ fontSize: '7.5pt', color: '#c0c0c0' }}>Exportado em {exportedAt}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-horizontal-preta.png"
              alt="Pratic System"
              style={{ height: '9pt', width: 'auto', objectFit: 'contain', opacity: 0.18 }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
