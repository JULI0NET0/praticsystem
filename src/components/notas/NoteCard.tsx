'use client';

import Link from 'next/link';
import { Calendar, BookmarkCheck, Trash2 } from 'lucide-react';

export interface NoteCardData {
  id: string;
  title: string;
  content: any;
  date?: string;
  subjects?: string[];
  updated_at?: string;
  created_at?: string;
  pin_to_client?: boolean;
  client?: { id: string; name: string; nome_fantasia?: string } | null;
}

function getPreviewText(content: any): string {
  if (!content) return '';
  
  const extractText = (node: any): string => {
    if (!node) return '';
    if (node.text) return node.text;
    if (Array.isArray(node.content)) {
      return node.content.map(extractText).join('');
    }
    return '';
  };

  const blocks: any[] = Array.isArray(content) ? content : content.content ?? [];
  for (const block of blocks) {
    const text = extractText(block).trim();
    if (text) return text.slice(0, 140);
  }
  return '';
}

function formatDate(str?: string): string {
  if (!str) return '';
  return new Date(str).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export default function NoteCard({ note, onClick, onDelete }: { note: NoteCardData; onClick?: () => void; onDelete?: (note: NoteCardData) => void }) {
  const preview = getPreviewText(note.content);
  const clientName = note.client
    ? note.client.nome_fantasia || note.client.name
    : null;
  const dateStr = note.updated_at || note.created_at || note.date;

  const inner = (
      <div
        onClick={onClick}
        style={{
          padding: '20px',
          borderRadius: '16px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          cursor: 'pointer',
          height: '100%',
          minHeight: '140px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          transition: 'border-color 0.2s, transform 0.2s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(217, 72, 15, 0.35)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
          (e.currentTarget as HTMLElement).style.transform = 'none';
        }}
      >
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <h3 style={{
            fontWeight: 600, fontSize: '0.95rem', color: 'white',
            lineHeight: 1.4, margin: 0, flex: 1,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {note.title || 'Sem título'}
          </h3>
          {note.pin_to_client && (
            <BookmarkCheck size={14} color="var(--accent)" style={{ flexShrink: 0, marginTop: '2px', opacity: 0.8 }} />
          )}
        </div>

        {/* Preview */}
        {preview ? (
          <p style={{
            fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.55,
            margin: 0, flex: 1,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {preview}
          </p>
        ) : (
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.2)', margin: 0, flex: 1, fontStyle: 'italic' }}>
            Nota vazia
          </p>
        )}

        {/* Subjects */}
        {(note.subjects ?? []).length > 0 && (
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            {(note.subjects ?? []).slice(0, 3).map(s => (
              <span key={s} style={{
                fontSize: '0.68rem', fontWeight: 600,
                background: 'rgba(217, 72, 15, 0.1)', color: 'var(--accent)',
                padding: '2px 8px', borderRadius: '20px',
                border: '1px solid rgba(217, 72, 15, 0.2)',
              }}>
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 'auto', paddingTop: '8px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            <Calendar size={11} />
            {formatDate(dateStr)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {clientName && (
              <span style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600 }}>
                {clientName}
              </span>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(note);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.15s, background 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.background = 'none';
                }}
                title="Excluir nota"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
  );

  if (onClick) return inner;
  return (
    <Link href={`/admin/notas/${note.id}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
      {inner}
    </Link>
  );
}
