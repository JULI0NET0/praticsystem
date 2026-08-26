"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { computePosition, flip, offset, shift, size } from "@floating-ui/dom";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, CalendarClock, Clock, Flag, User } from "lucide-react";
import {
  activeMarkerQuery,
  applyMarkerCompletion,
  parseQuickInput,
  type QuickCatalogs,
  type QuickParseResult,
  type QuickTokenKind,
} from "@/lib/quickParse";
import { formatDueDateLabel } from "@/lib/dueDate";
import { clientLabel, PRIORITY_COLORS, PRIORITY_LABELS } from "@/types/demandas";
import { useDemandas } from "./DemandasProvider";

const TOKEN_ICON: Record<QuickTokenKind, typeof Building2> = {
  client: Building2,
  assignee: User,
  priority: Flag,
  date: CalendarClock,
  time: Clock,
};

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (parsed: QuickParseResult) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** Mostra a legenda dos atalhos sob o campo. */
  showHint?: boolean;
}

/**
 * Campo de título com atalhos digitáveis: `#cliente`, `@responsável`,
 * `P1`, data e hora. Enquanto se digita `#`/`@` abre um autocomplete;
 * o que é reconhecido vira chip abaixo e sai do texto ao salvar.
 */
export default function QuickAddInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Ex.: Ajustar banner #Cliente @Responsável sexta 14h P1",
  autoFocus,
  showHint = true,
}: Props) {
  const { clients, users } = useDemandas();
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [caret, setCaret] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const catalogs = useMemo<QuickCatalogs>(
    () => ({
      clients: clients.map((client) => ({
        id: client.id,
        label: clientLabel(client),
        alias: client.name,
      })),
      users: users.map((user) => ({
        id: user.id,
        label: user.username || user.name || user.email,
        alias: user.name,
      })),
    }),
    [clients, users],
  );

  const parsed = useMemo(
    () => parseQuickInput(value, catalogs),
    [value, catalogs],
  );

  const marker = activeMarkerQuery(value, caret);
  const suggestions = useMemo(() => {
    if (!marker) return [];
    const query = marker.query.trim().toLowerCase();

    if (marker.marker === "#") {
      // Clientes: preferência por clientes ativos.
      // Sem query -> lista apenas ativos
      // Com query -> busca ativos primeiro, e inativos identificados depois
      const activeClients = clients.filter(
        (c) => !c.status || c.status === "active" || c.status === "prospect",
      );
      const inactiveClients = clients.filter((c) => c.status === "inactive");

      if (!query) {
        return activeClients.slice(0, 7).map((c) => ({
          id: c.id,
          label: clientLabel(c),
          alias: c.name,
          isInactive: false,
        }));
      }

      const matchFn = (c: (typeof clients)[0]) => {
        const label = clientLabel(c).toLowerCase();
        const name = (c.name || "").toLowerCase();
        return label.includes(query) || name.includes(query);
      };

      const matchedActive = activeClients.filter(matchFn).map((c) => ({
        id: c.id,
        label: clientLabel(c),
        alias: c.name,
        isInactive: false,
      }));

      const matchedInactive = inactiveClients.filter(matchFn).map((c) => ({
        id: c.id,
        label: clientLabel(c),
        alias: `${c.name} (Inativo)`,
        isInactive: true,
      }));

      return [...matchedActive, ...matchedInactive].slice(0, 7);
    }

    // Colaboradores / Usuários (@)
    const pool = catalogs.users;
    const matches = query
      ? pool.filter(
          (item) =>
            item.label.toLowerCase().includes(query) ||
            (item.alias && item.alias.toLowerCase().includes(query)),
        )
      : pool;
    return matches.slice(0, 6).map((u) => ({ ...u, isInactive: false }));
  }, [marker, clients, catalogs.users]);

  // Posicionamento inteligente (Floating UI + Portal):
  // Se estiver no rodapé da página ou na última linha, abre para CIMA (flip),
  // garantindo sobreposição e visibilidade total sobre outros elementos.
  useLayoutEffect(() => {
    if (suggestions.length === 0) return;
    const input = inputRef.current;
    const panel = panelRef.current;
    if (!input || !panel) return;

    let active = true;
    const place = () => {
      computePosition(input, panel, {
        placement: "bottom-start",
        middleware: [
          offset(6),
          flip({ fallbackPlacements: ["top-start", "bottom-end", "top-end"] }),
          shift({ padding: 12 }),
          size({
            padding: 12,
            apply({ availableHeight, rects }) {
              Object.assign(panel.style, {
                maxHeight: `${Math.max(160, Math.min(availableHeight, 300))}px`,
                minWidth: `${Math.max(rects.reference.width, 240)}px`,
              });
            },
          }),
        ],
      }).then(({ x, y }) => {
        if (!active) return;
        Object.assign(panel.style, { left: `${x}px`, top: `${y}px` });
      });
    };

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      active = false;
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [suggestions.length]);

  const complete = (label: string) => {
    const next = applyMarkerCompletion(value, caret, label);
    onChange(next.text);
    setCaret(next.caret);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(next.caret, next.caret);
    });
  };

  const syncCaret = () => setCaret(inputRef.current?.selectionStart ?? 0);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
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
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (parsed.title.trim()) onSubmit(parsed);
    }
  };

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 6 }}>
      <input
        ref={inputRef}
        value={value}
        autoFocus={autoFocus}
        onChange={(event) => {
          onChange(event.target.value);
          setCaret(event.target.selectionStart ?? 0);
          setActiveIndex(0);
        }}
        onKeyUp={syncCaret}
        onClick={syncCaret}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{
          width: "100%",
          minWidth: 0,
          border: "none",
          background: "transparent",
          outline: "none",
          fontSize: "0.88rem",
          fontWeight: 600,
          color: "var(--text-primary)",
          fontFamily: "inherit",
        }}
      />

      {/* Chips do que foi reconhecido */}
      {parsed.tokens.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {parsed.tokens.map((token, index) => {
            const Icon = TOKEN_ICON[token.kind];
            const label =
              token.kind === "date"
                ? formatDueDateLabel(parsed.dueDate).label
                : token.kind === "priority" && parsed.priority
                  ? PRIORITY_LABELS[parsed.priority]
                  : token.label;
            const color =
              token.kind === "priority" && parsed.priority
                ? PRIORITY_COLORS[parsed.priority]
                : "var(--accent)";

            return (
              <span
                key={`${token.kind}-${index}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 8px",
                  borderRadius: "var(--radius-badge)",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  color,
                  background: "color-mix(in oklab, currentColor 12%, transparent)",
                  border: "1px solid color-mix(in oklab, currentColor 28%, transparent)",
                }}
              >
                <Icon size={11} />
                {label}
              </span>
            );
          })}
        </div>
      )}

      {showHint && parsed.tokens.length === 0 && (
        <span style={{ fontSize: "0.68rem", color: "var(--text-tertiary)" }}>
          <strong>#</strong> cliente · <strong>@</strong> responsável ·{" "}
          <strong>P1–P4</strong> prioridade · <strong>sexta</strong>, <strong>amanhã</strong>,{" "}
          <strong>03/09</strong> · <strong>14h</strong>
        </span>
      )}

      {/* Autocomplete em Portal: sempre sobreposto (z-index alto) e com flip automático */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {suggestions.length > 0 && (
              <motion.div
                ref={panelRef}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
                className="combobox-panel"
                style={{ position: "fixed", zIndex: 9999 }}
              >
                <div className="combobox-list">
                  {suggestions.map((item, index) => {
                    const displayLabel =
                      marker?.marker === "@"
                        ? `@${item.label.replace(/^@/, "")}`
                        : item.label;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onMouseEnter={() => setActiveIndex(index)}
                        onMouseDown={(event) => {
                          event.preventDefault(); // não tira o foco do input
                          complete(item.label);
                        }}
                        className="combobox-option"
                        data-active={index === activeIndex || undefined}
                      >
                        {marker?.marker === "#" ? <Building2 size={14} /> : <User size={14} />}
                        <span className="combobox-option-text">
                          <span className="combobox-option-label">{displayLabel}</span>
                          {item.alias && item.alias !== item.label && (
                            <span className="combobox-option-description">{item.alias}</span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
