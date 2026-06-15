"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, RefreshCw, Search, ChevronDown, Link2, Plus, Check, ExternalLink } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import DialogShell from "@/components/DialogShell";
import type { Invoice, ExpenseEntry, AsaasTransaction, ExpenseCategory } from "@/types/database";

const CATEGORY_LABELS: Record<string, string> = {
  pro_labore: "Pro-labore",
  funcionario_pj: "Funcionário PJ",
  sistema: "Sistema/Software",
  internet: "Internet/Infra",
  taxa_asaas: "Taxas Asaas",
  taxa_boleto: "Taxa de Boleto",
  taxa_mensageria: "Taxa de Mensageria",
  outros: "Outros",
};

function parseInvoiceDescription(raw: string): { categoryLabel: string; description: string } {
  const colonIdx = raw.indexOf(': ');
  if (colonIdx > 0) {
    return { categoryLabel: raw.slice(0, colonIdx), description: raw.slice(colonIdx + 2) };
  }
  return { categoryLabel: 'Avulso', description: raw };
}

type FilterType = "all" | "receita" | "despesa";
type FilterStatus = "all" | "paid" | "pending" | "cancelled";

interface LancamentosTableProps {
  invoices: Invoice[];
  expenseEntries: ExpenseEntry[];
  asaasTransactions: AsaasTransaction[];
  clients: { id: string; name: string; nome_fantasia?: string }[];
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
  clientName?: string;
  categoryLabel: string;
  amount: number;
  type: "receita" | "despesa";
  status: string;
  asaasLinked: boolean;
  asaasTransactionId?: string;
  rawInvoice?: Invoice;
  rawEntry?: ExpenseEntry;
}

