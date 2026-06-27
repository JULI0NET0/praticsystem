"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, ChevronDown, ChevronRight, Pencil, Trash2,
  Check, Layers, Link2, CheckCircle2,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import DialogShell from "@/components/DialogShell";
import { ExpenseLinkDialog } from "@/components/financeiro/ExpenseLinkDialog";
import type { Expense, ExpenseEntry, ExpenseCategory, AsaasTransaction } from "@/types/database";

const CATEGORIES: Record<string, string> = {
  taxa_asaas: "Taxas Asaas",
  taxa_boleto: "Taxa de Boleto",
  taxa_mensageria: "Taxa de Mensageria",
  internet: "Internet/Infra",
  sistema: "Sistema/Software",
  outros: "Outros",
};

interface DespesasVariaveisProps {
  expenses: Expense[];
  expenseEntries: ExpenseEntry[];
  clients: { id: string; name: string; nome_fantasia?: string }[];
  users: { id: string; name: string }[];
  asaasTransactions: AsaasTransaction[];
  startDate: string;
  endDate: string;
  onSaveGroup: (data: Partial<Expense>) => Promise<void>;
  onDeleteGroup: (id: string) => Promise<void>;
  onCreateEntry: (data: Partial<ExpenseEntry>) => Promise<ExpenseEntry | null>;
  onUpdateEntry: (id: string, data: Partial<ExpenseEntry>) => Promise<void>;
  onDeleteEntry?: (id: string) => Promise<void>;
  onLinkTransaction: (asaasId: string, expenseEntryId?: string, invoiceId?: string, notes?: string) => Promise<void>;
}

