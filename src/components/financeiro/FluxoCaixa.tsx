"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { Invoice, ExpenseEntry, Expense } from "@/types/database";

interface FluxoCaixaProps {
  invoices: Invoice[];
  expenseEntries: ExpenseEntry[];
  expenses: Expense[];
  selectedMonth: string;
}

interface WeekRow {
  label: string;
  startDate: string;
  endDate: string;
  entradasPrevistas: number;
  saidasPrevistas: number;
  entradasRealizadas: number;
  saidasRealizadas: number;
}

export function FluxoCaixa({ invoices, expenseEntries, expenses, selectedMonth }: FluxoCaixaProps) {
  const [year, month] = selectedMonth.split("-").map(Number);

  const weeks = useMemo<WeekRow[]>(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const ranges = [
      { label: "Semana 1", start: 1, end: 7 },
      { label: "Semana 2", start: 8, end: 14 },
      { label: "Semana 3", start: 15, end: 21 },
      { label: "Semana 4", start: 22, end: daysInMonth },
    ];

    return ranges.map((range) => {
      const startDate = `${year}-${String(month).padStart(2, "0")}-${String(range.start).padStart(2, "0")}`;
      const endDate = `${year}-${String(month).padStart(2, "0")}-${String(range.end).padStart(2, "0")}`;

      const inRange = (dateStr: string) => {
        const d = dateStr.split("T")[0];
        return d >= startDate && d <= endDate;
      };

      const entradasPrevistas = invoices
        .filter((i) => i.status === "pending" && inRange(i.due_date))
        .reduce((s, i) => s + Number(i.amount), 0);

      const entradasRealizadas = invoices
        .filter((i) => i.status === "paid" && inRange(i.paid_at || i.due_date))
        .reduce((s, i) => s + Number(i.amount), 0);

      const saidasRealizadas = expenseEntries
        .filter((e) => e.status === "paid" && inRange(e.date))
        .reduce((s, e) => s + Number(e.amount), 0);

      // Despesas recorrentes ativas com due_day nessa semana
      const saidasPrevistas = expenses
        .filter((e) => {
          if (e.status !== "active") return false;
          if (!e.due_day) return false;
          return e.due_day >= range.start && e.due_day <= range.end;
        })
        .reduce((s, e) => s + Number(e.amount), 0);

      return { label: range.label, startDate, endDate, entradasPrevistas, saidasPrevistas, entradasRealizadas, saidasRealizadas };
    });
  }, [invoices, expenseEntries, expenses, year, month]);

  const totalEntradas = weeks.reduce((s, w) => s + w.entradasRealizadas + w.entradasPrevistas, 0);
  const totalSaidas = weeks.reduce((s, w) => s + w.saidasRealizadas + w.saidasPrevistas, 0);
  const saldoProjetado = totalEntradas - totalSaidas;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Summary */}
      <div className="responsive-grid-3" style={{ gap: "14px" }}>
        <div className="glass-card" style={{ padding: "20px", background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.12)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <TrendingUp size={16} color="#22C55E" />
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#22C55E", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Entradas</span>
          </div>
          <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "#22C55E" }}>{formatCurrency(totalEntradas)}</p>
        </div>
        <div className="glass-card" style={{ padding: "20px", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.12)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <TrendingDown size={16} color="#EF4444" />
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#EF4444", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Saídas</span>
          </div>
          <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "#EF4444" }}>{formatCurrency(totalSaidas)}</p>
        </div>
        <div className="glass-card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <Wallet size={16} color={saldoProjetado >= 0 ? "var(--accent)" : "#EF4444"} />
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: saldoProjetado >= 0 ? "var(--accent)" : "#EF4444", textTransform: "uppercase", letterSpacing: "0.05em" }}>Saldo Projetado</span>
          </div>
          <p style={{ fontSize: "1.5rem", fontWeight: 800, color: saldoProjetado >= 0 ? "var(--accent)" : "#EF4444" }}>{formatCurrency(saldoProjetado)}</p>
        </div>
      </div>

      {/* Weekly breakdown */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Período</th>
              <th>Entradas Realizadas</th>
              <th>Entradas Previstas</th>
              <th>Saídas Realizadas</th>
              <th>Saídas Previstas</th>
              <th>Saldo Semana</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, i) => {
              const saldo = (week.entradasRealizadas + week.entradasPrevistas) - (week.saidasRealizadas + week.saidasPrevistas);
              return (
                <motion.tr
                  key={week.label}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <td>
                    <p style={{ fontWeight: 700 }}>{week.label}</p>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                      {new Date(`${week.startDate}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} —{" "}
                      {new Date(`${week.endDate}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </p>
                  </td>
                  <td style={{ fontWeight: 600, color: "#22C55E" }}>{formatCurrency(week.entradasRealizadas)}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{formatCurrency(week.entradasPrevistas)}</td>
                  <td style={{ fontWeight: 600, color: "#EF4444" }}>{formatCurrency(week.saidasRealizadas)}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{formatCurrency(week.saidasPrevistas)}</td>
                  <td style={{ fontWeight: 800, color: saldo >= 0 ? "#22C55E" : "#EF4444" }}>{formatCurrency(saldo)}</td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards (visíveis apenas em telas ≤768px) */}
      <div className="mobile-table-cards">
        {weeks.map((week, i) => {
          const saldo = (week.entradasRealizadas + week.entradasPrevistas) - (week.saidasRealizadas + week.saidasPrevistas);
          return (
            <div key={week.label} className="mobile-data-card">
              <div className="mobile-card-header">
                <span className="mobile-card-title">{week.label}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                  {new Date(`${week.startDate}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} — {new Date(`${week.endDate}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                </span>
              </div>
              <div className="mobile-card-row">
                <span>Entradas realizadas</span>
                <strong style={{ color: "#22C55E" }}>{formatCurrency(week.entradasRealizadas)}</strong>
              </div>
              <div className="mobile-card-row">
                <span>Entradas previstas</span>
                <span style={{ color: "var(--text-secondary)" }}>{formatCurrency(week.entradasPrevistas)}</span>
              </div>
              <div className="mobile-card-row">
                <span>Saídas realizadas</span>
                <strong style={{ color: "#EF4444" }}>{formatCurrency(week.saidasRealizadas)}</strong>
              </div>
              <div className="mobile-card-row">
                <span>Saídas previstas</span>
                <span style={{ color: "var(--text-secondary)" }}>{formatCurrency(week.saidasPrevistas)}</span>
              </div>
              <div className="mobile-card-row" style={{ borderTop: "1px solid var(--border)", paddingTop: "8px", marginTop: "2px" }}>
                <span style={{ fontWeight: 700 }}>Saldo semana</span>
                <strong style={{ color: saldo >= 0 ? "#22C55E" : "#EF4444", fontSize: "1rem" }}>{formatCurrency(saldo)}</strong>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
