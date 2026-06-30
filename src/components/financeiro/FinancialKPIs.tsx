"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, DollarSign, Users, Percent, ArrowUpRight, ArrowDownRight, Maximize2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import DialogShell from "@/components/DialogShell";

import { Calendar } from "lucide-react";

export interface DespesaItem {
  id: string;
  description: string;
  category?: string;
  date: string;
  amount: number;
  paid: number;
  status: 'pending' | 'paid' | 'cancelled';
}

export interface FaturamentoItem {
  id: string;
  description: string;
  client?: string;
  date: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
}

interface FinancialKPIsProps {
  faturamentoPrevisto: number;
  faturamentoRealizado: number;
  faturamentoItems: FaturamentoItem[];
  despesas: number;
  despesasPrevistas: number;
  despesaItems: DespesaItem[];
  clientesAtivos: number;
  dateRange: { start: string; end: string };
  datePreset: 'all' | 'this_month' | 'prev_month' | 'next_month' | 'custom';
  onPresetChange: (preset: 'all' | 'this_month' | 'prev_month' | 'next_month' | 'custom') => void;
  onRangeChange: (range: { start: string; end: string }) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  pro_labore: "Pro-labore",
  funcionario_pj: "Func. PJ",
  sistema: "Sistemas",
  internet: "Internet",
  taxa_asaas: "Taxas Asaas",
  taxa_boleto: "Tx. Boleto",
  taxa_mensageria: "Tx. Mensageria",
  outros: "Outros",
};

