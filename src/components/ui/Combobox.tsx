"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { computePosition, flip, offset, shift, size } from "@floating-ui/dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Search, X } from "lucide-react";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Texto extra considerado na busca (ex.: razão social de um cliente). */
  keywords?: string;
  /** Bolinha colorida à esquerda — status, prioridade. */
  color?: string;
  /** Substitui a bolinha (avatar, ícone). */
  icon?: ReactNode;
  description?: string;
}

interface BaseProps {
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  /** Some com a busca quando a lista é curta demais para justificá-la. */
  searchThreshold?: number;
  disabled?: boolean;
  ariaLabel?: string;
  /** Largura do painel; por padrão acompanha a do gatilho. */
  panelWidth?: number;
  /** Conteúdo do gatilho. Sem isto, o rótulo é montado a partir da seleção. */
  renderTrigger?: (state: { selected: ComboboxOption[]; open: boolean }) => ReactNode;
  /** Linha fixa no topo da lista (ex.: "Sem cliente", "Time todo"). */
  clearOption?: { label: string; icon?: ReactNode };
}

interface SingleProps extends BaseProps {
  multiple?: false;
  value: string | null;
  onChange: (value: string | null) => void;
}

interface MultiProps extends BaseProps {
  multiple: true;
  value: string[];
  onChange: (value: string[]) => void;
}

export type ComboboxProps = SingleProps | MultiProps;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Dropdown único da aplicação: gatilho + painel com busca e seleção
 * (simples ou múltipla). Substitui os <select> nativos, que renderizavam
 * com o chrome do sistema operacional e destoavam da interface.
 *
 * O painel vai para um portal no body e é posicionado com floating-ui,
 * senão ele é cortado dentro de drawers, modais e colunas com overflow.
 */
export default function Combobox(props: ComboboxProps) {
  const {
    options,
    placeholder = "Selecionar",
    searchPlaceholder = "Buscar…",
    searchThreshold = 7,
    disabled,
    ariaLabel,
    panelWidth,
    renderTrigger,
    clearOption,
  } = props;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const selectedValues = useMemo(
    () => (props.multiple ? props.value : props.value ? [props.value] : []),
    [props.multiple, props.value],
  );

  const selected = useMemo(
    () => options.filter((option) => selectedValues.includes(option.value)),
    [options, selectedValues],
  );

  const filtered = useMemo(() => {
    const term = normalize(query.trim());
    if (!term) return options;
    return options.filter((option) =>
      normalize(`${option.label} ${option.keywords ?? ""} ${option.description ?? ""}`).includes(
        term,
      ),
    );
  }, [options, query]);

  const showSearch = options.length >= searchThreshold;

  // Posicionamento: flip resolve a borda de baixo, shift segura na viewport
  // e size limita a altura ao espaço livre.
  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;

    let active = true;
    const place = () => {
      computePosition(trigger, panel, {
        placement: "bottom-start",
        middleware: [
          offset(6),
          flip({ fallbackPlacements: ["top-start", "bottom-end", "top-end"] }),
          shift({ padding: 12 }),
          size({
            padding: 12,
            apply({ availableHeight, rects }) {
              Object.assign(panel.style, {
                maxHeight: `${Math.max(180, Math.min(availableHeight, 380))}px`,
                minWidth: `${panelWidth ?? Math.max(rects.reference.width, 200)}px`,
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
  }, [open, panelWidth, filtered.length]);

  // Abrir/fechar zera busca e destaque. Ajuste durante o render (padrão do
  // React para estado derivado), em vez de um setState dentro do efeito.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    setQuery("");
    setActiveIndex(0);
  }

  useEffect(() => {
    if (!open) return;
    // Foco na busca só quando ela existe; senão o painel recebe o foco
    const timer = window.setTimeout(() => searchRef.current?.focus(), 10);

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  const commit = useCallback(
    (value: string | null) => {
      if (props.multiple) {
        if (value === null) {
          props.onChange([]);
          setOpen(false);
          return;
        }
        const next = props.value.includes(value)
          ? props.value.filter((item) => item !== value)
          : [...props.value, value];
        props.onChange(next);
        return; // múltipla escolha mantém o painel aberto
      }
      props.onChange(value);
      setOpen(false);
    },
    [props],
  );

  const rows = useMemo(() => {
    const list: ({ kind: "clear" } | { kind: "option"; option: ComboboxOption })[] = [];
    if (clearOption && !query.trim()) list.push({ kind: "clear" });
    for (const option of filtered) list.push({ kind: "option", option });
    return list;
  }, [clearOption, filtered, query]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, rows.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const row = rows[activeIndex];
      if (!row) return;
      commit(row.kind === "clear" ? null : row.option.value);
    }
  };

  const triggerLabel = selected.length
    ? props.multiple && selected.length > 1
      ? `${selected.length} selecionados`
      : selected[0].label
    : clearOption && !selectedValues.length
      ? clearOption.label
      : placeholder;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((value) => !value)}
        className="combobox-trigger"
        data-open={open || undefined}
      >
        {renderTrigger ? (
          renderTrigger({ selected, open })
        ) : (
          <>
            {selected[0]?.icon ??
              (selected[0]?.color ? (
                <span className="combobox-dot" style={{ background: selected[0].color }} />
              ) : null)}
            <span className="combobox-trigger-label">{triggerLabel}</span>
          </>
        )}
        <ChevronDown size={14} className="combobox-chevron" />
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={panelRef}
                id={listId}
                role="listbox"
                aria-multiselectable={props.multiple || undefined}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
                onKeyDown={onKeyDown}
                className="combobox-panel"
              >
                {showSearch && (
                  <div className="combobox-search">
                    <Search size={13} />
                    <input
                      ref={searchRef}
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value);
                        setActiveIndex(0);
                      }}
                      placeholder={searchPlaceholder}
                      aria-label={searchPlaceholder}
                    />
                    {query && (
                      <button type="button" onClick={() => setQuery("")} aria-label="Limpar busca">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                )}

                <div className="combobox-list">
                  {rows.map((row, index) => {
                    const isClear = row.kind === "clear";
                    const option = isClear ? null : row.option;
                    const isSelected = isClear
                      ? selectedValues.length === 0
                      : selectedValues.includes(option!.value);

                    return (
                      <button
                        key={isClear ? "__clear__" : option!.value}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => commit(isClear ? null : option!.value)}
                        className="combobox-option"
                        data-active={index === activeIndex || undefined}
                        data-selected={isSelected || undefined}
                      >
                        {isClear
                          ? (clearOption!.icon ?? <span className="combobox-dot combobox-dot-empty" />)
                          : (option!.icon ??
                            (option!.color ? (
                              <span className="combobox-dot" style={{ background: option!.color }} />
                            ) : (
                              <span className="combobox-dot combobox-dot-empty" />
                            )))}

                        <span className="combobox-option-text">
                          <span className="combobox-option-label">
                            {isClear ? clearOption!.label : option!.label}
                          </span>
                          {!isClear && option!.description && (
                            <span className="combobox-option-description">
                              {option!.description}
                            </span>
                          )}
                        </span>

                        {isSelected && <Check size={14} className="combobox-check" />}
                      </button>
                    );
                  })}

                  {rows.length === 0 && (
                    <span className="combobox-empty">Nada encontrado.</span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
