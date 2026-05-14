"use client";

import { ArrowLeft, Briefcase, FileText, DollarSign, Tag, Layers, Save, Share2 } from "lucide-react";
import Spotlight from "@/components/Spotlight";
import { motion } from "framer-motion";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function CreateServicePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "Marketing",
    price: 0,
    is_recurring: true,
    billing_cycle: "monthly",
    minimum_term: 0,
    default_posts_per_week: 0,
    default_content_capture: false,
    default_capture_frequency: "1 meia diária"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('services').insert([formData]);
      if (error) throw error;
      router.push("/admin/services");
    } catch (err: any) {
      console.error("Erro ao criar serviço:", err.message || err);
      alert("Erro ao criar serviço: " + (err.message || "Erro desconhecido"));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '800px', margin: '0 auto', paddingBottom: '40px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link href="/admin/services" className="btn-icon" style={{ padding: '8px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '4px' }}>Novo Serviço</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Cadastre um novo item no catálogo de serviços da agência.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Informações Básicas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Tag size={14} /> Nome do Serviço
            </label>
            <input
              type="text" className="input-dark" placeholder="Ex: Gestão de Google Ads" required
              value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={14} /> Descrição Detalhada
            </label>
            <textarea
              className="input-dark"
              style={{ minHeight: '100px', resize: 'vertical', padding: '16px' }}
              placeholder="O que está incluso neste serviço?" required
              value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Categoria */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={14} /> Categoria
            </label>
            <select
              className="input-dark"
              value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="Marketing">Marketing</option>
              <option value="Design">Design</option>
              <option value="Desenvolvimento">Desenvolvimento</option>
              <option value="Conteúdo">Conteúdo</option>
              <option value="Consultoria">Consultoria</option>
            </select>
          </div>

          {/* Preço Base */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DollarSign size={14} /> Preço Base (Sugestão)
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontWeight: 600 }}>R$</span>
              <input
                type="number" className="input-dark" style={{ paddingLeft: '44px' }} placeholder="0.00" required
                value={formData.price} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>

        {/* Tipo de Serviço */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Modalidade do Serviço</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_recurring: true })}
              style={{
                padding: '16px', borderRadius: '16px', border: '1px solid',
                borderColor: formData.is_recurring ? 'var(--accent)' : 'var(--border)',
                background: formData.is_recurring ? 'rgba(217, 72, 15, 0.05)' : 'rgba(255,255,255,0.02)',
                color: formData.is_recurring ? 'white' : 'var(--text-secondary)',
                display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              <span style={{ fontWeight: 600 }}>Recorrente</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Assinatura mensal, trimestral, etc.</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_recurring: false })}
              style={{
                padding: '16px', borderRadius: '16px', border: '1px solid',
                borderColor: !formData.is_recurring ? 'var(--accent)' : 'var(--border)',
                background: !formData.is_recurring ? 'rgba(217, 72, 15, 0.05)' : 'rgba(255,255,255,0.02)',
                color: !formData.is_recurring ? 'white' : 'var(--text-secondary)',
                display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              <span style={{ fontWeight: 600 }}>Avulso</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Projeto pontual com entrega única.</span>
            </button>
          </div>
        </div>

        {/* Detalhes de Assinatura (apenas se recorrente) */}
        {formData.is_recurring && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Ciclo de Faturamento</label>
              <select 
                className="input-dark"
                value={formData.billing_cycle} onChange={(e) => setFormData({...formData, billing_cycle: e.target.value as any})}
              >
                <option value="monthly">Mensal</option>
                <option value="quarterly">Trimestral</option>
                <option value="yearly">Anual</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Fidelidade Mínima (Meses)</label>
              <input 
                type="number" className="input-dark" placeholder="0 para sem fidelidade"
                value={formData.minimum_term} onChange={(e) => setFormData({...formData, minimum_term: Number(e.target.value)})}
              />
            </div>
          </div>
        )}

        {/* Configurações de Entrega (Social Media) */}
        <div style={{ 
          padding: '24px', 
          background: 'rgba(217, 72, 15, 0.05)', 
          borderRadius: '20px', 
          border: '1px solid rgba(217, 72, 15, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Share2 size={16} />
            </div>
            <p style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Configurações de Entrega (Social Media)
            </p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Posts por Semana (Padrão)</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="number" className="input-dark" 
                  style={{ paddingRight: '100px' }}
                  value={formData.default_posts_per_week}
                  onChange={(e) => setFormData({ ...formData, default_posts_per_week: Number(e.target.value) })}
                />
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 700 }}>
                  { (formData.default_posts_per_week || 0) * 4 } / MÊS
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Captação de Conteúdo</label>
              <select 
                className="input-dark"
                value={formData.default_content_capture ? 'sim' : 'nao'}
                onChange={(e) => setFormData({ ...formData, default_content_capture: e.target.value === 'sim' })}
              >
                <option value="nao">Não incluso</option>
                <option value="sim">Incluso no pacote</option>
              </select>
            </div>
          </div>

          {formData.default_content_capture && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Frequência de Captação Padrão</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                {['1 meia diária', '1 diária inteira', '2 meias diárias', '2 diárias inteiras'].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFormData({ ...formData, default_capture_frequency: opt })}
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: formData.default_capture_frequency === opt ? 'var(--accent)' : 'rgba(255,255,255,0.03)',
                      color: formData.default_capture_frequency === opt ? 'white' : 'var(--text-secondary)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Ações */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
          <Link href="/admin/services" className="btn" style={{ background: 'rgba(255,255,255,0.05)' }}>
            Cancelar
          </Link>
          <Spotlight as="button" type="submit" className="btn btn-accent">
            <Save size={18} /> Cadastrar Serviço
          </Spotlight>
        </div>
      </form>
    </motion.div>
  );
}
