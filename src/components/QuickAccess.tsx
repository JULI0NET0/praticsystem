import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Spotlight from "./Spotlight";

export default function QuickAccess() {
  const [activeClients, setActiveClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActiveClients() {
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('status', 'active')
          .limit(4);

        if (error) throw error;
        if (data) setActiveClients(data);
      } catch (err: any) {
        console.error("Erro ao buscar clientes ativos:", err?.message || JSON.stringify(err, null, 2) || err);
      } finally {
        setLoading(false);
      }
    }
    fetchActiveClients();
  }, []);

  return (
    <Spotlight className="glass-card" style={{ padding: '24px' }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '24px' }}>Acesso Rápido</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {activeClients.map((client) => (
          <Link
            key={client.id}
            href={`/admin/clients/${client.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px',
              borderRadius: 'var(--radius-input)',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid transparent',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = 'transparent'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'rgba(217, 72, 15, 0.1)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600
              }}>
                {client.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <p style={{ fontWeight: 500, fontSize: '0.875rem' }}>{client.name}</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{client.contact_name}</p>
              </div>
            </div>
            <ArrowRight size={16} color="var(--text-secondary)" />
          </Link>
        ))}
      </div>

      <button className="btn btn-secondary" style={{ width: '100%', marginTop: '24px' }}>
        Ver todos os clientes
      </button>
    </Spotlight>
  );
}
