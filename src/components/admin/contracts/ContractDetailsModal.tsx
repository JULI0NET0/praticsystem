"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, DollarSign, FileText, CheckCircle2, AlertCircle, Clock, ArrowRight, Copy, Hash } from "lucide-react";
import { Contract, Client, Service, Invoice } from "@/types/database";

interface ContractDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  client: Client | undefined;
  service: Service | undefined;
  invoices: Invoice[];
}

export default function ContractDetailsModal({ isOpen, onClose, contract, client, service, invoices }: ContractDetailsModalProps) {
  if (!contract) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(8px)',
              zIndex: 100,
              cursor: 'pointer'
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            style={{
              position: 'fixed',
              top: '10%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '90%',
              maxWidth: '800px',
              backgroundColor: '#111111',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              zIndex: 101,
              overflow: 'hidden',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Header */}
            <div style={{ padding: '24px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '12px', 
                  backgroundColor: 'rgba(217, 72, 15, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent)'
                }}>
                  <FileText size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>Detalhes do Contrato</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                    <div 
                      onClick={() => {
                        navigator.clipboard.writeText(contract.id);
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        padding: '2px 8px', borderRadius: '6px',
                        backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 0.2s'
                      }}
                      title="Clique para copiar ID"
                    >
                      <Hash size={10} color="var(--accent)" />
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, fontFamily: 'monospace' }}>
                        {contract.id.substring(0, 8)}
                      </span>
                      <Copy size={10} />
                    </div>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>• {client?.name}</span>
                  </div>
                </div>
              </div>
              <button onClick={onClose} style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
              
              {/* Top Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div className="glass-card" style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Status do Contrato</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {contract.status === 'active' ? <CheckCircle2 size={16} color="#22C55E" /> : <AlertCircle size={16} color="#F59E0B" />}
                    <span style={{ fontWeight: 600, color: 'white' }}>
                      {contract.status === 'active' ? 'Ativo' : contract.status === 'expiring' ? 'A Vencer' : 'Expirado'}
                    </span>
                  </div>
                </div>
                <div className="glass-card" style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Valor Mensal</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <DollarSign size={16} color="var(--accent)" />
                    <span style={{ fontWeight: 700, color: 'white', fontSize: '1.1rem' }}>
                      R$ {contract.value.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
                <div className="glass-card" style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Data de Encerramento</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={16} color="var(--text-secondary)" />
                    <span style={{ fontWeight: 600, color: 'white' }}>
                      {new Date(contract.end_date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Service & Client Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={18} color="var(--accent)" /> Escopo do Serviço
                  </h3>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ fontWeight: 600, color: 'white', marginBottom: '4px' }}>{service?.name}</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {service?.description}
                    </p>
                    <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                      <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(217, 72, 15, 0.1)', color: 'var(--accent)', padding: '4px 10px', borderRadius: '100px', fontWeight: 500 }}>
                        Recorrente
                      </span>
                      <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: '100px', fontWeight: 500 }}>
                        {service?.category}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <DollarSign size={18} color="var(--accent)" /> Histórico Financeiro
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {invoices.length > 0 ? (
                      invoices.map(invoice => (
                        <div key={invoice.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                          <div>
                            <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'white' }}>Venc. {new Date(invoice.due_date).toLocaleDateString('pt-BR')}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{invoice.status === 'paid' ? 'Pago' : 'Pendente'}</p>
                          </div>
                          <p style={{ fontWeight: 600, color: invoice.status === 'paid' ? '#22C55E' : 'var(--accent)' }}>
                            R$ {invoice.amount.toLocaleString('pt-BR')}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Nenhuma fatura encontrada.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ marginTop: 'auto', display: 'flex', gap: '12px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <button className="btn btn-accent" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <FileText size={18} /> Baixar PDF do Contrato
                </button>
                <button className="btn btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Calendar size={18} /> Agendar Renovação
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
