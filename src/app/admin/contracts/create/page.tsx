"use client";

import { supabase } from "@/lib/supabase";
import { ArrowLeft, FileText, Calendar, DollarSign, User, Briefcase, RefreshCw, Save, Loader2, CheckCircle2 } from "lucide-react";
import Spotlight from "@/components/Spotlight";
import { motion, AnimatePresence } from "framer-motion";
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
  const [isEmitModalOpen, setIsEmitModalOpen] = useState(false);
  const [createdContractId, setCreatedContractId] = useState<string | null>(null);
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    client_id: "",
    service_id: "",
    start_date: new Date().toISOString().split('T')[0],
    first_due_date: new Date().toISOString().split('T')[0],
    duration_months: 1,
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

  const generatePreview = () => {
    if (!formData.first_due_date || formData.duration_months < 1) return [];
    
    const parcels = [];
    const baseDate = new Date(formData.first_due_date + 'T12:00:00');
    
    for (let i = 0; i < formData.duration_months; i++) {
      const parcelDate = new Date(baseDate);
      parcelDate.setMonth(baseDate.getMonth() + i);
      parcels.push({
        parcelNumber: i + 1,
        dueDate: parcelDate.toISOString().split('T')[0],
        amount: formData.value
      });
    }
    return parcels;
  };

  const invoicePreview = generatePreview();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);

      const client = clients.find(c => c.id === formData.client_id);
      const service = services.find(s => s.id === formData.service_id);

      // Calcular a data de término com base na data de início e duração
      const endDate = new Date(formData.start_date + 'T12:00:00');
      endDate.setMonth(endDate.getMonth() + formData.duration_months);

      // Inserir contrato
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .insert([{
          client_id: formData.client_id,
          service_id: formData.service_id,
          start_date: formData.start_date,
          end_date: endDate.toISOString().split('T')[0],
          value: formData.value,
          auto_renew: formData.auto_renew,
          status: formData.status,
          document_status: 'pending'
        }])
        .select()
        .single();

      if (contractError) throw contractError;

      // Montar faturas a partir do preview
      const invoicesToInsert = invoicePreview.map(parcel => ({
        client_id: formData.client_id,
        contract_id: contractData.id,
        amount: parcel.amount,
        due_date: parcel.dueDate,
        status: 'pending',
        description: `${client?.name || 'Cliente'} - ${service?.name || 'Serviço'} - Parcela ${parcel.parcelNumber}/${formData.duration_months}`
      }));

      // Inserir as faturas em lote
      const { error: invoicesError } = await supabase
        .from('invoices')
        .insert(invoicesToInsert);

      if (invoicesError) throw invoicesError;

      // Se o contrato criado for ativo, atualiza o status do cliente para active
      if (formData.status === 'active') {
        await supabase
          .from('clients')
          .update({ status: 'active' })
          .eq('id', formData.client_id);
      }

      showToast("Contrato e faturas gerados com sucesso!", "success");
      setCreatedContractId(contractData.id);
      setIsEmitModalOpen(true);
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

          <div className="responsive-grid-2" style={{ gap: '24px' }}>
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

          <div className="responsive-grid-4" style={{ gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Data de Início</label>
              <input
                type="date" className="input-dark" required
                value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Duração (Meses)</label>
              <input
                type="number" className="input-dark" required min="1"
                value={formData.duration_months} onChange={(e) => setFormData({ ...formData, duration_months: Number(e.target.value) })}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>1º Vencimento</label>
              <input
                type="date" className="input-dark" required
                value={formData.first_due_date} onChange={(e) => setFormData({ ...formData, first_due_date: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Valor Mensal</label>
              <div style={{ position: 'relative' }}>
                <DollarSign size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="number" className="input-dark" style={{ paddingLeft: '40px' }} placeholder="0.00" required min="0" step="0.01"
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

        {/* Prévia Financeira */}
        {formData.duration_months > 0 && formData.first_due_date && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--accent)' }}>
              <DollarSign size={20} /> Prévia de Lançamentos
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
              {invoicePreview.map((parcel, idx) => (
                <div key={idx} style={{ 
                  background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', 
                  borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' 
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>
                      Parcela {parcel.parcelNumber}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#EAB308', background: 'rgba(234, 179, 8, 0.1)', padding: '2px 8px', borderRadius: '100px' }}>
                      Pendente
                    </span>
                  </div>
                  <strong style={{ fontSize: '1.1rem', marginTop: '8px' }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parcel.amount)}
                  </strong>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Vencimento: {new Date(parcel.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Ações */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
          <Link href="/admin/contracts" className="btn" style={{ background: 'rgba(255,255,255,0.05)' }}>
            Cancelar
          </Link>
          <Spotlight as="button" type="submit" className="btn btn-accent" disabled={loading}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {loading ? 'Gerando...' : 'Lançar Serviço e Faturas'}
          </Spotlight>
        </div>
      </form>

      <AnimatePresence>
        {isEmitModalOpen && (
          <div style={{
            position: 'fixed', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px'
          }}>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card" style={{ padding: '32px', maxWidth: '450px', width: '100%', position: 'relative', display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'center' }}
            >
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', color: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>Serviço Lançado!</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  O faturamento já foi programado. Deseja emitir o documento do contrato agora mesmo?
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  className="btn btn-secondary" style={{ flex: 1 }}
                  onClick={() => router.push('/admin/contracts')}
                >
                  Fazer Depois
                </button>
                <button
                  className="btn btn-accent" style={{ flex: 1 }}
                  onClick={() => router.push(`/admin/clients/${formData.client_id}?openContract=${createdContractId}`)}
                >
                  Emitir Contrato
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