export function DespesasVariaveis({
  expenses,
  expenseEntries,
  clients,
  users,
  asaasTransactions,
  startDate,
  endDate,
  onSaveGroup,
  onDeleteGroup,
  onCreateEntry,
  onUpdateEntry,
  onDeleteEntry,
  onLinkTransaction,
}: DespesasVariaveisProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [groupDialog, setGroupDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Expense | null>(null);
  const [groupForm, setGroupForm] = useState<{ description: string; category: string; notes: string }>({
    description: "", category: "outros", notes: "",
  });
  const [groupSaving, setGroupSaving] = useState(false);

  const [entryDialog, setEntryDialog] = useState<Expense | null>(null);
  const [editingEntry, setEditingEntry] = useState<ExpenseEntry | null>(null);
  const [entryForm, setEntryForm] = useState<{ description: string; amount: string; date: string; notes: string }>({
    description: "", amount: "", date: new Date().toISOString().split("T")[0], notes: "",
  });
  const [entrySaving, setEntrySaving] = useState(false);

  const [baixaEntry, setBaixaEntry] = useState<ExpenseEntry | null>(null);
  const [baixaDate, setBaixaDate] = useState("");

  const [linkEntry, setLinkEntry] = useState<ExpenseEntry | null>(null);
  const [linking, setLinking] = useState(false);

  const unlinkedDebits = useMemo(
    () => asaasTransactions.filter((t) => t.type === "DEBIT" && !t.expense_entry_id && !t.invoice_id),
    [asaasTransactions]
  );

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

  const groups = useMemo(
    () => expenses.filter((e) => e.type === "variable").sort((a, b) => a.description.localeCompare(b.description)),
    [expenses]
  );

  function entriesForGroup(groupId: string) {
    return expenseEntries.filter((e) => {
      if (e.expense_id !== groupId) return false;
      if (!startDate && !endDate) return true;
      const d = e.date.split("T")[0];
      return (!startDate || d >= startDate) && (!endDate || d <= endDate);
    }).sort((a, b) => b.date.localeCompare(a.date));
  }

  function resolveResponsible(entry: ExpenseEntry) {
    const parentExpense = expenses.find((e) => e.id === entry.expense_id);
    if (parentExpense?.related_user_id) {
      const user = users.find((u) => u.id === parentExpense.related_user_id);
      return user ? { type: "funcionario", label: user.name.split(" ")[0] } : null;
    }
    return { type: "empresa", label: "Empresa" };
  }

  function openNewGroup() {
    setEditingGroup(null);
    setGroupForm({ description: "", category: "outros", notes: "" });
    setGroupDialog(true);
  }

  function openEditGroup(g: Expense) {
    setEditingGroup(g);
    setGroupForm({ description: g.description, category: g.category, notes: g.notes ?? "" });
    setGroupDialog(true);
  }

  async function handleSaveGroup() {
    setGroupSaving(true);
    try {
      await onSaveGroup({
        ...(editingGroup ? { id: editingGroup.id } : {}),
        description: groupForm.description,
        category: groupForm.category as ExpenseCategory,
        notes: groupForm.notes || undefined,
        type: "variable",
        amount: 0,
        recurrence: "one_time",
        status: "active",
      });
      setGroupDialog(false);
    } catch {
      // erro já foi exibido via showToast no handleSaveExpense do pai
    } finally {
      setGroupSaving(false);
    }
  }

  function openNewEntry(group: Expense) {
    setEditingEntry(null);
    setEntryForm({ description: group.description, amount: "", date: new Date().toISOString().split("T")[0], notes: "" });
    setEntryDialog(group);
  }

  function openEditEntry(entry: ExpenseEntry, group: Expense) {
    setEditingEntry(entry);
    setEntryForm({
      description: entry.description,
      amount: String(entry.amount),
      date: entry.date.split("T")[0],
      notes: entry.notes ?? "",
    });
    setEntryDialog(group);
  }

  async function handleSaveEntry() {
    if (!entryDialog) return;
    setEntrySaving(true);
    try {
      if (editingEntry) {
        await onUpdateEntry(editingEntry.id, {
          description: entryForm.description,
          amount: Number(entryForm.amount),
          date: entryForm.date,
          notes: entryForm.notes || undefined,
        });
      } else {
        const created = await onCreateEntry({
          expense_id: entryDialog.id,
          description: entryForm.description,
          category: entryDialog.category,
          amount: Number(entryForm.amount),
          date: entryForm.date,
          status: "pending",
          notes: entryForm.notes || undefined,
        });
        if (!created) return; // erro já tratado no pai
      }
      setEntryDialog(null);
      setEditingEntry(null);
    } catch {
      // erro exibido via toast no pai
    } finally {
      setEntrySaving(false);
    }
  }

  const STATUS_COLOR: Record<string, string> = {
    paid: "#22C55E", partial: "#F59E0B", pending: "#F59E0B", cancelled: "var(--text-tertiary)",
  };
  const STATUS_LABEL: Record<string, string> = {
    paid: "Pago", partial: "Parcial", pending: "Pendente", cancelled: "Cancelado",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "10px" }}>
            <Layers size={22} color="var(--accent)" /> Despesas Variáveis
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>
            Grupos de custos ad-hoc — taxas, combustível, deslocamentos e outros gastos irregulares.
          </p>
        </div>
        <button className="btn btn-accent" onClick={openNewGroup} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Plus size={15} /> Novo Grupo
        </button>
      </div>

      {/* Groups */}
      {groups.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 24px", color: "var(--text-tertiary)" }}>
          <Layers size={40} style={{ opacity: 0.15, display: "block", margin: "0 auto 16px" }} />
          <p style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "6px" }}>Nenhum grupo variável criado.</p>
          <p style={{ fontSize: "0.82rem" }}>Crie um grupo como "Taxas Bancárias" ou "Combustível" e adicione lançamentos ad-hoc.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {groups.map((group) => {
            const entries = entriesForGroup(group.id);
            const total = entries.reduce((s, e) => s + Number(e.amount), 0);
            const paid = entries.filter((e) => e.status === "paid").reduce((s, e) => s + Number(e.amount), 0);
            const pending = entries.filter((e) => e.status === "pending").reduce((s, e) => s + Number(e.amount), 0);
            const isOpen = expandedId === group.id;

            return (
              <div key={group.id} className="glass-card" style={{ overflow: "hidden" }}>
                {/* Group header */}
                <div
                  onClick={() => setExpandedId(isOpen ? null : group.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: "14px",
                    padding: "18px 20px", cursor: "pointer", userSelect: "none",
                  }}
                >
                  {isOpen ? <ChevronDown size={16} color="var(--text-secondary)" /> : <ChevronRight size={16} color="var(--text-secondary)" />}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: "1rem" }}>{group.description}</span>
                      <span className="badge" style={{ fontSize: "0.7rem" }}>{CATEGORIES[group.category] ?? group.category}</span>
                    </div>
                    {entries.length > 0 && (
                      <div style={{ display: "flex", gap: "14px", fontSize: "0.72rem", color: "var(--text-tertiary)", marginTop: "3px", flexWrap: "wrap" }}>
                        <span>{entries.length} lançamento{entries.length !== 1 ? "s" : ""}</span>
                        {paid > 0 && <span style={{ color: "#22C55E" }}>Pago: {formatCurrency(paid)}</span>}
                        {pending > 0 && <span style={{ color: "#F59E0B" }}>Pendente: {formatCurrency(pending)}</span>}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                    <span style={{ fontWeight: 800, color: "#EF4444", fontSize: "1.1rem" }}>
                      {total > 0 ? formatCurrency(total) : "—"}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditGroup(group); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: "4px", display: "flex" }}
                      title="Editar grupo"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Excluir o grupo "${group.description}" e todos os seus lançamentos?`)) onDeleteGroup(group.id);
                      }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: "4px", display: "flex" }}
                      title="Excluir grupo"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Expanded entries */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="entries"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: "hidden", borderTop: "1px solid var(--border)" }}
                    >
                      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                        {/* Add entry button */}
                        <button
                          className="btn btn-secondary"
                          onClick={() => openNewEntry(group)}
                          style={{ display: "flex", alignItems: "center", gap: "6px", alignSelf: "flex-start", fontSize: "0.82rem" }}
                        >
                          <Plus size={13} /> Novo Lançamento
                        </button>

                        {entries.length === 0 ? (
                          <p style={{ fontSize: "0.82rem", color: "var(--text-tertiary)", padding: "8px 0" }}>
                            Nenhum lançamento registrado neste período.
                          </p>
                        ) : (
                          <div className="table-container">
                            <table className="table">
                              <thead>
                                <tr>
                                  <th>Data</th>
                                  <th>Descrição</th>
                                  <th>Responsável</th>
                                  <th style={{ textAlign: "right" }}>Valor</th>
                                  <th>Status</th>
                                  <th>Vínculo</th>
                                  <th></th>
                                </tr>
                              </thead>
                              <tbody>
                                {entries.map((entry, i) => {
                                  const effStatus = effectiveEntryStatus(entry);
                                  const sc = STATUS_COLOR[effStatus] || "var(--text-tertiary)";
                                  const linkedSum = linkedSumEntry(entry.id);
                                  const responsible = resolveResponsible(entry);
                                  return (
                                    <motion.tr
                                      key={entry.id}
                                      initial={{ opacity: 0, y: 4 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: i * 0.03 }}
                                    >
                                      <td style={{ color: "var(--text-secondary)", fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                                        {new Date(`${entry.date.split("T")[0]}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                                      </td>
                                      <td style={{ fontWeight: 600, fontSize: "0.875rem", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {entry.description}
                                      </td>
                                      <td>
                                        <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", fontWeight: 600 }}>
                                          {responsible?.label ?? "Empresa"}
                                        </span>
                                      </td>
                                      <td style={{ textAlign: "right", fontWeight: 700, color: "#EF4444", whiteSpace: "nowrap" }}>
                                        {formatCurrency(Number(entry.amount))}
                                      </td>
                                      <td>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                          <span style={{
                                            fontSize: "0.68rem", fontWeight: 700, padding: "2px 7px", borderRadius: "6px",
                                            color: sc, background: `${sc}18`, border: `1px solid ${sc}30`, alignSelf: "flex-start",
                                          }}>
                                            {STATUS_LABEL[effStatus] ?? effStatus}
                                          </span>
                                          {(() => {
                                            const partials = asaasTransactions.filter((t) => t.expense_entry_id === entry.id);
                                            if (partials.length === 0) return null;
                                            const remaining = Math.max(0, Number(entry.amount) - linkedSum);
                                            const isPaid = effStatus === "paid";
                                            return (
                                              <div style={{ padding: "6px 8px", borderRadius: "6px", background: isPaid ? "rgba(34,197,94,0.05)" : "rgba(245,158,11,0.05)", border: `1px solid ${isPaid ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)"}`, display: "flex", flexDirection: "column", gap: "3px" }}>
                                                {partials.map((t) => (
                                                  <div key={t.id} style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", fontSize: "0.65rem", color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
                                                      <span>{isPaid ? "Pgto." : "Adiant."} {new Date(`${t.date.split("T")[0]}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                                                      <span style={{ color: isPaid ? "#22C55E" : "#F59E0B", fontWeight: 600 }}>− {formatCurrency(Math.abs(Number(t.value)))}</span>
                                                    </div>
                                                    {t.notes && (
                                                      <p style={{ fontSize: "0.62rem", color: "var(--text-tertiary)", fontStyle: "italic", margin: 0 }}>{t.notes}</p>
                                                    )}
                                                  </div>
                                                ))}
                                                {remaining > 0 && (
                                                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", fontSize: "0.68rem", fontWeight: 700, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "3px", marginTop: "1px", whiteSpace: "nowrap" }}>
                                                    <span style={{ color: "var(--text-secondary)" }}>Em aberto</span>
                                                    <span style={{ color: "#EF4444" }}>{formatCurrency(remaining)}</span>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      </td>
                                      <td>
                                        {isEntryLinked(entry) ? (
                                          <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.72rem", color: "#22C55E", fontWeight: 600 }}>
                                            <CheckCircle2 size={11} /> Banco
                                          </span>
                                        ) : (
                                          <span style={{ fontSize: "0.72rem", color: "#F59E0B", fontWeight: 600 }}>Sem vínculo</span>
                                        )}
                                      </td>
                                      <td>
                                        <div style={{ display: "flex", gap: "2px", justifyContent: "flex-end" }}>
                                          <button
                                            onClick={() => openEditEntry(entry, group)}
                                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: "4px", display: "flex" }}
                                            title="Editar"
                                          >
                                            <Pencil size={13} />
                                          </button>
                                          {effStatus !== "paid" && effStatus !== "cancelled" && (
                                            <button
                                              onClick={() => setLinkEntry(entry)}
                                              style={{ background: "none", border: "none", cursor: "pointer", color: "#F59E0B", padding: "4px", display: "flex" }}
                                              title="Vincular ao banco"
                                            >
                                              <Link2 size={13} />
                                            </button>
                                          )}
                                          {effStatus !== "paid" && effStatus !== "cancelled" && (
                                            <button
                                              onClick={() => { setBaixaDate(new Date().toISOString().split("T")[0]); setBaixaEntry(entry); }}
                                              style={{ background: "none", border: "none", cursor: "pointer", color: "#22C55E", padding: "4px", display: "flex" }}
                                              title="Dar baixa"
                                            >
                                              <Check size={13} />
                                            </button>
                                          )}
                                          {onDeleteEntry && (
                                            <button
                                              onClick={() => { if (confirm("Excluir este lançamento?")) onDeleteEntry(entry.id); }}
                                              style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: "4px", display: "flex" }}
                                              title="Excluir"
                                            >
                                              <Trash2 size={13} />
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    </motion.tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog: Grupo */}
      <DialogShell
        isOpen={groupDialog}
        onClose={() => setGroupDialog(false)}
        title={editingGroup ? "Editar Grupo" : "Novo Grupo Variável"}
        maxWidth="440px"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button className="btn btn-secondary" onClick={() => setGroupDialog(false)}>Cancelar</button>
            <button className="btn btn-accent" onClick={handleSaveGroup} disabled={!groupForm.description || groupSaving}>
              {groupSaving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Nome do Grupo *</label>
            <input
              className="input-dark"
              style={{ width: "100%" }}
              placeholder="ex: Taxas Bancárias, Combustível..."
              value={groupForm.description}
              onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
            />
          </div>
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Categoria</label>
            <select
              className="input-dark"
              style={{ width: "100%" }}
              value={groupForm.category}
              onChange={(e) => setGroupForm({ ...groupForm, category: e.target.value })}
            >
              {Object.entries(CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Observações</label>
            <textarea
              className="input-dark"
              style={{ width: "100%", minHeight: "60px", resize: "vertical" }}
              value={groupForm.notes}
              onChange={(e) => setGroupForm({ ...groupForm, notes: e.target.value })}
            />
          </div>
        </div>
      </DialogShell>

      {/* Dialog: Lançamento */}
      <DialogShell
        isOpen={!!entryDialog}
        onClose={() => { setEntryDialog(null); setEditingEntry(null); }}
        title={editingEntry ? "Editar Lançamento" : `Novo Lançamento — ${entryDialog?.description ?? ""}`}
        maxWidth="440px"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button className="btn btn-secondary" onClick={() => { setEntryDialog(null); setEditingEntry(null); }}>Cancelar</button>
            <button
              className="btn btn-accent"
              onClick={handleSaveEntry}
              disabled={!entryForm.description || !entryForm.amount || entrySaving}
            >
              {entrySaving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Descrição *</label>
            <input
              className="input-dark"
              style={{ width: "100%" }}
              placeholder="ex: Taxa DOC/TED, Recarga combustível..."
              value={entryForm.description}
              onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
            />
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
                value={entryForm.amount}
                onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Data *</label>
              <input
                className="input-dark"
                style={{ width: "100%" }}
                type="date"
                value={entryForm.date}
                onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Observações</label>
            <textarea
              className="input-dark"
              style={{ width: "100%", minHeight: "55px", resize: "vertical" }}
              value={entryForm.notes}
              onChange={(e) => setEntryForm({ ...entryForm, notes: e.target.value })}
            />
          </div>
        </div>
      </DialogShell>

      {/* Dialog: Baixa */}
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
              <p style={{ fontWeight: 800, color: "#EF4444", fontSize: "1.1rem", marginTop: "4px" }}>{formatCurrency(Number(baixaEntry.amount))}</p>
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Data do Pagamento</label>
              <input className="input-dark" style={{ width: "100%" }} type="date" value={baixaDate} onChange={(e) => setBaixaDate(e.target.value)} />
              <p style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", marginTop: "4px" }}>Padrão: hoje. Altere se o pagamento ocorreu em outra data.</p>
            </div>
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
