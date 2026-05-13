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
  Briefcase,
  Edit2,
  Trash2,
  X,
  Copy,
  Hash,
  Sparkles,
  Folder,
  HardDrive,
  Upload,
  Link,
  Download,
  FilePlus,
  MoreVertical,
  MapPin,
  Layout,
  Target
} from "lucide-react";
import Spotlight from "@/components/Spotlight";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/CustomToast";

const TABS = [
  { id: 'dados', label: 'Dados', icon: User },
  { id: 'briefing', label: 'Briefing', icon: Layout },
  { id: 'demandas', label: 'Demandas', icon: ClipboardList },
  { id: 'notas', label: 'Notas', icon: MessageSquare },
  { id: 'access', label: 'Acessos', icon: ShieldCheck },
  { id: 'contracts', label: 'Contratos', icon: FileText },
  { id: 'finance', label: 'Financeiro', icon: CreditCard },
  { id: 'docs', label: 'Docs', icon: Folder },
];

export default function ClientDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('dados');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const [clientData, setClientData] = useState<any>(null);
  const [localDemands, setLocalDemands] = useState<any[]>([]);
  const [localNotes, setLocalNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [clientContracts, setClientContracts] = useState<any[]>([]);
  const [clientInvoices, setClientInvoices] = useState<any[]>([]);
  const [clientEvents, setClientEvents] = useState<any[]>([]);
  const [clientDocuments, setClientDocuments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isGoogleDriveModalOpen, setIsGoogleDriveModalOpen] = useState(false);
  const [tempGoogleDriveUrl, setTempGoogleDriveUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionFormData, setActionFormData] = useState({
    service_id: '',
    value: 0,
    start_date: new Date().toISOString().split('T')[0],
    billing_cycle: 'monthly',
    due_day: 10,
    installments: 1,
    contract_duration: 12
  });

  useEffect(() => {
    if (id) {
      fetchClientDetails();
      fetchAvailableServices();
    }
  }, [id]);

  const fetchAvailableServices = async () => {
    const { data } = await supabase.from('services').select('*').order('name');
    if (data) setAvailableServices(data);
  };

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

      setClientData(client);

      // Note: We don't have a 'notes' table yet. If it was jsonb in mock, let's keep it empty for now 
      // or fetch from somewhere else if it gets added later.
      setLocalNotes([]);

      // Fetch related data in parallel
      const [demandsRes, contractsRes, invoicesRes, eventsRes, docsRes] = await Promise.all([
        supabase.from('demands').select('*').eq('client_id', id).order('created_at', { ascending: false }),
        supabase.from('contracts').select('*').eq('client_id', id),
        supabase.from('invoices').select('*').eq('client_id', id),
        supabase.from('agenda_events').select('*').eq('client_id', id),
        supabase.from('client_documents').select('*').eq('client_id', id).order('created_at', { ascending: false })
      ]);

      if (demandsRes.data) setLocalDemands(demandsRes.data);
      if (contractsRes.data) setClientContracts(contractsRes.data);
      if (invoicesRes.data) setClientInvoices(invoicesRes.data);
      if (eventsRes.data) setClientEvents(eventsRes.data);
      if (docsRes.data) setClientDocuments(docsRes.data);

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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    // Para datas YYYY-MM-DD, forçamos o meio-dia para evitar que o fuso horário mude o dia
    const date = dateStr.includes('T') ? new Date(dateStr) : new Date(`${dateStr}T12:00:00`);
    return date.toLocaleDateString('pt-BR');
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'paid' })
        .eq('id', invoiceId);

      if (error) throw error;
      showToast('Fatura marcada como paga!', 'success');
      fetchClientDetails();
    } catch (err) {
      console.error("Erro ao atualizar fatura:", err);
      showToast('Erro ao atualizar fatura.', 'error');
    }
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

  const handleOpenEdit = () => {
    setEditFormData({ ...clientData });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editFormData) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          name: editFormData.name,
          nome_fantasia: editFormData.nome_fantasia,
          cnpj: editFormData.cnpj,
          tipo_pessoa: editFormData.tipo_pessoa,
          contact_name: editFormData.contact_name,
          email: editFormData.email,
          email_financeiro: editFormData.email_financeiro,
          phone: editFormData.phone,
          telefone_fixo: editFormData.telefone_fixo,
          status: editFormData.status,
          setor: editFormData.setor,
          address: editFormData.address,
          briefing: editFormData.briefing,
          servico_interesse: editFormData.servico_interesse,
          social_access: editFormData.social_access,
          portal_email: editFormData.portal_email,
          portal_password: editFormData.portal_password
        })
        .eq('id', id);

      if (error) throw error;

      setClientData(editFormData);
      setIsEditModalOpen(false);
      showToast('Dados do cliente atualizados com sucesso!', 'success');
    } catch (err) {
      console.error("Erro ao atualizar cliente:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateAction = async () => {
    if (!actionFormData.service_id) {
      showToast('Selecione um serviço', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const selectedService = availableServices.find(s => s.id === actionFormData.service_id);
      
      // 1. Criar o Contrato
      const startDate = new Date(`${actionFormData.start_date}T12:00:00`);
      const endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 1); // Contrato padrão de 1 ano

      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .insert({
          client_id: id,
          service_id: actionFormData.service_id,
          value: actionFormData.value || Number(selectedService?.price || 0),
          start_date: actionFormData.start_date,
          end_date: endDate.toISOString().split('T')[0],
          status: 'active',
          auto_renew: true,
          billing_cycle: actionFormData.billing_cycle || selectedService?.billing_cycle || 'monthly'
        })
        .select()
        .single();

      if (contractError) throw contractError;

      // 2. Gerar Faturas (Lógica de Parcelamento ou Recorrência Antecipada)
      let invoicesToCreate = [];
      const totalValue = actionFormData.value || Number(selectedService?.price || 0);

      if (actionFormData.billing_cycle === 'one_time') {
        const numInstallments = actionFormData.installments;
        const installmentValue = totalValue / numInstallments;
        for (let i = 0; i < numInstallments; i++) {
          let dueDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, actionFormData.due_day);
          invoicesToCreate.push({
            client_id: id,
            contract_id: contract.id,
            amount: installmentValue,
            due_date: dueDate.toISOString().split('T')[0],
            status: 'pending',
            description: `${selectedService?.name || 'Serviço'} (Parcela ${i + 1}/${numInstallments})`
          });
        }
      } else {
        // Lógica para Recorrentes (Mensal, Trimestral, etc.)
        const duration = actionFormData.contract_duration;
        let monthsStep = 1;
        if (actionFormData.billing_cycle === 'quarterly') monthsStep = 3;
        if (actionFormData.billing_cycle === 'semiannual') monthsStep = 6;
        if (actionFormData.billing_cycle === 'annual') monthsStep = 12;

        const numInvoices = Math.ceil(duration / monthsStep);
        for (let i = 0; i < numInvoices; i++) {
          // A primeira fatura recorrente começa no mês seguinte (mês + 1 + i * step)
          let dueDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1 + (i * monthsStep), actionFormData.due_day);
          invoicesToCreate.push({
            client_id: id,
            contract_id: contract.id,
            amount: totalValue,
            due_date: dueDate.toISOString().split('T')[0],
            status: 'pending',
            description: `Mensalidade: ${selectedService?.name || 'Serviço'} (${i + 1}/${numInvoices})`
          });
        }
      }

      // 3. Inserir todas as faturas geradas
      const { error: invoiceError } = await supabase
        .from('invoices')
        .insert(invoicesToCreate);

      if (invoiceError) throw invoiceError;

      showToast('Serviço ativado e fatura gerada!', 'success');
      setIsActionModalOpen(false);
      fetchClientDetails(); 
    } catch (err) {
      console.error("Erro ao criar ação:", err);
      showToast('Erro ao ativar serviço. Verifique os dados.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClient = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setIsDeleteModalOpen(false);
      router.push("/admin/clients");
    } catch (err) {
      console.error("Erro ao excluir cliente:", err);
      showToast("Erro ao excluir cliente. Verifique se há dependências.", 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('client_documents')
        .insert({
          client_id: id,
          name: file.name,
          file_path: filePath,
          file_type: file.type,
          size: file.size,
          category: 'attachment'
        });

      if (dbError) throw dbError;

      showToast('Documento enviado com sucesso!', 'success');
      fetchClientDetails();
    } catch (err) {
      console.error('Erro no upload:', err);
      showToast('Erro ao enviar documento.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string, filePath: string) => {
    try {
      if (filePath) {
        await supabase.storage.from('client-documents').remove([filePath]);
      }

      const { error } = await supabase
        .from('client_documents')
        .delete()
        .eq('id', docId);

      if (error) throw error;

      showToast('Documento excluído!', 'success');
      setClientDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      console.error('Erro ao excluir:', err);
      showToast('Erro ao excluir documento.', 'error');
    }
  };

  const handleSaveGoogleDrive = async () => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ google_drive_url: tempGoogleDriveUrl })
        .eq('id', id);

      if (error) throw error;

      setClientData({ ...clientData, google_drive_url: tempGoogleDriveUrl });
      setIsGoogleDriveModalOpen(false);
      showToast('Link do Google Drive atualizado!', 'success');
    } catch (err) {
      console.error('Erro ao salvar Drive:', err);
      showToast('Erro ao salvar link do Drive.', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="mobile-stack" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
            <h1 
              title={clientData.nome_fantasia || clientData.name}
              className="hover-text-accent"
              style={{ 
                fontSize: 'clamp(1.3rem, 4vw, 2rem)', 
                fontWeight: 700,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%'
              }}
            >
              {clientData.nome_fantasia || clientData.name}
            </h1>
            <span className={`badge ${clientData.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
              {clientData.status === 'active' ? 'Ativo' : 'Prospect'}
            </span>
            <span style={{ 
              fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)',
              background: 'rgba(217, 72, 15, 0.05)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(217, 72, 15, 0.1)'
            }}>
              #{String(clientData.sequential_id || 0).padStart(3, '0')}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
            {clientData.nome_fantasia && (
              <p 
                title={clientData.name}
                style={{ 
                  color: 'var(--text-secondary)', 
                  fontSize: '0.95rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '250px'
                }}
              >
                {clientData.name}
              </p>
            )}
            <span style={{ color: 'rgba(255,255,255,0.1)' }}>•</span>
            <p 
              title={clientData.servico_interesse || 'Sem serviço definido'}
              style={{ 
                color: 'var(--text-secondary)', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '300px'
              }}
            >
              <Briefcase size={14} style={{ color: 'var(--accent)' }} /> {clientData.servico_interesse || 'Sem serviço definido'}
            </p>
          </div>
            <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px' }}>
              {/* Quick Access Icons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {clientData.social_access?.instagram?.usuario && (
                  <button 
                    onClick={() => window.open(`https://instagram.com/${clientData.social_access.instagram.usuario}`, '_blank')}
                    title={`Instagram: @${clientData.social_access.instagram.usuario}`}
                    style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--card-inner-bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', transition: '0.2s' }}
                    className="hover-accent"
                  >
                    <Camera size={16} />
                  </button>
                )}
                {clientData.social_access?.facebook?.usuario && (
                  <button 
                    onClick={() => window.open(`https://facebook.com/${clientData.social_access.facebook.usuario}`, '_blank')}
                    title={`Facebook: ${clientData.social_access.facebook.usuario}`}
                    style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--card-inner-bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', transition: '0.2s' }}
                    className="hover-accent"
                  >
                    <Globe size={16} />
                  </button>
                )}
                {clientData.social_access?.linkedin?.usuario && (
                  <button 
                    onClick={() => window.open(`https://linkedin.com/in/${clientData.social_access.linkedin.usuario}`, '_blank')}
                    title={`LinkedIn: ${clientData.social_access.linkedin.usuario}`}
                    style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--card-inner-bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', transition: '0.2s' }}
                    className="hover-accent"
                  >
                    <Briefcase size={16} />
                  </button>
                )}
                {clientData.social_access?.tiktok?.usuario && (
                  <button 
                    onClick={() => window.open(`https://tiktok.com/@${clientData.social_access.tiktok.usuario}`, '_blank')}
                    title={`TikTok: @${clientData.social_access.tiktok.usuario}`}
                    style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--card-inner-bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', transition: '0.2s' }}
                    className="hover-accent"
                  >
                    <Share2 size={16} />
                  </button>
                )}
                {clientData.social_access?.google?.usuario && (
                  <button 
                    title={`Google Meu Negócio: ${clientData.social_access.google.usuario}`}
                    style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--card-inner-bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', transition: '0.2s' }}
                    className="hover-accent"
                  >
                    <MapPin size={16} />
                  </button>
                )}
                <button 
                  onClick={() => window.open(`/client/dashboard?simulate=${clientData.id}`, '_blank')}
                  title="Visão do Cliente"
                  style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(217, 72, 15, 0.05)', border: '1px solid rgba(217, 72, 15, 0.2)', color: 'var(--accent)', display: 'flex', alignItems: 'center', transition: '0.2s' }}
                  className="hover-accent"
                >
                  <Eye size={16} />
                </button>
              </div>

              <span style={{ color: 'rgba(255,255,255,0.1)' }}>•</span>
              
              <div
                title={`Cadastrado em ${new Date(clientData.created_at).toLocaleDateString('pt-BR')} às ${new Date(clientData.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                style={{ 
                  color: 'var(--text-secondary)', 
                  fontSize: '0.75rem', 
                  fontWeight: 600,
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  backgroundColor: 'var(--card-inner-bg)',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  cursor: 'default',
                  transition: '0.2s'
                }}
                className="hover-accent"
              >
                <Calendar size={14} /> CAD {clientData.created_at ? formatDate(clientData.created_at).split('/').slice(0, 2).join('/') : '-'}
              </div>
            </div>
        </div>
        <div className="mobile-stack" style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setIsDeleteModalOpen(true)} style={{ color: '#EF4444', minHeight: '44px' }}><Trash2 size={18} /></button>
          <button className="btn btn-secondary" onClick={handleOpenEdit} style={{ minHeight: '44px' }}><Edit2 size={18} /> <span className="hide-mobile">Editar</span></button>
          <button className="btn btn-accent" onClick={() => setIsActionModalOpen(true)} style={{ minHeight: '44px' }}><Plus size={18} /> <span className="hide-mobile">Nova</span> Ação</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '2px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }} className="client-tabs-scroll">
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
                padding: '10px 16px',
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
              className="mobile-grid-1"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <Spotlight className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '20px' }}>Informações Cadastrais</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div title={clientData.name} style={{ overflow: 'hidden' }}>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Razão Social</p>
                      <p style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '250px' }}>{clientData.name}</p>
                    </div>
                    <div title={clientData.nome_fantasia || '-'} style={{ overflow: 'hidden' }}>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Nome Fantasia</p>
                      <p style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '250px' }}>{clientData.nome_fantasia || '-'}</p>
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
                      <p style={{ fontWeight: 500 }}>{clientData.contact_name}</p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>WhatsApp</p>
                      <p style={{ fontWeight: 500 }}>{clientData.phone}</p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Telefone Fixo</p>
                      <p style={{ fontWeight: 500 }}>{clientData.telefone_fixo || '-'}</p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>E-mail Principal</p>
                      <p style={{ fontWeight: 500 }}>{clientData.email}</p>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>E-mail Financeiro</p>
                      <p style={{ fontWeight: 500 }}>{clientData.email_financeiro || clientData.email}</p>
                    </div>
                  </div>
                </Spotlight>

                <Spotlight className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '20px' }}>Endereço</h3>
                  {clientData.address ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div style={{ gridColumn: 'span 2' }} title={`${clientData.address.logradouro}, ${clientData.address.numero}`}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Logradouro</p>
                        <p style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {clientData.address.logradouro}, {clientData.address.numero}
                        </p>
                      </div>
                      <div title={clientData.address.complemento || '-'}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Complemento</p>
                        <p style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{clientData.address.complemento || '-'}</p>
                      </div>
                      <div title={clientData.address.bairro}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Bairro</p>
                        <p style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{clientData.address.bairro}</p>
                      </div>
                      <div title={`${clientData.address.cidade} - ${clientData.address.uf}`}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Cidade/UF</p>
                        <p style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{clientData.address.cidade} - {clientData.address.uf}</p>
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

                {/* Agenda and Sidebar Content */}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <Spotlight className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '20px' }}>Próximos Passos & Agenda</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {clientEvents.length > 0 ? clientEvents.map(event => (
                      <div key={event.id} style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '12px', backgroundColor: 'var(--card-inner-bg)', borderRadius: '12px' }}>
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
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(clientContracts.reduce((acc, curr) => acc + curr.value, 0))}
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

          {activeTab === 'briefing' && (
            <motion.div
              key="briefing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {clientData.briefing_completed ? (
                    <Spotlight className="glass-card" style={{ padding: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Respostas do Briefing</h3>
                        <span className="badge badge-success">Concluído</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                        {(() => {
                          const data = clientData.briefing_data || {};
                          const groups = [
                            {
                              title: 'Identidade e Negócio',
                              icon: <User size={20} />,
                              fields: ['nome_contato', 'email_contato', 'whatsapp', 'nicho', 'tempo_mercado', 'situacao_atual', 'produtos_fortes']
                            },
                            {
                              title: 'Público e Diferenciais',
                              icon: <Target size={20} />,
                              fields: ['perfil_publico', 'desejos_publico', 'diferencial', 'concorrentes']
                            },
                            {
                              title: 'Marketing e Vendas',
                              icon: <Briefcase size={20} />,
                              fields: ['equipe_marketing', 'processo_vendas', 'ticket_medio', 'sazonalidade', 'canais_atuais', 'objetivos', 'historico_marketing']
                            },
                            {
                              title: 'Identidade Visual e Inspirações',
                              icon: <Camera size={20} />,
                              fields: ['cores_desejadas', 'elementos_visuais', 'cores_evitar', 'referencias', 'inspiracoes']
                            }
                          ];

                          const labels: Record<string, string> = {
                            nome_contato: 'Nome do Contato',
                            email_contato: 'E-mail do Contato',
                            whatsapp: 'WhatsApp',
                            nicho: 'Nicho de Mercado',
                            tempo_mercado: 'Tempo de Mercado',
                            situacao_atual: 'Situação Atual',
                            produtos_fortes: 'Produtos/Serviços Fortes',
                            perfil_publico: 'Perfil do Público',
                            desejos_publico: 'Desejos do Público',
                            diferencial: 'Diferencial Competitivo',
                            concorrentes: 'Concorrentes',
                            referencias: 'Referências',
                            inspiracoes: 'Inspirações',
                            equipe_marketing_interna: 'Equipe de Marketing Interna',
                            empresa_nova: 'Empresa Nova no Mercado?',
                            redes_sociais: 'Redes Sociais Atuais',
                            processo_vendas: 'Processo de Vendas',
                            ticket_medio: 'Ticket Médio',
                            sazonalidade: 'Sazonalidade',
                            canais_atuais: 'Canais Atuais',
                            objetivos: 'Objetivos Principais',
                            historico_marketing: 'Histórico de Marketing',
                            cores_desejadas: 'Cores Desejadas',
                            elementos_visuais: 'Elementos Visuais',
                            cores_evitar: 'Cores a Evitar'
                          };

                          return groups.map((group, gIdx) => {
                            const hasData = group.fields.some(f => data[f]);
                            if (!hasData) return null;

                            return (
                              <div key={gIdx} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--accent)' }}>
                                  {group.icon}
                                  <h4 style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '0.02em' }}>{group.title}</h4>
                                  <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, var(--accent), transparent)', opacity: 0.2 }} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                                  {group.fields.map(field => {
                                    if (!data[field]) return null;
                                    const value = data[field];
                                    const displayValue = Array.isArray(value) ? value.join(', ') : value;
                                    
                                    return (
                                      <div key={field} style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                                          {labels[field] || field.replace(/_/g, ' ')}
                                        </p>
                                        <p style={{ lineHeight: 1.6, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{displayValue}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          });
                        })()}
                        
                        {clientData.briefing && !clientData.briefing_data && (
                           <div style={{ marginTop: '20px' }}>
                             <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Briefing (Texto Consolidado)</p>
                             <div style={{ whiteSpace: 'pre-wrap', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', fontSize: '0.9rem' }}>
                               {clientData.briefing}
                             </div>
                           </div>
                        )}
                      </div>
                    </Spotlight>
                  ) : (
                    <Spotlight className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
                      <div style={{ 
                        width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(217, 72, 15, 0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)',
                        margin: '0 auto 24px'
                      }}>
                        <Sparkles size={32} />
                      </div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px' }}>Briefing Pendente</h3>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', maxWidth: '400px', margin: '0 auto 32px' }}>
                        O cliente ainda não preencheu o briefing. Envie o link personalizado para coletar as informações necessárias para o projeto.
                      </p>
                      
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                        <button 
                          className="btn btn-accent"
                          onClick={() => {
                            const briefingUrl = `${window.location.origin}/briefing/${clientData.id}`;
                            navigator.clipboard.writeText(briefingUrl);
                            showToast('Link do briefing copiado!', 'success');
                          }}
                        >
                          <Copy size={18} /> Copiar Link de Briefing
                        </button>
                        <button 
                          className="btn btn-secondary"
                          onClick={() => window.open(`/briefing/${clientData.id}`, '_blank')}
                        >
                          <ExternalLink size={18} /> Visualizar Formulário
                        </button>
                      </div>
                    </Spotlight>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <Spotlight className="glass-card" style={{ padding: '24px' }}>
                    <h4 style={{ fontWeight: 600, marginBottom: '16px' }}>Gestão de Briefing</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Status</span>
                        <span className={`badge ${clientData.briefing_completed ? 'badge-success' : 'badge-warning'}`}>
                          {clientData.briefing_completed ? 'Concluído' : 'Pendente'}
                        </span>
                      </div>
                      
                      <button 
                        className="btn btn-secondary" 
                        style={{ width: '100%', fontSize: '0.875rem' }}
                        onClick={() => {
                          const briefingUrl = `${window.location.origin}/briefing/${clientData.id}`;
                          navigator.clipboard.writeText(briefingUrl);
                          showToast('Link do briefing copiado!', 'success');
                        }}
                      >
                        <Copy size={16} /> Copiar Link p/ WhatsApp
                      </button>
                      
                      {clientData.briefing_completed && (
                        <button 
                          className="btn btn-secondary" 
                          style={{ width: '100%', fontSize: '0.875rem' }}
                          onClick={() => {
                             // Resetar briefing (opcional, pode ser perigoso sem confirmação)
                             showToast('Funcionalidade de editar briefing em breve.', 'info');
                          }}
                        >
                          <Edit2 size={16} /> Editar Respostas
                        </button>
                      )}
                    </div>
                  </Spotlight>
                </div>
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
                      Entrega: {new Date(demand.due_date).toLocaleDateString('pt-BR')}
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
              {/* Portal Access Card */}
              <Spotlight className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', border: '1px solid var(--accent)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(217, 72, 15, 0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)'
                    }}>
                      <ShieldCheck size={20} />
                    </div>
                    <h4 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Portal do Cliente</h4>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', background: 'rgba(217, 72, 15, 0.1)', padding: '4px 8px', borderRadius: '6px' }}>
                    Agência Prátic
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>E-mail de Acesso</span>
                    <div style={{
                      padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px',
                      display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem'
                    }}>
                      <Mail size={14} color="var(--text-secondary)" />
                      {clientData.portal_email || 'Não definido'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Senha</span>
                    <div style={{
                      padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', fontSize: '0.9rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Lock size={14} color="var(--text-secondary)" />
                        <span>{showPasswords['portal'] ? (clientData.portal_password || '••••••••') : '••••••••'}</span>
                      </div>
                      <button
                        onClick={() => togglePassword('portal')}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      >
                        {showPasswords['portal'] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
                    <button 
                      className="btn btn-accent" 
                      style={{ fontSize: '0.75rem', height: '36px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
                      onClick={() => {
                        window.open(`/client/dashboard?simulate=${clientData.id}`, '_blank');
                      }}
                    >
                      <Eye size={14} /> Visão do Cliente
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      style={{ fontSize: '0.75rem', height: '36px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
                      onClick={() => {
                        const cleanPhone = clientData.phone.replace(/\D/g, '');
                        const portalLink = `${window.location.origin}/login`;
                        const message = `Olá, ${clientData.contact_name}!\n\nSegue o acesso ao Portal Prátic para acompanhar o progresso da ${clientData.nome_fantasia || clientData.name}:\n\n🔗 Link: ${portalLink}\n📧 E-mail: ${clientData.portal_email || clientData.email}\n🔑 Senha: ${clientData.portal_password || '********'}\n\nQualquer dúvida, estamos à disposição!`;
                        navigator.clipboard.writeText(message);
                        showToast('Mensagem copiada para o WhatsApp!', 'success');
                      }}
                    >
                      <Copy size={14} /> Copiar p/ WhatsApp
                    </button>
                  </div>
                </div>
              </Spotlight>
              {clientData.social_access ? Object.entries(clientData.social_access).map(([key, data]: [string, any]) => {
                if (!data || !data.usuario) return null;
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
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID Serviço: {contract.service_id}</p>
                        </td>
                        <td>{formatDate(contract.start_date)}</td>
                        <td>{formatDate(contract.end_date)}</td>
                        <td style={{ fontWeight: 600 }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.value)}</td>
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
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(clientInvoices.filter(i => i.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0))}
                  </h4>
                </Spotlight>
                <Spotlight className="glass-card" style={{ padding: '24px' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Pendente (Atrasado)</p>
                  <h4 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#EF4444' }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(clientInvoices.filter(i => i.status === 'pending' && new Date(`${i.due_date}T23:59:59`) <= new Date()).reduce((acc, curr) => acc + curr.amount, 0))}
                  </h4>
                </Spotlight>
                <Spotlight className="glass-card" style={{ padding: '24px' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>A Vencer</p>
                  <h4 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent)' }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(clientInvoices.filter(i => i.status === 'pending' && new Date(`${i.due_date}T23:59:59`) > new Date()).reduce((acc, curr) => acc + curr.amount, 0))}
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
                    {clientInvoices.sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime()).map(invoice => {
                      const isUpcoming = invoice.status === 'pending' && new Date(`${invoice.due_date}T23:59:59`) > new Date();
                      
                      return (
                        <tr key={invoice.id}>
                          <td style={{ paddingLeft: '24px' }}>
                            <p style={{ fontWeight: 500 }}>{invoice.description}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>#{invoice.id}</p>
                          </td>
                          <td>{formatDate(invoice.due_date)}</td>
                          <td style={{ fontWeight: 600 }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoice.amount)}</td>
                          <td>
                            <span className={`badge ${
                              invoice.status === 'paid' ? 'badge-success' :
                              isUpcoming ? 'badge-warning' : 'badge-danger'
                            }`}>
                              {invoice.status === 'paid' ? 'Pago' : isUpcoming ? 'A Vencer' : 'Pendente'}
                            </span>
                          </td>
                          <td style={{ paddingRight: '24px', textAlign: 'right' }}>
                            {invoice.status !== 'paid' && (
                              <button 
                                onClick={() => handleMarkAsPaid(invoice.id)}
                                title="Marcar como Pago"
                                style={{ 
                                  color: 'var(--accent)', 
                                  padding: '8px', 
                                  borderRadius: '8px', 
                                  background: 'rgba(217, 72, 15, 0.1)', 
                                  border: 'none', 
                                  cursor: 'pointer',
                                  marginRight: '8px'
                                }}
                              >
                                <CheckCircle2 size={16} />
                              </button>
                            )}
                            <button 
                              style={{ color: 'var(--text-secondary)', padding: '8px', background: 'none', border: 'none', cursor: 'pointer' }}
                              onClick={() => showToast('Recibo indisponível no momento.', 'info')}
                            >
                              <FileText size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {clientInvoices.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                          Nenhuma fatura gerada para este cliente.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Spotlight>
            </motion.div>
          )}

          {activeTab === 'docs' && (
            <motion.div
              key="docs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}
            >
              {/* Google Drive Section */}
              <Spotlight className="glass-card" style={{ padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(66, 133, 244, 0.2)', background: 'rgba(66, 133, 244, 0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'rgba(66, 133, 244, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4285F4' }}>
                    <HardDrive size={32} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '4px' }}>Pasta do Google Drive</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                      {clientData.google_drive_url ? 'Acesse todos os documentos na pasta sincronizada.' : 'Vincule uma pasta do Google Drive para este cliente.'}
                    </p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                  {clientData.google_drive_url ? (
                    <>
                      <button 
                        onClick={() => window.open(clientData.google_drive_url, '_blank')}
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(66, 133, 244, 0.3)', color: '#4285F4' }}
                      >
                        <ExternalLink size={18} /> Abrir Pasta
                      </button>
                      <button 
                        onClick={() => {
                          setTempGoogleDriveUrl(clientData.google_drive_url || "");
                          setIsGoogleDriveModalOpen(true);
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '12px' }}
                      >
                        <Edit2 size={18} />
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => setIsGoogleDriveModalOpen(true)}
                      className="btn btn-accent"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#4285F4', borderColor: '#4285F4' }}
                    >
                      <Plus size={18} /> Vincular Pasta
                    </button>
                  )}
                </div>
              </Spotlight>

              {/* Attachments Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Anexos Diretos</h3>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="file" 
                      id="doc-upload" 
                      style={{ display: 'none' }} 
                      onChange={handleUploadDocument}
                      disabled={isUploading}
                    />
                    <label 
                      htmlFor="doc-upload" 
                      className={`btn ${isUploading ? 'btn-secondary' : 'btn-accent'}`}
                      style={{ cursor: isUploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      {isUploading ? (
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                          <Plus size={18} />
                        </motion.div>
                      ) : (
                        <Upload size={18} />
                      )}
                      {isUploading ? 'Enviando...' : 'Fazer Upload'}
                    </label>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                  {clientDocuments.map(doc => (
                    <Spotlight key={doc.id} className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ 
                        width: '48px', height: '48px', borderRadius: '12px', 
                        backgroundColor: 'rgba(255,255,255,0.03)', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: doc.file_type?.includes('pdf') ? '#EF4444' : doc.file_type?.includes('image') ? '#3B82F6' : 'var(--accent)'
                      }}>
                        <FileText size={24} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={doc.name}>
                          {doc.name}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {(doc.size / 1024).toFixed(1)} KB • {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button 
                          onClick={() => {
                            const { data } = supabase.storage.from('client-documents').getPublicUrl(doc.file_path);
                            window.open(data.publicUrl, '_blank');
                          }}
                          style={{ padding: '8px', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
                          title="Visualizar"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteDocument(doc.id, doc.file_path)}
                          style={{ padding: '8px', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
                          title="Excluir"
                          className="hover-danger"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </Spotlight>
                  ))}

                  {clientDocuments.length === 0 && !isUploading && (
                    <div style={{ 
                      gridColumn: '1 / -1', padding: '48px', textAlign: 'center', 
                      backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '24px',
                      border: '2px dashed var(--border)'
                    }}>
                      <div style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}><Upload size={40} style={{ opacity: 0.3 }} /></div>
                      <p style={{ color: 'var(--text-secondary)' }}>Nenhum anexo enviado diretamente.</p>
                      <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>Suba contratos, briefings em PDF ou outros arquivos rápidos.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Modal (Nova Ação) */}
      <AnimatePresence>
        {isActionModalOpen && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 110,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px', backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)'
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card"
              style={{ width: '100%', maxWidth: '500px', padding: '32px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Nova Ação / Serviço</h2>
                <button onClick={() => setIsActionModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <X size={24} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Selecione o Serviço</label>
                  <select 
                    className="input-dark"
                    value={actionFormData.service_id}
                    onChange={(e) => {
                      const service = availableServices.find(s => s.id === e.target.value);
                      setActionFormData({ 
                        ...actionFormData, 
                        service_id: e.target.value,
                        value: Number(service?.price || 0),
                        billing_cycle: service?.billing_cycle || 'monthly'
                      });
                    }}
                  >
                    <option value="">Selecione um serviço cadastrado</option>
                    {availableServices.map(s => (
                      <option key={s.id} value={s.id}>{s.name} - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(s.price)}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Valor Personalizado</label>
                    <input 
                      type="number" className="input-dark"
                      value={actionFormData.value}
                      onChange={(e) => setActionFormData({ ...actionFormData, value: Number(e.target.value) })}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Ciclo de Cobrança</label>
                    <select 
                      className="input-dark"
                      value={actionFormData.billing_cycle}
                      onChange={(e) => setActionFormData({ ...actionFormData, billing_cycle: e.target.value })}
                    >
                      <option value="monthly">Mensal</option>
                      <option value="quarterly">Trimestral</option>
                      <option value="semiannual">Semestral</option>
                      <option value="annual">Anual</option>
                      <option value="one_time">Avulso (Único)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Data de Início</label>
                    <input 
                      type="date" className="input-dark"
                      value={actionFormData.start_date}
                      onChange={(e) => setActionFormData({ ...actionFormData, start_date: e.target.value })}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Dia de Vencimento</label>
                    <select 
                      className="input-dark"
                      value={actionFormData.due_day}
                      onChange={(e) => setActionFormData({ ...actionFormData, due_day: Number(e.target.value) })}
                    >
                      {[5, 10, 15, 20, 25, 30].map(day => (
                        <option key={day} value={day}>Todo dia {day}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {actionFormData.billing_cycle === 'one_time' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Número de Parcelas</label>
                    <select 
                      className="input-dark"
                      value={actionFormData.installments}
                      onChange={(e) => setActionFormData({ ...actionFormData, installments: Number(e.target.value) })}
                    >
                      {[1, 2, 3, 4, 5, 6, 10, 12].map(n => (
                        <option key={n} value={n}>{n}x {n > 1 ? `de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(actionFormData.value / n)}` : ''}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Duração do Contrato (Fidelidade)</label>
                    <select 
                      className="input-dark"
                      value={actionFormData.contract_duration}
                      onChange={(e) => setActionFormData({ ...actionFormData, contract_duration: Number(e.target.value) })}
                    >
                      <option value={3}>3 meses</option>
                      <option value={6}>6 meses</option>
                      <option value={12}>12 meses</option>
                      <option value={24}>24 meses</option>
                    </select>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                  <button className="btn btn-secondary" onClick={() => setIsActionModalOpen(false)}>Cancelar</button>
                  <button className="btn btn-accent" onClick={handleCreateAction} disabled={isSaving}>
                    {isSaving ? 'Salvando...' : 'Confirmar e Ativar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px', backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)'
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card"
              style={{ width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', padding: '32px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Editar Cliente</h2>
                <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <X size={24} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                {/* Informações Cadastrais */}
                <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                    Informações Gerais
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Nome Fantasia</label>
                      <input type="text" className="input-dark" value={editFormData.nome_fantasia || ''} onChange={(e) => setEditFormData({ ...editFormData, nome_fantasia: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Razão Social</label>
                      <input type="text" className="input-dark" value={editFormData.name || ''} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>CNPJ / CPF</label>
                      <input type="text" className="input-dark" value={editFormData.cnpj || ''} onChange={(e) => setEditFormData({ ...editFormData, cnpj: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Setor / Nicho</label>
                      <input type="text" className="input-dark" value={editFormData.setor || ''} onChange={(e) => setEditFormData({ ...editFormData, setor: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Contato Principal</label>
                      <input type="text" className="input-dark" value={editFormData.contact_name || ''} onChange={(e) => setEditFormData({ ...editFormData, contact_name: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Serviço de Interesse</label>
                      <select 
                        className="input-dark"
                        value={editFormData.servico_interesse || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, servico_interesse: e.target.value })}
                      >
                        <option value="">Selecione um serviço</option>
                        {availableServices.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>
                </section>

                {/* Contato e Financeiro */}
                <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                    Contato e Financeiro
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>WhatsApp / Celular</label>
                      <input type="text" className="input-dark" value={editFormData.phone || ''} onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>E-mail Principal</label>
                      <input type="email" className="input-dark" value={editFormData.email || ''} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>E-mail Financeiro</label>
                      <input type="email" className="input-dark" value={editFormData.email_financeiro || ''} onChange={(e) => setEditFormData({ ...editFormData, email_financeiro: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Telefone Fixo</label>
                      <input type="text" className="input-dark" value={editFormData.telefone_fixo || ''} onChange={(e) => setEditFormData({ ...editFormData, telefone_fixo: e.target.value })} />
                    </div>
                  </div>
                </section>

                {/* Redes Sociais e Acesso */}
                <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                      Acesso ao Portal
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>E-mail de Login</label>
                        <input type="email" className="input-dark" value={editFormData.portal_email || ''} onChange={(e) => setEditFormData({ ...editFormData, portal_email: e.target.value })} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Senha do Portal</label>
                        <input type="text" className="input-dark" value={editFormData.portal_password || ''} onChange={(e) => setEditFormData({ ...editFormData, portal_password: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                      Redes Sociais
                    </h3>
                    {['instagram', 'facebook', 'google', 'linkedin', 'tiktok'].map(social => (
                      <div key={social} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{social.replace('_', ' ')}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <input placeholder="Usuário" type="text" className="input-dark" value={editFormData.social_access?.[social]?.usuario || ''} onChange={(e) => setEditFormData({ ...editFormData, social_access: { ...editFormData.social_access, [social]: { ...editFormData.social_access?.[social], usuario: e.target.value, ativo: !!e.target.value } } })} />
                          <input placeholder="Senha" type="text" className="input-dark" value={editFormData.social_access?.[social]?.senha || ''} onChange={(e) => setEditFormData({ ...editFormData, social_access: { ...editFormData.social_access, [social]: { ...editFormData.social_access?.[social], senha: e.target.value } } })} />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                  <button className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>Cancelar</button>
                  <Spotlight as="button" className="btn btn-accent" onClick={handleSaveEdit} disabled={isSaving}>
                    {isSaving ? "Salvando..." : "Salvar Alterações"}
                  </Spotlight>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 110,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px', backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)'
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card"
              style={{ width: '100%', maxWidth: '450px', padding: '32px', textAlign: 'center' }}
            >
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444', margin: '0 auto 24px'
              }}>
                <Trash2 size={32} />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px' }}>Excluir Cliente?</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: '1.6' }}>
                Esta ação é irreversível. Todos os dados, contratos, demandas e notas associados a <strong>{clientData.name}</strong> serão permanentemente removidos.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  className="btn"
                  style={{ backgroundColor: '#EF4444', color: 'white', width: '100%' }}
                  onClick={handleDeleteClient}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Excluindo..." : "Sim, Excluir permanentemente"}
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%' }}
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={isDeleting}
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Google Drive Link Modal */}
      <AnimatePresence>
        {isGoogleDriveModalOpen && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 110,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px', backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)'
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card"
              style={{ width: '100%', maxWidth: '500px', padding: '32px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ color: '#4285F4' }}><HardDrive size={24} /></div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Vincular Google Drive</h2>
                </div>
                <button onClick={() => setIsGoogleDriveModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <X size={24} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                  Cole o link da pasta do Google Drive dedicada a este cliente. Isso permitirá acesso rápido direto pelo sistema.
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Link da Pasta</label>
                  <div style={{ position: 'relative' }}>
                    <Link size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input 
                      type="url" 
                      className="input-dark" 
                      placeholder="https://drive.google.com/drive/folders/..." 
                      style={{ paddingLeft: '48px' }}
                      value={tempGoogleDriveUrl}
                      onChange={(e) => setTempGoogleDriveUrl(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsGoogleDriveModalOpen(false)}>Cancelar</button>
                  <button className="btn btn-accent" style={{ flex: 1, backgroundColor: '#4285F4', borderColor: '#4285F4' }} onClick={handleSaveGoogleDrive}>
                    Salvar Vínculo
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
