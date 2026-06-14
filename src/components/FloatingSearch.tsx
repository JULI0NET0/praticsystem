"use client";

import {
  Command, Search as SearchIcon, User, Building2, Briefcase,
  ArrowRight, FileText, Calendar, DollarSign, BookOpen,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

type ResultType = 'client' | 'user' | 'service' | 'contract' | 'note' | 'event' | 'invoice';

type SearchResult = {
  id: string;
  type: ResultType;
  title: string;
  subtitle: string;
  url: string;
};

const TYPE_META: Record<ResultType, { label: string; Icon: React.ComponentType<{ size?: number }> }> = {
  client:   { label: 'Clientes',    Icon: Building2 },
  contract: { label: 'Contratos',   Icon: FileText },
  note:     { label: 'Notas',       Icon: BookOpen },
  event:    { label: 'Agenda',      Icon: Calendar },
  service:  { label: 'Serviços',    Icon: Briefcase },
  user:     { label: 'Equipe',      Icon: User },
  invoice:  { label: 'Financeiro',  Icon: DollarSign },
};

const DISPLAY_ORDER: ResultType[] = ['client', 'contract', 'note', 'event', 'service', 'user', 'invoice'];

export default function FloatingSearch() {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const close = () => {
    setIsOpen(false);
    setQuery("");
    setResults([]);
  };

  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev);
    window.addEventListener('toggle-search', handleToggle);
    return () => window.removeEventListener('toggle-search', handleToggle);
  }, []);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }

    const search = async () => {
      const q = query.toLowerCase();
      const all: SearchResult[] = [];

      try {
        const [
          { data: clientData },
          { data: userData },
          { data: serviceData },
          { data: notesData },
          { data: eventsData },
          { data: invoiceData },
        ] = await Promise.all([
          supabase.from('clients').select('id, name, cnpj').or(`name.ilike.%${q}%,cnpj.ilike.%${q}%`).limit(3),
          supabase.from('users').select('id, name, username').or(`name.ilike.%${q}%,username.ilike.%${q}%`).limit(2),
          supabase.from('services').select('id, name, price').ilike('name', `%${q}%`).limit(2),
          supabase.from('notes').select('id, title, subjects').ilike('title', `%${q}%`).limit(3),
          supabase.from('agenda_events').select('id, title, type, date').ilike('title', `%${q}%`).limit(3),
          supabase.from('invoices').select('id, description, amount, status').ilike('description', `%${q}%`).limit(2),
        ]);

        clientData?.forEach(c =>
          all.push({ id: `c-${c.id}`, type: 'client', title: c.name, subtitle: `Cliente • ${c.cnpj || '—'}`, url: `/admin/clients/${c.id}` })
        );

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

        // Contracts: derived from matched clients
        if (clientData && clientData.length > 0) {
          const clientIds = clientData.map(c => c.id);
          const { data: contractData } = await supabase
            .from('contracts')
            .select('id, status, value, clients(name), services(name)')
            .in('client_id', clientIds)
            .limit(2);

          contractData?.forEach((ct: any) => {
            const statusLabel = ct.status === 'active' ? 'Ativo' : ct.status === 'expiring' ? 'Vencendo' : 'Expirado';
            all.push({
              id: `ct-${ct.id}`,
              type: 'contract',
              title: ct.clients?.name || 'Contrato',
              subtitle: `Contrato • ${ct.services?.name || '—'} • ${statusLabel}`,
              url: `/admin/contracts`,
            });
          });
        }

        setResults(all);
      } catch (err) {
        console.error("Erro na busca:", err);
      }
    };

    const t = setTimeout(search, 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleNavigate = (url: string) => { router.push(url); close(); };

  const grouped = DISPLAY_ORDER.reduce<{ type: ResultType; items: SearchResult[] }[]>((acc, type) => {
    const items = results.filter(r => r.type === type);
    if (items.length > 0) acc.push({ type, items });
    return acc;
  }, []);

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
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
            zIndex: 200,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            paddingTop: '15vh', paddingLeft: '16px', paddingRight: '16px',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '540px',
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
              borderRadius: '20px',
              border: '1px solid var(--border)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.08)',
              overflow: 'hidden',
              maxHeight: '70vh',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Input row */}
            <div style={{
              display: 'flex', alignItems: 'center',
              padding: '14px 18px', gap: '12px',
              borderBottom: grouped.length > 0 ? '1px solid var(--border)' : 'none',
              flexShrink: 0,
            }}>
              <SearchIcon size={18} color={query ? "var(--accent)" : "var(--text-secondary)"} style={{ flexShrink: 0 }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Busque clientes, contratos, notas, agenda..."
                style={{
                  flex: 1, background: 'transparent', border: 'none',
                  color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none',
                }}
              />
              <button
                onClick={close}
                style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                  borderRadius: '8px', padding: '3px 8px',
                  fontSize: '0.7rem', color: 'var(--text-secondary)',
                  cursor: 'pointer', flexShrink: 0,
                }}
              >
                ESC
              </button>
            </div>

            {/* Grouped results */}
            {grouped.length > 0 && (
              <div style={{ overflowY: 'auto', padding: '8px' }}>
                {grouped.map(({ type, items }, gi) => {
                  const { label, Icon } = TYPE_META[type];
                  return (
                    <div key={type} style={{ marginBottom: gi < grouped.length - 1 ? '4px' : 0 }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '6px 14px 4px',
                        color: 'var(--text-secondary)', fontSize: '0.68rem',
                        fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>
                        <Icon size={10} />
                        {label}
                      </div>
                      {items.map((result) => {
                        const { Icon: ItemIcon } = TYPE_META[result.type];
                        return (
                          <button
                            key={result.id}
                            onClick={() => handleNavigate(result.url)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '10px',
                              padding: '9px 14px', borderRadius: '12px',
                              background: 'transparent', border: 'none',
                              color: 'var(--text-primary)', cursor: 'pointer',
                              textAlign: 'left', width: '100%',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(217,72,15,0.1)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <div style={{
                              width: '30px', height: '30px', borderRadius: '8px',
                              backgroundColor: 'rgba(255,255,255,0.05)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: 'var(--accent)', flexShrink: 0,
                            }}>
                              <ItemIcon size={14} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontWeight: 600, fontSize: '0.875rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {result.title}
                              </p>
                              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0 }}>
                                {result.subtitle}
                              </p>
                            </div>
                            <ArrowRight size={13} color="var(--text-secondary)" opacity={0.4} style={{ flexShrink: 0 }} />
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Hint when empty */}
            {!query && (
              <div style={{
                padding: '12px 18px',
                display: 'flex', alignItems: 'center', gap: '6px',
                color: 'var(--text-secondary)', fontSize: '0.75rem',
              }}>
                <Command size={11} />
                <span>Busca clientes, contratos, notas, agenda e financeiro</span>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