export function LancamentosTable({
  invoices,
  expenseEntries,
  asaasTransactions,
  clients,
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
  const [expenseLinkDialog, setExpenseLinkDialog] = useState<UnifiedEntry | null>(null);
  const [selectedTxnIds, setSelectedTxnIds] = useState<Set<string>>(new Set());
  const [linkingExpense, setLinkingExpense] = useState(false);
  const [newEntryDialog, setNewEntryDialog] = useState(false);
  const [newEntryForm, setNewEntryForm] = useState<Partial<ExpenseEntry>>({ description: "", amount: 0, date: "", status: "paid", category: "outros" });
  const [saving, setSaving] = useState(false);
  const [openingAsaas, setOpeningAsaas] = useState<string | null>(null);

  const openAsaasLink = async (asaasId: string) => {
    setOpeningAsaas(asaasId);
    try {
      const res = await fetch(`/api/financeiro/asaas/payment/${asaasId}`);
      const payment = await res.json();
      const url = payment.invoiceUrl || payment.bankSlipUrl;
      if (url) window.open(url, '_blank', 'noopener');
    } catch {
      // silently fail — URL not available
    } finally {
      setOpeningAsaas(null);
    }
  };

  const entries = useMemo<UnifiedEntry[]>(() => {
    const result: UnifiedEntry[] = [];

    for (const inv of invoices) {
      const d = inv.due_date.split("T")[0];
      if (startDate && d < startDate) continue;
      if (endDate && d > endDate) continue;
      const client = clients.find((c) => c.id === inv.client_id);
      const linkedTxn = asaasTransactions.find((t) => t.invoice_id === inv.id);
      const parsed = parseInvoiceDescription(inv.description);
      result.push({
        id: `inv-${inv.id}`,
        date: d,
        description: parsed.description,
        clientName: client?.nome_fantasia || client?.name,
        categoryLabel: parsed.categoryLabel,
        amount: Number(inv.amount),
        type: "receita",
        status: inv.status,
        asaasLinked: !!linkedTxn,
        asaasTransactionId: linkedTxn?.id,
        rawInvoice: inv,
      });
    }

    for (const entry of expenseEntries) {
      const d = entry.date.split("T")[0];
      if (startDate && d < startDate) continue;
      if (endDate && d > endDate) continue;
      const linkedTxns = asaasTransactions.filter((t) => t.expense_entry_id === entry.id);
      const cat = entry.category || "outros";
      result.push({
        id: `exp-${entry.id}`,
        date: d,
        description: entry.description,
        categoryLabel: CATEGORY_LABELS[cat] || cat,
        amount: Number(entry.amount),
        type: "despesa",
        status: entry.status,
        asaasLinked: linkedTxns.length > 0 || !!entry.asaas_transaction_id,
        asaasTransactionId: entry.asaas_transaction_id || linkedTxns[0]?.id,
        rawEntry: entry,
      });
    }

    return result.sort((a, b) => b.date.localeCompare(a.date));
  }, [invoices, expenseEntries, asaasTransactions, clients, startDate, endDate]);

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
  const unlinkedDebits = asaasTransactions.filter((t) => t.type === "DEBIT" && !t.expense_entry_id && !t.invoice_id);

  const selectedTxnsTotal = useMemo(
    () => unlinkedDebits.filter((t) => selectedTxnIds.has(t.id)).reduce((s, t) => s + Number(t.value), 0),
    [unlinkedDebits, selectedTxnIds]
  );

  function openExpenseLink(entry: UnifiedEntry) {
    setExpenseLinkDialog(entry);
    setSelectedTxnIds(new Set());
  }

  function toggleTxnSelection(id: string) {
    setSelectedTxnIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleExpenseLink() {
    if (!expenseLinkDialog || selectedTxnIds.size === 0) return;
    const entryId = expenseLinkDialog.id.replace("exp-", "");
    setLinkingExpense(true);
    try {
      for (const txnId of selectedTxnIds) {
        await onLinkTransaction(txnId, entryId, undefined);
      }
      if (selectedTxnsTotal >= expenseLinkDialog.amount && expenseLinkDialog.status !== "paid") {
        await onUpdateEntry(entryId, { status: "paid" });
      }
      setExpenseLinkDialog(null);
      setSelectedTxnIds(new Set());
    } finally {
      setLinkingExpense(false);
    }
  }

  async function handleMarkExpensePaid(entry: UnifiedEntry) {
    const entryId = entry.id.replace("exp-", "");
    await onUpdateEntry(entryId, { status: "paid" });
  }

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
              <th style={{ width: "72px" }}>Data</th>
              <th>Descrição</th>
              <th>Categoria</th>
              <th style={{ textAlign: "right" }}>Valor</th>
              <th style={{ width: "80px" }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "40px", color: "var(--text-tertiary)" }}>
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
                {/* Data */}
                <td style={{ color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: 500, whiteSpace: "nowrap" }}>
                  {(() => {
                    const parts = entry.date.split("-");
                    return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : entry.date;
                  })()}
                </td>

                {/* Descrição + cliente + status */}
                <td style={{ maxWidth: "280px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {entry.description}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {entry.clientName && (
                        <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {entry.clientName}
                        </span>
                      )}
                      <span
                        className="badge"
                        style={{
                          fontSize: "0.68rem",
                          padding: "1px 6px",
                          color: statusColor[entry.status] || "var(--text-secondary)",
                          background: `${statusColor[entry.status] || "var(--text-secondary)"}18`,
                          border: `1px solid ${statusColor[entry.status] || "var(--text-secondary)"}30`,
                          flexShrink: 0,
                        }}
                      >
                        {statusLabel[entry.status] || entry.status}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Categoria */}
                <td>
                  <span className="badge" style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                    {entry.categoryLabel}
                  </span>
                </td>

                {/* Valor alinhado à direita */}
                <td style={{ textAlign: "right", fontWeight: 700, fontSize: "0.9rem", color: entry.type === "receita" ? "#22C55E" : "#EF4444", whiteSpace: "nowrap" }}>
                  {entry.type === "despesa" ? "−" : "+"} {formatCurrency(entry.amount)}
                </td>

                {/* Ações compactas: Asaas + Baixar */}
                <td style={{ textAlign: "right" }}>
                  <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "4px" }}>
                    {/* Asaas */}
                    {entry.asaasLinked ? (
                      <button
                        onClick={() => entry.asaasTransactionId && openAsaasLink(entry.asaasTransactionId)}
                        disabled={openingAsaas === entry.asaasTransactionId}
                        title="Abrir no Asaas"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#22C55E", padding: "4px", display: "flex" }}
                      >
                        {openingAsaas === entry.asaasTransactionId
                          ? <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} />
                          : <ExternalLink size={14} />
                        }
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (entry.type === "despesa") openExpenseLink(entry);
                          else {
                            const txn = asaasTransactions.find((t) => !t.expense_entry_id && !t.invoice_id);
                            if (txn) setLinkDialog(txn);
                          }
                        }}
                        title="Vincular Asaas"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#F59E0B", padding: "4px", display: "flex" }}
                      >
                        <Link2 size={14} />
                      </button>
                    )}

                    {/* Dar Baixa */}
                    {((entry.type === "receita" && entry.status !== "paid") ||
                      (entry.type === "despesa" && entry.status === "pending")) && (
                      <button
                        onClick={() => {
                          if (entry.type === "receita") onUpdateInvoiceStatus?.(entry.id.replace("inv-", ""), "paid");
                          else handleMarkExpensePaid(entry);
                        }}
                        title="Dar Baixa"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#22C55E", padding: "4px", display: "flex" }}
                      >
                        <Check size={14} />
                      </button>
                    )}
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
            Nenhum lançamento encontrado para o período.
          </p>
        )}
        {filtered.map((entry) => (
          <div key={entry.id} className="mobile-data-card" style={{ padding: "12px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: "block", fontWeight: 600, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {entry.description}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}>
                    {(() => {
                      const parts = entry.date.split("-");
                      return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : entry.date;
                    })()}
                  </span>
                  {entry.clientName && (
                    <>
                      <span style={{ fontSize: "0.65rem", color: "var(--text-tertiary)" }}>·</span>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.clientName}</span>
                    </>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
                <span style={{ fontWeight: 700, fontSize: "0.9rem", color: entry.type === "receita" ? "#22C55E" : "#EF4444" }}>
                  {entry.type === "despesa" ? "−" : "+"} {formatCurrency(entry.amount)}
                </span>
                <span className="badge" style={{ fontSize: "0.65rem", padding: "1px 6px", color: statusColor[entry.status] || "var(--text-secondary)", background: `${statusColor[entry.status] || "var(--text-secondary)"}18`, border: `1px solid ${statusColor[entry.status] || "var(--text-secondary)"}30` }}>
                  {statusLabel[entry.status] || entry.status}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
              <span className="badge" style={{ fontSize: "0.7rem", padding: "2px 8px" }}>{entry.categoryLabel}</span>
              <div style={{ display: "flex", gap: "4px" }}>
                {entry.asaasLinked ? (
                  <button onClick={() => entry.asaasTransactionId && openAsaasLink(entry.asaasTransactionId)} style={{ background: "none", border: "none", cursor: "pointer", color: "#22C55E", padding: "4px", display: "flex" }} title="Asaas">
                    <ExternalLink size={13} />
                  </button>
                ) : (
                  <button
                    onClick={() => { if (entry.type === "despesa") openExpenseLink(entry); else { const txn = asaasTransactions.find((t) => !t.expense_entry_id && !t.invoice_id); if (txn) setLinkDialog(txn); } }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#F59E0B", padding: "4px", display: "flex" }} title="Vincular Asaas"
                  >
                    <Link2 size={13} />
                  </button>
                )}
                {((entry.type === "receita" && entry.status !== "paid") || (entry.type === "despesa" && entry.status === "pending")) && (
                  <button
                    onClick={() => { if (entry.type === "receita") onUpdateInvoiceStatus?.(entry.id.replace("inv-", ""), "paid"); else handleMarkExpensePaid(entry); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#22C55E", padding: "4px", display: "flex" }} title="Dar Baixa"
                  >
                    <Check size={13} />
                  </button>
                )}
              </div>
            </div>
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

      {/* Dialog vincular múltiplos débitos Asaas a uma despesa */}
      <DialogShell
        isOpen={!!expenseLinkDialog}
        onClose={() => { setExpenseLinkDialog(null); setSelectedTxnIds(new Set()); }}
        title="Vincular Pagamentos Asaas à Despesa"
        maxWidth="500px"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button className="btn btn-secondary" onClick={() => { setExpenseLinkDialog(null); setSelectedTxnIds(new Set()); }}>Cancelar</button>
            <button
              className="btn btn-accent"
              onClick={handleExpenseLink}
              disabled={linkingExpense || selectedTxnIds.size === 0}
            >
              {linkingExpense ? "Vinculando..." : `Vincular${selectedTxnIds.size > 0 ? ` ${selectedTxnIds.size} transação(ões)` : ""}`}
            </button>
          </div>
        }
      >
        {expenseLinkDialog && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="glass-card" style={{ padding: "14px", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "2px" }}>Despesa</p>
              <p style={{ fontWeight: 700 }}>{expenseLinkDialog.description}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                <p style={{ fontWeight: 800, color: "#EF4444", fontSize: "1.1rem" }}>
                  {formatCurrency(expenseLinkDialog.amount)}
                </p>
                {selectedTxnIds.size > 0 && (
                  <p style={{ fontSize: "0.82rem", fontWeight: 600, color: selectedTxnsTotal >= expenseLinkDialog.amount ? "#22C55E" : "#F59E0B" }}>
                    Selecionado: {formatCurrency(selectedTxnsTotal)}
                    {selectedTxnsTotal >= expenseLinkDialog.amount && " ✓"}
                  </p>
                )}
              </div>
            </div>

            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              Selecione os pagamentos PIX/débitos do Asaas que correspondem a esta despesa:
            </p>

            {unlinkedDebits.length === 0 ? (
              <p style={{ fontSize: "0.875rem", color: "var(--text-tertiary)", textAlign: "center", padding: "20px" }}>
                Nenhuma transação de débito sem vínculo. Sincronize o Asaas primeiro.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "280px", overflowY: "auto" }}>
                {unlinkedDebits.map((txn) => {
                  const selected = selectedTxnIds.has(txn.id);
                  return (
                    <button
                      key={txn.id}
                      onClick={() => toggleTxnSelection(txn.id)}
                      style={{
                        padding: "10px 14px",
                        background: selected ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.02)",
                        border: `1px solid ${selected ? "rgba(239,68,68,0.4)" : "var(--border)"}`,
                        borderRadius: "12px",
                        cursor: "pointer",
                        textAlign: "left",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        color: "var(--text-primary)",
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>{txn.description || "Transferência"}</span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                          {new Date(`${txn.date}T12:00:00`).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontWeight: 700, color: "#EF4444" }}>- {formatCurrency(Number(txn.value))}</span>
                        {selected && (
                          <span style={{ width: "18px", height: "18px", borderRadius: "50%", background: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Check size={11} color="#fff" />
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedTxnsTotal >= expenseLinkDialog.amount && expenseLinkDialog.status !== "paid" && (
              <div style={{ padding: "10px 14px", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "10px" }}>
                <p style={{ fontSize: "0.82rem", color: "#22C55E", fontWeight: 600 }}>
                  A soma cobre o valor da despesa — a fatura será baixada automaticamente ao vincular.
                </p>
              </div>
            )}
          </div>
        )}
      </DialogShell>

      {/* Link dialog (receita) */}
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
