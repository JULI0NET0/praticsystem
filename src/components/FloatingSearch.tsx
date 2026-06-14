"use client";

import { Command, Search as SearchIcon, User, Building2, Briefcase, ArrowRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

type SearchResult = {
  id: string;
  type: 'client' | 'user' | 'service';
  title: string;
  subtitle: string;
  url: string;
};

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
    const handleToggle = () => {
      setIsOpen((prev) => !prev);
    };
    window.addEventListener('toggle-search', handleToggle);
    return () => window.removeEventListener('toggle-search', handleToggle);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchItems = async () => {
      const q = query.toLowerCase();
      const searchResults: SearchResult[] = [];

      try {
        const { data: clientData } = await supabase
          .from('clients')
          .select('id, name, cnpj')
          .or(`name.ilike.%${q}%,cnpj.ilike.%${q}%`)
          .limit(3);

        clientData?.forEach(c => {
          searchResults.push({ id: `c-${c.id}`, type: 'client', title: c.name, subtitle: `Cliente • ${c.cnpj}`, url: `/admin/clients/${c.id}` });
        });

        const { data: userData } = await supabase
          .from('users')
          .select('id, name, username')
          .or(`name.ilike.%${q}%,username.ilike.%${q}%`)
          .limit(3);

        userData?.forEach(u => {
          searchResults.push({ id: `u-${u.id}`, type: 'user', title: u.name, subtitle: `Equipe • @${u.username}`, url: `/admin/users` });
        });

        const { data: serviceData } = await supabase
          .from('services')
          .select('id, name, price')
          .ilike('name', `%${q}%`)
          .limit(3);

        serviceData?.forEach(s => {
          searchResults.push({ id: `s-${s.id}`, type: 'service', title: s.name, subtitle: `Serviço • R$ ${s.price}`, url: `/admin/services` });
        });

        setResults(searchResults.slice(0, 5));
      } catch (err) {
        console.error("Erro na busca:", err);
      }
    };

    const timeoutId = setTimeout(searchItems, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleNavigate = (url: string) => {
    router.push(url);
    close();
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
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '15vh',
            paddingLeft: '16px',
            paddingRight: '16px',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '540px',
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              borderRadius: '20px',
              border: '1px solid var(--border)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.08)',
              overflow: 'hidden',
            }}
          >
            {/* Input row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '14px 18px',
              gap: '12px',
              borderBottom: results.length > 0 ? '1px solid var(--border)' : 'none',
            }}>
              <SearchIcon size={18} color={query ? "var(--accent)" : "var(--text-secondary)"} style={{ flexShrink: 0 }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Busque clientes, equipe ou serviços..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                  outline: 'none',
                }}
              />
              <button
                onClick={close}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '3px 8px',
                  fontSize: '0.7rem',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                ESC
              </button>
            </div>

            {/* Results */}
            <AnimatePresence>
              {results.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ padding: '8px' }}>
                    {results.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleNavigate(result.url)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(217, 72, 15, 0.1)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '8px',
                          backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', color: 'var(--accent)',
                          flexShrink: 0,
                        }}>
                          {result.type === 'client' ? <Building2 size={16} /> : result.type === 'user' ? <User size={16} /> : <Briefcase size={16} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 600, fontSize: '0.88rem', margin: 0 }}>{result.title}</p>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0 }}>{result.subtitle}</p>
                        </div>
                        <ArrowRight size={14} color="var(--text-secondary)" opacity={0.5} />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty state hint */}
            {!query && (
              <div style={{
                padding: '12px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
              }}>
                <Command size={11} />
                <span>K para abrir · ESC para fechar</span>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
