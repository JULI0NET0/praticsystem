"use client";

import { supabase } from "@/lib/supabase";
import { ArrowLeft, FileText, Calendar, DollarSign, User, Briefcase, RefreshCw, Save, Loader2 } from "lucide-react";
import Spotlight from "@/components/Spotlight";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/CustomToast";

export default function CreateContractPage() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    client_id: "",
    service_id: "",
    start_date: new Date().toISOString().split('T')[0],
    end_date: "",
    value: 0,
    auto_renew: true,
    status: "active"
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [clientsRes, servicesRes] = await Promise.all([
          supabase.from('clients').select('id, name'),
          supabase.from('services').select('id, name, price, is_recurring')
        ]);
        if (clientsRes.data) setClients(clientsRes.data);
        if (servicesRes.data) setServices(servicesRes.data);
      } catch (err) {
        console.error("Erro ao buscar dados:", err);
      } finally {
        setFetching(false);
      }
    }
    fetchData();
  }, []);

  // Atualiza o valor sugerido quando o serviço muda
  useEffect(() => {
    const service = services.find(s => s.id === formData.service_id);
    if (service) {
      setFormData(prev => ({ ...prev, value: service.price }));
    }
  }, [formData.service_id, services]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { error } = await supabase
        .from('contracts')
        .insert([formData]);

      if (error) throw error;
      showToast("Contrato criado com sucesso!", "success");
      router.push("/admin/contracts");
    } catch (err) {
      console.error("Erro ao criar contrato:", err);
      showToast("Erro ao criar contrato. Verifique os dados.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '900px', margin: '0 auto', paddingBottom: '40px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link href="/admin/contracts" className="btn-icon" style={{ padding: '8px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '4px' }}>Novo Contrato</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Vincule serviços a clientes e configure o faturamento recorrente.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
        {/* Vínculo de Entidades */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--accent)' }}>
            <FileText size={20} /> Definições de Vínculo
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={14} /> Selecionar Cliente
              </label>
              <select
                required
                className="input-dark"
                value={formData.client_id} onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
              >
                <option value="">Selecione um cliente...</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Briefcase size={14} /> Selecionar Serviço / Plano
              </label>
              <select
                required
                className="input-dark"
                value={formData.service_id} onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
              >
                <option value="">Selecione um serviço...</option>
                {services.map(service => (
                  <option key={service.id} value={service.id}>{service.name} ({service.is_recurring ? 'Recorrente' : 'Avulso'})</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Vigência e Valores */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--accent)' }}>
            <Calendar size={20} /> Vigência e Financeiro
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Data de Início</label>
              <input
                type="date" className="input-dark" required
                value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Data de Término</label>
              <input
                type="date" className="input-dark" required
                value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Valor Mensal (R$)</label>
              <div style={{ position: 'relative' }}>
                <DollarSign size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="number" className="input-dark" style={{ paddingLeft: '40px' }} placeholder="0.00" required
                  value={formData.value} onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '32px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: formData.auto_renew ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: formData.auto_renew ? '#22C55E' : 'var(--text-secondary)',
                transition: 'all 0.3s ease'
              }}>
                <RefreshCw size={20} className={formData.auto_renew ? 'spin-slow' : ''} />
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>Auto-renovação</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Renovar automaticamente ao fim do período.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setFormData({ ...formData, auto_renew: !formData.auto_renew })}
              style={{
                marginLeft: 'auto',
                width: '56px', height: '28px', borderRadius: '100px',
                background: formData.auto_renew ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                position: 'relative', border: 'none', cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              <motion.div
                animate={{ x: formData.auto_renew ? 28 : 4 }}
                style={{
                  width: '20px', height: '20px', borderRadius: '50%', background: 'white',
                  position: 'absolute', top: '4px'
                }}
              />
            </button>
          </div>
        </section>

        {/* Ações */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
          <Link href="/admin/contracts" className="btn" style={{ background: 'rgba(255,255,255,0.05)' }}>
            Cancelar
          </Link>
          <Spotlight as="button" type="submit" className="btn btn-accent" disabled={loading}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {loading ? 'Gerando...' : 'Gerar Contrato'}
          </Spotlight>
        </div>
      </form>

      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </motion.div>
  );
}
