"use client";

import { supabase } from "@/lib/supabase";
import { ArrowLeft, Loader2, FileText, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/CustomToast";
import type { HermesContractDraft } from "@/types/database";

export default function ContractDraftsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [drafts, setDrafts] = useState<HermesContractDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchDrafts = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("hermes_contract_drafts")
        .select("*, clients(id, name, nome_fantasia, cnpj), services(id, name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setDrafts(data || []);
    } catch (err) {
      console.error("Erro ao buscar rascunhos do Hermes:", err);
      showToast("Erro ao buscar rascunhos.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchDrafts(); }, [fetchDrafts]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatDate = (dateStr: string) => new Date(`${dateStr}T12:00:00`).toLocaleDateString('pt-BR');

  const handleApprove = async (draft: HermesContractDraft) => {
    if (!confirm(`Aprovar este rascunho e criar o contrato oficial para ${draft.clients?.name}?`)) return;
    setProcessingId(draft.id);
    try {
      // Cria o contrato oficial já com o documento redigido pelo Hermes.
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .insert([{
          client_id: draft.client_id,
          service_id: draft.service_id,
          start_date: draft.start_date,
          end_date: draft.end_date,
          value: draft.value,
          auto_renew: true,
          status: 'active',
          document_status: 'generated',
          document_content: draft.document_content,
          posts_per_week: draft.posts_per_week,
          capture_frequency: draft.capture_frequency,
        }])
        .select()
        .single();
      if (contractError) throw contractError;

      // Gera as parcelas mensais, igual ao fluxo manual de criação de contrato.
      const invoicesToInsert = Array.from({ length: draft.duration_months }, (_, i) => {
        const dueDate = new Date(draft.start_date + 'T12:00:00');
        dueDate.setMonth(dueDate.getMonth() + i);
        return {
          client_id: draft.client_id,
          contract_id: contractData.id,
          amount: draft.value,
          due_date: dueDate.toISOString().split('T')[0],
          status: 'pending',
          description: `${draft.clients?.name || 'Cliente'} - ${draft.services?.name || 'Serviço'} - Parcela ${i + 1}/${draft.duration_months}`,
        };
      });
      const { error: invoicesError } = await supabase.from('invoices').insert(invoicesToInsert);
      if (invoicesError) throw invoicesError;

      await supabase.from('clients').update({ status: 'active' }).eq('id', draft.client_id);

      const { error: draftError } = await supabase
        .from('hermes_contract_drafts')
        .update({ status: 'approved', resulting_contract_id: contractData.id, reviewed_at: new Date().toISOString() })
        .eq('id', draft.id);
      if (draftError) throw draftError;

      showToast("Contrato criado a partir do rascunho!", "success");
      router.push(`/admin/contracts/${contractData.id}/document`);
    } catch (err) {
      console.error("Erro ao aprovar rascunho:", err);
      showToast("Erro ao aprovar rascunho. Verifique os dados.", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (draft: HermesContractDraft) => {
    if (!confirm("Rejeitar este rascunho? Nenhum contrato será criado.")) return;
    setProcessingId(draft.id);
    try {
      const { error } = await supabase
        .from('hermes_contract_drafts')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
        .eq('id', draft.id);
      if (error) throw error;
      showToast("Rascunho rejeitado.", "success");
      setDrafts(prev => prev.map(d => d.id === draft.id ? { ...d, status: 'rejected' } : d));
    } catch (err) {
      console.error("Erro ao rejeitar rascunho:", err);
      showToast("Erro ao rejeitar rascunho.", "error");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <Loader2 size={48} color="var(--accent)" className="animate-spin" />
      </div>
    );
  }

  const pending = drafts.filter(d => d.status === 'pending_review');
  const reviewed = drafts.filter(d => d.status !== 'pending_review');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link href="/admin/contracts" style={{ textDecoration: 'none' }}>
          <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid var(--border)' }}>
            <ArrowLeft size={16} /> Voltar
          </button>
        </Link>
        <div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800 }}>Rascunhos de Contrato do Hermes</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Contratos propostos pelo agente Hermes. Nenhum vira oficial sem sua aprovação aqui.
          </p>
        </div>
      </div>

      {drafts.length === 0 && (
        <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Nenhum rascunho enviado pelo Hermes ainda.
        </div>
      )}

      {pending.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Pendentes de revisão ({pending.length})</h2>
          {pending.map(draft => (
            <DraftCard
              key={draft.id}
              draft={draft}
              expanded={expandedId === draft.id}
              onToggle={() => setExpandedId(expandedId === draft.id ? null : draft.id)}
              onApprove={() => handleApprove(draft)}
              onReject={() => handleReject(draft)}
              processing={processingId === draft.id}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}

      {reviewed.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Já revisados ({reviewed.length})</h2>
          {reviewed.map(draft => (
            <DraftCard
              key={draft.id}
              draft={draft}
              expanded={expandedId === draft.id}
              onToggle={() => setExpandedId(expandedId === draft.id ? null : draft.id)}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              readOnly
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DraftCard({
  draft, expanded, onToggle, onApprove, onReject, processing, formatCurrency, formatDate, readOnly,
}: {
  draft: HermesContractDraft;
  expanded: boolean;
  onToggle: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  processing?: boolean;
  formatCurrency: (v: number) => string;
  formatDate: (d: string) => string;
  readOnly?: boolean;
}) {
  const statusLabel = draft.status === 'approved' ? 'Aprovado' : draft.status === 'rejected' ? 'Rejeitado' : 'Pendente';
  const statusColor = draft.status === 'approved' ? '#22C55E' : draft.status === 'rejected' ? '#EF4444' : '#F59E0B';

  return (
    <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{draft.clients?.name || 'Cliente'}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{draft.services?.name || 'Serviço'}</div>
        </div>
        <span className="badge" style={{ backgroundColor: `${statusColor}22`, color: statusColor, fontWeight: 700 }}>
          {statusLabel}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        <span><strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(draft.value)}</strong>/mês</span>
        <span>{draft.duration_months} {draft.duration_months === 1 ? 'mês' : 'meses'}</span>
        <span>{formatDate(draft.start_date)} → {formatDate(draft.end_date)}</span>
      </div>

      {draft.notes && (
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
          Nota do Hermes: {draft.notes}
        </div>
      )}

      <button
        onClick={onToggle}
        className="btn"
        style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid var(--border)', fontSize: '0.8rem' }}
      >
        <FileText size={14} />
        {expanded ? 'Ocultar contrato completo' : 'Ver contrato completo'}
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <pre style={{
          whiteSpace: 'pre-wrap',
          fontFamily: 'inherit',
          fontSize: '0.8rem',
          lineHeight: 1.6,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '16px',
          maxHeight: '400px',
          overflowY: 'auto',
        }}>
          {draft.document_content}
        </pre>
      )}

      {!readOnly && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onApprove}
            disabled={processing}
            className="btn btn-accent"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
          >
            {processing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Aprovar e criar contrato
          </button>
          <button
            onClick={onReject}
            disabled={processing}
            className="btn"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid var(--border)', fontSize: '0.8rem' }}
          >
            <XCircle size={14} /> Rejeitar
          </button>
        </div>
      )}
    </div>
  );
}
