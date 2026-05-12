"use client";

import { ArrowLeft, Briefcase, FileText, DollarSign, Tag, Layers, Save } from "lucide-react";
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
    minimum_term: 0
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
