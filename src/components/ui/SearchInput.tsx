"use client";

import { Search, X, Command } from "lucide-react";
import { useRef, useState } from "react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  shortcut?: string;
}

export default function SearchInput({
  value,
  onChange,
  placeholder = "Buscar...",
  className = "",
  shortcut = "⌘K"
}: SearchInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={`glass-card ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '10px 18px',
        borderRadius: '100px',
        gap: '12px',
        border: isFocused ? '1px solid var(--accent)' : '1px solid var(--border)',
        boxShadow: isFocused ? '0 0 0 3px rgba(217, 72, 15, 0.15)' : 'var(--shadow-glow)',
        background: 'var(--bg-secondary)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        width: '100%',
        maxWidth: '450px'
      }}
    >
      <Search size={18} color={value || isFocused ? "var(--accent)" : "var(--text-tertiary)"} style={{ transition: 'color 0.2s' }} />

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          color: 'var(--text-primary)',
          fontSize: '0.95rem',
          outline: 'none',
          minWidth: 0
        }}
      />

      {value ? (
        <button
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border)',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
            e.currentTarget.style.color = '#EF4444';
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
        >
          <X size={14} />
        </button>
      ) : shortcut ? (
        <div
          className="hide-mobile"
          style={{
            background: 'rgba(255,255,255,0.05)',
            padding: '2px 8px',
            borderRadius: '100px',
            fontSize: '0.7rem',
            color: 'var(--text-tertiary)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontFamily: 'monospace'
          }}
        >
          {shortcut}
        </div>
      ) : null}
    </div>
  );
}
