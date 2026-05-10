"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  User,
  FileText,
  Share2,
  MessageSquare,
  CreditCard,
  Plus,
  Calendar,
  ExternalLink,
  ShieldCheck,
  Clock,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Mail,
  Send,
  Camera,
  Briefcase
} from "lucide-react";
import Spotlight from "@/components/Spotlight";
import { motion, AnimatePresence } from "framer-motion";

const TABS = [
  { id: 'dados', label: 'Dados', icon: User },
  { id: 'demandas', label: 'Demandas', icon: ClipboardList },
  { id: 'notas', label: 'Notas', icon: MessageSquare },
  { id: 'access', label: 'Acessos', icon: ShieldCheck },
  { id: 'contracts', label: 'Contratos', icon: FileText },
  { id: 'finance', label: 'Financeiro', icon: CreditCard },
];

export default function ClientDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dados');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const [clientData, setClientData] = useState<any>(null);
  const [localDemands, setLocalDemands] = useState<any[]>([]);
  const [localNotes, setLocalNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [clientContracts, setClientContracts] = useState<any[]>([]);
  const [clientInvoices, setClientInvoices] = useState<any[]>([]);
  const [clientEvents, setClientEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchClientDetails();
    }
  }, [id]);

  const fetchClientDetails = async () => {
    try {
      setLoading(true);

      // Fetch Client Data
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();

      if (clientError) throw clientError;

      // Ensure proper casing for frontend compat
      const mappedClient = {
        ...client,
        contactName: client.contact_name,
        nomeFantasia: client.nome_fantasia,
        tipoPessoa: client.tipo_pessoa,
        emailFinanceiro: client.email_financeiro,
        telefoneFixo: client.telefone_fixo,
        socialAccess: client.social_access,
        portalEmail: client.portal_email,
        portalPassword: client.portal_password,
        servicoInteresse: client.servico_interesse,
        createdAt: client.created_at,
      };

      setClientData(mappedClient);

      // Note: We don't have a 'notes' table yet. If it was jsonb in mock, let's keep it empty for now 
      // or fetch from somewhere else if it gets added later.
      setLocalNotes([]);

      // Fetch related data in parallel
      const [demandsRes, contractsRes, invoicesRes, eventsRes] = await Promise.all([
        supabase.from('demands').select('*').eq('client_id', id).order('created_at', { ascending: false }),
        supabase.from('contracts').select('*').eq('client_id', id),
        supabase.from('invoices').select('*').eq('client_id', id),
        supabase.from('agenda_events').select('*').eq('client_id', id)
      ]);

      if (demandsRes.data) setLocalDemands(demandsRes.data.map(d => ({ ...d, dueDate: d.due_date })));
      if (contractsRes.data) setClientContracts(contractsRes.data.map(c => ({ ...c, startDate: c.start_date, endDate: c.end_date })));
      if (invoicesRes.data) setClientInvoices(invoicesRes.data.map(i => ({ ...i, dueDate: i.due_date })));
      if (eventsRes.data) setClientEvents(eventsRes.data);

    } catch (error) {
      console.error("Erro ao buscar detalhes do cliente:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(217, 72, 15, 0.3)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} />
        </motion.div>
      </div>
    );
  }

  if (!clientData) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Cliente não encontrado</h2>
        <button onClick={() => router.back()} className="btn btn-secondary" style={{ marginTop: '20px' }}>
          Voltar
        </button>
      </div>
    );
  }

  const togglePassword = (key: string) => {
    setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const updateDemandStatus = (demandId: string) => {
    const statusOrder: any[] = ['pending', 'in_production', 'review', 'approved', 'completed'];
    setLocalDemands(prev => prev.map(d => {
      if (d.id === demandId) {
        const currentIndex = statusOrder.indexOf(d.status);
        const nextIndex = (currentIndex + 1) % statusOrder.length;
        return { ...d, status: statusOrder[nextIndex] };
      }
      return d;
    }));
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;

    // Lógica de menção será adaptada
    const mentions = newNote.match(/@(\w+)/g);
    if (mentions) {
      // requires querying users table
    }

    // Como a tabela notes não existe na modelagem atual, apenas adiciona em memória ou você pode querer criá-la.
    const note = { id: Math.random().toString(), content: newNote, date: new Date().toISOString(), author: 'Current User' };
    setLocalNotes([note, ...localNotes]);
    setNewNote("");
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <motion.button
          whileHover={{ x: -4 }}
          onClick={() => router.back()}
          style={{
            width: '40px', height: '40px', borderRadius: '12px',
            backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)'
          }}
        >
          <ArrowLeft size={20} />
        </motion.button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>{clientData.name}</h1>
            <span className={`badge ${clientData.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
              {clientData.status === 'active' ? 'Ativo' : 'Prospect'}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>ID: #{clientData.id} • Cadastrado em {new Date(clientData.createdAt).toLocaleDateString('pt-BR')}</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary"><Share2 size={18} /> Compartilhar</button>
          <button className="btn btn-accent"><Plus size={18} /> Nova Ação</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '2px', overflowX: 'auto' }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '12px 12px 0 0',
                background: isActive ? 'rgba(217, 72, 15, 0.1)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                fontWeight: 600,
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              <tab.icon size={18} />
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="active-tab-client"
                  style={{
                    position: 'absolute',
                    bottom: '-2px',
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: 'var(--accent)',
                    zIndex: 1
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="animate-fade-in">
        <AnimatePresence mode="wait">
          {activeTab === 'dados' && (
            <motion.div
              key="dados"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <Spotlight className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '20px' }}>Informações Cadastrais</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Razão Social</p>
                      <p style={{ fontWeight: 500 }}>{clientData.name}</p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Nome Fantasia</p>
                      <p style={{ fontWeight: 500 }}>{clientData.nomeFantasia || '-'}</p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>CNPJ / CPF</p>
                      <p style={{ fontWeight: 500 }}>{clientData.cnpj}</p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Setor / Nicho</p>
                      <p style={{ fontWeight: 500 }}>{clientData.setor || '-'}</p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Contato Principal</p>
                      <p style={{ fontWeight: 500 }}>{clientData.contactName}</p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>WhatsApp</p>
                      <p style={{ fontWeight: 500 }}>{clientData.phone}</p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Telefone Fixo</p>
                      <p style={{ fontWeight: 500 }}>{clientData.telefoneFixo || '-'}</p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>E-mail Principal</p>
                      <p style={{ fontWeight: 500 }}>{clientData.email}</p>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>E-mail Financeiro</p>
                      <p style={{ fontWeight: 500 }}>{clientData.emailFinanceiro || clientData.email}</p>
                    </div>
                  </div>
                </Spotlight>

                <Spotlight className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '20px' }}>Endereço</h3>
                  {clientData.address ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div style={{ gridColumn: 'span 2' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Logradouro</p>
                        <p style={{ fontWeight: 500 }}>{clientData.address.logradouro}, {clientData.address.numero}</p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Complemento</p>
                        <p style={{ fontWeight: 500 }}>{clientData.address.complemento || '-'}</p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Bairro</p>
                        <p style={{ fontWeight: 500 }}>{clientData.address.bairro}</p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Cidade/UF</p>
                        <p style={{ fontWeight: 500 }}>{clientData.address.cidade} - {clientData.address.uf}</p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>CEP</p>
                        <p style={{ fontWeight: 500 }}>{clientData.address.cep}</p>
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Endereço não informado.</p>
                  )}
                </Spotlight>

                <Spotlight className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '20px' }}>Briefing & Interesse</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Serviço de Interesse</p>
                      <p style={{ fontWeight: 600, color: 'var(--accent)' }}>{clientData.servicoInteresse || '-'}</p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Briefing Inicial</p>
                      <p style={{ fontWeight: 400, lineHeight: '1.6', fontSize: '0.95rem' }}>
                        {clientData.briefing || 'Nenhum briefing fornecido.'}
                      </p>
                    </div>
                  </div>
                </Spotlight>

                <Spotlight className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Lock size={18} color="var(--accent)" /> Acesso ao Portal do Cliente
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                      <div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>E-mail de Login (Portal)</p>
                        <p style={{ fontWeight: 500 }}>{clientData.portalEmail || clientData.email}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => {
                            if (confirm(`Deseja realmente redefinir a senha do portal para ${clientData.name}?`)) {
                              alert('Um e-mail de redefinição de senha foi enviado para o cliente.');
                            }
                          }}
                          className="btn btn-secondary"
                          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                          <ShieldCheck size={16} /> Redefinir Senha do Portal
                        </button>
                      </div>
                    </div>
                    <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(217, 72, 15, 0.05)', border: '1px solid rgba(217, 72, 15, 0.1)' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
                        <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                        O cliente usa estas credenciais para acessar o painel de acompanhamento de demandas e financeiro.
                      </p>
                    </div>
                  </div>
                </Spotlight>

                <Spotlight className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '20px' }}>Próximos Passos & Agenda</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {clientEvents.length > 0 ? clientEvents.map(event => (
                      <div key={event.id} style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px' }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(217, 72, 15, 0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)'
                        }}>
                          <Calendar size={20} />
                        </div>
                        <div>
                          <p style={{ fontWeight: 500 }}>{event.title}</p>
                          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{new Date(event.date).toLocaleString('pt-BR')}</p>
                        </div>
                        <button style={{ marginLeft: 'auto', color: 'var(--text-secondary)' }}><ExternalLink size={16} /></button>
                      </div>
                    )) : (
                      <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>Sem eventos agendados.</p>
                    )}
                  </div>
                </Spotlight>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <Spotlight className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '20px' }}>Resumo de Contratos</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Contratos Ativos</span>
                      <span style={{ fontWeight: 600 }}>{clientContracts.length}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Recorrência Total</span>
                      <span style={{ fontWeight: 600, color: 'var(--accent)' }}>
                        R$ {clientContracts.reduce((acc, curr) => acc + curr.value, 0).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div style={{ height: '1px', background: 'var(--border)', margin: '8px 0' }} />
                    <button className="btn btn-secondary" style={{ width: '100%' }}>Ver todos os contratos</button>
                  </div>
                </Spotlight>

                <Spotlight className="glass-card" style={{ padding: '24px', backgroundColor: 'rgba(34, 197, 94, 0.05)', borderColor: 'rgba(34, 197, 94, 0.2)' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ color: '#22C55E' }}><ShieldCheck size={24} /></div>
                    <div>
                      <p style={{ fontWeight: 600 }}>Health Score: 9.5</p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Cliente satisfeito e com pagamentos em dia.</p>
                    </div>
                  </div>
                </Spotlight>
              </div>
            </motion.div>
          )}

          {activeTab === 'demandas' && (
            <motion.div
              key="demandas"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Demandas Ativas</h3>
                <button className="btn btn-accent btn-sm"><Plus size={16} /> Nova Demanda</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {localDemands.map(demand => (
                  <Spotlight
                    key={demand.id}
                    className="glass-card"
                    style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', cursor: 'pointer' }}
                    onClick={() => updateDemandStatus(demand.id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 600, padding: '4px 8px', borderRadius: '6px',
                        backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)'
                      }}>{demand.type}</span>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 600,
                        color: demand.priority === 'high' ? '#EF4444' : demand.priority === 'medium' ? 'var(--accent)' : '#22C55E'
                      }}>
                        {demand.priority === 'high' ? 'Alta Prioridade' : demand.priority === 'medium' ? 'Média' : 'Baixa'}
                      </span>
                    </div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{demand.title}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      <Clock size={14} />
                      Entrega: {new Date(demand.dueDate).toLocaleDateString('pt-BR')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <div style={{
                        flex: 1, height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden'
                      }}>
                        <div style={{
                          width: demand.status === 'completed' ? '100%' : demand.status === 'approved' ? '80%' : demand.status === 'review' ? '60%' : demand.status === 'in_production' ? '40%' : '10%',
                          height: '100%', backgroundColor: 'var(--accent)', borderRadius: '3px',
                          transition: 'width 0.5s ease-in-out'
                        }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                        {demand.status === 'completed' ? 'Finalizado' : demand.status === 'approved' ? 'Aprovado' : demand.status === 'review' ? 'Em Revisão' : demand.status === 'in_production' ? 'Produção' : 'Pendente'}
                      </span>
                    </div>
                  </Spotlight>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'notas' && (
            <motion.div
              key="notas"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: '0 auto', width: '100%' }}
            >
              <div className="glass-card" style={{ padding: '20px', display: 'flex', gap: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>JN</div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <textarea
                    className="input-dark"
                    placeholder="Adicionar uma nota interna..."
                    style={{ minHeight: '100px', resize: 'none' }}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      className="btn btn-accent btn-sm"
                      onClick={handleAddNote}
                    >
                      <Send size={16} /> Publicar Nota
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {localNotes.map(note => (
                  <div key={note.id} style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ width: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600 }}>
                        {note.author.substring(0, 2).toUpperCase()}
                      </div>
                      <div style={{ width: '1px', flex: 1, background: 'var(--border)', margin: '8px 0' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{note.author}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(note.date).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <div className="glass-card" style={{ padding: '16px', fontSize: '0.95rem' }}>
                        {note.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'access' && (
            <motion.div
              key="access"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}
            >
              {clientData.socialAccess ? Object.entries(clientData.socialAccess).map(([key, data]) => {
                if (!data.usuario) return null;
                return (
                  <Spotlight key={key} className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(217, 72, 15, 0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)'
                        }}>
                          {key === 'instagram' ? <Camera size={20} /> :
                            key === 'facebook' ? <Globe size={20} /> :
                              key === 'linkedin' ? <Briefcase size={20} /> :
                                <Globe size={20} />}
                        </div>
                        <h4 style={{ fontWeight: 700, fontSize: '1.1rem', textTransform: 'capitalize' }}>{key}</h4>
                      </div>
                      {data.link && (
                        <a href={data.link.startsWith('http') ? data.link : `https://${data.link}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ padding: '8px' }}>
                          <ExternalLink size={16} />
                        </a>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Usuário / Login</span>
                        <div style={{
                          padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px',
                          display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem'
                        }}>
                          <User size={14} color="var(--text-secondary)" />
                          {data.usuario}
                        </div>
                      </div>

                      {data.email && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>E-mail de Recuperação</span>
                          <div style={{
                            padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px',
                            display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem'
                          }}>
                            <Mail size={14} color="var(--text-secondary)" />
                            {data.email}
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Senha</span>
                        <div style={{
                          padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', fontSize: '0.9rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Lock size={14} color="var(--text-secondary)" />
                            <span>{showPasswords[key] ? data.senha : '••••••••'}</span>
                          </div>
                          <button
                            onClick={() => togglePassword(key)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                          >
                            {showPasswords[key] ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </Spotlight>
                );
              }) : (
                <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  Nenhum acesso de rede social cadastrado.
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'contracts' && (
            <motion.div
              key="contracts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Spotlight className="glass-card" style={{ padding: '0' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: '24px' }}>Serviço</th>
                      <th>Início</th>
                      <th>Vencimento</th>
                      <th>Valor</th>
                      <th>Status</th>
                      <th style={{ paddingRight: '24px', textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientContracts.map(contract => (
                      <tr key={contract.id}>
                        <td style={{ paddingLeft: '24px' }}>
                          <p style={{ fontWeight: 500 }}>Contrato #{contract.id}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID Serviço: {contract.serviceId}</p>
                        </td>
                        <td>{new Date(contract.startDate).toLocaleDateString('pt-BR')}</td>
                        <td>{new Date(contract.endDate).toLocaleDateString('pt-BR')}</td>
                        <td style={{ fontWeight: 600 }}>R$ {contract.value.toLocaleString('pt-BR')}</td>
                        <td>
                          <span className={`badge ${contract.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                            {contract.status === 'active' ? 'Ativo' : 'Expirando'}
                          </span>
                        </td>
                        <td style={{ paddingRight: '24px', textAlign: 'right' }}>
                          <button style={{ color: 'var(--text-secondary)' }}><ExternalLink size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Spotlight>
            </motion.div>
          )}

          {activeTab === 'finance' && (
            <motion.div
              key="finance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                <Spotlight className="glass-card" style={{ padding: '24px' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total Pago</p>
                  <h4 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#22C55E' }}>
                    R$ {clientInvoices.filter(i => i.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString('pt-BR')}
                  </h4>
                </Spotlight>
                <Spotlight className="glass-card" style={{ padding: '24px' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Pendente</p>
                  <h4 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent)' }}>
                    R$ {clientInvoices.filter(i => i.status === 'pending').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString('pt-BR')}
                  </h4>
                </Spotlight>
                <Spotlight className="glass-card" style={{ padding: '24px' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Atrasado</p>
                  <h4 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#EF4444' }}>
                    R$ {clientInvoices.filter(i => i.status === 'overdue').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString('pt-BR')}
                  </h4>
                </Spotlight>
              </div>

              <Spotlight className="glass-card" style={{ padding: '0' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: '24px' }}>Fatura</th>
                      <th>Data de Vencimento</th>
                      <th>Valor</th>
                      <th>Status</th>
                      <th style={{ paddingRight: '24px', textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientInvoices.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()).map(invoice => (
                      <tr key={invoice.id}>
                        <td style={{ paddingLeft: '24px' }}>
                          <p style={{ fontWeight: 500 }}>{invoice.description}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>#{invoice.id}</p>
                        </td>
                        <td>{new Date(invoice.dueDate).toLocaleDateString('pt-BR')}</td>
                        <td style={{ fontWeight: 600 }}>R$ {invoice.amount.toLocaleString('pt-BR')}</td>
                        <td>
                          <span className={`badge ${invoice.status === 'paid' ? 'badge-success' :
                            invoice.status === 'pending' ? 'badge-warning' : 'badge-danger'
                            }`}>
                            {invoice.status === 'paid' ? 'Pago' : invoice.status === 'pending' ? 'Pendente' : 'Atrasado'}
                          </span>
                        </td>
                        <td style={{ paddingRight: '24px', textAlign: 'right' }}>
                          <button style={{ color: 'var(--text-secondary)' }}><CreditCard size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Spotlight>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
