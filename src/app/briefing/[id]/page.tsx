'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, ArrowLeft, CheckCircle2,
  Info, Target, Users, Search,
  Settings, TrendingUp, Megaphone, Palette,
  Send, Loader2, Sparkles, Monitor, Mail
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/CustomToast';
import Link from 'next/link';

// Componentes Reutilizados (Estilo Onboarding)
const Spotlight = ({ children, className = "", style = {} }: any) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const div = e.currentTarget;
    const rect = div.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`relative overflow-hidden ${className}`}
      style={{ ...style, position: 'relative' }}
    >
      <div
        className="pointer-events-none absolute -inset-px transition duration-300"
        style={{
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(249, 115, 22, 0.1), transparent 40%)`,
          opacity,
        }}
      />
      {children}
    </div>
  );
};

export default function BriefingPage() {
  const params = useParams();
  const id = params.id as string;
  const [step, setStep] = useState(0); // 0 is loading/welcome, 1-8 are form steps, 9 is success
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const [formData, setFormData] = useState<any>({
    // 1. Informações Gerais
    nome_contato: '',
    email_contato: '',
    whatsapp: '',

    // 2. Identidade da Empresa
    nicho: '',
    tempo_mercado: '',
    situacao_atual: '',
    produtos_fortes: '',
    empresa_nova: 'Não', // Objetiva

    // 3. Público Alvo
    perfil_publico: '',
    desejos_publico: '',
    diferencial: '',

    // 4. Concorrência e Referências
    concorrentes: '',
    referencias: '',
    inspiracoes: '',

    // 5. Estrutura Interna
    equipe_marketing_interna: 'Não', // Objetiva
    processo_vendas: '',

    // 6. Dados de Mercado
    ticket_medio: '',
    sazonalidade: '',

    // 7. Marketing & Estratégia
    redes_sociais: [], // Multi-seleção
    canais_atuais: '',
    objetivos: '',
    historico_marketing: '',

    // 8. Personalidade da Marca
    cores_desejadas: '',
    elementos_visuais: '',
    cores_evitar: ''
  });

  useEffect(() => {
    async function loadClient() {
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('id', params.id)
          .single();

        if (data) {
          setClient(data);
          setFormData((prev: any) => ({
            ...prev,
            whatsapp: data.whatsapp || data.phone || '',
            email_contato: data.email || '',
            nicho: data.setor || '',
            nome_contato: data.contact_name || ''
          }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadClient();
  }, [id]);

  const updateForm = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1');
    }
    return value;
  };

  const nextStep = () => {
    if (step === 8) {
      handleSubmit();
    } else {
      setStep(p => p + 1);
    }
  };

  const prevStep = () => setStep(p => Math.max(0, p - 1));

  const handleSubmit = async () => {
    setIsSubmitting(true);

    // Consolidar briefing em texto para o campo legado
    const briefingText = `
DADOS DO BRIEFING:

1. IDENTIDADE:
- Nicho: ${formData.nicho}
- Tempo de Mercado: ${formData.tempo_mercado}
- Situação Atual: ${formData.situacao_atual}
- Produtos Fortes: ${formData.produtos_fortes}

2. PÚBLICO:
- Perfil: ${formData.perfil_publico}
- Desejos: ${formData.desejos_publico}
- Diferencial: ${formData.diferencial}

3. MERCADO:
- Concorrentes: ${formData.concorrentes}
- Ticket Médio: ${formData.ticket_medio}
- Sazonalidade: ${formData.sazonalidade}

4. MARKETING:
- Canais Atuais: ${formData.canais_atuais}
- Objetivos: ${formData.objetivos}

5. VISUAL:
- Cores: ${formData.cores_desejadas}
- Evitar: ${formData.cores_evitar}
    `.trim();

    try {
      const { error } = await supabase
        .from('clients')
        .update({
          briefing: briefingText,
          briefing_data: formData,
          briefing_completed: true
        })
        .eq('id', id);

      if (!error) {
        setStep(9);
      } else {
        showToast('Erro ao salvar briefing. Tente novamente.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro de conexão ao salvar briefing.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090b' }}>
        <Loader2 className="animate-spin" color="#f97316" size={40} />
      </div>
    );
  }

  if (!client) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090b', color: 'white' }}>
        <p>Cliente não encontrado.</p>
      </div>
    );
  }

  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: -20 }
  };

  const pageTransition = {
    type: "tween",
    ease: "anticipate",
    duration: 0.4
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#09090b',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* Background Effects */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '10%', left: '20%', width: '400px', height: '400px', background: 'rgba(249, 115, 22, 0.05)', filter: 'blur(100px)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '20%', width: '400px', height: '400px', background: 'rgba(249, 115, 22, 0.03)', filter: 'blur(100px)', borderRadius: '50%' }} />
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card"
            style={{
              maxWidth: '600px',
              padding: '48px',
              textAlign: 'center',
              zIndex: 1,
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <div style={{
              width: '80px',
              height: '80px',
              background: 'rgba(249, 115, 22, 0.1)',
              borderRadius: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 32px',
              color: '#f97316'
            }}>
              <Sparkles size={40} />
            </div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '16px' }}>Bem-vindo ao seu Briefing</h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '1.125rem', marginBottom: '40px', lineHeight: '1.6' }}>
              Olá, <strong>{client.nome_fantasia || client.name}</strong>! Este formulário nos ajudará a entender profundamente o seu negócio para criarmos estratégias de alto impacto.
            </p>
            <button
              onClick={() => setStep(1)}
              className="btn btn-accent"
              style={{ width: '100%', padding: '16px', fontSize: '1rem', fontWeight: 600 }}
            >
              Começar Briefing <ArrowRight size={20} />
            </button>
          </motion.div>
        )}

        {step >= 1 && step <= 8 && (
          <motion.div
            key="form"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: '800px',
              minHeight: '600px',
              zIndex: 1,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Mac OS Window Header */}
            <div style={{
              padding: '16px 24px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f56' }} />
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e' }} />
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27c93f' }} />
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Briefing Strategy Portal — {client.nome_fantasia || client.name}
              </div>
              <div style={{ width: '52px' }} />
            </div>

            <div style={{ padding: '40px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Progress Bar */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '40px' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <div key={s} style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    background: s <= step ? '#f97316' : 'rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.3s ease'
                  }} />
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  variants={pageVariants}
                  initial="initial"
                  animate="in"
                  exit="out"
                  transition={pageTransition}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                >
                  {/* Step 1: Informações Gerais */}
                  {step === 1 && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                        <div style={{ padding: '12px', background: 'rgba(249, 115, 22, 0.1)', color: '#f97316', borderRadius: '16px' }}>
                          <Info size={24} />
                        </div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Informações Gerais</h2>
                      </div>
                      <p style={{ color: 'rgba(255, 255, 255, 0.5)', marginBottom: '32px' }}>Confirme os dados de contato principais.</p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div>
                          <label className="label-briefing">Nome do Responsável</label>
                          <input className="input-briefing" value={formData.nome_contato} onChange={e => updateForm('nome_contato', e.target.value)} placeholder="Quem cuidará do projeto?" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div>
                            <label className="label-briefing">E-mail de Contato</label>
                            <input className="input-briefing" value={formData.email_contato} onChange={e => updateForm('email_contato', e.target.value)} placeholder="email@exemplo.com" />
                          </div>
                          <div>
                            <label className="label-briefing">WhatsApp</label>
                            <input
                              className="input-briefing"
                              value={formData.whatsapp}
                              onChange={e => updateForm('whatsapp', formatWhatsApp(e.target.value))}
                              placeholder="(00) 00000-0000"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Step 2: Identidade da Empresa */}
                  {step === 2 && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                        <div style={{ padding: '12px', background: 'rgba(249, 115, 22, 0.1)', color: '#f97316', borderRadius: '16px' }}>
                          <Monitor size={24} />
                        </div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Identidade da Empresa</h2>
                      </div>
                      <p style={{ color: 'rgba(255, 255, 255, 0.5)', marginBottom: '32px' }}>Conte-nos sobre a essência do seu negócio.</p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div>
                            <label className="label-briefing">Nicho / Setor</label>
                            <input className="input-briefing" value={formData.nicho} onChange={e => updateForm('nicho', e.target.value)} placeholder="Ex: Estética Automotiva" />
                          </div>
                          <div>
                            <label className="label-briefing">Tempo de Mercado</label>
                            <input className="input-briefing" value={formData.tempo_mercado} onChange={e => updateForm('tempo_mercado', e.target.value)} placeholder="Ex: 5 anos" />
                          </div>
                        </div>

                        <div>
                          <label className="label-briefing">Sua empresa é nova no mercado?</label>
                          <div style={{ display: 'flex', gap: '12px' }}>
                            {['Sim', 'Não'].map(opt => (
                              <button
                                key={opt}
                                onClick={() => updateForm('empresa_nova', opt)}
                                style={{
                                  flex: 1, padding: '12px', borderRadius: '12px',
                                  background: formData.empresa_nova === opt ? 'rgba(249, 115, 22, 0.2)' : 'rgba(255,255,255,0.05)',
                                  border: `1px solid ${formData.empresa_nova === opt ? '#f97316' : 'rgba(255,255,255,0.1)'}`,
                                  color: formData.empresa_nova === opt ? '#f97316' : 'white',
                                  fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                                }}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="label-briefing">Situação Atual da Empresa</label>
                          <textarea className="input-briefing" rows={3} value={formData.situacao_atual} onChange={e => updateForm('situacao_atual', e.target.value)} placeholder="Como está o momento da empresa hoje?" />
                        </div>
                        <div>
                          <label className="label-briefing">Principais Produtos/Serviços (Carro-chefe)</label>
                          <input className="input-briefing" value={formData.produtos_fortes} onChange={e => updateForm('produtos_fortes', e.target.value)} placeholder="O que mais traz retorno?" />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Step 3: Público Alvo */}
                  {step === 3 && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                        <div style={{ padding: '12px', background: 'rgba(249, 115, 22, 0.1)', color: '#f97316', borderRadius: '16px' }}>
                          <Users size={24} />
                        </div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Público Alvo</h2>
                      </div>
                      <p style={{ color: 'rgba(255, 255, 255, 0.5)', marginBottom: '32px' }}>Quem é o cliente ideal para você?</p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div>
                          <label className="label-briefing">Perfil do Público (Idade, Região, Interesses)</label>
                          <textarea className="input-briefing" rows={3} value={formData.perfil_publico} onChange={e => updateForm('perfil_publico', e.target.value)} placeholder="Ex: Mulheres de 25-45 anos, residentes em São Paulo..." />
                        </div>
                        <div>
                          <label className="label-briefing">Quais as principais dúvidas ou desejos deles?</label>
                          <textarea className="input-briefing" rows={2} value={formData.desejos_publico} onChange={e => updateForm('desejos_publico', e.target.value)} placeholder="O que eles buscam ao procurar você?" />
                        </div>
                        <div>
                          <label className="label-briefing">Qual o seu diferencial competitivo?</label>
                          <input className="input-briefing" value={formData.diferencial} onChange={e => updateForm('diferencial', e.target.value)} placeholder="Por que escolher você e não o concorrente?" />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Step 4: Concorrência */}
                  {step === 4 && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                        <div style={{ padding: '12px', background: 'rgba(249, 115, 22, 0.1)', color: '#f97316', borderRadius: '16px' }}>
                          <Search size={24} />
                        </div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Concorrência e Referências</h2>
                      </div>
                      <p style={{ color: 'rgba(255, 255, 255, 0.5)', marginBottom: '32px' }}>Quem são seus vizinhos de mercado?</p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div>
                          <label className="label-briefing">Principais Concorrentes (Links ou Nomes)</label>
                          <textarea className="input-briefing" rows={3} value={formData.concorrentes} onChange={e => updateForm('concorrentes', e.target.value)} placeholder="Ex: @concorrente_A, @concorrente_B..." />
                        </div>
                        <div>
                          <label className="label-briefing">Referências ou Inspirações (Nacionais ou Internacionais)</label>
                          <textarea className="input-briefing" rows={3} value={formData.referencias} onChange={e => updateForm('referencias', e.target.value)} placeholder="Perfis ou marcas que você admira..." />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Step 5: Estrutura Interna */}
                  {step === 5 && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                        <div style={{ padding: '12px', background: 'rgba(249, 115, 22, 0.1)', color: '#f97316', borderRadius: '16px' }}>
                          <Settings size={24} />
                        </div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Estrutura Interna</h2>
                      </div>
                      <p style={{ color: 'rgba(255, 255, 255, 0.5)', marginBottom: '32px' }}>Como as coisas funcionam por dentro?</p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div>
                          <label className="label-briefing">Possui equipe de marketing ou alguém interno?</label>
                          <div style={{ display: 'flex', gap: '12px' }}>
                            {['Sim', 'Não'].map(opt => (
                              <button
                                key={opt}
                                onClick={() => updateForm('equipe_marketing_interna', opt)}
                                style={{
                                  flex: 1, padding: '12px', borderRadius: '12px',
                                  background: formData.equipe_marketing_interna === opt ? 'rgba(249, 115, 22, 0.2)' : 'rgba(255,255,255,0.05)',
                                  border: `1px solid ${formData.equipe_marketing_interna === opt ? '#f97316' : 'rgba(255,255,255,0.1)'}`,
                                  color: formData.equipe_marketing_interna === opt ? '#f97316' : 'white',
                                  fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                                }}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="label-briefing">Como funciona o seu processo de vendas atual?</label>
                          <textarea className="input-briefing" rows={4} value={formData.processo_vendas} onChange={e => updateForm('processo_vendas', e.target.value)} placeholder="Ex: Cliente chega pelo WhatsApp e agendamos uma reunião..." />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Step 6: Dados de Mercado */}
                  {step === 6 && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                        <div style={{ padding: '12px', background: 'rgba(249, 115, 22, 0.1)', color: '#f97316', borderRadius: '16px' }}>
                          <TrendingUp size={24} />
                        </div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Dados de Mercado</h2>
                      </div>
                      <p style={{ color: 'rgba(255, 255, 255, 0.5)', marginBottom: '32px' }}>Números que nos ajudam no ROI.</p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div>
                          <label className="label-briefing">Ticket Médio (Valor médio por venda)</label>
                          <input className="input-briefing" value={formData.ticket_medio} onChange={e => updateForm('ticket_medio', e.target.value)} placeholder="Ex: R$ 500,00" />
                        </div>
                        <div>
                          <label className="label-briefing">Sazonalidade (Meses de alta e baixa)</label>
                          <textarea className="input-briefing" rows={3} value={formData.sazonalidade} onChange={e => updateForm('sazonalidade', e.target.value)} placeholder="Ex: Alta em Dezembro/Janeiro, Baixa em Maio..." />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Step 7: Estratégia */}
                  {step === 7 && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                        <div style={{ padding: '12px', background: 'rgba(249, 115, 22, 0.1)', color: '#f97316', borderRadius: '16px' }}>
                          <Megaphone size={24} />
                        </div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Marketing & Estratégia</h2>
                      </div>
                      <p style={{ color: 'rgba(255, 255, 255, 0.5)', marginBottom: '32px' }}>Onde estamos e para onde vamos.</p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div>
                          <label className="label-briefing">Quais redes sociais você já trabalha?</label>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                            {['Instagram', 'Facebook', 'LinkedIn', 'YouTube', 'TikTok', 'Google Meu Negócio'].map(red => (
                              <button
                                key={red}
                                onClick={() => {
                                  const current = formData.redes_sociais || [];
                                  const next = current.includes(red)
                                    ? current.filter((r: string) => r !== red)
                                    : [...current, red];
                                  updateForm('redes_sociais', next);
                                }}
                                style={{
                                  padding: '12px', borderRadius: '12px', textAlign: 'left',
                                  background: (formData.redes_sociais || []).includes(red) ? 'rgba(249, 115, 22, 0.2)' : 'rgba(255,255,255,0.05)',
                                  border: `1px solid ${(formData.redes_sociais || []).includes(red) ? '#f97316' : 'rgba(255,255,255,0.1)'}`,
                                  color: (formData.redes_sociais || []).includes(red) ? '#f97316' : 'white',
                                  fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s',
                                  display: 'flex', alignItems: 'center', gap: '8px'
                                }}
                              >
                                <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: '1px solid currentColor', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {(formData.redes_sociais || []).includes(red) && <CheckCircle2 size={12} />}
                                </div>
                                {red}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="label-briefing">Outros canais que utiliza atualmente</label>
                          <input className="input-briefing" value={formData.canais_atuais} onChange={e => updateForm('canais_atuais', e.target.value)} placeholder="Ex: Google Ads, Indicação, Rádio..." />
                        </div>
                        <div>
                          <label className="label-briefing">Principais Objetivos (Curto e Longo Prazo)</label>
                          <textarea className="input-briefing" rows={3} value={formData.objetivos} onChange={e => updateForm('objetivos', e.target.value)} placeholder="O que você espera alcançar nos próximos 6 meses?" />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Step 8: Visual */}
                  {step === 8 && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                        <div style={{ padding: '12px', background: 'rgba(249, 115, 22, 0.1)', color: '#f97316', borderRadius: '16px' }}>
                          <Palette size={24} />
                        </div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Personalidade da Marca</h2>
                      </div>
                      <p style={{ color: 'rgba(255, 255, 255, 0.5)', marginBottom: '32px' }}>A cara do seu projeto.</p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div>
                          <label className="label-briefing">Cores ou Elementos que Deseja (ou já utiliza)</label>
                          <input className="input-briefing" value={formData.cores_desejadas} onChange={e => updateForm('cores_desejadas', e.target.value)} placeholder="Ex: Azul marinho, Dourado, Minimalismo..." />
                        </div>
                        <div>
                          <label className="label-briefing">O que NÃO gosta ou gostaria de EVITAR?</label>
                          <textarea className="input-briefing" rows={3} value={formData.cores_evitar} onChange={e => updateForm('cores_evitar', e.target.value)} placeholder="Cores, estilos ou tipos de postagem que não combinam com você..." />
                        </div>
                        <div>
                          <label className="label-briefing">Referências Visuais (Links ou Perfis)</label>
                          <input className="input-briefing" value={formData.elementos_visuais} onChange={e => updateForm('elementos_visuais', e.target.value)} placeholder="Ex: @perfil_referencia" />
                        </div>
                      </div>
                    </>
                  )}

                  <div style={{ marginTop: 'auto', paddingTop: '40px', display: 'flex', justifyContent: 'space-between' }}>
                    <button onClick={prevStep} className="btn btn-secondary" style={{ border: 'none', background: 'transparent' }}>
                      <ArrowLeft size={18} /> Voltar
                    </button>
                    <button
                      onClick={nextStep}
                      className="btn btn-accent"
                      disabled={isSubmitting}
                      style={{ minWidth: '160px' }}
                    >
                      {isSubmitting ? (
                        <>Salvando... <Loader2 className="animate-spin" size={18} /></>
                      ) : step === 8 ? (
                        <>Finalizar Briefing <Send size={18} /></>
                      ) : (
                        <>Próximo <ArrowRight size={18} /></>
                      )}
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {step === 9 && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card"
            style={{
              maxWidth: '500px',
              padding: '48px',
              textAlign: 'center',
              zIndex: 1,
              border: '1px solid rgba(34, 197, 94, 0.2)'
            }}
          >
            <div style={{
              width: '80px',
              height: '80px',
              background: 'rgba(34, 197, 94, 0.1)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 32px',
              color: '#22c55e'
            }}>
              <CheckCircle2 size={40} />
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '16px' }}>Briefing Enviado!</h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '1.125rem', marginBottom: '32px', lineHeight: '1.6' }}>
              Excelente, <strong>{client.name}</strong>! Recebemos suas respostas. Nosso time de estratégia agora irá analisar tudo para iniciarmos o seu projeto com força total.
            </p>
            <p style={{ color: '#f97316', fontSize: '0.875rem', fontWeight: 500 }}>
              Você já pode fechar esta aba.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .glass-card {
          background: rgba(18, 18, 20, 0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 24px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        
        .label-briefing {
          display: block;
          margin-bottom: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.5);
        }
        
        .input-briefing {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 12px 16px;
          color: white;
          font-size: 1rem;
          transition: all 0.2s ease;
        }
        
        .input-briefing:focus {
          outline: none;
          border-color: #f97316;
          background: rgba(255, 255, 255, 0.08);
          box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.1);
        }

        .btn-accent {
          background: #f97316;
          color: white;
          border: none;
          border-radius: 12px;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-accent:hover {
          transform: translateY(-2px);
          filter: brightness(1.1);
          box-shadow: 0 10px 15px -3px rgba(249, 115, 22, 0.3);
        }
        
        .btn-accent:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .btn-secondary {
          color: rgba(255, 255, 255, 0.5);
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-weight: 500;
          background: transparent;
          border: none;
        }
        
        .btn-secondary:hover {
          color: white;
        }
      `}</style>
    </div>
  );
}
