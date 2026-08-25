"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, User } from "lucide-react";
import {
  activeMarkerQuery,
  applyMarkerCompletion,
  type QuickCatalogs,
} from "@/lib/quickParse";

interface Props {
  value: string;
  onChange: (value: string) => void;
  catalogs: QuickCatalogs;
  placeholder?: string;
  rows?: number;
  /** Enter com ⌘/Ctrl envia — só quando o autocomplete não está aberto. */
  onSubmit?: () => void;
  ariaLabel?: string;
}

/**
 * Textarea com autocomplete de menção: `@` para colaborador, `#` para cliente.
 * A mesma convenção do título das demandas e do editor de descrição, para não
 * haver duas gramáticas dentro do produto.
 */
export default function MentionTextarea({
  value,
  onChange,
  catalogs,
  placeholder,
  rows = 2,
  onSubmit,
  ariaLabel,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [caret, setCaret] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const marker = activeMarkerQuery(value, caret);

  const suggestions = useMemo(() => {
    if (!marker) return [];
    const pool = marker.marker === "#" ? catalogs.clients : catalogs.users;
    const query = marker.query.trim().toLowerCase();
    const matches = query
      ? pool.filter((item) => item.label.toLowerCase().includes(query))
      : pool;
    return matches.slice(0, 6);
  }, [marker, catalogs]);

  const complete = (label: string) => {
    const next = applyMarkerCompletion(value, caret, label);
    onChange(next.text);
    setCaret(next.caret);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(next.caret, next.caret);
    });
  };

  const syncCaret = () => setCaret(textareaRef.current?.selectionStart ?? 0);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % suggestions.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((index) => (index - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        complete(suggestions[activeIndex].label);
        setActiveIndex(0);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setCaret(-1); // fecha o painel sem mexer no texto
        return;
      }
    }
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      onSubmit?.();
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setCaret(event.target.selectionStart ?? 0);
          setActiveIndex(0);
        }}
        onKeyUp={syncCaret}
        onClick={syncCaret}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        rows={rows}
        style={{
          width: "100%",
          resize: "vertical",
          border: "none",
          background: "transparent",
          outline: "none",
          fontSize: "0.84rem",
          lineHeight: 1.5,
          color: "var(--text-primary)",
          fontFamily: "inherit",
        }}
      />

      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="combobox-panel"
            style={{ position: "absolute", top: "100%", left: 0, minWidth: 240, zIndex: 30 }}
          >
            <div className="combobox-list">
              {suggestions.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => {
                    event.preventDefault(); // não tira o foco do textarea
                    complete(item.label);
                  }}
                  className="combobox-option"
                  data-active={index === activeIndex || undefined}
                >
                  {marker?.marker === "#" ? <Building2 size={14} /> : <User size={14} />}
                  <span className="combobox-option-text">
                    <span className="combobox-option-label">{item.label}</span>
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
