"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  RefreshCw, Link2, CheckCircle2, AlertCircle, Wallet,
  Sparkles, User, Building2, X, Search, Unlink,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import DialogShell from "@/components/DialogShell";
import { AsaasLinkDialog } from "@/components/financeiro/AsaasLinkDialog";
import type { AsaasTransaction, ExpenseEntry, Invoice, Expense } from "@/types/database";

interface AsaasBalance {
  balance: number;
  availableBalance: number;
}

interface AsaasSyncProps {
  asaasTransactions: AsaasTransaction[];
  expenseEntries: ExpenseEntry[];
  invoices: Invoice[];
  expenses: Expense[];
  clients: { id: string; name: string; nome_fantasia?: string }[];
  users: { id: string; name: string }[];
  syncing: boolean;
  onSync: (startDate: string, endDate: string) => Promise<{ imported: number; skipped: number } | void>;
  onLink: (asaasId: string, expenseEntryId?: string, invoiceId?: string) => Promise<void>;
  onUnlink: (asaasId: string) => Promise<void>;
  onCreateEntry: (data: Partial<ExpenseEntry>) => Promise<ExpenseEntry | null>;
  onUpdateInvoiceStatus?: (id: string, status: string) => Promise<void>;
  selectedMonth: string;
  startDate?: string;
  endDate?: string;
  balance?: AsaasBalance | null;
  onRefreshBalance?: () => Promise<void>;
}

type AutoLinkMatch = { txn: AsaasTransaction; invoice: Invoice };

