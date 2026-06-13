"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
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
  FileCheck,
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
  Target,
  TrendingUp,
  Activity,
  Loader2
} from "lucide-react";
import Spotlight from "@/components/Spotlight";
import DialogShell from "@/components/DialogShell";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/CustomToast";
import {
  InstagramIcon,
  FacebookIcon,
  LinkedInIcon,
  TikTokIcon,
  GoogleIcon
} from "@/components/SocialIcons";
import ContractDetailsModal from "@/components/admin/contracts/ContractDetailsModal";
import NoteCard from "@/components/notas/NoteCard";
import InlineNoteEditor from "@/components/notas/InlineNoteEditor";


const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: Layout },
  { id: 'dados', label: 'Dados', icon: User },
  { id: 'briefing', label: 'Briefing', icon: FileText },
  { id: 'demandas', label: 'Demandas', icon: ClipboardList },
  { id: 'notas', label: 'Notas', icon: MessageSquare },
  { id: 'access', label: 'Acessos', icon: ShieldCheck },
  { id: 'contracts', label: 'Contratos', icon: FileText },
  { id: 'finance', label: 'Financeiro', icon: CreditCard },
  { id: 'docs', label: 'Documentos', icon: Folder },
];

export default function ClientDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [dateRange, setDateRange] = useState({
    start: "",
    end: ""
  });
  const [datePreset, setDatePreset] = useState<'all' | 'this_month' | 'prev_month' | 'next_month' | 'custom'>('all');

  const handlePresetChange = (preset: 'all' | 'this_month' | 'prev_month' | 'next_month' | 'custom') => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      if (preset === 'all') {
        setDateRange({ start: "", end: "" });
      } else if (preset === 'this_month') {
        setDateRange({
          start: new Date(y, m, 1).toISOString().split('T')[0],
          end: new Date(y, m + 1, 0).toISOString().split('T')[0]
        });
      } else if (preset === 'prev_month') {
        setDateRange({
          start: new Date(y, m - 1, 1).toISOString().split('T')[0],
          end: new Date(y, m, 0).toISOString().split('T')[0]
        });
      } else if (preset === 'next_month') {
        setDateRange({
          start: new Date(y, m + 1, 1).toISOString().split('T')[0],
          end: new Date(y, m + 2, 0).toISOString().split('T')[0]
        });
      }
    }
  };

  const [clientData, setClientData] = useState<any>(null);
  const [localDemands, setLocalDemands] = useState<any[]>([]);
  const [localNotes, setLocalNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [notesView, setNotesView] = useState<'list' | 'editor'>('list');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
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
  const [selectedContractForModal, setSelectedContractForModal] = useState<any | null>(null);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [editTab, setEditTab] = useState<'geral' | 'contato' | 'acesso' | 'redes'>('geral');
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkFormData, setLinkFormData] = useState({ title: '', url: '' });
  const [isSavingLink, setIsSavingLink] = useState(false);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionFormData, setActionFormData] = useState({
    service_id: '',
    value: 0,
    start_date: new Date().toISOString().split('T')[0],
    billing_cycle: 'monthly',
    due_day: 10,
    installments: 1,
    contract_duration: 12,
    posts_per_week: 3,
    content_capture: false,
    capture_frequency: '1 meia diária'
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

      const { data: notesData } = await supabase
        .from('notes')
        .select('id, title, content, date, subjects, user_id, created_at, updated_at')
        .eq('client_id', id)
        .eq('pin_to_client', true)
        .order('updated_at', { ascending: false });
      setLocalNotes(notesData ?? []);

      // Fetch related data in parallel
      const [demandsRes, contractsRes, invoicesRes, eventsRes, docsRes] = await Promise.all([
        supabase.from('demands').select('*').eq('client_id', id).order('created_at', { ascending: false }),
        supabase.from('contracts').select('*').eq('client_id', id),
        supabase.from('invoices').select('*').eq('client_id', id),
        supabase.from('agenda_events').select('*').eq('client_id', id),
        supabase.from('client_documents').select('*').eq('client_id', id).order('created_at', { ascending: false })
      ]);

      let finalClientStatus = client.status;
      if (demandsRes.data) setLocalDemands(demandsRes.data);
      if (contractsRes.data) {
        setClientContracts(contractsRes.data);
        
        // Se o cliente for prospect e possuir um contrato ativo, altera para active
        if (client.status === 'prospect' && contractsRes.data.some((c: any) => c.status === 'active')) {
          await supabase
            .from('clients')
            .update({ status: 'active' })
            .eq('id', id);
          finalClientStatus = 'active';
        }
      }
      
      setClientData({ ...client, status: finalClientStatus });
      if (invoicesRes.data) setClientInvoices(invoicesRes.data);
      if (eventsRes.data) setClientEvents(eventsRes.data);
      if (docsRes.data) setClientDocuments(docsRes.data);

      const openContractId = searchParams.get('openContract');
      if (openContractId && contractsRes.data) {
        const cToOpen = contractsRes.data.find(c => c.id === openContractId);
        if (cToOpen) {
          setActiveTab('contracts');
          setSelectedContractForModal(cToOpen);
          setIsContractModalOpen(true);
          // Optional: clear the query param so it doesn't reopen on refresh
          window.history.replaceState(null, '', `/admin/clients/${id}?tab=contracts`);
        }
      } else if (searchParams.get('tab')) {
        setActiveTab(searchParams.get('tab') as string);
      }

    } catch (error) {
      console.error("Erro ao buscar detalhes do cliente:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleClientStatus = async () => {
    if (!clientData) return;
    const newStatus = clientData.status === 'active' ? 'prospect' : 'active';
    try {
      const { error } = await supabase
        .from('clients')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;
      setClientData({ ...clientData, status: newStatus });
      showToast(`Status alterado para ${newStatus === 'active' ? 'Ativo' : 'Prospect'}!`, 'success');
    } catch (err) {
      console.error(err);
      showToast("Erro ao alternar status do cliente", "error");
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
    const date = dateStr.includes('T') ? new Date(dateStr) : new Date(`${dateStr}T12:00:00`);
    return date.toLocaleDateString('pt-BR');
  };

  const getFinanceMetrics = () => {
    const rangeInvoices = clientInvoices.filter(i => {
      const d = i.due_date.split('T')[0];
      const startMatch = !dateRange.start || d >= dateRange.start;
      const endMatch = !dateRange.end || d <= dateRange.end;
      return startMatch && endMatch;
    });

    const mrr = rangeInvoices
      .filter(i => {
        const contract = clientContracts.find(c => c.id === i.contract_id);
        return contract?.billing_cycle !== 'one_time';
      })
      .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    const avulsos = rangeInvoices
      .filter(i => {
        const contract = clientContracts.find(c => c.id === i.contract_id);
        return contract?.billing_cycle === 'one_time';
      })
      .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    const totalReceived = rangeInvoices
      .filter(i => i.status === 'paid')
      .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    const overdue = rangeInvoices
      .filter(i => i.status === 'pending' && new Date(`${i.due_date}T23:59:59`) < new Date())
      .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    const upcoming = rangeInvoices
      .filter(i => i.status === 'pending' && new Date(`${i.due_date}T23:59:59`) >= new Date())
      .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    return { mrr, avulsos, totalReceived, overdue, upcoming, count: rangeInvoices.length, rangeInvoices };
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

  const handleAddNote = async () => {
    if (!newNote.trim() || !currentUser) return;

    const { data, error } = await supabase
      .from('notes')
      .insert({
        user_id: currentUser.id,
        title: `Nota — ${new Date().toLocaleDateString('pt-BR')}`,
        content: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: newNote.trim() }] }],
        },
        date: new Date().toISOString().split('T')[0],
        subjects: [],
        shared_with: [],
        share_all: false,
        pin_to_client: true,
        client_id: id,
      })
      .select('id, title, content, date, user_id, subjects, created_at, updated_at')
      .single();

    if (!error && data) {
      setLocalNotes([data, ...localNotes]);
      setNewNote('');
    } else {
      showToast('Erro ao salvar nota', 'error');
    }
  };

  const handleOpenEdit = () => {
    setEditFormData({ ...clientData });
    setEditTab('geral');
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
          portal_password: editFormData.portal_password,
          onboarding_date: editFormData.onboarding_date
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
      endDate.setMonth(endDate.getMonth() + actionFormData.contract_duration);

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
          billing_cycle: actionFormData.billing_cycle || selectedService?.billing_cycle || 'monthly',
          posts_per_week: actionFormData.posts_per_week,
          content_capture: actionFormData.content_capture,
          capture_frequency: actionFormData.content_capture ? actionFormData.capture_frequency : null
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
    } catch (err: any) {
      console.error("Erro ao criar ação:", err);
      showToast('Erro: ' + (err?.message || err?.error_description || JSON.stringify(err)), 'error');
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

  const handleSaveLink = async () => {
    if (!linkFormData.title || !linkFormData.url) {
      showToast('Preencha o título e o link.', 'error');
      return;
    }

    setIsSavingLink(true);
    try {
      const newLink = {
        id: Math.random().toString(36).substr(2, 9),
        title: linkFormData.title,
        url: linkFormData.url.startsWith('http') ? linkFormData.url : `https://${linkFormData.url}`
      };

      const currentLinks = clientData.essential_links || [];
      const updatedLinks = [...currentLinks, newLink];

      const { error } = await supabase
        .from('clients')
        .update({ essential_links: updatedLinks })
        .eq('id', id);

      if (error) throw error;

      setClientData({ ...clientData, essential_links: updatedLinks });
      setIsLinkModalOpen(false);
      setLinkFormData({ title: '', url: '' });
      showToast('Link essencial adicionado!', 'success');
    } catch (err) {
      console.error('Erro ao salvar link:', err);
      showToast('Erro ao salvar link.', 'error');
    } finally {
      setIsSavingLink(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      const updatedLinks = (clientData.essential_links || []).filter((l: any) => l.id !== linkId);

      const { error } = await supabase
        .from('clients')
        .update({ essential_links: updatedLinks })
        .eq('id', id);

      if (error) throw error;

      setClientData({ ...clientData, essential_links: updatedLinks });
      showToast('Link removido.', 'success');
    } catch (err) {
      console.error('Erro ao excluir link:', err);
      showToast('Erro ao excluir link.', 'error');
    }
  };

  const handleDeleteContract = async () => {
    if (!contractToDelete) return;
    setIsDeleting(true);
    try {
      // Exclui as faturas associadas primeiro para evitar erro de foreign key
      const { error: invoiceError } = await supabase
        .from('invoices')
        .delete()
        .eq('contract_id', contractToDelete);

      if (invoiceError) throw invoiceError;

      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contractToDelete);

      if (error) throw error;

      showToast('Serviço/Contrato excluído com sucesso!', 'success');
      setContractToDelete(null);
      fetchClientDetails();
    } catch (err) {
      console.error('Erro ao excluir contrato:', err);
      showToast('Erro ao excluir contrato.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading || !clientData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px' }}>
        <Loader2 className="spinner" size={32} color="var(--accent)" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="client-page-header" style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <motion.button
              whileHover={{ x: -4 }}
              onClick={() => router.back()}
              style={{
                width: '36px', height: '36px', borderRadius: '10px',
                backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)',
                flexShrink: 0
              }}
            >
              <ArrowLeft size={18} />
            </motion.button>
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
            <span 
              onClick={toggleClientStatus}
              className={`badge ${clientData.status === 'active' ? 'badge-success' : 'badge-warning'}`}
              style={{ cursor: 'pointer', userSelect: 'none' }}
              title="Clique para alternar o status do cliente"
            >
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
              title={clientContracts.find(c => c.status === 'active') ? availableServices.find(s => s.id === clientContracts.find(c => c.status === 'active').service_id)?.name : (clientData.servico_interesse || 'Sem serviço definido')}
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
              <Briefcase size={14} style={{ color: 'var(--accent)' }} />
              {clientContracts.find(c => c.status === 'active')
                ? availableServices.find(s => s.id === clientContracts.find(c => c.status === 'active').service_id)?.name
                : (clientData.servico_interesse || 'Sem serviço definido')}
            </p>
          </div>
          <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px' }}>
            {/* Quick Access Icons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {clientData.social_access?.instagram?.usuario && (
                <button
                  onClick={() => window.open(`https://instagram.com/${clientData.social_access.instagram.usuario}`, '_blank')}
                  title={`Instagram: @${clientData.social_access.instagram.usuario}`}
                  style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--card-inner-bg)', border: '1px solid var(--border)', color: '#E1306C', display: 'flex', alignItems: 'center', transition: '0.2s' }}
                  className="hover-accent"
                >
                  <InstagramIcon size={16} />
                </button>
              )}
              {clientData.social_access?.facebook?.usuario && (
                <button
                  onClick={() => window.open(`https://facebook.com/${clientData.social_access.facebook.usuario}`, '_blank')}
                  title={`Facebook: ${clientData.social_access.facebook.usuario}`}
                  style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--card-inner-bg)', border: '1px solid var(--border)', color: '#1877F2', display: 'flex', alignItems: 'center', transition: '0.2s' }}
                  className="hover-accent"
                >
                  <FacebookIcon size={16} />
                </button>
              )}
              {clientData.social_access?.linkedin?.usuario && (
                <button
                  onClick={() => window.open(`https://linkedin.com/in/${clientData.social_access.linkedin.usuario}`, '_blank')}
                  title={`LinkedIn: ${clientData.social_access.linkedin.usuario}`}
                  style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--card-inner-bg)', border: '1px solid var(--border)', color: '#0A66C2', display: 'flex', alignItems: 'center', transition: '0.2s' }}
                  className="hover-accent"
                >
                  <LinkedInIcon size={16} />
                </button>
              )}
              {clientData.social_access?.tiktok?.usuario && (
                <button
                  onClick={() => window.open(`https://tiktok.com/@${clientData.social_access.tiktok.usuario}`, '_blank')}
                  title={`TikTok: @${clientData.social_access.tiktok.usuario}`}
                  style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--card-inner-bg)', border: '1px solid var(--border)', color: '#FFF', display: 'flex', alignItems: 'center', transition: '0.2s' }}
                  className="hover-accent"
                >
                  <TikTokIcon size={16} />
                </button>
              )}
              {clientData.social_access?.google?.usuario && (
                <button
                  title={`Google Meu Negócio: ${clientData.social_access.google.usuario}`}
                  style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--card-inner-bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', transition: '0.2s' }}
                  className="hover-accent"
                >
                  <GoogleIcon size={16} />
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
        <div className="client-page-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
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
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                <Spotlight className="glass-card" style={{ flex: '1 1 120px', maxWidth: '200px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22C55E' }}>
                      <TrendingUp size={14} />
                    </div>
                    <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Prev. MRR</p>
                  </div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getFinanceMetrics().mrr)}</h4>
                </Spotlight>

                <Spotlight className="glass-card" style={{ flex: '1 1 120px', maxWidth: '200px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(217, 72, 15, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                      <ClipboardList size={14} />
                    </div>
                    <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Demandas</p>
                  </div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>{localDemands.filter(d => d.status !== 'completed').length}</h4>
                </Spotlight>

                <Spotlight className="glass-card" style={{ flex: '1 1 120px', maxWidth: '200px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
                      <Activity size={14} />
                    </div>
                    <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Onboarding</p>
                  </div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>{clientData.briefing_completed ? '✅ Concluído' : '⏳ Em Fila'}</h4>
                </Spotlight>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
                <Spotlight className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CreditCard size={18} color="var(--accent)" /> Visão Financeira do Período
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {[
                        { id: 'all', label: 'Tudo' },
                        { id: 'this_month', label: 'Este Mês' },
                        { id: 'prev_month', label: 'Mês Anterior' },
                        { id: 'next_month', label: 'Próximo Mês' },
                        { id: 'custom', label: 'Personalizado' }
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => handlePresetChange(preset.id as any)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '10px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            border: datePreset === preset.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                            background: datePreset === preset.id ? 'rgba(217, 72, 15, 0.15)' : 'rgba(255,255,255,0.02)',
                            color: datePreset === preset.id ? 'var(--accent)' : 'var(--text-secondary)'
                          }}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    {(datePreset === 'custom' || dateRange.start || dateRange.end) && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '10px 16px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                        <Calendar size={16} color="var(--accent)" style={{ marginRight: '4px', opacity: 0.7 }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                          <span style={{ fontSize: '0.55rem', color: 'var(--text-tertiary)', fontWeight: 800, textTransform: 'uppercase' }}>Início</span>
                          <input
                            type="date" className="input-dark"
                            style={{ border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', width: '100px', fontWeight: 600 }}
                            value={dateRange.start}
                            onChange={(e) => {
                              setDateRange({ ...dateRange, start: e.target.value });
                              setDatePreset('custom');
                            }}
                          />
                        </div>
                        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                          <span style={{ fontSize: '0.55rem', color: 'var(--text-tertiary)', fontWeight: 800, textTransform: 'uppercase' }}>Fim</span>
                          <input
                            type="date" className="input-dark"
                            style={{ border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', width: '100px', fontWeight: 600 }}
                            value={dateRange.end}
                            onChange={(e) => {
                              setDateRange({ ...dateRange, end: e.target.value });
                              setDatePreset('custom');
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                    <div style={{ padding: '20px', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '16px', border: '1px solid rgba(34, 197, 94, 0.1)' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Recebido</p>
                      <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#22C55E' }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getFinanceMetrics().totalReceived)}</p>
                    </div>
                    <div style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Pendente</p>
                      <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#EF4444' }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getFinanceMetrics().overdue)}</p>
                    </div>
                  </div>
                </Spotlight>

                <Spotlight className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '20px' }}>Contratos Vigentes</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {clientContracts.filter(c => c.status === 'active').length > 0 ? (
                      clientContracts.filter(c => c.status === 'active').map(c => (
                        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{availableServices.find(s => s.id === c.service_id)?.name}</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent)' }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.value)}</span>
                        </div>
                      ))
                    ) : (
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', textAlign: 'center', padding: '20px' }}>Nenhum contrato ativo.</p>
                    )}
                  </div>
                </Spotlight>
              </div>
            </motion.div>
          )}

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
                    <div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>E-mail Financeiro</p>
                      <p style={{ fontWeight: 500 }}>{clientData.email_financeiro || clientData.email}</p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Data de Onboarding</p>
                      <p style={{ fontWeight: 500 }}>{formatDate(clientData.onboarding_date)}</p>
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
              <div className="responsive-grid-sidebar" style={{ gap: '24px' }}>
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
              style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
            >
              {notesView === 'editor' ? (
                <InlineNoteEditor
                  clientId={id as string}
                  noteId={editingNoteId}
                  onClose={() => { setNotesView('list'); setEditingNoteId(null); }}
                  onSaved={(savedNote) => {
                    setLocalNotes(prev => {
                      const exists = prev.find((n: any) => n.id === savedNote.id);
                      if (exists) return prev.map((n: any) => n.id === savedNote.id ? savedNote : n);
                      return [savedNote, ...prev];
                    });
                    setNotesView('list');
                    setEditingNoteId(null);
                  }}
                />
              ) : (
                <>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>Notas do cliente</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                        {localNotes.length} nota{localNotes.length !== 1 ? 's' : ''} vinculada{localNotes.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <button
                      className="btn btn-accent"
                      onClick={() => { setEditingNoteId(null); setNotesView('editor'); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <Plus size={16} /> Nova Nota
                    </button>
                  </div>

                  {/* Grid */}
                  {localNotes.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '56px 20px' }}>
                      <MessageSquare size={40} style={{ opacity: 0.12, display: 'block', margin: '0 auto 12px' }} />
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
                        Nenhuma nota para este cliente ainda.
                      </p>
                      <button
                        className="btn btn-accent"
                        onClick={() => { setEditingNoteId(null); setNotesView('editor'); }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                      >
                        <Plus size={16} /> Criar primeira nota
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                      {localNotes.map((note: any) => (
                        <NoteCard
                          key={note.id}
                          note={note}
                          onClick={() => { setEditingNoteId(note.id); setNotesView('editor'); }}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {activeTab === 'access' && (
            <motion.div
              key="access"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(350px, 100%), 1fr))', gap: '24px' }}
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
                          {key === 'instagram' ? <InstagramIcon size={20} style={{ color: '#E1306C' }} /> :
                            key === 'facebook' ? <FacebookIcon size={20} style={{ color: '#1877F2' }} /> :
                              key === 'linkedin' ? <LinkedInIcon size={20} style={{ color: '#0A66C2' }} /> :
                                key === 'tiktok' ? <TikTokIcon size={20} style={{ color: '#FFF' }} /> :
                                  key === 'google' ? <GoogleIcon size={20} /> :
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <p style={{ fontWeight: 500 }}>{availableServices.find(s => s.id === contract.service_id)?.name || 'Contrato'}</p>
                            <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>#{contract.id.slice(-6).toUpperCase()}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            {contract.posts_per_week > 0 && (
                              <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                                {contract.posts_per_week} posts/sem ({contract.posts_per_week * 4} mes)
                              </span>
                            )}
                            {contract.content_capture && (
                              <span style={{ fontSize: '0.65rem', background: 'rgba(217, 72, 15, 0.1)', padding: '2px 6px', borderRadius: '4px', color: 'var(--accent)' }}>
                                Captação: {contract.capture_frequency}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>{formatDate(contract.start_date)}</td>
                        <td>{formatDate(contract.end_date)}</td>
                        <td style={{ fontWeight: 600 }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.value)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span className={`badge ${contract.status === 'active' ? 'badge-success' : 'badge-warning'}`} style={{ width: 'fit-content', whiteSpace: 'nowrap' }}>
                              {contract.status === 'active' ? 'Ativo' : 'Expirando'}
                            </span>
                            <span 
                              className="badge"
                              style={{ 
                                width: 'fit-content',
                                whiteSpace: 'nowrap',
                                backgroundColor: 
                                  contract.document_status === 'signed' ? 'rgba(34, 197, 94, 0.1)' : 
                                  contract.document_status === 'sent' ? 'rgba(59, 130, 246, 0.1)' : 
                                  contract.document_status === 'generated' ? 'rgba(168, 85, 247, 0.1)' : 
                                  'rgba(255, 255, 255, 0.05)',
                                color: 
                                  contract.document_status === 'signed' ? '#22C55E' : 
                                  contract.document_status === 'sent' ? '#3B82F6' : 
                                  contract.document_status === 'generated' ? '#A855F7' : 
                                  'var(--text-secondary)'
                              }}
                            >
                              {contract.document_status === 'signed' ? 'Assinado' : 
                               contract.document_status === 'sent' ? 'Enviado' : 
                               contract.document_status === 'generated' ? 'Emitido' : 
                               'Doc. Pendente'}
                            </span>
                          </div>
                        </td>
                        <td style={{ paddingRight: '24px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center' }}>
                            {contract.signed_document_url && (
                              <a 
                                href={contract.signed_document_url} 
                                target="_blank" 
                                rel="noreferrer"
                                style={{ color: '#22C55E', display: 'flex', alignItems: 'center' }}
                                title="Ver PDF Assinado"
                              >
                                <FileCheck size={16} />
                              </a>
                            )}
                            <button 
                              style={{ color: 'var(--text-secondary)' }}
                              onClick={() => {
                                setSelectedContractForModal(contract);
                                setIsContractModalOpen(true);
                              }}
                              title="Gerenciar Documento / Detalhes"
                            >
                              <FileText size={16} />
                            </button>
                            <button 
                              style={{ color: 'var(--text-secondary)' }}
                              onClick={() => {
                                setSelectedContractForModal(contract);
                                setIsContractModalOpen(true);
                              }}
                              title="Visualizar Detalhes"
                            >
                              <ExternalLink size={16} />
                            </button>
                            <button
                              style={{ color: '#EF4444' }}
                              onClick={() => setContractToDelete(contract.id)}
                              title="Excluir Serviço/Contrato"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
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
              {/* Filtros Financeiros */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {[
                      { id: 'all', label: 'Tudo' },
                      { id: 'this_month', label: 'Este Mês' },
                      { id: 'prev_month', label: 'Mês Anterior' },
                      { id: 'next_month', label: 'Próximo Mês' },
                      { id: 'custom', label: 'Personalizado' }
                    ].map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => handlePresetChange(preset.id as any)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '10px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          border: datePreset === preset.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                          background: datePreset === preset.id ? 'rgba(217, 72, 15, 0.15)' : 'rgba(255,255,255,0.02)',
                          color: datePreset === preset.id ? 'var(--accent)' : 'var(--text-secondary)'
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  {(datePreset === 'custom' || dateRange.start || dateRange.end) && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '10px 20px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-glow)', width: 'fit-content' }}>
                      <Calendar size={18} color="var(--accent)" style={{ marginRight: '8px', opacity: 0.8 }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Período Inicial</span>
                        <input
                          type="date" className="input-dark"
                          style={{ border: 'none', background: 'transparent', padding: 0, fontSize: '0.85rem', width: '110px', fontWeight: 600 }}
                          value={dateRange.start}
                          onChange={(e) => {
                            setDateRange({ ...dateRange, start: e.target.value });
                            setDatePreset('custom');
                          }}
                        />
                      </div>
                      <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Período Final</span>
                        <input
                          type="date" className="input-dark"
                          style={{ border: 'none', background: 'transparent', padding: 0, fontSize: '0.85rem', width: '110px', fontWeight: 600 }}
                          value={dateRange.end}
                          onChange={(e) => {
                            setDateRange({ ...dateRange, end: e.target.value });
                            setDatePreset('custom');
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Exibindo {getFinanceMetrics().count} faturas encontradas
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                <Spotlight className="glass-card" style={{ flex: '1 1 120px', maxWidth: '180px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
                      <TrendingUp size={12} />
                    </div>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>MRR</p>
                  </div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#3B82F6', margin: 0 }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getFinanceMetrics().mrr)}
                  </h4>
                </Spotlight>
                <Spotlight className="glass-card" style={{ flex: '1 1 120px', maxWidth: '180px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(168, 85, 247, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A855F7' }}>
                      <Plus size={12} />
                    </div>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>Avulsos</p>
                  </div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#A855F7', margin: 0 }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getFinanceMetrics().avulsos)}
                  </h4>
                </Spotlight>
                <Spotlight className="glass-card" style={{ flex: '1 1 120px', maxWidth: '180px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(217, 72, 15, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                      <Clock size={12} />
                    </div>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>A Vencer</p>
                  </div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent)', margin: 0 }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getFinanceMetrics().upcoming)}
                  </h4>
                </Spotlight>
                <Spotlight className="glass-card" style={{ flex: '1 1 120px', maxWidth: '180px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22C55E' }}>
                      <CheckCircle2 size={12} />
                    </div>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>Recebido</p>
                  </div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#22C55E', margin: 0 }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getFinanceMetrics().totalReceived)}
                  </h4>
                </Spotlight>
                <Spotlight className="glass-card" style={{ flex: '1 1 120px', maxWidth: '180px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
                      <AlertCircle size={12} />
                    </div>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>Pendente</p>
                  </div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#EF4444', margin: 0 }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getFinanceMetrics().overdue)}
                  </h4>
                </Spotlight>
              </div>

              <Spotlight className="glass-card" style={{ padding: '0' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                      <th style={{ textAlign: 'left', padding: '16px 24px' }}>Fatura</th>
                      <th style={{ textAlign: 'left', padding: '16px 24px' }}>Data de Vencimento</th>
                      <th style={{ textAlign: 'left', padding: '16px 24px' }}>Valor</th>
                      <th style={{ textAlign: 'left', padding: '16px 24px' }}>Status</th>
                      <th style={{ textAlign: 'right', padding: '16px 24px' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFinanceMetrics().rangeInvoices.sort((a: any, b: any) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime()).map((invoice: any, index: number) => {
                      const isUpcoming = invoice.status === 'pending' && new Date(`${invoice.due_date}T23:59:59`) > new Date();
                      const totalInvoicesCount = getFinanceMetrics().rangeInvoices.length;

                      return (
                        <tr key={invoice.id}>
                          <td style={{ paddingLeft: '24px' }}>
                            <p style={{ fontWeight: 500 }}>{invoice.description}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              Fatura #{String(totalInvoicesCount - index).padStart(3, '0')}
                              <span style={{ opacity: 0.3, marginLeft: '8px' }}>#{invoice.id.slice(-6).toUpperCase()}</span>
                            </p>
                          </td>
                          <td>{formatDate(invoice.due_date)}</td>
                          <td style={{ fontWeight: 600 }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoice.amount)}</td>
                          <td>
                            <span className={`badge ${invoice.status === 'paid' ? 'badge-success' :
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
              {/* Essential Links Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(217, 72, 15, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                      <Link size={18} />
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Links Essenciais</h3>
                  </div>
                  <button
                    onClick={() => setIsLinkModalOpen(true)}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Plus size={16} /> Adicionar Link
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
                  {clientData.essential_links?.map((link: any) => (
                    <Spotlight key={link.id} className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                      <div
                        onClick={() => window.open(link.url, '_blank')}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flex: 1, minWidth: 0 }}
                      >
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                          {link.url.includes('canva.com') ? <Sparkles size={20} /> :
                            link.url.includes('trello.com') ? <Layout size={20} /> :
                              link.url.includes('figma.com') ? <Target size={20} /> :
                                <ExternalLink size={20} />}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{link.title}</p>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{new URL(link.url).hostname}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteLink(link.id)}
                        style={{ color: 'var(--text-tertiary)', padding: '8px', background: 'none', border: 'none', cursor: 'pointer' }}
                        className="hover-danger"
                      >
                        <Trash2 size={16} />
                      </button>
                    </Spotlight>
                  ))}

                  {(!clientData.essential_links || clientData.essential_links.length === 0) && (
                    <div style={{ gridColumn: '1 / -1', padding: '32px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
                      <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Nenhum link essencial cadastrado.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Google Drive Section */}
              <Spotlight className="glass-card" style={{ padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(66, 133, 244, 0.2)', background: 'rgba(66, 133, 244, 0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'rgba(66, 133, 244, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4285F4' }}>
                    <HardDrive size={32} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '4px' }}>Pasta do Google Drive</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                        {clientData.google_drive_url ? 'Acesse todos os documentos na pasta sincronizada.' : 'Vincule uma pasta do Google Drive para este cliente.'}
                      </p>
                      {clientData.drive_settings?.auto_backup && (
                        <span style={{ fontSize: '0.65rem', background: 'rgba(34, 197, 94, 0.1)', color: '#22C55E', padding: '2px 8px', borderRadius: '100px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={10} /> BACKUP ATIVO
                        </span>
                      )}
                    </div>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                      <FilePlus size={18} />
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Anexos Diretos</h3>
                  </div>
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
                          <Loader2 size={18} />
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
      <DialogShell
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        title="Nova Ação / Serviço"
        maxWidth="860px"
        zIndex={110}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => setIsActionModalOpen(false)} style={{ padding: '8px 18px', fontSize: '0.875rem' }}>Cancelar</button>
            <button className="btn btn-accent" onClick={handleCreateAction} disabled={isSaving} style={{ padding: '8px 18px', fontSize: '0.875rem' }}>
              {isSaving ? 'Salvando...' : 'Confirmar e Ativar'}
            </button>
          </div>
        }
      >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
                {/* Coluna da Esquerda: Configurações Básicas */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Selecione o Serviço</label>
                    <select
                      className="input-dark"
                      style={{ height: '42px', padding: '0 14px', fontSize: '0.9rem', boxSizing: 'border-box', borderRadius: '12px', textAlign: 'left', width: '100%' }}
                      value={actionFormData.service_id}
                      onChange={(e) => {
                        const service = availableServices.find(s => s.id === e.target.value);
                        setActionFormData({
                          ...actionFormData,
                          service_id: e.target.value,
                          value: Number(service?.price || 0),
                          billing_cycle: service?.billing_cycle || 'monthly',
                          installments: 1,
                          posts_per_week: service?.default_posts_per_week || 3,
                          content_capture: service?.default_content_capture || false,
                          capture_frequency: service?.default_capture_frequency || '1 meia diária'
                        });
                      }}
                    >
                      <option value="">Selecione um serviço cadastrado</option>
                      {availableServices.map(s => (
                        <option key={s.id} value={s.id}>{s.name} - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(s.price)}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Valor Personalizado</label>
                      <input
                        type="number" className="input-dark"
                        style={{ height: '42px', padding: '0 14px', fontSize: '0.9rem', boxSizing: 'border-box', borderRadius: '12px', textAlign: 'left', width: '100%' }}
                        value={actionFormData.value}
                        onChange={(e) => setActionFormData({ ...actionFormData, value: Number(e.target.value) })}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Ciclo de Cobrança</label>
                      <select
                        className="input-dark"
                        style={{ height: '42px', padding: '0 14px', fontSize: '0.9rem', boxSizing: 'border-box', borderRadius: '12px', textAlign: 'left', width: '100%' }}
                        value={actionFormData.billing_cycle}
                        onChange={(e) => setActionFormData({ 
                          ...actionFormData, 
                          billing_cycle: e.target.value,
                          installments: e.target.value === 'one_time' ? actionFormData.installments || 1 : 1
                        })}
                      >
                        <option value="monthly">Mensal</option>
                        <option value="quarterly">Trimestral</option>
                        <option value="semiannual">Semestral</option>
                        <option value="annual">Anual</option>
                        <option value="one_time">Avulso (Único)</option>
                      </select>
                    </div>
                  </div>

                  {actionFormData.billing_cycle === 'one_time' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} 
                      animate={{ opacity: 1, height: 'auto' }} 
                      style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                    >
                      <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Número de Parcelas</label>
                      <select
                        className="input-dark"
                        style={{ height: '42px', padding: '0 14px', fontSize: '0.9rem', boxSizing: 'border-box', borderRadius: '12px', textAlign: 'left', width: '100%' }}
                        value={actionFormData.installments}
                        onChange={(e) => setActionFormData({ ...actionFormData, installments: Number(e.target.value) })}
                      >
                        <option value={1}>1x (À vista)</option>
                        {[2, 3, 4, 5, 6, 10, 12].map(num => (
                          <option key={num} value={num}>
                            {num}x de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((actionFormData.value || 0) / num)}
                          </option>
                        ))}
                      </select>
                    </motion.div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Data de Início</label>
                      <input
                        type="date" className="input-dark"
                        style={{ height: '42px', padding: '0 14px', fontSize: '0.9rem', boxSizing: 'border-box', borderRadius: '12px', textAlign: 'left', width: '100%' }}
                        value={actionFormData.start_date}
                        onChange={(e) => setActionFormData({ ...actionFormData, start_date: e.target.value })}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Dia de Vencimento</label>
                      <select
                        className="input-dark"
                        style={{ height: '42px', padding: '0 14px', fontSize: '0.9rem', boxSizing: 'border-box', borderRadius: '12px', textAlign: 'left', width: '100%' }}
                        value={actionFormData.due_day}
                        onChange={(e) => setActionFormData({ ...actionFormData, due_day: Number(e.target.value) })}
                      >
                        {[5, 10, 15, 20, 25, 30].map(day => (
                          <option key={day} value={day}>Todo dia {day}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {actionFormData.billing_cycle !== 'one_time' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Duração do Contrato (Fidelidade)</label>
                      <select
                        className="input-dark"
                        style={{ height: '42px', padding: '0 14px', fontSize: '0.9rem', boxSizing: 'border-box', borderRadius: '12px', textAlign: 'left', width: '100%' }}
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
                </div>

                {/* Coluna da Direita: Especificações e Resumo */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Campos de Redes Sociais */}
                    {(availableServices.find(s => s.id === actionFormData.service_id)?.name?.toLowerCase().includes('redes') ||
                      availableServices.find(s => s.id === actionFormData.service_id)?.name?.toLowerCase().includes('social')) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          style={{ background: 'rgba(217, 72, 15, 0.05)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(217, 72, 15, 0.15)', display: 'flex', flexDirection: 'column', gap: '16px' }}
                        >
                          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px' }}>Especificações de Gestão</p>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Posts Semanais</label>
                              <input
                                type="number" className="input-dark"
                                style={{ height: '42px', padding: '0 14px', fontSize: '0.9rem', boxSizing: 'border-box', borderRadius: '12px', textAlign: 'left', width: '100%' }}
                                value={actionFormData.posts_per_week}
                                onChange={(e) => setActionFormData({ ...actionFormData, posts_per_week: Number(e.target.value) })}
                              />
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{actionFormData.posts_per_week * 4} posts mensais</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Captação de Conteúdo?</label>
                              <select
                                className="input-dark"
                                style={{ height: '42px', padding: '0 14px', fontSize: '0.9rem', boxSizing: 'border-box', borderRadius: '12px', textAlign: 'left', width: '100%' }}
                                value={actionFormData.content_capture ? 'sim' : 'nao'}
                                onChange={(e) => setActionFormData({ ...actionFormData, content_capture: e.target.value === 'sim' })}
                              >
                                <option value="nao">Não</option>
                                <option value="sim">Sim</option>
                              </select>
                            </div>
                          </div>

                          {actionFormData.content_capture && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Frequência de Captação</label>
                              <select
                                className="input-dark"
                                style={{ height: '42px', padding: '0 14px', fontSize: '0.9rem', boxSizing: 'border-box', borderRadius: '12px', textAlign: 'left', width: '100%' }}
                                value={actionFormData.capture_frequency}
                                onChange={(e) => setActionFormData({ ...actionFormData, capture_frequency: e.target.value })}
                              >
                                <option value="1 meia diária">1 meia diária</option>
                                <option value="1 diária inteira">1 diária inteira</option>
                                <option value="2 meias diárias">2 meias diárias</option>
                                <option value="2 diárias inteiras">2 diárias inteiras</option>
                              </select>
                            </div>
                          )}
                        </motion.div>
                      )}
                  </div>

                  {/* Resumo Visual e Botões */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: 'auto' }}>
                    <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '16px' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Resumo do Contrato</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{availableServices.find(s => s.id === actionFormData.service_id)?.name || 'Nenhum serviço'}</p>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--accent)' }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(actionFormData.value)}
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                              {actionFormData.billing_cycle === 'one_time' ? (actionFormData.installments > 1 ? ` (em ${actionFormData.installments}x)` : ' (À vista)') : ' /mês'}
                            </span>
                          </p>
                          {actionFormData.billing_cycle === 'one_time' && actionFormData.installments > 1 && (
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {actionFormData.installments} parcelas de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((actionFormData.value || 0) / actionFormData.installments)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
      </DialogShell>

      {/* Edit Modal */}
      <DialogShell
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Cliente"
        maxWidth="720px"
        zIndex={100}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setIsEditModalOpen(false)}
              style={{ padding: '8px 18px', fontSize: '0.875rem' }}
            >
              Cancelar
            </button>
            <Spotlight
              as="button"
              className="btn btn-accent"
              onClick={handleSaveEdit}
              disabled={isSaving}
              style={{ padding: '8px 18px', fontSize: '0.875rem' }}
            >
              {isSaving ? "Salvando..." : "Salvar Alterações"}
            </Spotlight>
          </div>
        }
      >
        {editFormData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {/* Tab navigation */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '24px', flexWrap: 'wrap' }}>
              {([
                { id: 'geral', label: 'Geral' },
                { id: 'contato', label: 'Contato' },
                { id: 'acesso', label: 'Portal' },
                { id: 'redes', label: 'Redes Sociais' },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setEditTab(tab.id)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    background: editTab === tab.id ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                    color: editTab === tab.id ? '#fff' : 'var(--text-secondary)',
                    border: '1px solid',
                    borderColor: editTab === tab.id ? 'var(--accent)' : 'var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.18s',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Aba: Geral */}
            {editTab === 'geral' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Nome Fantasia</label>
                  <input type="text" className="input-dark" value={editFormData.nome_fantasia || ''} onChange={(e) => setEditFormData({ ...editFormData, nome_fantasia: e.target.value })} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Razão Social</label>
                  <input type="text" className="input-dark" value={editFormData.name || ''} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>CNPJ / CPF</label>
                  <input type="text" className="input-dark" value={editFormData.cnpj || ''} onChange={(e) => setEditFormData({ ...editFormData, cnpj: e.target.value })} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Setor / Nicho</label>
                  <input type="text" className="input-dark" value={editFormData.setor || ''} onChange={(e) => setEditFormData({ ...editFormData, setor: e.target.value })} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Contato Principal</label>
                  <input type="text" className="input-dark" value={editFormData.contact_name || ''} onChange={(e) => setEditFormData({ ...editFormData, contact_name: e.target.value })} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Serviço de Interesse</label>
                  <select
                    className="input-dark"
                    value={editFormData.servico_interesse || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, servico_interesse: e.target.value })}
                  >
                    <option value="">Selecione um serviço</option>
                    {availableServices.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Data de Onboarding</label>
                  <input type="date" className="input-dark" value={editFormData.onboarding_date || ''} onChange={(e) => setEditFormData({ ...editFormData, onboarding_date: e.target.value })} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status</label>
                  <select
                    className="input-dark"
                    value={editFormData.status || 'active'}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  >
                    <option value="active">Ativo</option>
                    <option value="prospect">Prospect</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>
              </div>
            )}

            {/* Aba: Contato */}
            {editTab === 'contato' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>WhatsApp / Celular</label>
                  <input type="text" className="input-dark" value={editFormData.phone || ''} onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Telefone Fixo</label>
                  <input type="text" className="input-dark" value={editFormData.telefone_fixo || ''} onChange={(e) => setEditFormData({ ...editFormData, telefone_fixo: e.target.value })} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>E-mail Principal</label>
                  <input type="email" className="input-dark" value={editFormData.email || ''} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>E-mail Financeiro</label>
                  <input type="email" className="input-dark" value={editFormData.email_financeiro || ''} onChange={(e) => setEditFormData({ ...editFormData, email_financeiro: e.target.value })} />
                </div>
              </div>
            )}

            {/* Aba: Portal */}
            {editTab === 'acesso' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>E-mail de Login</label>
                  <input type="email" className="input-dark" value={editFormData.portal_email || ''} onChange={(e) => setEditFormData({ ...editFormData, portal_email: e.target.value })} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Senha do Portal</label>
                  <input type="text" className="input-dark" value={editFormData.portal_password || ''} onChange={(e) => setEditFormData({ ...editFormData, portal_password: e.target.value })} />
                </div>
              </div>
            )}

            {/* Aba: Redes Sociais */}
            {editTab === 'redes' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
                {(['instagram', 'facebook', 'google', 'linkedin', 'tiktok'] as const).map(social => {
                  const Icon = social === 'instagram' ? InstagramIcon :
                    social === 'facebook' ? FacebookIcon :
                      social === 'linkedin' ? LinkedInIcon :
                        social === 'tiktok' ? TikTokIcon :
                          GoogleIcon;
                  const color = social === 'instagram' ? '#E1306C' :
                    social === 'facebook' ? '#1877F2' :
                      social === 'linkedin' ? '#0A66C2' :
                        social === 'tiktok' ? '#FFF' : '#EA4335';
                  return (
                    <div key={social} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Icon size={14} style={{ color }} />
                        <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{social}</p>
                      </div>
                      <input placeholder="Usuário" type="text" className="input-dark" value={editFormData.social_access?.[social]?.usuario || ''} onChange={(e) => setEditFormData({ ...editFormData, social_access: { ...editFormData.social_access, [social]: { ...editFormData.social_access?.[social], usuario: e.target.value, ativo: !!e.target.value } } })} />
                      <input placeholder="Senha" type="text" className="input-dark" value={editFormData.social_access?.[social]?.senha || ''} onChange={(e) => setEditFormData({ ...editFormData, social_access: { ...editFormData.social_access, [social]: { ...editFormData.social_access?.[social], senha: e.target.value } } })} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </DialogShell>

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

      {/* Delete Contract Modal */}
      <AnimatePresence>
        {contractToDelete && (
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
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px' }}>Excluir Serviço/Contrato?</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: '1.6' }}>
                Tem certeza que deseja excluir este serviço/contrato? As faturas associadas também serão excluídas.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  className="btn"
                  style={{ backgroundColor: '#EF4444', color: 'white', width: '100%' }}
                  onClick={handleDeleteContract}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Excluindo..." : "Sim, Excluir"}
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%' }}
                  onClick={() => setContractToDelete(null)}
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

      {/* Link Modal */}
      <AnimatePresence>
        {isLinkModalOpen && (
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
              style={{ width: '100%', maxWidth: '450px', padding: '32px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Adicionar Link Essencial</h2>
                <button onClick={() => setIsLinkModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <X size={24} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Título do Link</label>
                  <input
                    type="text" className="input-dark" placeholder="Ex: Projeto Canva, Quadro Trello..."
                    value={linkFormData.title} onChange={(e) => setLinkFormData({ ...linkFormData, title: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>URL</label>
                  <input
                    type="url" className="input-dark" placeholder="https://..."
                    value={linkFormData.url} onChange={(e) => setLinkFormData({ ...linkFormData, url: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsLinkModalOpen(false)}>Cancelar</button>
                  <button className="btn btn-accent" style={{ flex: 1 }} onClick={handleSaveLink} disabled={isSavingLink}>
                    {isSavingLink ? 'Salvando...' : 'Salvar Link'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ContractDetailsModal
        isOpen={isContractModalOpen}
        onClose={() => setIsContractModalOpen(false)}
        contract={selectedContractForModal}
        client={clientData}
        service={availableServices.find((s: any) => s.id === selectedContractForModal?.service_id)}
        invoices={clientInvoices.filter((i: any) => i.contract_id === selectedContractForModal?.id)}
      />
    </div>
  );
}
