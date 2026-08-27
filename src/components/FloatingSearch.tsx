"use client";

import {
  Command, Search as SearchIcon, User, Building2, Briefcase,
  ArrowRight, FileText, Calendar, DollarSign, BookOpen, ListChecks,
  Plus, LayoutGrid, List, Sparkles, CheckCircle2, CornerDownLeft
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

type ResultType = 'action' | 'demand' | 'client' | 'contract' | 'event' | 'note' | 'service' | 'user' | 'invoice';

type SearchResult = {
  id: string;
  type: ResultType;
  title: string;
  subtitle: string;
  url: string;
  badge?: string;
};

const TYPE_META: Record<ResultType, { label: string; Icon: React.ComponentType<{ size?: number; color?: string }> }> = {
  action:   { label: 'Ações Rápidas', Icon: Command },
  demand:   { label: 'Demandas',     Icon: ListChecks },
  client:   { label: 'Clientes',     Icon: Building2 },
  contract: { label: 'Contratos',    Icon: FileText },
  event:    { label: 'Agenda',       Icon: Calendar },
  note:     { label: 'Notas',        Icon: BookOpen },
  service:  { label: 'Serviços',     Icon: Briefcase },
  user:     { label: 'Equipe',       Icon: User },
  invoice:  { label: 'Financeiro',   Icon: DollarSign },
};

const DEFAULT_ACTIONS: SearchResult[] = [
  { id: 'act-new-demand', type: 'action', title: 'Lançar Nova Demanda', subtitle: 'Abre o formulário para criar uma demanda imediatamente', url: '/admin/demandas?action=new', badge: 'Atalho [N]' },
  { id: 'act-view-list', type: 'action', title: 'Ver Demandas em Lista', subtitle: 'Modo de visualização em tabela/lista de demandas', url: '/admin/demandas?view=list', badge: 'Atalho [L]' },
  { id: 'act-view-board', type: 'action', title: 'Ver Demandas em Kanban', subtitle: 'Quadro visual por status da operação', url: '/admin/demandas?view=board', badge: 'Atalho [K]' },
  { id: 'act-contracts', type: 'action', title: 'Localizar Dados de Contrato', subtitle: 'Ver contratos, valores, clientes e status', url: '/admin/contracts', badge: 'Contratos' },
  { id: 'act-agenda', type: 'action', title: 'Agenda de Compromissos', subtitle: 'Visualizar a agenda completa e eventos da agência', url: '/admin/schedule', badge: 'Agenda' },
];

const DISPLAY_ORDER: ResultType[] = ['action', 'demand', 'client', 'contract', 'event', 'note', 'service', 'user', 'invoice'];

export default function FloatingSearch() {
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentDemands, setRecentDemands] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const close = () => {
    setIsOpen(false);
    setQuery("");
    setResults([]);
    setSelectedIndex(0);
  };

  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev);
    window.addEventListener('toggle-search', handleToggle);
    return () => window.removeEventListener('toggle-search', handleToggle);
  }, []);

  // Ao abrir o modal, foca o input e carrega o resumo rápido das demandas abertas
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);

      const fetchRecentDemands = async () => {
        try {
          const { data } = await supabase
            .from('demands')
            .select('id, title, priority, status_category, clients(name)')
            .neq('status_category', 'fechado')
            .order('created_at', { ascending: false })
            .limit(5);

          if (data && data.length > 0) {
            const formatted: SearchResult[] = data.map((d: any) => {
              const clientName = d.clients?.name ? ` • ${d.clients.name}` : '';
              const prioMap: Record<string, string> = {
                urgent: 'P1 Urgente',
                high: 'P2 Alta',
                medium: 'P3 Média',
                low: 'P4 Baixa',
                none: 'Normal'
              };
              return {
                id: `d-${d.id}`,
                type: 'demand',
                title: d.title,
                subtitle: `Demanda${clientName} • ${prioMap[d.priority] || 'Pendente'}`,
                url: `/admin/demandas?d=${d.id}`,
                badge: prioMap[d.priority] || 'Aberta'
              };
            });
            setRecentDemands(formatted);
          }
        } catch (err) {
          console.error("Erro ao carregar resumo de demandas:", err);
        }
      };

      fetchRecentDemands();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Busca geral no banco de dados
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    const search = async () => {
      const q = query.toLowerCase();
      const all: SearchResult[] = [];

      // Ações rápidas correspondentes
      const matchedActions = DEFAULT_ACTIONS.filter(
        a => a.title.toLowerCase().includes(q) || a.subtitle.toLowerCase().includes(q)
      );
      all.push(...matchedActions);

      try {
        const [
          { data: demandData },
          { data: clientData },
          { data: userData },
          { data: serviceData },
          { data: notesData },
          { data: eventsData },
          { data: invoiceData },
        ] = await Promise.all([
          supabase.from('demands').select('id, title, priority, status_category, clients(name)').or(`title.ilike.%${q}%,description.ilike.%${q}%`).limit(5),
          supabase.from('clients').select('id, name, cnpj, status').or(`name.ilike.%${q}%,cnpj.ilike.%${q}%`).limit(4),
          supabase.from('users').select('id, name, username').or(`name.ilike.%${q}%,username.ilike.%${q}%`).limit(3),
          supabase.from('services').select('id, name, price').ilike('name', `%${q}%`).limit(3),
          supabase.from('notes').select('id, title, subjects').ilike('title', `%${q}%`).limit(3),
          supabase.from('agenda_events').select('id, title, type, date').ilike('title', `%${q}%`).limit(3),
          supabase.from('invoices').select('id, description, amount, status').ilike('description', `%${q}%`).limit(3),
        ]);

        demandData?.forEach((d: any) => {
          const clientName = d.clients?.name ? ` • ${d.clients.name}` : '';
          const statusText = d.status_category === 'fechado' ? 'Concluída' : 'Em andamento';
          all.push({
            id: `d-${d.id}`,
            type: 'demand',
            title: d.title,
            subtitle: `Demanda${clientName} • ${statusText} • Prioridade ${d.priority?.toUpperCase() || 'P3'}`,
            url: `/admin/demandas?d=${d.id}`,
            badge: d.status_category === 'fechado' ? 'Concluída' : 'Aberta'
          });
        });

        clientData?.forEach((c: any) => {
          const statusSuffix = c.status === 'inactive' ? ' (Inativo)' : '';
          all.push({
            id: `c-${c.id}`,
            type: 'client',
            title: `${c.name}${statusSuffix}`,
            subtitle: `Cliente • CNPJ/Doc: ${c.cnpj || '—'}${c.status === 'inactive' ? ' • Inativo' : ''}`,
            url: `/admin/clients/${c.id}`,
            badge: c.status === 'inactive' ? 'Inativo' : 'Cliente'
          });
        });

        userData?.forEach(u =>
          all.push({ id: `u-${u.id}`, type: 'user', title: u.name, subtitle: `Equipe • @${u.username}`, url: `/admin/users` })
        );

        serviceData?.forEach(s =>
          all.push({ id: `s-${s.id}`, type: 'service', title: s.name, subtitle: `Serviço • R$ ${s.price}`, url: `/admin/services` })
        );

        notesData?.forEach(n => {
          const tags = n.subjects?.slice(0, 2).join(', ');
          all.push({ id: `n-${n.id}`, type: 'note', title: n.title, subtitle: tags ? `Nota • ${tags}` : 'Nota', url: `/admin/notas/${n.id}` });
        });

        eventsData?.forEach(e => {
          const date = new Date(e.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
          all.push({ id: `ev-${e.id}`, type: 'event', title: e.title, subtitle: `Agenda • ${date}`, url: `/admin/schedule` });
        });

        invoiceData?.forEach(i => {
          const amount = `R$ ${Number(i.amount).toFixed(2).replace('.', ',')}`;
          const status = i.status === 'paid' ? 'Pago' : i.status === 'overdue' ? 'Vencido' : 'Pendente';
          all.push({ id: `inv-${i.id}`, type: 'invoice', title: i.description || 'Fatura', subtitle: `Financeiro • ${amount} • ${status}`, url: `/admin/financeiro` });
        });

        // Contratos vinculados aos clientes localizados
        if (clientData && clientData.length > 0) {
          const clientIds = clientData.map(c => c.id);
          const { data: contractData } = await supabase
            .from('contracts')
            .select('id, status, value, clients(name), services(name)')
            .in('client_id', clientIds)
            .limit(3);

          contractData?.forEach((ct: any) => {
            const statusLabel = ct.status === 'active' ? 'Ativo' : ct.status === 'expiring' ? 'Vencendo' : 'Expirado';
            const valueFormatted = ct.value ? `R$ ${Number(ct.value).toLocaleString('pt-BR')}` : '';
            all.push({
              id: `ct-${ct.id}`,
              type: 'contract',
              title: ct.clients?.name || 'Contrato',
              subtitle: `Contrato • ${ct.services?.name || 'Serviço'} ${valueFormatted ? '• ' + valueFormatted : ''} • Status: ${statusLabel}`,
              url: `/admin/contracts`,
              badge: statusLabel
            });
          });
        }

        setResults(all);
        setSelectedIndex(0);
      } catch (err) {
        console.error("Erro na busca:", err);
      }
    };

    const t = setTimeout(search, 200);
    return () => clearTimeout(t);
  }, [query]);

  const handleNavigate = (url: string) => {
    router.push(url);
    close();
  };

  const displayList = useMemo(() => {
    if (query.trim()) return results;
    return [...DEFAULT_ACTIONS, ...recentDemands];
  }, [query, results, recentDemands]);

  const grouped = useMemo(() => {
    return DISPLAY_ORDER.reduce<{ type: ResultType; items: SearchResult[] }[]>((acc, type) => {
      const items = displayList.filter(r => r.type === type);
      if (items.length > 0) acc.push({ type, items });
      return acc;
    }, []);
  }, [displayList]);

  // Lista linearizada de todos os itens exibidos para controle exato de navegação por setas
  const flatResults = useMemo(() => {
    return grouped.flatMap(g => g.items);
  }, [grouped]);

  // Mantém o item selecionado visível dentro do container com rolagem suave
  useEffect(() => {
    const currentItem = flatResults[selectedIndex];
    if (currentItem) {
      const el = itemRefs.current.get(currentItem.id);
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex, flatResults]);

  // Navegação por teclado: Setinhas (ArrowUp / ArrowDown) e Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (flatResults.length === 0) {
      if (e.key === 'Escape') close();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % flatResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatResults.length) % flatResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const current = flatResults[selectedIndex];
      if (current) {
        handleNavigate(current.url);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={close}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            paddingTop: '12vh', paddingLeft: '16px', paddingRight: '16px',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '600px',
              background: 'var(--color-surface-raised, #161618)',
              borderRadius: '20px',
              border: '1px solid var(--border)',
              boxShadow: '0 28px 72px rgba(0,0,0,0.7), inset 0 1px 1px var(--color-border-subtle)',
              overflow: 'hidden',
              maxHeight: '78vh',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Input row */}
            <div style={{
              display: 'flex', alignItems: 'center',
              padding: '14px 18px', gap: '12px',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0,
              background: 'var(--color-surface-sunken)',
            }}>
              <SearchIcon size={18} color={query ? "var(--accent)" : "var(--text-secondary)"} style={{ flexShrink: 0 }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar demandas, contratos, clientes, ou use as setinhas..."
                style={{
                  flex: 1, background: 'transparent', border: 'none',
                  color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none',
                  fontWeight: 500,
                }}
              />
              <button
                onClick={close}
                style={{
                  background: 'var(--color-surface-raised)', border: '1px solid var(--border)',
                  borderRadius: '8px', padding: '3px 8px',
                  fontSize: '0.7rem', color: 'var(--text-secondary)',
                  cursor: 'pointer', flexShrink: 0,
                  fontWeight: 600,
                }}
              >
                ESC
              </button>
            </div>

            {/* Grouped results */}
            <div style={{ overflowY: 'auto', padding: '8px', flex: 1 }}>
              {grouped.map(({ type, items }, gi) => {
                const { label, Icon } = TYPE_META[type];
                return (
                  <div key={type} style={{ marginBottom: gi < grouped.length - 1 ? '10px' : 0 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '8px 14px 4px',
                      color: 'var(--text-secondary)', fontSize: '0.68rem',
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
                    }}>
                      <Icon size={12} color="var(--accent)" />
                      {label}
                      {type === 'demand' && !query.trim() && (
                        <span style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', textTransform: 'none', fontWeight: 500, marginLeft: 'auto' }}>
                          Recentes em aberto
                        </span>
                      )}
                    </div>
                    {items.map((result) => {
                      const { Icon: ItemIcon } = TYPE_META[result.type];
                      const flatIndex = flatResults.findIndex(r => r.id === result.id);
                      const isSelected = flatIndex === selectedIndex;

                      return (
                        <button
                          key={result.id}
                          ref={(el) => {
                            if (el) itemRefs.current.set(result.id, el);
                            else itemRefs.current.delete(result.id);
                          }}
                          onClick={() => handleNavigate(result.url)}
                          onMouseEnter={() => setSelectedIndex(flatIndex)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '10px 14px', borderRadius: '12px',
                            background: isSelected
                              ? 'color-mix(in oklab, var(--accent) 15%, var(--color-surface-sunken))'
                              : 'transparent',
                            border: isSelected
                              ? '1px solid color-mix(in oklab, var(--accent) 45%, transparent)'
                              : '1px solid transparent',
                            color: 'var(--text-primary)', cursor: 'pointer',
                            textAlign: 'left', width: '100%',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '10px',
                            backgroundColor: isSelected
                              ? 'color-mix(in oklab, var(--accent) 25%, transparent)'
                              : 'var(--color-surface-sunken)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                            flexShrink: 0,
                            transition: 'all 0.15s ease',
                          }}>
                            {result.id === 'act-new-demand' ? <Plus size={16} /> :
                             result.id === 'act-view-list' ? <List size={16} /> :
                             result.id === 'act-view-board' ? <LayoutGrid size={16} /> :
                             <ItemIcon size={15} />}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <p style={{
                                fontWeight: isSelected ? 700 : 600,
                                fontSize: '0.875rem', margin: 0,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                color: isSelected ? 'var(--text-primary)' : 'inherit',
                              }}>
                                {result.title}
                              </p>
                              {result.badge && (
                                <span style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                  backgroundColor: isSelected
                                    ? 'color-mix(in oklab, var(--accent) 25%, transparent)'
                                    : 'color-mix(in oklab, var(--accent) 12%, transparent)',
                                  color: 'var(--accent)',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em'
                                }}>
                                  {result.badge}
                                </span>
                              )}
                            </div>
                            <p style={{
                              fontSize: '0.725rem',
                              color: isSelected ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                              margin: '2px 0 0 0',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                            }}>
                              {result.subtitle}
                            </p>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            {isSelected && (
                              <span style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '6px',
                                background: 'var(--accent)',
                                color: '#ffffff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                              }}>
                                ↵ Abrir
                              </span>
                            )}
                            <ArrowRight
                              size={14}
                              color={isSelected ? "var(--accent)" : "var(--text-secondary)"}
                              opacity={isSelected ? 1 : 0.4}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}

              {flatResults.length === 0 && (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  <p style={{ margin: 0, fontSize: '0.88rem' }}>Nenhum resultado encontrado para &ldquo;{query}&rdquo;</p>
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', opacity: 0.7 }}>Tente buscar pelo título da demanda, nome do cliente ou compromisso.</p>
                </div>
              )}
            </div>

            {/* Hint footer */}
            <div style={{
              padding: '10px 18px',
              borderTop: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              color: 'var(--text-secondary)', fontSize: '0.75rem',
              backgroundColor: 'var(--color-surface-sunken)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <kbd style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--border)', borderRadius: '4px', padding: '1px 5px', fontSize: '0.68rem', fontWeight: 700 }}>↑</kbd>
                  <kbd style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--border)', borderRadius: '4px', padding: '1px 5px', fontSize: '0.68rem', fontWeight: 700 }}>↓</kbd>
                  Navegar
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <kbd style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--border)', borderRadius: '4px', padding: '1px 5px', fontSize: '0.68rem', fontWeight: 700 }}>↵</kbd>
                  Abrir
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <kbd style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--border)', borderRadius: '4px', padding: '1px 5px', fontSize: '0.68rem', fontWeight: 700 }}>ESC</kbd>
                  Fechar
                </span>
              </div>
              <span style={{ fontSize: '0.7rem', opacity: 0.8, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <kbd style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--border)', borderRadius: '4px', padding: '1px 5px', fontSize: '0.68rem', fontWeight: 700 }}>⌘K</kbd>
                Atalho
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

