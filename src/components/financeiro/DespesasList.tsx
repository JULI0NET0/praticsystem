"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, ChevronDown, CalendarPlus, FileText, Check, Link2, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import DialogShell from "@/components/DialogShell";
import { ExpenseLinkDialog } from "@/components/financeiro/ExpenseLinkDialog";
import type { Expense, ExpenseCategory, ExpenseRecurrence, ExpenseEntry, AsaasTransaction } from "@/types/database";

const CATEGORIES: Record<ExpenseCategory, string> = {
  pro_labore: "Pro-labore",
  funcionario_pj: "Funcionário PJ",
  sistema: "Sistema/Software",
  internet: "Internet/Infra",
  taxa_asaas: "Taxas Asaas",
  taxa_boleto: "Taxa de Boleto",
  taxa_mensageria: "Taxa de Mensageria",
  outros: "Outros",
};

const RECURRENCES: Record<ExpenseRecurrence, string> = {
  monthly: "Mensal",
  quarterly: "Trimestral",
  yearly: "Anual",
  one_time: "Pontual",
};

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  pro_labore: "#A78BFA",
  funcionario_pj: "#60A5FA",
  sistema: "#34D399",
  internet: "#F59E0B",
  taxa_asaas: "#FB923C",
  taxa_boleto: "#F472B6",
  taxa_mensageria: "#38BDF8",
  outros: "var(--text-secondary)",
};

interface DespesasListProps {
  expenses: Expense[];
  expenseEntries: ExpenseEntry[];
  users: { id: string; name: string }[];
  asaasTransactions: AsaasTransaction[];
  selectedMonth?: string;
  onSave: (data: Partial<Expense>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggle: (id: string, status: 'active' | 'inactive') => Promise<void>;
  onGenerateEntries: (expenseId: string, startMonth: string, months: number) => Promise<void>;
  onUpdateEntry: (id: string, data: Partial<ExpenseEntry>) => Promise<void>;
  onLinkTransaction: (asaasId: string, expenseEntryId?: string, invoiceId?: string, notes?: string) => Promise<void>;
}

const EMPTY_FORM: Partial<Expense> = {
  description: "",
  category: "outros",
  amount: 0,
  due_day: 5,
  recurrence: "monthly",
  status: "active",
  type: "fixed",
  related_user_id: undefined,
  notes: "",
};

function getMonthLabel(yyyymm: string) {
  if (!yyyymm) return "";
  const [y, m] = yyyymm.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

function generatePreviewDates(startMonth: string, months: number, dueDay: number): string[] {
  if (!startMonth || months < 1) return [];
  const [y, m] = startMonth.split("-").map(Number);
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(y, m - 1 + i, dueDay || 1);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" });
  });
}

