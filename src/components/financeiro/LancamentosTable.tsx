"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, RefreshCw, Search, ChevronDown, Link2, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import DialogShell from "@/components/DialogShell";
import type { Invoice, ExpenseEntry, AsaasTransaction, ExpenseCategory } from "@/types/database";

const CATEGORY_LABELS: Record<string, string> = {
  pro_labore: "Pro-labore",
  funcionario_pj: "Funcionário PJ",
  sistema: "Sistema/Software",
  internet: "Internet/Infra",
  outros: "Outros",
  receita: "Receita",
};

type FilterType = "all" | "receita" | "despesa";
type FilterStatus = "all" | "paid" | "pending" | "cancelled";

interface LancamentosTableProps {
  invoices: Invoice[];
  expenseEntries: ExpenseEntry[];
  asaasTransactions: AsaasTransaction[];
  syncing: boolean;
  onSync: (startDate: string, endDate: string) => Promise<void>;
  onLinkTransaction: (asaasId: string, expenseEntryId?: string, invoiceId?: string) => Promise<void>;
  onCreateEntry: (data: Partial<ExpenseEntry>) => Promise<void>;
  onUpdateEntry: (id: string, data: Partial<ExpenseEntry>) => Promise<void>;
  onUpdateInvoiceStatus?: (id: string, status: string) => Promise<void>;
  startDate: string;
  endDate: string;
}

interface UnifiedEntry {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: "receita" | "despesa";
  status: string;
  asaasLinked: boolean;
  rawInvoice?: Invoice;
  rawEntry?: ExpenseEntry;
}