export function AsaasSync({
  asaasTransactions,
  expenseEntries,
  invoices,
  expenses,
  clients,
  users,
  syncing,
  onSync,
  onLink,
  onUnlink,
  onCreateEntry,
  onUpdateInvoiceStatus,
  selectedMonth,
  startDate: filterStart,
  endDate: filterEnd,
  balance,
  onRefreshBalance,
}: AsaasSyncProps) {
  const [lastSyncResult, setLastSyncResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "linked" | "unlinked">("all");
  const [search, setSearch] = useState("");
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  async function handleUnlink(txnId: string) {
    if (!confirm("Desfazer este vínculo? O lançamento volta a Pendente/Parcial conforme o restante.")) return;
    setUnlinkingId(txnId);
    try {
      await onUnlink(txnId);
    } finally {
      setUnlinkingId(null);
    }
  }

  // Advanced link dialog
  const [linkDialogTxn, setLinkDialogTxn] = useState<AsaasTransaction | null>(null);
  const [linking, setLinking] = useState(false);

  // Batch selection
  const [selectedBatch, setSelectedBatch] = useState<Set<string>>(new Set());

  // Auto-link
  const [autoLinkMatches, setAutoLinkMatches] = useState<AutoLinkMatch[]>([]);
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(new Set());
  const [showAutoLinkPanel, setShowAutoLinkPanel] = useState(false);
  const [autoLinking, setAutoLinking] = useState(false);

  const [refreshingBalance, setRefreshingBalance] = useState(false);
  const [hoveredVinculo, setHoveredVinculo] = useState<string | null>(null);

  const [year, month] = selectedMonth.split("-");
  const startDate = `${year}-${month}-01`;
  const lastDay = new Date(Number(year), Number(month), 0).getDate();
  const endDate = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;

  async function handleSync() {
    const result = await onSync(startDate, endDate);
    if (result) setLastSyncResult(result as { imported: number; skipped: number });
  }

  async function handleSync2025() {
    const result = await onSync("2025-01-01", "2025-12-31");
    if (result) setLastSyncResult(result as { imported: number; skipped: number });
  }

  async function handleRefreshBalance() {
    if (!onRefreshBalance) return;
    setRefreshingBalance(true);
    try { await onRefreshBalance(); } finally { setRefreshingBalance(false); }
  }

  function openAutoLink() {
    const unlinkedCredits = asaasTransactions.filter((t) => t.type === "CREDIT" && !t.invoice_id && !t.expense_entry_id);
    const pendingInvoices = invoices.filter((i) => i.status !== "paid");
    const usedInvoiceIds = new Set<string>();
    const matches: AutoLinkMatch[] = [];

    for (const txn of unlinkedCredits) {
      const txnMonth = txn.date.substring(0, 7);
      const match = pendingInvoices.find(
        (inv) =>
          !usedInvoiceIds.has(inv.id) &&
          Math.abs(Number(inv.amount) - Number(txn.value)) < 0.02 &&
          inv.due_date.substring(0, 7) === txnMonth
      );
      if (match) {
        usedInvoiceIds.add(match.id);
        matches.push({ txn, invoice: match });
      }
    }

    setAutoLinkMatches(matches);
    setSelectedMatchIds(new Set(matches.map((m) => m.txn.id)));
    setShowAutoLinkPanel(true);
  }

  async function handleConfirmAutoLink() {
    setAutoLinking(true);
    try {
      const selected = autoLinkMatches.filter((m) => selectedMatchIds.has(m.txn.id));
      for (const { txn, invoice } of selected) {
        await onLink(txn.id, undefined, invoice.id);
        await onUpdateInvoiceStatus?.(invoice.id, "paid");
      }
      setShowAutoLinkPanel(false);
    } finally {
      setAutoLinking(false);
    }
  }

  // Handle single link from AsaasLinkDialog
  async function handleLinkConfirm(target: { kind: string; id?: string; groupId?: string; label: string }) {
    if (!linkDialogTxn) return;
    setLinking(true);
    try {
      if (target.kind === "invoice") {
        await onLink(linkDialogTxn.id, undefined, target.id);
      } else if (target.kind === "expense_entry") {
        await onLink(linkDialogTxn.id, target.id, undefined);
      }
      setLinkDialogTxn(null);
    } finally {
      setLinking(false);
    }
  }

  // Create variable entry and return it for linking
  async function handleCreateVariableEntry(groupId: string, amount: number, date: string): Promise<ExpenseEntry | null> {
    const group = expenses.find((e) => e.id === groupId);
    if (!group) return null;
    return onCreateEntry({
      expense_id: groupId,
      description: group.description,
      category: group.category,
      amount,
      date,
      status: "pending",
    });
  }

  // Batch link
  async function handleBatchLink(target: { kind: string; id?: string; groupId?: string; label: string }) {
    setLinking(true);
    try {
      for (const txnId of selectedBatch) {
        const txn = asaasTransactions.find((t) => t.id === txnId);
        if (!txn) continue;
        if (target.kind === "variable_group") {
          const group = expenses.find((e) => e.id === target.groupId);
          if (!group) continue;
          const entry = await onCreateEntry({
            expense_id: target.groupId,
            description: group.description,
            category: group.category,
            amount: Number(txn.value),
            date: txn.date,
            status: "pending",
          });
          if (entry) await onLink(txnId, entry.id, undefined);
        } else if (target.kind === "expense_entry" && target.id) {
          await onLink(txnId, target.id, undefined);
        } else if (target.kind === "invoice" && target.id) {
          await onLink(txnId, undefined, target.id);
        }
      }
      setSelectedBatch(new Set());
      setLinkDialogTxn(null);
    } finally {
      setLinking(false);
    }
  }

  const [batchLinkOpen, setBatchLinkOpen] = useState(false);

  function toggleBatch(id: string) {
    setSelectedBatch((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // Derive responsible for a transaction
  function resolveResponsible(txn: AsaasTransaction): { kind: "cliente" | "funcionario" | "empresa"; label: string } {
    if (txn.invoice_id) {
      const inv = invoices.find((i) => i.id === txn.invoice_id);
      if (inv) {
        const client = clients.find((c) => c.id === inv.client_id);
        return { kind: "cliente", label: client?.nome_fantasia || client?.name || "Cliente" };
      }
    }
    if (txn.expense_entry_id) {
      const entry = expenseEntries.find((e) => e.id === txn.expense_entry_id);
      if (entry?.expense_id) {
        const parentExpense = expenses.find((ex) => ex.id === entry.expense_id);
        if (parentExpense?.related_user_id) {
          const user = users.find((u) => u.id === parentExpense.related_user_id);
          if (user) return { kind: "funcionario", label: user.name.split(" ").slice(0, 2).join(" ") };
        }
      }
    }
    return { kind: "empresa", label: "Empresa" };
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return asaasTransactions
      .filter((t) => {
        const d = t.date.split("T")[0];
        if (filterStart && d < filterStart) return false;
        if (filterEnd && d > filterEnd) return false;
        if (filterStatus === "linked" && !(t.expense_entry_id || t.invoice_id)) return false;
        if (filterStatus === "unlinked" && (t.expense_entry_id || t.invoice_id)) return false;
        if (q) {
          const label = resolveResponsible(t).label.toLowerCase();
          if (!(t.description || "").toLowerCase().includes(q) && !label.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asaasTransactions, filterStatus, filterStart, filterEnd, search, invoices, clients, expenseEntries, expenses, users]);

  // Totalizadores do período (ignora busca e filtro de vínculo)
  const periodTotals = useMemo(() => {
    let entrou = 0, saiu = 0;
    for (const t of asaasTransactions) {
      const d = t.date.split("T")[0];
      if (filterStart && d < filterStart) continue;
      if (filterEnd && d > filterEnd) continue;
      if (t.type === "CREDIT") entrou += Number(t.value);
      else saiu += Number(t.value);
    }
    return { entrou, saiu, saldo: entrou - saiu };
  }, [asaasTransactions, filterStart, filterEnd]);

  const unlinkedCount = asaasTransactions.filter((t) => !t.expense_entry_id && !t.invoice_id).length;
  const batchTotal = useMemo(() => {
    return asaasTransactions.filter((t) => selectedBatch.has(t.id)).reduce((s, t) => s + Number(t.value), 0);
  }, [asaasTransactions, selectedBatch]);

  // Fake transaction shape for batch link dialog
  const batchFakeTxn = selectedBatch.size > 0 ? {
    id: "__batch__",
    description: `${selectedBatch.size} transações selecionadas`,
    value: batchTotal,
    type: "DEBIT" as const,
    date: new Date().toISOString().split("T")[0],
  } : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Balance cards */}
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "stretch" }}>
        {[
          { label: "Saldo Total", value: balance?.balance ?? null, color: "#60A5FA", bg: "rgba(96,165,250,0.06)", border: "rgba(96,165,250,0.15)" },
          {
            label: "Saldo Disponível", value: balance?.availableBalance ?? null,
            color: balance?.availableBalance != null ? (balance.availableBalance >= 0 ? "#22C55E" : "#EF4444") : "#60A5FA",
            bg: balance?.availableBalance != null ? (balance.availableBalance >= 0 ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)") : "rgba(255,255,255,0.02)",
            border: balance?.availableBalance != null ? (balance.availableBalance >= 0 ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)") : "var(--border)",
          },
        ].map((card) => (
          <div key={card.label} className="glass-card" style={{ padding: "20px 24px", flex: "1 1 200px", background: card.bg, border: `1px solid ${card.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <Wallet size={15} color={card.color} />
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{card.label}</span>
            </div>
            <span style={{ fontSize: "1.6rem", fontWeight: 800, color: card.color, letterSpacing: "-0.02em" }}>
              {card.value != null ? formatCurrency(card.value) : <span style={{ fontSize: "0.9rem", color: "var(--text-tertiary)", fontWeight: 600 }}>—</span>}
            </span>
          </div>
        ))}
        <button onClick={handleRefreshBalance} disabled={refreshingBalance} className="btn btn-secondary"
          style={{ alignSelf: "center", display: "flex", alignItems: "center", gap: "7px", whiteSpace: "nowrap" }}>
          <RefreshCw size={14} className={refreshingBalance ? "animate-spin" : ""} /> Atualizar Saldo
        </button>
      </div>

      {/* Totalizadores do período */}
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "stretch" }}>
        {[
          { label: "Entrou", value: periodTotals.entrou, color: "#22C55E", bg: "rgba(34,197,94,0.06)", border: "rgba(34,197,94,0.15)" },
          { label: "Saiu", value: periodTotals.saiu, color: "#EF4444", bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.15)" },
          {
            label: "Saldo do período", value: periodTotals.saldo,
            color: periodTotals.saldo >= 0 ? "#22C55E" : "#EF4444",
            bg: periodTotals.saldo >= 0 ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)",
            border: periodTotals.saldo >= 0 ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
          },
        ].map((card) => (
          <div key={card.label} className="glass-card" style={{ padding: "16px 22px", flex: "1 1 180px", background: card.bg, border: `1px solid ${card.border}` }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{card.label}</span>
            <p style={{ fontSize: "1.4rem", fontWeight: 800, color: card.color, letterSpacing: "-0.02em", marginTop: "6px" }}>
              {card.label === "Saiu" ? "− " : card.label === "Entrou" ? "+ " : ""}{formatCurrency(Math.abs(card.value))}
            </p>
          </div>
        ))}
      </div>

      {/* Sync control */}
      <div className="glass-card" style={{ padding: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: "6px" }}>Sincronização com Asaas</h3>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            Importa transações do extrato bancário do Asaas. Transações já importadas são ignoradas.
          </p>
          {lastSyncResult && (
            <div style={{ marginTop: "10px", display: "flex", gap: "16px" }}>
              <span style={{ fontSize: "0.8rem", color: "#22C55E", fontWeight: 700 }}>✓ {lastSyncResult.imported} importadas</span>
              <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", fontWeight: 600 }}>{lastSyncResult.skipped} já existiam</span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button className="btn btn-accent" onClick={handleSync} disabled={syncing} style={{ display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}>
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Sincronizando..." : `Sincronizar ${month}/${year}`}
          </button>
          <button className="btn btn-secondary" onClick={handleSync2025} disabled={syncing} style={{ display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}>
            <RefreshCw size={16} /> Sincronizar 2025
          </button>
          <button className="btn btn-secondary" onClick={openAutoLink} style={{ display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}>
            <Sparkles size={16} /> Auto-vincular
          </button>
        </div>
      </div>

      {/* Alert */}
      {unlinkedCount > 0 && (
        <div className="glass-card" style={{ padding: "14px 20px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", display: "flex", alignItems: "center", gap: "12px" }}>
          <AlertCircle size={18} color="#F59E0B" />
          <p style={{ fontSize: "0.875rem", color: "#F59E0B", fontWeight: 600 }}>
            {unlinkedCount} transação(ões) sem vínculo.
          </p>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: "180px" }}>
          <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
          <input
            className="input-dark"
            style={{ width: "100%", paddingLeft: "34px" }}
            placeholder="Buscar por cliente ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {[{ value: "all", label: "Todas" }, { value: "unlinked", label: `Sem vínculo (${unlinkedCount})` }, { value: "linked", label: "Vinculadas" }].map((opt) => (
          <button key={opt.value} onClick={() => setFilterStatus(opt.value as typeof filterStatus)}
            className={`btn ${filterStatus === opt.value ? "btn-accent" : "btn-secondary"}`}
            style={{ fontSize: "0.8rem", padding: "6px 14px" }}>
            {opt.label}
          </button>
        ))}
        {selectedBatch.size > 0 && (
          <button className="btn btn-secondary" onClick={() => setSelectedBatch(new Set())} style={{ fontSize: "0.8rem", padding: "6px 10px", color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: "5px" }}>
            <X size={12} /> Limpar seleção
          </button>
        )}
      </div>

      {/* Floating batch bar */}
      {selectedBatch.size > 0 && (
        <div style={{
          position: "sticky", bottom: "20px", zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px", borderRadius: "16px",
          background: "var(--bg-secondary)", border: "1px solid var(--accent)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}>
          <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>
            {selectedBatch.size} selecionada{selectedBatch.size !== 1 ? "s" : ""} · {formatCurrency(batchTotal)}
          </span>
          <button
            className="btn btn-accent"
            onClick={() => setBatchLinkOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Link2 size={14} /> Vincular em lote
          </button>
        </div>
      )}

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: "36px" }}></th>
              <th style={{ width: "90px" }}>Data</th>
              <th style={{ width: "150px" }}>Cliente</th>
              <th>Descrição</th>
              <th style={{ width: "90px" }}>Tipo</th>
              <th style={{ textAlign: "right", width: "120px" }}>Valor</th>
              <th style={{ width: "130px" }}>Vínculo</th>
              <th style={{ width: "60px" }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "48px", color: "var(--text-tertiary)" }}>
                  {asaasTransactions.length === 0 ? "Nenhuma transação importada. Clique em Sincronizar." : "Nenhuma transação neste filtro."}
                </td>
              </tr>
            )}
            {filtered.map((txn, i) => {
              const isLinked = !!(txn.expense_entry_id || txn.invoice_id);
              const linkedEntry = txn.expense_entry_id ? expenseEntries.find((e) => e.id === txn.expense_entry_id) : null;
              const linkedInvoice = txn.invoice_id ? invoices.find((inv) => inv.id === txn.invoice_id) : null;
              const linkedLabel = linkedEntry?.description || linkedInvoice?.description || null;
              const responsible = resolveResponsible(txn);
              const isBatchSelected = selectedBatch.has(txn.id);

              return (
                <motion.tr
                  key={txn.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.015 }}
                  style={{ background: isBatchSelected ? "rgba(217,72,15,0.06)" : undefined }}
                >
                  {/* Checkbox */}
                  <td>
                    {!isLinked && (
                      <input
                        type="checkbox"
                        checked={isBatchSelected}
                        onChange={() => toggleBatch(txn.id)}
                        style={{ width: "15px", height: "15px", cursor: "pointer", accentColor: "var(--accent)" }}
                      />
                    )}
                  </td>

                  {/* Data */}
                  <td style={{ color: "var(--text-secondary)", fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                    {new Date(`${txn.date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                  </td>

                  {/* Cliente */}
                  <td>
                    <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.82rem", color: responsible.kind === "empresa" ? "var(--text-tertiary)" : "var(--text-secondary)", fontWeight: 600 }}>
                      {responsible.kind === "funcionario" && <User size={11} />}
                      {responsible.kind === "cliente" && <Building2 size={11} />}
                      {responsible.kind === "empresa" ? "—" : responsible.label}
                    </span>
                  </td>

                  {/* Descrição */}
                  <td style={{ maxWidth: "240px" }}>
                    <p style={{ fontWeight: 600, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {txn.description || "—"}
                    </p>
                  </td>

                  {/* Tipo */}
                  <td>
                    <span className="badge" style={{
                      color: txn.type === "CREDIT" ? "#22C55E" : "#EF4444",
                      background: txn.type === "CREDIT" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                      border: `1px solid ${txn.type === "CREDIT" ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
                      fontSize: "0.75rem",
                    }}>
                      {txn.type === "CREDIT" ? "Receita" : "Despesa"}
                    </span>
                  </td>

                  {/* Valor */}
                  <td style={{ textAlign: "right", fontWeight: 700, fontSize: "0.9rem", color: txn.type === "CREDIT" ? "#22C55E" : "#EF4444", whiteSpace: "nowrap" }}>
                    {txn.type === "DEBIT" ? "−" : "+"} {formatCurrency(Number(txn.value))}
                  </td>

                  {/* Vínculo com hover */}
                  <td style={{ position: "relative" }}>
                    <div
                      onMouseEnter={() => setHoveredVinculo(txn.id)}
                      onMouseLeave={() => setHoveredVinculo(null)}
                      style={{ display: "inline-flex", cursor: isLinked ? "default" : "pointer" }}
                    >
                      {isLinked ? (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.82rem", color: "#22C55E", fontWeight: 600 }}>
                          <CheckCircle2 size={11} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100px" }}>
                            {linkedLabel || "Vinculado"}
                          </span>
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.82rem", color: "#F59E0B", fontWeight: 600 }}>Sem vínculo</span>
                      )}
                    </div>
                    {hoveredVinculo === txn.id && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: "calc(100% + 4px)",
                          left: 0,
                          zIndex: 50,
                          width: "240px",
                          background: "rgba(18,18,18,0.98)",
                          border: "1px solid var(--border)",
                          borderRadius: "12px",
                          padding: "12px",
                          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                          pointerEvents: "none",
                        }}
                      >
                        {isLinked ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {linkedInvoice && (() => {
                              const client = clients.find((c) => c.id === linkedInvoice.client_id);
                              return client ? (
                                <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                                  {client.nome_fantasia || client.name}
                                </p>
                              ) : null;
                            })()}
                            {linkedEntry && (() => {
                              const group = expenses.find((e) => e.id === linkedEntry.expense_id);
                              return group ? (
                                <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                                  {group.description}
                                </p>
                              ) : null;
                            })()}
                            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {linkedLabel || "Vinculado"}
                            </p>
                            <span style={{ fontSize: "0.72rem", color: "#22C55E", fontWeight: 600 }}>Asaas ✓</span>
                          </div>
                        ) : (
                          <p style={{ fontSize: "0.82rem", color: "#F59E0B", fontWeight: 600, margin: 0 }}>
                            Sem vínculo — clique em <Link2 size={11} style={{ display: "inline", verticalAlign: "middle" }} /> para vincular.
                          </p>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Ação */}
                  <td style={{ textAlign: "right" }}>
                    {!isLinked ? (
                      <button
                        onClick={() => setLinkDialogTxn(txn)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#F59E0B", padding: "4px", display: "inline-flex" }}
                        title="Vincular"
                      >
                        <Link2 size={15} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUnlink(txn.id)}
                        disabled={unlinkingId === txn.id}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: "4px", display: "inline-flex" }}
                        title="Desvincular"
                      >
                        {unlinkingId === txn.id
                          ? <RefreshCw size={15} className="animate-spin" />
                          : <Unlink size={15} />}
                      </button>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Advanced link dialog (single) */}
      <AsaasLinkDialog
        isOpen={!!linkDialogTxn && !batchLinkOpen}
        transaction={linkDialogTxn ? {
          id: linkDialogTxn.id,
          description: linkDialogTxn.description,
          value: Number(linkDialogTxn.value),
          type: linkDialogTxn.type as "CREDIT" | "DEBIT",
          date: linkDialogTxn.date,
        } : null}
        invoices={invoices}
        expenseEntries={expenseEntries}
        expenses={expenses}
        clients={clients}
        linking={linking}
        onClose={() => setLinkDialogTxn(null)}
        onConfirm={handleLinkConfirm as any}
        onCreateVariableEntry={handleCreateVariableEntry}
      />

      {/* Batch link dialog */}
      <AsaasLinkDialog
        isOpen={batchLinkOpen}
        transaction={batchFakeTxn}
        invoices={invoices}
        expenseEntries={expenseEntries}
        expenses={expenses}
        clients={clients}
        linking={linking}
        onClose={() => setBatchLinkOpen(false)}
        onConfirm={async (target) => {
          setBatchLinkOpen(false);
          await handleBatchLink(target as any);
        }}
        onCreateVariableEntry={handleCreateVariableEntry}
      />

      {/* Auto-link review dialog */}
      <DialogShell
        isOpen={showAutoLinkPanel}
        onClose={() => setShowAutoLinkPanel(false)}
        title="Auto-vincular Transações"
        maxWidth="600px"
        footer={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              {selectedMatchIds.size} de {autoLinkMatches.length} selecionados
            </span>
            <div style={{ display: "flex", gap: "10px" }}>
              <button className="btn btn-secondary" onClick={() => setShowAutoLinkPanel(false)} disabled={autoLinking}>Cancelar</button>
              <button className="btn btn-accent" onClick={handleConfirmAutoLink} disabled={autoLinking || selectedMatchIds.size === 0} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Sparkles size={14} /> {autoLinking ? "Vinculando..." : "Confirmar Vínculos"}
              </button>
            </div>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {autoLinkMatches.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center" }}>
              <Sparkles size={32} style={{ opacity: 0.2, display: "block", margin: "0 auto 12px" }} />
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                Nenhuma correspondência encontrada por valor + mês.
              </p>
            </div>
          ) : (
            <>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Correspondências por valor e mês de vencimento. Desmarque os que não deseja vincular.
              </p>
              {autoLinkMatches.map(({ txn, invoice }) => {
                const sel = selectedMatchIds.has(txn.id);
                const client = clients.find((c) => c.id === invoice.client_id);
                return (
                  <button
                    key={txn.id}
                    onClick={() => setSelectedMatchIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(txn.id)) next.delete(txn.id); else next.add(txn.id);
                      return next;
                    })}
                    style={{
                      display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px",
                      background: sel ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${sel ? "rgba(34,197,94,0.3)" : "var(--border)"}`,
                      borderRadius: "12px", cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                    }}
                  >
                    <div style={{
                      width: "20px", height: "20px", borderRadius: "6px", flexShrink: 0,
                      background: sel ? "#22C55E" : "rgba(255,255,255,0.08)",
                      border: `2px solid ${sel ? "#22C55E" : "var(--border)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {sel && <CheckCircle2 size={12} color="white" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "1px" }}>Transação</p>
                      <p style={{ fontSize: "0.875rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {txn.description || txn.id.slice(0, 20)}
                      </p>
                      <p style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}>
                        {new Date(`${txn.date}T12:00:00`).toLocaleDateString("pt-BR")} · {formatCurrency(Number(txn.value))}
                      </p>
                    </div>
                    <div style={{ fontSize: "1rem", color: "var(--text-secondary)" }}>→</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "1px" }}>
                        {client?.nome_fantasia || client?.name || "Fatura"}
                      </p>
                      <p style={{ fontSize: "0.875rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {invoice.description}
                      </p>
                      <p style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}>
                        {new Date(`${invoice.due_date}T12:00:00`).toLocaleDateString("pt-BR")} · {formatCurrency(Number(invoice.amount))}
                      </p>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </DialogShell>
    </div>
  );
}
