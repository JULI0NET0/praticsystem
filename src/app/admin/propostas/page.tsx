'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { FileText, Loader2, ExternalLink, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchInput from '@/components/ui/SearchInput';
import { useToast } from '@/components/CustomToast';
import { useConfirm } from '@/components/ConfirmProvider';
import { Proposal, Client } from '@/types/database';

const STATUS_LABEL: Record<Proposal['status'], string> = {
  draft: 'Rascunho',
  sent: 'Enviada',
  accepted: 'Aceita',
  rejected: 'Recusada',
};

const STATUS_STYLE: Record<Proposal['status'], { bg: string; color: string }> = {
  draft: { bg: 'var(--color-surface-sunken)', color: 'var(--text-secondary)' },
  sent: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' },
  accepted: { bg: 'var(--color-success-wash)', color: 'var(--color-success)' },
  rejected: { bg: 'var(--color-danger-wash, rgba(239,68,68,0.1))', color: 'var(--color-danger)' },
};

export default function PropostasPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [clients, setClients] = useState<Pick<Client, 'id' | 'name' | 'nome_fantasia'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [proposalsRes, clientsRes] = await Promise.all([
        supabase.from('proposals').select('*').order('created_at', { ascending: false }),
        supabase.from('clients').select('id, name, nome_fantasia'),
      ]);

      if (proposalsRes.error) throw proposalsRes.error;
      setProposals((proposalsRes.data || []) as Proposal[]);
      setClients(clientsRes.data || []);
    } catch (err) {
      console.error('Erro ao carregar propostas:', err);
      const message = err instanceof Error ? err.message : '';
      showToast('Erro ao carregar propostas: ' + message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const clientsById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  const filteredProposals = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return proposals;
    return proposals.filter((p) => {
      const client = clientsById.get(p.client_id);
      const clientName = `${client?.nome_fantasia || ''} ${client?.name || ''}`.toLowerCase();
      return p.title.toLowerCase().includes(term) || clientName.includes(term);
    });
  }, [proposals, clientsById, searchTerm]);

  const handleDelete = async (proposal: Proposal) => {
    const ok = await confirm({
      title: 'Excluir proposta',
      message: `Tem certeza que deseja excluir a proposta "${proposal.title}"?`,
    });
    if (!ok) return;

    const { error } = await supabase.from('proposals').delete().eq('id', proposal.id);
    if (error) {
      showToast('Erro ao excluir proposta: ' + error.message, 'error');
      return;
    }
    setProposals((prev) => prev.filter((p) => p.id !== proposal.id));
    showToast('Proposta excluída.', 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', paddingBottom: '40px' }}>
      <div className="page-header">
        <div className="page-header-info">
          <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
            Propostas
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '4px 0 0' }}>
            Propostas comerciais montadas pelo HERMES, vinculadas aos clientes.
          </p>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '24px', overflow: 'hidden' }}>
        <div style={{ marginBottom: '24px' }}>
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por cliente ou título..."
          />
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Loader2 className="spin" size={24} />
          </div>
        ) : filteredProposals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            <FileText size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <p>Nenhuma proposta encontrada.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Título</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Criada em</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {filteredProposals.map((proposal, i) => {
                    const client = clientsById.get(proposal.client_id);
                    const style = STATUS_STYLE[proposal.status];

                    return (
                      <motion.tr
                        key={proposal.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2, delay: i * 0.03 }}
                      >
                        <td>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            {client?.nome_fantasia || client?.name || '—'}
                          </span>
                        </td>
                        <td>{proposal.title}</td>
                        <td>
                          {typeof proposal.value === 'number'
                            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proposal.value)
                            : '—'}
                        </td>
                        <td>
                          <span
                            className="badge"
                            style={{ padding: '4px 12px', fontSize: '0.75rem', width: 'fit-content', backgroundColor: style.bg, color: style.color }}
                          >
                            {STATUS_LABEL[proposal.status]}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          {new Date(proposal.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <a
                              href={proposal.document_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-icon"
                              title="Abrir documento"
                              style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--card-inner-bg)', color: 'var(--text-primary)', border: 'none', cursor: 'pointer', textDecoration: 'none' }}
                            >
                              <ExternalLink size={16} />
                            </a>
                            <button
                              className="btn-icon"
                              title="Excluir"
                              onClick={() => handleDelete(proposal)}
                              style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--card-inner-bg)', color: 'var(--color-danger)', border: 'none', cursor: 'pointer' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