export function DespesasList({ expenses, expenseEntries, users, asaasTransactions, selectedMonth, onSave, onDelete, onToggle, onGenerateEntries, onUpdateEntry, onLinkTransaction }: DespesasListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<Partial<Expense>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState<string>("all");
  const [viewEntriesDialog, setViewEntriesDialog] = useState<Expense | null>(null);

  const [genDialog, setGenDialog] = useState<Expense | null>(null);
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [genStartMonth, setGenStartMonth] = useState(defaultMonth);
  const [genMonths, setGenMonths] = useState(1);
  const [genSaving, setGenSaving] = useState(false);
  const [baixaEntry, setBaixaEntry] = useState<ExpenseEntry | null>(null);
  const [baixaDate, setBaixaDate] = useState("");

  const [linkEntry, setLinkEntry] = useState<ExpenseEntry | null>(null);
  const [linking, setLinking] = useState(false);

  const unlinkedDebits = asaasTransactions.filter((t) => t.type === "DEBIT" && !t.expense_entry_id && !t.invoice_id);

  function linkedSumEntry(entryId: string) {
    return asaasTransactions.filter((t) => t.expense_entry_id === entryId).reduce((s, t) => s + Math.abs(Number(t.value)), 0);
  }

  function isEntryLinked(entry: ExpenseEntry) {
    return !!entry.asaas_transaction_id || asaasTransactions.some((t) => t.expense_entry_id === entry.id);
  }

  function effectiveEntryStatus(entry: ExpenseEntry): "paid" | "partial" | "pending" | "cancelled" {
    if (entry.status === "paid" || entry.status === "cancelled") return entry.status;
    const linked = linkedSumEntry(entry.id);
    const amount = Number(entry.amount);
    if (linked >= amount && amount > 0) return "paid";
    if (linked > 0) return "partial";
    return entry.status;
  }

  async function handleConfirmLink(txnIds: string[], paymentDate: string, notes?: string) {
    if (!linkEntry) return;
    setLinking(true);
    try {
      for (const txnId of txnIds) {
        await onLinkTransaction(txnId, linkEntry.id, undefined, notes);
      }
      const selectedSum = asaasTransactions.filter((t) => txnIds.includes(t.id)).reduce((s, t) => s + Math.abs(Number(t.value)), 0);
      const totalLinked = linkedSumEntry(linkEntry.id) + selectedSum;
      if (totalLinked >= Number(linkEntry.amount)) {
        await onUpdateEntry(linkEntry.id, { status: "paid", date: paymentDate });
      }
      setLinkEntry(null);
    } finally {
      setLinking(false);
    }
  }

  const totalMensal = expenses
    .filter((e) => e.type !== "variable" && e.status === "active" && e.recurrence === "monthly")
    .reduce((acc, e) => acc + Number(e.amount), 0);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(expense: Expense) {
    setEditing(expense);
    setForm({ ...expense });
    setDialogOpen(true);
  }

  function openGen(expense: Expense) {
    setGenDialog(expense);
    setGenStartMonth(defaultMonth);
    setGenMonths(1);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(editing ? { ...form, id: editing.id } : form);
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerate() {
    if (!genDialog) return;
    setGenSaving(true);
    try {
      await onGenerateEntries(genDialog.id, genStartMonth, genMonths);
      setGenDialog(null);
    } finally {
      setGenSaving(false);
    }
  }

  const fixedExpenses = expenses.filter((e) => e.type !== "variable");
  const filtered = filterCat === "all" ? fixedExpenses : fixedExpenses.filter((e) => e.category === filterCat);

  const previewDates = genDialog
    ? generatePreviewDates(genStartMonth, genMonths, genDialog.due_day || 1)
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {["all", ...Object.keys(CATEGORIES)].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`btn ${filterCat === cat ? "btn-accent" : "btn-secondary"}`}
              style={{ fontSize: "0.8rem", padding: "6px 14px" }}
            >
              {cat === "all" ? "Todas" : CATEGORIES[cat as ExpenseCategory]}
            </button>
          ))}
        </div>
        <button className="btn btn-accent" onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Plus size={16} /> Nova Despesa
        </button>
      </div>

      {/* Resumo fixo mensal */}
      <div
        className="glass-card"
        style={{
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(239,68,68,0.05)",
          border: "1px solid rgba(239,68,68,0.12)",
        }}
      >
        <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: 600 }}>
          Total de despesas fixas mensais ativas
        </span>
        <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "#EF4444" }}>
          {formatCurrency(totalMensal)}
        </span>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Dia Vcto</th>
              <th>Recorrência</th>
              <th>Valor</th>
              <th>Mês Atual</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "40px", color: "var(--text-tertiary)" }}>
                  Nenhuma despesa cadastrada.
                </td>
              </tr>
            )}
            {filtered.map((expense, i) => {
              const entries = expenseEntries.filter((e) => e.expense_id === expense.id);
              const paidCount = entries.filter((e) => e.status === "paid").length;
              const pendingCount = entries.filter((e) => e.status === "pending").length;
              return (
                <motion.tr
                  key={expense.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <td style={{ fontWeight: 600 }}>
                    {expense.description}
                    {expense.notes && (
                      <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "2px" }}>{expense.notes}</p>
                    )}
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{ color: CATEGORY_COLORS[expense.category], background: `${CATEGORY_COLORS[expense.category]}18`, border: `1px solid ${CATEGORY_COLORS[expense.category]}30` }}
                    >
                      {CATEGORIES[expense.category]}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>
                    {expense.due_day ? `Dia ${String(expense.due_day).padStart(2, "0")}` : "—"}
                  </td>
                  <td style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                    {RECURRENCES[expense.recurrence]}
                  </td>
                  <td style={{ fontWeight: 700, color: "#EF4444" }}>{formatCurrency(Number(expense.amount))}</td>
                  <td>
                    {(() => {
                      if (!selectedMonth) return <span style={{ color: "var(--text-tertiary)", fontSize: "0.78rem" }}>—</span>;
                      const monthEntry = entries.find((e) => e.date.slice(0, 7) === selectedMonth);
                      if (!monthEntry) return <span style={{ color: "var(--text-tertiary)", fontSize: "0.78rem" }}>Sem fatura</span>;
                      const effStatus = effectiveEntryStatus(monthEntry);
                      const sum = linkedSumEntry(monthEntry.id);
                      const remaining = Math.max(0, Number(monthEntry.amount) - sum);
                      if (effStatus === "paid") {
                        return <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#22C55E" }}>✓ Pago</span>;
                      }
                      if (effStatus === "partial") {
                        return (
                          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#F59E0B" }}>Parcial</span>
                            <span style={{ fontSize: "0.7rem", color: "#EF4444" }}>{formatCurrency(remaining)} em aberto</span>
                          </div>
                        );
                      }
                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#EF4444" }}>Pendente</span>
                          <span style={{ fontSize: "0.7rem", color: "#EF4444" }}>{formatCurrency(Number(monthEntry.amount))}</span>
                        </div>
                      );
                    })()}
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span className={`badge ${expense.status === "active" ? "badge-success" : ""}`}
                        style={expense.status !== "active" ? { color: "var(--text-tertiary)", background: "rgba(255,255,255,0.04)" } : {}}>
                        {expense.status === "active" ? "Ativa" : "Inativa"}
                      </span>
                      {entries.length > 0 && (
                        <span style={{ fontSize: "0.7rem", color: "var(--text-tertiary)" }}>
                          {entries.length} fatura{entries.length !== 1 ? "s" : ""}
                          {paidCount > 0 && <span style={{ color: "#22C55E" }}> · {paidCount}✓</span>}
                          {pendingCount > 0 && <span style={{ color: "#F59E0B" }}> · {pendingCount}⏳</span>}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => setViewEntriesDialog(expense)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: entries.length > 0 ? "var(--accent)" : "var(--text-tertiary)", padding: "4px", display: "flex" }}
                        title="Ver faturas geradas"
                      >
                        <FileText size={15} />
                      </button>
                      {expense.status === "active" && (
                        <button
                          onClick={() => openGen(expense)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", padding: "4px", display: "flex" }}
                          title="Gerar Lançamentos por Meses"
                        >
                          <CalendarPlus size={15} />
                        </button>
                      )}
                      <button
                        onClick={() => onToggle(expense.id, expense.status === "active" ? "inactive" : "active")}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: "4px", display: "flex" }}
                        title={expense.status === "active" ? "Desativar" : "Ativar"}
                      >
                        {expense.status === "active" ? <ToggleRight size={18} color="#22C55E" /> : <ToggleLeft size={18} />}
                      </button>
                      <button
                        onClick={() => openEdit(expense)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: "4px", display: "flex" }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => onDelete(expense.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: "4px", display: "flex" }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards (visíveis apenas em telas ≤768px) */}
      <div className="mobile-table-cards">
        {filtered.length === 0 && (
          <p style={{ textAlign: "center", padding: "32px", color: "var(--text-tertiary)" }}>
            Nenhuma despesa cadastrada.
          </p>
        )}
        {filtered.map((expense) => (
          <div key={expense.id} className="mobile-data-card">
            <div className="mobile-card-header">
              <span className="mobile-card-title">{expense.description}</span>
              <span
                className="badge"
                style={{
                  color: CATEGORY_COLORS[expense.category],
                  background: `${CATEGORY_COLORS[expense.category]}18`,
                  border: `1px solid ${CATEGORY_COLORS[expense.category]}30`,
                  fontSize: "0.72rem",
                  flexShrink: 0,
                }}
              >
                {CATEGORIES[expense.category]}
              </span>
            </div>
            <div className="mobile-card-row">
              <span>Valor</span>
              <strong style={{ color: "#EF4444" }}>{formatCurrency(Number(expense.amount))}</strong>
            </div>
            <div className="mobile-card-row">
              <span>Recorrência</span>
              <span>{RECURRENCES[expense.recurrence]}</span>
            </div>
            <div className="mobile-card-row">
              <span>Vencimento</span>
              <span>{expense.due_day ? `Dia ${String(expense.due_day).padStart(2, "0")}` : "—"}</span>
            </div>
            <div className="mobile-card-row">
              <span>Status</span>
              <span className={`badge ${expense.status === "active" ? "badge-success" : ""}`}
                style={expense.status !== "active" ? { color: "var(--text-tertiary)", background: "rgba(255,255,255,0.04)" } : {}}>
                {expense.status === "active" ? "Ativa" : "Inativa"}
              </span>
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}>
              <button
                onClick={() => setViewEntriesDialog(expense)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", padding: "4px", display: "flex" }}
                title="Ver faturas"
              >
                <FileText size={16} />
              </button>
              {expense.status === "active" && (
                <button
                  onClick={() => openGen(expense)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", padding: "4px", display: "flex" }}
                  title="Gerar Lançamentos"
                >
                  <CalendarPlus size={16} />
                </button>
              )}
              <button
                onClick={() => onToggle(expense.id, expense.status === "active" ? "inactive" : "active")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: "4px", display: "flex" }}
                title={expense.status === "active" ? "Desativar" : "Ativar"}
              >
                {expense.status === "active" ? <ToggleRight size={18} color="#22C55E" /> : <ToggleLeft size={18} />}
              </button>
              <button
                onClick={() => openEdit(expense)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: "4px", display: "flex" }}
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={() => onDelete(expense.id)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: "4px", display: "flex" }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Dialog faturas da despesa */}
      {(() => {
        if (!viewEntriesDialog) return null;
        const entries = expenseEntries.filter((e) => e.expense_id === viewEntriesDialog.id);
        const paidCount = entries.filter((e) => effectiveEntryStatus(e) === "paid").length;
        const pendingCount = entries.filter((e) => ["pending", "partial"].includes(effectiveEntryStatus(e))).length;
        const totalPago = entries.reduce((s, e) => {
          const eff = effectiveEntryStatus(e);
          if (eff === "paid") return s + Number(e.amount);
          if (eff === "partial") return s + linkedSumEntry(e.id);
          return s;
        }, 0);
        const totalPendente = entries.reduce((s, e) => {
          const eff = effectiveEntryStatus(e);
          if (eff === "pending") return s + Number(e.amount);
          if (eff === "partial") return s + Math.max(0, Number(e.amount) - linkedSumEntry(e.id));
          return s;
        }, 0);
        return (
          <DialogShell
            isOpen
            onClose={() => setViewEntriesDialog(null)}
            title="Faturas Geradas"
            maxWidth="560px"
            footer={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => { setViewEntriesDialog(null); openGen(viewEntriesDialog); }}
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <CalendarPlus size={15} /> Gerar mais meses
                </button>
                <button className="btn btn-accent" onClick={() => setViewEntriesDialog(null)}>Fechar</button>
              </div>
            }
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Cabeçalho da despesa */}
              <div style={{ padding: "14px 16px", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                  <div>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "2px" }}>
                      {CATEGORIES[viewEntriesDialog.category]} · {RECURRENCES[viewEntriesDialog.recurrence]}
                      {viewEntriesDialog.due_day && ` · vcto dia ${String(viewEntriesDialog.due_day).padStart(2, "0")}`}
                    </p>
                    <p style={{ fontWeight: 700, fontSize: "1rem" }}>{viewEntriesDialog.description}</p>
                  </div>
                  <p style={{ fontWeight: 800, color: "#EF4444", fontSize: "1.15rem", flexShrink: 0 }}>
                    {formatCurrency(Number(viewEntriesDialog.amount))}
                  </p>
                </div>
              </div>

              {/* Resumo */}
              {entries.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                  {[
                    { label: "Total gerado", value: entries.length, suffix: ` fatura${entries.length !== 1 ? "s" : ""}`, color: "var(--text-primary)" },
                    { label: "Pago", value: formatCurrency(totalPago), suffix: ` (${paidCount})`, color: "#22C55E" },
                    { label: "Pendente", value: formatCurrency(totalPendente), suffix: ` (${pendingCount})`, color: "#F59E0B" },
                  ].map((item) => (
                    <div key={item.label} style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "10px", textAlign: "center" }}>
                      <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "4px" }}>{item.label}</p>
                      <p style={{ fontWeight: 800, color: item.color, fontSize: "0.9rem" }}>{item.value}<span style={{ fontWeight: 500, fontSize: "0.72rem", color: "var(--text-tertiary)" }}>{item.suffix}</span></p>
                    </div>
                  ))}
                </div>
              )}

              {/* Lista de faturas */}
              {entries.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px", color: "var(--text-tertiary)", fontSize: "0.875rem" }}>
                  Nenhuma fatura gerada ainda.<br />
                  <span style={{ fontSize: "0.8rem" }}>Use o botão abaixo para gerar os meses.</span>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "320px", overflowY: "auto" }}>
                  {entries
                    .slice()
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((entry) => {
                      const dateObj = new Date(`${entry.date}T12:00:00`);
                      const mesLabel = dateObj.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
                      const diaLabel = dateObj.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
                      const effStatus = effectiveEntryStatus(entry);
                      const linkedSum = linkedSumEntry(entry.id);
                      const sc = effStatus === "paid" ? "#22C55E" : effStatus === "cancelled" ? "var(--text-tertiary)" : "#F59E0B";
                      const sl = effStatus === "paid" ? "Pago" : effStatus === "cancelled" ? "Cancelado" : effStatus === "partial" ? "Parcial" : "Pendente";
                      return (
                        <div
                          key={entry.id}
                          style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", padding: "10px 14px", borderRadius: "10px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}
                        >
                          {/* Linha principal */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: "0.875rem", fontWeight: 600, textTransform: "capitalize" }}>{mesLabel}</p>
                            <p style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", marginTop: "1px" }}>vcto {diaLabel}</p>
                          </div>
                          <span style={{ fontWeight: 700, color: "#EF4444", fontSize: "0.9rem" }}>{formatCurrency(Number(entry.amount))}</span>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "1px", flexShrink: 0 }}>
                            <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "3px 8px", borderRadius: "6px", color: sc, background: `${sc}18`, border: `1px solid ${sc}30` }}>{sl}</span>
                            {effStatus === "partial" && (
                              <span style={{ fontSize: "0.62rem", color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
                                {formatCurrency(linkedSum)} de {formatCurrency(Number(entry.amount))}
                              </span>
                            )}
                          </div>
                          {effStatus === "paid" ? (
                            <span title="Vinculado ao banco" style={{ display: "flex", flexShrink: 0, color: "#22C55E" }}>
                              <CheckCircle2 size={15} />
                            </span>
                          ) : effStatus !== "cancelled" && (
                            <button
                              onClick={() => setLinkEntry(entry)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#F59E0B", padding: "2px", display: "flex", flexShrink: 0 }}
                              title="Vincular ao banco"
                            >
                              <Link2 size={15} />
                            </button>
                          )}
                          {effStatus !== "paid" && effStatus !== "cancelled" && (
                            <button
                              onClick={() => {
                                setBaixaDate(new Date().toISOString().split("T")[0]);
                                setBaixaEntry(entry);
                              }}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#22C55E", padding: "2px", display: "flex", flexShrink: 0 }}
                              title="Dar baixa"
                            >
                              <Check size={15} />
                            </button>
                          )}
                          {/* Histórico de pagamentos via banco — aparece para qualquer entry com transações vinculadas */}
                          {(() => {
                            const partials = asaasTransactions.filter((t) => t.expense_entry_id === entry.id);
                            if (partials.length === 0) return null;
                            const remaining = Math.max(0, Number(entry.amount) - linkedSum);
                            const isPaid = effStatus === "paid";
                            return (
                              <div style={{ flexBasis: "100%", padding: "8px 10px", borderRadius: "8px", background: isPaid ? "rgba(34,197,94,0.05)" : "rgba(245,158,11,0.05)", border: `1px solid ${isPaid ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)"}`, display: "flex", flexDirection: "column", gap: "4px" }}>
                                {partials.map((t) => (
                                  <div key={t.id} style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--text-tertiary)" }}>
                                      <span>{isPaid ? "Pgto." : "Adiant."} {new Date(`${t.date.split("T")[0]}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                                      <span style={{ color: isPaid ? "#22C55E" : "#F59E0B", fontWeight: 600 }}>− {formatCurrency(Math.abs(Number(t.value)))}</span>
                                    </div>
                                    {t.notes && (
                                      <p style={{ fontSize: "0.65rem", color: "var(--text-tertiary)", fontStyle: "italic", margin: 0 }}>{t.notes}</p>
                                    )}
                                  </div>
                                ))}
                                {remaining > 0 && (
                                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", fontWeight: 700, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "4px", marginTop: "2px" }}>
                                    <span style={{ color: "var(--text-secondary)" }}>Saldo em aberto</span>
                                    <span style={{ color: "#EF4444" }}>{formatCurrency(remaining)}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </DialogShell>
        );
      })()}

      {/* Baixa dialog */}
      <DialogShell
        isOpen={!!baixaEntry}
        onClose={() => setBaixaEntry(null)}
        title="Confirmar Pagamento"
        maxWidth="360px"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button className="btn btn-secondary" onClick={() => setBaixaEntry(null)}>Cancelar</button>
            <button
              className="btn btn-accent"
              disabled={!baixaDate}
              onClick={async () => {
                if (!baixaEntry) return;
                await onUpdateEntry(baixaEntry.id, { status: "paid", date: baixaDate });
                setBaixaEntry(null);
              }}
            >
              Confirmar Baixa
            </button>
          </div>
        }
      >
        {baixaEntry && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ padding: "14px 16px", background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: "12px" }}>
              <p style={{ fontWeight: 700 }}>{baixaEntry.description}</p>
              <p style={{ fontWeight: 800, color: "#EF4444", fontSize: "1.1rem", marginTop: "4px" }}>
                {formatCurrency(Number(baixaEntry.amount))}
              </p>
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
                Data do Pagamento
              </label>
              <input
                className="input-dark"
                style={{ width: "100%" }}
                type="date"
                value={baixaDate}
                onChange={(e) => setBaixaDate(e.target.value)}
              />
              <p style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", marginTop: "4px" }}>
                Padrão: hoje. Altere se o pagamento ocorreu em outra data.
              </p>
            </div>
          </div>
        )}
      </DialogShell>

      {/* Dialog criar/editar despesa */}
      <DialogShell
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? "Editar Despesa" : "Nova Despesa"}
        maxWidth="520px"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button className="btn btn-secondary" onClick={() => setDialogOpen(false)}>Cancelar</button>
            <button className="btn btn-accent" onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Descrição *</label>
            <input
              className="input-dark"
              style={{ width: "100%" }}
              placeholder="ex: Plataforma de agendamento"
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="responsive-grid-2" style={{ gap: "12px" }}>
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Categoria *</label>
              <div style={{ position: "relative" }}>
                <select
                  className="input-dark"
                  style={{ width: "100%", appearance: "none" }}
                  value={form.category || "outros"}
                  onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
                >
                  {Object.entries(CATEGORIES).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <ChevronDown size={14} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-secondary)" }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Recorrência *</label>
              <div style={{ position: "relative" }}>
                <select
                  className="input-dark"
                  style={{ width: "100%", appearance: "none" }}
                  value={form.recurrence || "monthly"}
                  onChange={(e) => setForm({ ...form, recurrence: e.target.value as ExpenseRecurrence })}
                >
                  {Object.entries(RECURRENCES).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <ChevronDown size={14} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-secondary)" }} />
              </div>
            </div>
          </div>

          <div className="responsive-grid-2" style={{ gap: "12px" }}>
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Valor (R$) *</label>
              <input
                className="input-dark"
                style={{ width: "100%" }}
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={form.amount || ""}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Dia de Vencimento</label>
              <input
                className="input-dark"
                style={{ width: "100%" }}
                type="number"
                min="1"
                max="31"
                placeholder="ex: 5"
                value={form.due_day || ""}
                onChange={(e) => setForm({ ...form, due_day: Number(e.target.value) })}
              />
            </div>
          </div>

          {(form.category === "pro_labore" || form.category === "funcionario_pj") && users.length > 0 && (
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Vincular a membro da equipe</label>
              <div style={{ position: "relative" }}>
                <select
                  className="input-dark"
                  style={{ width: "100%", appearance: "none" }}
                  value={form.related_user_id || ""}
                  onChange={(e) => setForm({ ...form, related_user_id: e.target.value || undefined })}
                >
                  <option value="">Nenhum</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-secondary)" }} />
              </div>
            </div>
          )}

          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Observações</label>
            <textarea
              className="input-dark"
              style={{ width: "100%", minHeight: "72px", resize: "vertical" }}
              placeholder="Detalhes adicionais..."
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
      </DialogShell>

      {/* Dialog gerar lançamentos por meses */}
      <DialogShell
        isOpen={!!genDialog}
        onClose={() => setGenDialog(null)}
        title="Gerar Lançamentos por Meses"
        maxWidth="460px"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button className="btn btn-secondary" onClick={() => setGenDialog(null)}>Cancelar</button>
            <button
              className="btn btn-accent"
              onClick={handleGenerate}
              disabled={genSaving || !genStartMonth || genMonths < 1}
            >
              {genSaving ? "Gerando..." : `Gerar ${genMonths} lançamento${genMonths !== 1 ? "s" : ""}`}
            </button>
          </div>
        }
      >
        {genDialog && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="glass-card" style={{ padding: "14px 16px", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.12)" }}>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "2px" }}>{CATEGORIES[genDialog.category]}</p>
              <p style={{ fontWeight: 700, fontSize: "1rem" }}>{genDialog.description}</p>
              <p style={{ fontWeight: 800, color: "#EF4444", fontSize: "1.15rem", marginTop: "2px" }}>
                {formatCurrency(Number(genDialog.amount))}
                {genDialog.due_day && (
                  <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--text-secondary)", marginLeft: "8px" }}>
                    vencto dia {String(genDialog.due_day).padStart(2, "0")}
                  </span>
                )}
              </p>
            </div>

            <div className="responsive-grid-2" style={{ gap: "12px" }}>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Mês inicial *</label>
                <input
                  className="input-dark"
                  style={{ width: "100%" }}
                  type="month"
                  value={genStartMonth}
                  onChange={(e) => setGenStartMonth(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Quantidade de meses *</label>
                <input
                  className="input-dark"
                  style={{ width: "100%" }}
                  type="number"
                  min="1"
                  max="24"
                  value={genMonths}
                  onChange={(e) => setGenMonths(Math.max(1, Math.min(24, Number(e.target.value))))}
                />
              </div>
            </div>

            {previewDates.length > 0 && (
              <div>
                <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "8px" }}>
                  Lançamentos que serão criados ({previewDates.length}):
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {previewDates.map((date, i) => (
                    <span
                      key={i}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "8px",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        background: "rgba(239,68,68,0.08)",
                        color: "#EF4444",
                        border: "1px solid rgba(239,68,68,0.2)",
                      }}
                    >
                      {date}
                    </span>
                  ))}
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "8px" }}>
                  Total: {formatCurrency(Number(genDialog.amount) * genMonths)}
                </p>
              </div>
            )}
          </div>
        )}
      </DialogShell>

      {/* Dialog: Vínculo ao banco */}
      <ExpenseLinkDialog
        isOpen={!!linkEntry}
        entry={linkEntry ? { id: linkEntry.id, description: linkEntry.description, amount: Number(linkEntry.amount), date: linkEntry.date } : null}
        debits={unlinkedDebits}
        linking={linking}
        onClose={() => setLinkEntry(null)}
        onConfirm={handleConfirmLink}
      />
    </div>
  );
}