export function LancamentosTable({
  invoices,
  expenseEntries,
  asaasTransactions,
  syncing,
  onSync,
  onLinkTransaction,
  onCreateEntry,
  onUpdateEntry,
  onUpdateInvoiceStatus,
  startDate,
  endDate,
}: LancamentosTableProps) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [linkDialog, setLinkDialog] = useState<AsaasTransaction | null>(null);
  const [linkTarget, setLinkTarget] = useState<{ type: "expense" | "invoice"; id: string } | null>(null);
  const [newEntryDialog, setNewEntryDialog] = useState(false);
  const [newEntryForm, setNewEntryForm] = useState<Partial<ExpenseEntry>>({ description: "", amount: 0, date: "", status: "paid", category: "outros" });
  const [saving, setSaving] = useState(false);

  const entries = useMemo<UnifiedEntry[]>(() => {
    const result: UnifiedEntry[] = [];

    for (const inv of invoices) {
      const d = inv.due_date.split("T")[0];
      if (startDate && d < startDate) continue;
      if (endDate && d > endDate) continue;
      result.push({
        id: `inv-${inv.id}`,
        date: d,
        description: inv.description,
        category: "receita",
        amount: Number(inv.amount),
        type: "receita",
        status: inv.status,
        asaasLinked: asaasTransactions.some((t) => t.invoice_id === inv.id),
        rawInvoice: inv,
      });
    }

    for (const entry of expenseEntries) {
      const d = entry.date.split("T")[0];
      if (startDate && d < startDate) continue;
      if (endDate && d > endDate) continue;
      result.push({
        id: `exp-${entry.id}`,
        date: d,
        description: entry.description,
        category: entry.category || "outros",
        amount: Number(entry.amount),
        type: "despesa",
        status: entry.status,
        asaasLinked: !!entry.asaas_transaction_id,
        rawEntry: entry,
      });
    }

    return result.sort((a, b) => b.date.localeCompare(a.date));
  }, [invoices, expenseEntries, asaasTransactions, startDate, endDate]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filterType !== "all" && e.type !== filterType) return false;
      if (filterStatus !== "all" && e.status !== filterStatus) return false;
      if (search && !e.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [entries, filterType, filterStatus, search]);

  const totalReceita = entries.filter((e) => e.type === "receita" && e.status === "paid").reduce((s, e) => s + e.amount, 0);
  const totalDespesa = entries.filter((e) => e.type === "despesa" && e.status === "paid").reduce((s, e) => s + e.amount, 0);

  const unlinkdAsaas = asaasTransactions.filter((t) => !t.expense_entry_id && !t.invoice_id);

  async function handleLink() {
    if (!linkDialog || !linkTarget) return;
    setSaving(true);
    try {
      await onLinkTransaction(
        linkDialog.id,
        linkTarget.type === "expense" ? linkTarget.id : undefined,
        linkTarget.type === "invoice" ? linkTarget.id : undefined
      );
      setLinkDialog(null);
      setLinkTarget(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateEntry() {
    setSaving(true);
    try {
      await onCreateEntry(newEntryForm);
      setNewEntryDialog(false);
      setNewEntryForm({ description: "", amount: 0, date: "", status: "paid", category: "outros" });
    } finally {
      setSaving(false);
    }
  }

  const statusColor: Record<string, string> = {
    paid: "#22C55E",
    pending: "#F59E0B",
    overdue: "#EF4444",
    cancelled: "var(--text-tertiary)",
  };

  const statusLabel: Record<string, string> = {
    paid: "Pago",
    pending: "Pendente",
    overdue: "Vencido",
    cancelled: "Cancelado",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Totals bar */}
      <div className="responsive-grid-3" style={{ gap: "12px" }}>
        {[
          { label: "Receitas pagas", value: totalReceita, color: "#22C55E" },
          { label: "Despesas pagas", value: totalDespesa, color: "#EF4444" },
          { label: "Saldo do período", value: totalReceita - totalDespesa, color: totalReceita - totalDespesa >= 0 ? "var(--accent)" : "#EF4444" },
        ].map((item) => (
          <div key={item.label} className="glass-card" style={{ padding: "16px 20px" }}>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>{item.label}</p>
            <p style={{ fontSize: "1.4rem", fontWeight: 800, color: item.color }}>{formatCurrency(item.value)}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
          <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
          <input
            className="input-dark"
            style={{ width: "100%", paddingLeft: "34px" }}
            placeholder="Buscar lançamentos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ position: "relative" }}>
          <select className="input-dark" style={{ appearance: "none", paddingRight: "32px" }} value={filterType} onChange={(e) => setFilterType(e.target.value as FilterType)}>
            <option value="all">Todos os tipos</option>
            <option value="receita">Receitas</option>
            <option value="despesa">Despesas</option>
          </select>
          <ChevronDown size={13} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-secondary)" }} />
        </div>

        <div style={{ position: "relative" }}>
          <select className="input-dark" style={{ appearance: "none", paddingRight: "32px" }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}>
            <option value="all">Todos os status</option>
            <option value="paid">Pago</option>
            <option value="pending">Pendente</option>
            <option value="cancelled">Cancelado</option>
          </select>
          <ChevronDown size={13} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-secondary)" }} />
        </div>

        <button
          className="btn btn-secondary"
          onClick={() => setNewEntryDialog(true)}
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          <Plus size={15} /> Lançamento
        </button>

        <button
          className="btn btn-accent"
          onClick={() => {
            const activeStart = startDate || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;
            const activeEnd = endDate || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()).padStart(2, "0")}`;
            onSync(activeStart, activeEnd);
          }}
          disabled={syncing}
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Sincronizando..." : "Sincronizar Asaas"}
        </button>
      </div>

      {/* Asaas unlinked banner */}
      {unlinkdAsaas.length > 0 && (
        <div className="glass-card" style={{ padding: "14px 20px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontSize: "0.875rem", color: "#F59E0B", fontWeight: 600 }}>
            {unlinkdAsaas.length} transação(ões) do Asaas sem vínculo — veja na aba Asaas para reconciliar.
          </p>
        </div>
      )}

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Tipo</th>
              <th>Valor</th>
              <th>Status</th>
              <th>Asaas</th>
              <th style={{ textAlign: "right" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "40px", color: "var(--text-tertiary)" }}>
                  Nenhum lançamento encontrado para o período.
                </td>
              </tr>
            )}
            {filtered.map((entry, i) => (
              <motion.tr
                key={entry.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <td style={{ color: "var(--text-secondary)", fontSize: "0.875rem", whiteSpace: "nowrap" }}>
                  {new Date(`${entry.date}T12:00:00`).toLocaleDateString("pt-BR")}
                </td>
                <td style={{ fontWeight: 600, maxWidth: "240px" }}>
                  <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {entry.description}
                  </span>
                </td>
                <td>
                  <span className="badge" style={{ fontSize: "0.75rem" }}>
                    {CATEGORY_LABELS[entry.category] || entry.category}
                  </span>
                </td>
                <td>
                  <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.85rem", fontWeight: 700, color: entry.type === "receita" ? "#22C55E" : "#EF4444" }}>
                    {entry.type === "receita" ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {entry.type === "receita" ? "Receita" : "Despesa"}
                  </span>
                </td>
                <td style={{ fontWeight: 700, color: entry.type === "receita" ? "#22C55E" : "#EF4444" }}>
                  {entry.type === "despesa" ? "- " : "+ "}{formatCurrency(entry.amount)}
                </td>
                <td>
                  <span className="badge" style={{ color: statusColor[entry.status] || "var(--text-secondary)", background: `${statusColor[entry.status] || "var(--text-secondary)"}18`, border: `1px solid ${statusColor[entry.status] || "var(--text-secondary)"}30`, fontSize: "0.75rem" }}>
                    {statusLabel[entry.status] || entry.status}
                  </span>
                </td>
                <td>
                  {entry.asaasLinked ? (
                    <span style={{ color: "#22C55E", fontSize: "0.75rem", fontWeight: 700 }}>✓ Vinculado</span>
                  ) : (
                    <span style={{ color: "var(--text-tertiary)", fontSize: "0.75rem" }}>—</span>
                  )}
                </td>
                <td style={{ textAlign: "right" }}>
                  {entry.type === "receita" && entry.status !== "paid" && (
                    <button
                      onClick={() => {
                        const invoiceId = entry.id.replace("inv-", "");
                        onUpdateInvoiceStatus?.(invoiceId, "paid");
                      }}
                      style={{
                        color: "#22C55E",
                        background: "rgba(34, 197, 94, 0.1)",
                        border: "1px solid rgba(34, 197, 94, 0.2)",
                        borderRadius: "8px",
                        padding: "4px 10px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                      className="hover-accent"
                    >
                      Dar Baixa
                    </button>
                  )}
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
            Nenhum lançamento encontrado para o período.
          </p>
        )}
        {filtered.map((entry) => (
          <div key={entry.id} className="mobile-data-card">
            <div className="mobile-card-header">
              <span className="mobile-card-title">{entry.description}</span>
              <span
                className="badge"
                style={{
                  color: statusColor[entry.status] || "var(--text-secondary)",
                  background: `${statusColor[entry.status] || "var(--text-secondary)"}18`,
                  border: `1px solid ${statusColor[entry.status] || "var(--text-secondary)"}30`,
                  fontSize: "0.72rem",
                  flexShrink: 0,
                }}
              >
                {statusLabel[entry.status] || entry.status}
              </span>
            </div>
            <div className="mobile-card-row">
              <span>Tipo</span>
              <span style={{ fontWeight: 700, color: entry.type === "receita" ? "#22C55E" : "#EF4444" }}>
                {entry.type === "receita" ? "↑ Receita" : "↓ Despesa"}
              </span>
            </div>
            <div className="mobile-card-row">
              <span>Categoria</span>
              <span className="badge" style={{ fontSize: "0.72rem" }}>
                {CATEGORY_LABELS[entry.category] || entry.category}
              </span>
            </div>
            <div className="mobile-card-row">
              <span>Data</span>
              <span>{new Date(`${entry.date}T12:00:00`).toLocaleDateString("pt-BR")}</span>
            </div>
            <div className="mobile-card-row">
              <span>Valor</span>
              <strong style={{ color: entry.type === "receita" ? "#22C55E" : "#EF4444" }}>
                {entry.type === "despesa" ? "- " : "+ "}{formatCurrency(entry.amount)}
              </strong>
            </div>
            {entry.type === "receita" && entry.status !== "paid" && (
              <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px dashed var(--border)" }}>
                <button
                  onClick={() => {
                    const invoiceId = entry.id.replace("inv-", "");
                    onUpdateInvoiceStatus?.(invoiceId, "paid");
                  }}
                  style={{
                    color: "#22C55E",
                    background: "rgba(34, 197, 94, 0.1)",
                    border: "1px solid rgba(34, 197, 94, 0.2)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    width: "100%",
                    textAlign: "center"
                  }}
                >
                  Confirmar Recebimento (Dar Baixa)
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* New entry dialog */}
      <DialogShell
        isOpen={newEntryDialog}
        onClose={() => setNewEntryDialog(false)}
        title="Novo Lançamento de Saída"
        maxWidth="480px"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button className="btn btn-secondary" onClick={() => setNewEntryDialog(false)}>Cancelar</button>
            <button className="btn btn-accent" onClick={handleCreateEntry} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Descrição *</label>
            <input className="input-dark" style={{ width: "100%" }} placeholder="ex: Pagamento fornecedor" value={newEntryForm.description || ""} onChange={(e) => setNewEntryForm({ ...newEntryForm, description: e.target.value })} />
          </div>
          <div className="responsive-grid-2" style={{ gap: "12px" }}>
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Valor (R$) *</label>
              <input className="input-dark" style={{ width: "100%" }} type="number" min="0" step="0.01" value={newEntryForm.amount || ""} onChange={(e) => setNewEntryForm({ ...newEntryForm, amount: Number(e.target.value) })} />
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Data *</label>
              <input className="input-dark" style={{ width: "100%" }} type="date" value={newEntryForm.date || ""} onChange={(e) => setNewEntryForm({ ...newEntryForm, date: e.target.value })} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Categoria</label>
            <div style={{ position: "relative" }}>
              <select className="input-dark" style={{ width: "100%", appearance: "none" }} value={newEntryForm.category || "outros"} onChange={(e) => setNewEntryForm({ ...newEntryForm, category: e.target.value as ExpenseCategory })}>
                {Object.entries(CATEGORY_LABELS).filter(([k]) => k !== "receita").map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <ChevronDown size={13} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-secondary)" }} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Observações</label>
            <textarea className="input-dark" style={{ width: "100%", minHeight: "60px", resize: "vertical" }} value={newEntryForm.notes || ""} onChange={(e) => setNewEntryForm({ ...newEntryForm, notes: e.target.value })} />
          </div>
        </div>
      </DialogShell>

      {/* Link dialog */}
      <DialogShell
        isOpen={!!linkDialog}
        onClose={() => { setLinkDialog(null); setLinkTarget(null); }}
        title="Vincular Transação Asaas"
        maxWidth="480px"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button className="btn btn-secondary" onClick={() => { setLinkDialog(null); setLinkTarget(null); }}>Cancelar</button>
            <button className="btn btn-accent" onClick={handleLink} disabled={saving || !linkTarget}>{saving ? "Vinculando..." : "Vincular"}</button>
          </div>
        }
      >
        {linkDialog && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="glass-card" style={{ padding: "14px", background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Transação Asaas</p>
              <p style={{ fontWeight: 700 }}>{linkDialog.description || linkDialog.id}</p>
              <p style={{ color: linkDialog.type === "CREDIT" ? "#22C55E" : "#EF4444", fontWeight: 800, fontSize: "1.1rem" }}>
                {linkDialog.type === "DEBIT" ? "- " : "+ "}{formatCurrency(Number(linkDialog.value))}
              </p>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{new Date(`${linkDialog.date}T12:00:00`).toLocaleDateString("pt-BR")}</p>
            </div>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Selecione o lançamento para vincular esta transação:</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "240px", overflowY: "auto" }}>
              {expenseEntries.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setLinkTarget({ type: "expense", id: e.id })}
                  style={{
                    padding: "10px 14px",
                    background: linkTarget?.id === e.id ? "rgba(var(--accent-rgb),0.1)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${linkTarget?.id === e.id ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: "12px",
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    color: "var(--text-primary)",
                  }}
                >
                  <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>{e.description}</span>
                  <span style={{ fontWeight: 700, color: "#EF4444" }}>{formatCurrency(Number(e.amount))}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogShell>
    </div>
  );
}
