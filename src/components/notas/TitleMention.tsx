'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { supabase } from '@/lib/supabase';

export interface Mention {
  id: string;
  label: string;
  type: 'client';
}

interface ClientOption {
  id: string;
  name: string;
  nome_fantasia?: string;
}

interface TitleMentionProps {
  value: string;
  mentions: Mention[];
  onChange: (value: string, mentions: Mention[]) => void;
  placeholder?: string;
}

export default function TitleMention({
  value,
  mentions,
  onChange,
  placeholder = 'Título da nota...',
}: TitleMentionProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [query, setQuery] = useState('');
  const [mentionStart, setMentionStart] = useState(-1);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase
      .from('clients')
      .select('id, name, nome_fantasia')
      .then(({ data }) => {
        if (data) setClients(data as ClientOption[]);
      });
  }, []);

  const filteredClients = clients
    .filter(c =>
      (c.nome_fantasia || c.name).toLowerCase().includes(query.toLowerCase()),
    )
    .slice(0, 6);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart ?? 0;
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    if (atIndex !== -1 && (atIndex === 0 || newValue[atIndex - 1] === ' ')) {
      const q = textBeforeCursor.slice(atIndex + 1);
      if (!q.includes(' ')) {
        setQuery(q);
        setMentionStart(atIndex);
        setShowDropdown(true);
        setSelectedIndex(0);
      } else {
        setShowDropdown(false);
      }
    } else {
      setShowDropdown(false);
    }

    onChange(newValue, mentions);
  };

  const selectClient = (client: ClientOption) => {
    const label = client.nome_fantasia || client.name;
    const before = value.slice(0, mentionStart);
    const after = value.slice(mentionStart + query.length + 1);
    const newValue = `${before}@${label} ${after}`;
    const newMention: Mention = { id: client.id, label, type: 'client' };
    onChange(newValue, [...mentions.filter(m => m.id !== client.id), newMention]);
    setShowDropdown(false);
    requestAnimationFrame(() => {
      if (inputRef.current) {
        const pos = (before + `@${label} `).length;
        inputRef.current.setSelectionRange(pos, pos);
        inputRef.current.focus();
      }
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || !filteredClients.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => (i + 1) % filteredClients.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => (i - 1 + filteredClients.length) % filteredClients.length);
    } else if (e.key === 'Enter' && filteredClients[selectedIndex]) {
      e.preventDefault();
      selectClient(filteredClients[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        placeholder={placeholder}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          fontSize: 'clamp(1.4rem, 3.5vw, 2rem)',
          fontWeight: 700,
          color: 'white',
          padding: 0,
          fontFamily: 'inherit',
        }}
      />

      {showDropdown && filteredClients.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: 0,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '8px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          zIndex: 100,
          minWidth: '240px',
        }}>
          <p style={{
            fontSize: '0.68rem',
            color: 'var(--text-secondary)',
            padding: '2px 8px 6px',
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
          }}>
            Clientes
          </p>
          {filteredClients.map((client, idx) => {
            const label = client.nome_fantasia || client.name;
            return (
              <button
                key={client.id}
                onMouseDown={() => selectClient(client)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: idx === selectedIndex ? 'rgba(217, 72, 15, 0.15)' : 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'rgba(217, 72, 15, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: 'var(--accent)',
                  flexShrink: 0,
                }}>
                  {label.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
