"use client";

import { motion } from "framer-motion";
import { TrendingUp, DollarSign, Users, Percent, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatCurrency } from "@/lib/format";

import { Calendar } from "lucide-react";

interface FinancialKPIsProps {
  faturamentoPrevisto: number;
  faturamentoRealizado: number;
  despesas: number;
  despesasPrevistas: number;
  clientesAtivos: number;
  dateRange: { start: string; end: string };
  datePreset: 'all' | 'this_month' | 'prev_month' | 'next_month' | 'custom';
  onPresetChange: (preset: 'all' | 'this_month' | 'prev_month' | 'next_month' | 'custom') => void;
  onRangeChange: (range: { start: string; end: string }) => void;
}

export function FinancialKPIs({
  faturamentoPrevisto,
  faturamentoRealizado,
  despesas,
  despesasPrevistas,
  clientesAtivos,
  dateRange,
  datePreset,
  onPresetChange,
  onRangeChange,
}: FinancialKPIsProps) {
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
  };

  const cards: KpiCard[] = [
    {
      label: "Faturamento Previsto",
      value: formatCurrency(faturamentoPrevisto),
      sub: "Total emitido no período",
      icon: <TrendingUp size={20} />,
      color: "#60A5FA",
      bg: "rgba(96,165,250,0.06)",
      border: "rgba(96,165,250,0.15)",
    },
    {
      label: "Faturamento Realizado",
      value: formatCurrency(faturamentoRealizado),
      sub: `${taxaConversao.toFixed(0)}% do previsto recebido`,
      icon: <ArrowUpRight size={20} />,
      color: "#22C55E",
      bg: "rgba(34,197,94,0.06)",
      border: "rgba(34,197,94,0.15)",
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
            style={{
              padding: "24px",
              background: card.bg,
              border: `1px solid ${card.border}`,
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {card.label}
              </span>
              <span style={{ color: card.color, opacity: 0.8 }}>{card.icon}</span>
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
    </div>
  );
}
