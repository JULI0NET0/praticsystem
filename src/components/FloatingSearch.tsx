"use client";

import { Sparkles, Command, Search as SearchIcon, User, Building2, Briefcase, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Spotlight from "./Spotlight";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

export default function FloatingSearch() {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string, type: 'client' | 'user' | 'service', title: string, subtitle: string, url: string }[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => {
      inputRef.current?.focus();
      setIsOpen(true);
    };
    window.addEventListener('toggle-search', handleToggle);
    return () => window.removeEventListener('toggle-search', handleToggle);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchItems = async () => {
      const q = query.toLowerCase();
      const searchResults: any[] = [];

      try {
        // Search Clients
        const { data: clientData } = await supabase
          .from('clients')
          .select('id, name, cnpj')
          .or(`name.ilike.%${q}%,cnpj.ilike.%${q}%`)
          .limit(3);

        clientData?.forEach(c => {
          searchResults.push({ id: `c-${c.id}`, type: 'client', title: c.name, subtitle: `Cliente • ${c.cnpj}`, url: `/admin/clients/${c.id}` });
        });

        // Search Users
        const { data: userData } = await supabase
          .from('users')
          .select('id, name, username')
          .or(`name.ilike.%${q}%,username.ilike.%${q}%`)
          .limit(3);

        userData?.forEach(u => {
          searchResults.push({ id: `u-${u.id}`, type: 'user', title: u.name, subtitle: `Equipe • @${u.username}`, url: `/admin/users` });
        });

        // Search Services
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
        console.error("Erro na busca flutuante:", err);
      }
    };

    const timeoutId = setTimeout(searchItems, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleNavigate = (url: string) => {
    router.push(url);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div className="floating-search-container" style={{
      position: 'fixed',
      bottom: '32px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: '510px',
      zIndex: 100,
      padding: '0 24px',
    }}>
      <AnimatePresence>
        {results.length > 0 && isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 10px)',
              left: '24px',
              right: '24px',
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              borderRadius: '20px',
              border: '1px solid var(--border)',
              padding: '10px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            {results.map((result) => (
              <button
                key={result.id}
                onClick={() => handleNavigate(result.url)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '14px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(217, 72, 15, 0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: 'var(--accent)'
                }}>
                  {result.type === 'client' ? <Building2 size={16} /> : result.type === 'user' ? <User size={16} /> : <Briefcase size={16} />}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.88rem' }}>{result.title}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{result.subtitle}</p>
                </div>
                <ArrowRight size={14} color="var(--text-secondary)" opacity={0.5} />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <Spotlight className="glass-card" style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 18px',
        borderRadius: '100px',
        gap: '12px',
        border: '1px solid var(--border)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
      }}>
        <SearchIcon size={18} color={query ? "var(--accent)" : "var(--text-secondary)"} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          placeholder="Busque clientes, equipe ou serviços..."
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            outline: 'none'
          }}
        />
        <div className="hide-mobile" style={{
          background: 'rgba(255,255,255,0.05)',
          padding: '3px 10px',
          borderRadius: '100px',
          fontSize: '0.7rem',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <Command size={11} /> K
        </div>
      </Spotlight>
    </div>
  );
}