export function FinancialKPIs({
  faturamentoPrevisto,
  faturamentoRealizado,
  despesas,
  despesasPrevistas,
  despesaItems,
  clientesAtivos,
  dateRange,
  datePreset,
  onPresetChange,
  onRangeChange,
}: FinancialKPIsProps) {
  const [despesasOpen, setDespesasOpen] = useState(false);
  const lucro = faturamentoRealizado - despesas;
  const margem = faturamentoRealizado > 0 ? (lucro / faturamentoRealizado) * 100 : 0;
  const ticketMedio = clientesAtivos > 0 ? faturamentoRealizado / clientesAtivos : 0;
  const taxaConversao = faturamentoPrevisto > 0 ? (faturamentoRealizado / faturamentoPrevisto) * 100 : 0;

  type KpiCard = {
    label: string;
    value: string | null;
    sub: string | null;
    icon: React.ReactNode;
    color: string;
    bg: string;
    border: string;
    splitValues?: { label: string; value: string; color: string }[];
    onClick?: () => void;
  };

  const cards: KpiCard[] = [
    {
      label: "Faturamento",
      value: null,
      sub: `${taxaConversao.toFixed(0)}% do previsto recebido`,
      icon: <TrendingUp size={20} />,
      color: "#3B82F6",
      bg: "rgba(59,130,246,0.06)",
      border: "rgba(59,130,246,0.15)",
      splitValues: [
        { label: "Previsto", value: formatCurrency(faturamentoPrevisto), color: "#60A5FA" },
        { label: "Realizado", value: formatCurrency(faturamentoRealizado), color: "#22C55E" },
      ],
    },
    {
      label: "Despesas",
      value: null,
      sub: null,
      icon: <ArrowDownRight size={20} />,
      color: "#EF4444",
      bg: "rgba(239,68,68,0.06)",
      border: "rgba(239,68,68,0.15)",
      splitValues: [
        { label: "Pagas", value: formatCurrency(despesas), color: "#EF4444" },
        { label: "Previstas", value: formatCurrency(despesasPrevistas), color: "#F59E0B" },
      ],
      onClick: () => setDespesasOpen(true),
    },
    {
      label: "Ticket Médio",
      value: formatCurrency(ticketMedio),
      sub: null,
      icon: <DollarSign size={20} />,
      color: "#A78BFA",
      bg: "rgba(167,139,250,0.06)",
      border: "rgba(167,139,250,0.15)",
    },
    {
      label: "Margem de Lucro",
      value: `${margem.toFixed(1)}%`,
      sub: `Lucro: ${formatCurrency(lucro)}`,
      icon: <Percent size={20} />,
      color: margem >= 20 ? "#22C55E" : margem >= 0 ? "#F59E0B" : "#EF4444",
      bg: "rgba(255,255,255,0.02)",
      border: "var(--border)",
    },
    {
      label: "Clientes Ativos",
      value: String(clientesAtivos),
      sub: null,
      icon: <Users size={20} />,
      color: "#60A5FA",
      bg: "rgba(96,165,250,0.06)",
      border: "rgba(96,165,250,0.15)",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Month selector */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
        <div>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "6px" }}>
            Gestão Financeira
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>
            Faturamento, despesas e saúde financeira da agência.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-end' }}>
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
                onClick={() => onPresetChange(preset.id as any)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
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
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '8px 16px', borderRadius: '14px', border: '1px solid var(--border)' }}>
              <Calendar size={16} color="var(--accent)" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', fontWeight: 800, textTransform: 'uppercase' }}>Início</span>
                <input
                  type="date" className="input-dark"
                  style={{ border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', width: '100px', fontWeight: 600 }}
                  value={dateRange.start}
                  onChange={(e) => {
                    onRangeChange({ ...dateRange, start: e.target.value });
                    onPresetChange('custom');
                  }}
                />
              </div>
              <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', fontWeight: 800, textTransform: 'uppercase' }}>Fim</span>
                <input
                  type="date" className="input-dark"
                  style={{ border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', width: '100px', fontWeight: 600 }}
                  value={dateRange.end}
                  onChange={(e) => {
                    onRangeChange({ ...dateRange, end: e.target.value });
                    onPresetChange('custom');
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="responsive-grid-3" style={{ gap: "16px" }}>
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className="glass-card"
            onClick={card.onClick}
            role={card.onClick ? "button" : undefined}
            tabIndex={card.onClick ? 0 : undefined}
            onKeyDown={card.onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); card.onClick!(); } } : undefined}
            whileHover={card.onClick ? { y: -3 } : undefined}
            style={{
              padding: "24px",
              background: card.bg,
              border: `1px solid ${card.border}`,
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              cursor: card.onClick ? "pointer" : undefined,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {card.label}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "8px", color: card.color, opacity: 0.8 }}>
                {card.onClick && <Maximize2 size={14} style={{ opacity: 0.7 }} />}
                {card.icon}
              </span>
            </div>
            {card.splitValues ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {card.splitValues.map((sv) => (
                  <div key={sv.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {sv.label}
                    </span>
                    <span style={{ fontSize: "1.15rem", fontWeight: 800, color: sv.color, letterSpacing: "-0.01em" }}>
                      {sv.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: "1.75rem", fontWeight: 800, color: card.color, letterSpacing: "-0.02em", lineHeight: 1 }}>
                {card.value}
              </span>
            )}
            {card.sub && (
              <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontWeight: 600 }}>
                {card.sub}
              </span>
            )}
          </motion.div>
        ))}
      </div>

      <DialogShell
        isOpen={despesasOpen}
        onClose={() => setDespesasOpen(false)}
        title="Contas Lançadas"
        maxWidth="720px"
        footer={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-tertiary)" }}>
              {despesaItems.length} conta(s)
            </span>
            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                <span style={{ color: "var(--text-tertiary)" }}>Pagas: </span>
                <span style={{ color: "#EF4444" }}>{formatCurrency(despesas)}</span>
              </span>
              <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                <span style={{ color: "var(--text-tertiary)" }}>Previstas: </span>
                <span style={{ color: "#F59E0B" }}>{formatCurrency(despesasPrevistas)}</span>
              </span>
            </div>
          </div>
        }
      >
        {despesaItems.length === 0 ? (
          <p style={{ color: "var(--text-tertiary)", fontSize: "0.9rem", textAlign: "center", padding: "24px 0" }}>
            Nenhuma conta lançada no período.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[...despesaItems]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((item) => {
                const open = Math.max(0, item.amount - item.paid);
                const statusMeta =
                  item.status === "cancelled"
                    ? { label: "Cancelada", color: "var(--text-tertiary)", bg: "rgba(255,255,255,0.04)" }
                    : item.status === "paid" || open <= 0
                    ? { label: "Paga", color: "#22C55E", bg: "rgba(34,197,94,0.1)" }
                    : item.paid > 0
                    ? { label: "Parcial", color: "#F59E0B", bg: "rgba(245,158,11,0.1)" }
                    : { label: "Prevista", color: "#F59E0B", bg: "rgba(245,158,11,0.1)" };
                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      padding: "12px 14px",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                    }}
                  >
                    <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "3px" }}>
                      <span style={{ fontSize: "0.9rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.description}
                      </span>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", fontWeight: 600 }}>
                        {new Date(item.date + "T00:00:00").toLocaleDateString("pt-BR")}
                        {item.category && ` · ${CATEGORY_LABELS[item.category] || item.category}`}
                        {statusMeta.label === "Parcial" && ` · Pago ${formatCurrency(item.paid)} de ${formatCurrency(item.amount)}`}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                      <span style={{ fontSize: "1rem", fontWeight: 800, color: statusMeta.label === "Paga" ? "#EF4444" : "var(--text-primary)" }}>
                        {formatCurrency(item.amount)}
                      </span>
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          color: statusMeta.color,
                          background: statusMeta.bg,
                          padding: "4px 10px",
                          borderRadius: "999px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {statusMeta.label}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </DialogShell>
    </div>
  );
}
