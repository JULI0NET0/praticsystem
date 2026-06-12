"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, ChevronDown } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import DialogShell from "@/components/DialogShell";
import type { Expense, ExpenseCategory, ExpenseRecurrence } from "@/types/database";

const CATEGORIES: Record<ExpenseCategory, string> = {
  pro_labore: "Pro-labore",
  funcionario_pj: "Funcionário PJ",
  sistema: "Sistema/Software",
  internet: "Internet/Infra",
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
  outros: "var(--text-secondary)",
};

interface DespesasListProps {
  expenses: Expense[];
  users: { id: string; name: string }[];
  onSave: (data: Partial<Expense>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggle: (id: string, status: 'active' | 'inactive') => Promise<void>;
}

const EMPTY_FORM: Partial<Expense> = {
  description: "",
  category: "outros",
  amount: 0,
  due_day: 5,
  recurrence: "monthly",
  status: "active",
  related_user_id: undefined,
  notes: "",
};

export function DespesasList({ expenses, users, onSave, onDelete, onToggle }: DespesasListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<Partial<Expense>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState<string>("all");

  const totalMensal = expenses
    .filter((e) => e.status === "active" && e.recurrence === "monthly")
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

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(editing ? { ...form, id: editing.id } : form);
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  }

  const filtered = filterCat === "all" ? expenses : expenses.filter((e) => e.category === filterCat);

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
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "var(--text-tertiary)" }}>
                  Nenhuma despesa cadastrada.
                </td>
              </tr>
            )}
            {filtered.map((expense, i) => (
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
                  <span className={`badge ${expense.status === "active" ? "badge-success" : ""}`}
                    style={expense.status !== "active" ? { color: "var(--text-tertiary)", background: "rgba(255,255,255,0.04)" } : {}}>
                    {expense.status === "active" ? "Ativa" : "Inativa"}
                  </span>
                </td>
                <td>
                  <div style={{ display: "flex", gap: "6px" }}>
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
            ))}
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

      {/* Dialog */}
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
    </div>
  );
}
