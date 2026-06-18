"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Link2, CheckCircle2, AlertCircle, Wallet, Sparkles } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import DialogShell from "@/components/DialogShell";
import type { AsaasTransaction, ExpenseEntry, Invoice } from "@/types/database";

interface AsaasBalance {
  balance: number;
  availableBalance: number;
}

interface AsaasSyncProps {
  asaasTransactions: AsaasTransaction[];
  expenseEntries: ExpenseEntry[];
  invoices: Invoice[];
  syncing: boolean;
  onSync: (startDate: string, endDate: string) => Promise<{ imported: number; skipped: number } | void>;
  onLink: (asaasId: string, expenseEntryId?: string, invoiceId?: string) => Promise<void>;
  onUpdateInvoiceStatus?: (id: string, status: string) => Promise<void>;
  selectedMonth: string;
  balance?: AsaasBalance | null;
  onRefreshBalance?: () => Promise<void>;
}

type AutoLinkMatch = { txn: AsaasTransaction; invoice: Invoice };

export function AsaasSync({
  asaasTransactions,
  expenseEntries,
  invoices,
  syncing,
  onSync,
  onLink,
  onUpdateInvoiceStatus,
  selectedMonth,
  balance,
  onRefreshBalance,
}: AsaasSyncProps) {
  const [lastSyncResult, setLastSyncResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [linkDialog, setLinkDialog] = useState<AsaasTransaction | null>(null);
  const [linkTarget, setLinkTarget] = useState<{ type: "expense" | "invoice"; id: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "linked" | "unlinked">("all");
  const [autoLinkMatches, setAutoLinkMatches] = useState<AutoLinkMatch[]>([]);
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(new Set());
  const [showAutoLinkPanel, setShowAutoLinkPanel] = useState(false);
  const [autoLinking, setAutoLinking] = useState(false);

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

  function openAutoLink() {
    const unlinkedCredits = asaasTransactions.filter(
      (t) => t.type === "CREDIT" && !t.invoice_id && !t.expense_entry_id
    );
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

  async function handleLink() {
    if (!linkDialog || !linkTarget) return;
    setSaving(true);
    try {
      await onLink(
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

  const filtered = asaasTransactions.filter((t) => {
    if (filterStatus === "linked") return t.expense_entry_id || t.invoice_id;
    if (filterStatus === "unlinked") return !t.expense_entry_id && !t.invoice_id;
    return true;
  });

  const unlinkedCount = asaasTransactions.filter((t) => !t.expense_entry_id && !t.invoice_id).length;

  const [refreshingBalance, setRefreshingBalance] = useState(false);

  async function handleRefreshBalance() {
    if (!onRefreshBalance) return;
    setRefreshingBalance(true);
    try { await onRefreshBalance(); } finally { setRefreshingBalance(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Caixa Asaas */}
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "stretch" }}>
        {[
          {
            label: "Saldo Total",
            value: balance?.balance ?? null,
            color: "#60A5FA",
            bg: "rgba(96,165,250,0.06)",
            border: "rgba(96,165,250,0.15)",
          },
          {
            label: "Saldo Disponível",
            value: balance?.availableBalance ?? null,
            color: balance?.availableBalance != null
              ? balance.availableBalance >= 0 ? "#22C55E" : "#EF4444"
              : "#60A5FA",
            bg: balance?.availableBalance != null
              ? balance.availableBalance >= 0 ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)"
              : "rgba(255,255,255,0.02)",
            border: balance?.availableBalance != null
              ? balance.availableBalance >= 0 ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"
              : "var(--border)",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="glass-card"
            style={{ padding: "20px 24px", flex: "1 1 200px", background: card.bg, border: `1px solid ${card.border}` }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <Wallet size={15} color={card.color} />
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {card.label}
              </span>
            </div>
            <span style={{ fontSize: "1.6rem", fontWeight: 800, color: card.color, letterSpacing: "-0.02em" }}>
              {card.value != null
                ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(card.value)
                : <span style={{ fontSize: "0.9rem", color: "var(--text-tertiary)", fontWeight: 600 }}>—</span>
              }
            </span>
          </div>
        ))}
        <button
          onClick={handleRefreshBalance}
          disabled={refreshingBalance}
          className="btn btn-secondary"
          style={{ alignSelf: "center", display: "flex", alignItems: "center", gap: "7px", whiteSpace: "nowrap" }}
        >
          <RefreshCw size={14} className={refreshingBalance ? "animate-spin" : ""} />
          Atualizar Saldo
        </button>
      </div>

      {/* Sync control */}
      <div className="glass-card" style={{ padding: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: "6px" }}>Sincronização com Asaas</h3>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            Importa transações do extrato bancário do Asaas para o período selecionado. Transações já importadas são ignoradas automaticamente.
          </p>
          {lastSyncResult && (
            <div style={{ marginTop: "10px", display: "flex", gap: "16px" }}>
              <span style={{ fontSize: "0.8rem", color: "#22C55E", fontWeight: 700 }}>✓ {lastSyncResult.imported} importadas</span>
              <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", fontWeight: 600 }}>{lastSyncResult.skipped} já existiam</span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            className="btn btn-accent"
            onClick={handleSync}
            disabled={syncing}
            style={{ display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}
          >
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Sincronizando..." : `Sincronizar ${month}/${year}`}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleSync2025}
            disabled={syncing}
            style={{ display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}
          >
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            Sincronizar 2025 completo
          </button>
          <button
            className="btn btn-secondary"
            onClick={openAutoLink}
            style={{ display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}
          >
            <Sparkles size={16} /> Auto-vincular
          </button>
        </div>
      </div>

      {/* Alert for unlinked */}
      {unlinkedCount > 0 && (
        <div className="glass-card" style={{ padding: "14px 20px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", display: "flex", alignItems: "center", gap: "12px" }}>
          <AlertCircle size={18} color="#F59E0B" />
          <p style={{ fontSize: "0.875rem", color: "#F59E0B", fontWeight: 600 }}>
            {unlinkedCount} transação(ões) ainda não foram vinculadas a um lançamento ou fatura.
          </p>
        </div>
      )}

      {/* Filter */}
      <div style={{ display: "flex", gap: "8px" }}>
        {[
          { value: "all", label: "Todas" },
          { value: "unlinked", label: `Sem vínculo (${unlinkedCount})` },
          { value: "linked", label: "Vinculadas" },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilterStatus(opt.value as typeof filterStatus)}
            className={`btn ${filterStatus === opt.value ? "btn-accent" : "btn-secondary"}`}
            style={{ fontSize: "0.8rem", padding: "6px 14px" }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Transactions table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: "90px" }}>Data</th>
              <th>Descrição</th>
              <th style={{ width: "110px" }}>Categoria</th>
              <th style={{ textAlign: "right", width: "130px" }}>Valor</th>
              <th style={{ width: "110px" }}>Status</th>
              <th style={{ width: "90px" }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "48px", color: "var(--text-tertiary)" }}>
                  {asaasTransactions.length === 0
                    ? "Nenhuma transação importada. Clique em Sincronizar para importar."
                    : "Nenhuma transação neste filtro."}
                </td>
              </tr>
            )}
            {filtered.map((txn, i) => {
              const isLinked = !!(txn.expense_entry_id || txn.invoice_id);
              const linkedEntry = txn.expense_entry_id ? expenseEntries.find((e) => e.id === txn.expense_entry_id) : null;
              const linkedInvoice = txn.invoice_id ? invoices.find((inv) => inv.id === txn.invoice_id) : null;
              const categoria = txn.type === "CREDIT" ? "Receita" : "Despesa";

              return (
                <motion.tr
                  key={txn.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.015 }}
                >
                  {/* Data */}
                  <td style={{ color: "var(--text-secondary)", fontSize: "0.875rem", whiteSpace: "nowrap" }}>
                    {new Date(`${txn.date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                  </td>

                  {/* Descrição + vínculo */}
                  <td style={{ maxWidth: "280px" }}>
                    <p style={{ fontWeight: 600, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {txn.description || "—"}
                    </p>
                    {isLinked && (
                      <p style={{ fontSize: "0.72rem", color: "#22C55E", marginTop: "2px", display: "flex", alignItems: "center", gap: "3px" }}>
                        <CheckCircle2 size={11} />
                        {linkedEntry ? linkedEntry.description : linkedInvoice ? linkedInvoice.description : "Vinculado"}
                      </p>
                    )}
                  </td>

                  {/* Categoria */}
                  <td>
                    <span
                      className="badge"
                      style={{
                        color: txn.type === "CREDIT" ? "#22C55E" : "#EF4444",
                        background: txn.type === "CREDIT" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                        border: `1px solid ${txn.type === "CREDIT" ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
                        fontSize: "0.72rem",
                      }}
                    >
                      {categoria}
                    </span>
                  </td>

                  {/* Valor */}
                  <td style={{ textAlign: "right", fontWeight: 700, fontSize: "0.9rem", color: txn.type === "CREDIT" ? "#22C55E" : "#EF4444", whiteSpace: "nowrap" }}>
                    {txn.type === "DEBIT" ? "−" : "+"} {formatCurrency(Number(txn.value))}
                  </td>

                  {/* Status vínculo */}
                  <td>
                    <span
                      className="badge"
                      style={{
                        fontSize: "0.7rem",
                        color: isLinked ? "#22C55E" : "#F59E0B",
                        background: isLinked ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)",
                        border: `1px solid ${isLinked ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)"}`,
                      }}
                    >
                      {isLinked ? "Vinculado" : "Sem vínculo"}
                    </span>
                  </td>

                  {/* Ação */}
                  <td style={{ textAlign: "right" }}>
                    {!isLinked && (
                      <button
                        onClick={() => { setLinkDialog(txn); setLinkTarget(null); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#F59E0B", padding: "4px", display: "inline-flex" }}
                        title="Vincular"
                      >
                        <Link2 size={15} />
                      </button>
                    )}
                    {isLinked && (
                      <CheckCircle2 size={15} color="#22C55E" style={{ display: "inline-block", verticalAlign: "middle", opacity: 0.6 }} />
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Link dialog */}
      <DialogShell
        isOpen={!!linkDialog}
        onClose={() => { setLinkDialog(null); setLinkTarget(null); }}
        title="Vincular Transação"
        maxWidth="500px"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button className="btn btn-secondary" onClick={() => { setLinkDialog(null); setLinkTarget(null); }}>Cancelar</button>
            <button className="btn btn-accent" onClick={handleLink} disabled={saving || !linkTarget}>
              {saving ? "Vinculando..." : "Confirmar Vínculo"}
            </button>
          </div>
        }
      >
        {linkDialog && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Transaction summary */}
            <div className="glass-card" style={{ padding: "16px", background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "6px" }}>Transação Asaas</p>
              <p style={{ fontWeight: 700, marginBottom: "4px" }}>{linkDialog.description || "Sem descrição"}</p>
              <p style={{ color: linkDialog.type === "CREDIT" ? "#22C55E" : "#EF4444", fontWeight: 800, fontSize: "1.2rem" }}>
                {linkDialog.type === "DEBIT" ? "- " : "+ "}{formatCurrency(Number(linkDialog.value))}
              </p>
              <p style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", marginTop: "4px" }}>
                {new Date(`${linkDialog.date}T12:00:00`).toLocaleDateString("pt-BR")}
              </p>
            </div>

            {/* Link to expense entry */}
            {linkDialog.type === "DEBIT" && expenseEntries.length > 0 && (
              <div>
                <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "8px" }}>Vincular a lançamento de saída:</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "200px", overflowY: "auto" }}>
                  {expenseEntries.filter((e) => !e.asaas_transaction_id).map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setLinkTarget({ type: "expense", id: e.id })}
                      style={{
                        padding: "10px 14px",
                        background: linkTarget?.id === e.id ? "rgba(var(--accent-rgb),0.1)" : "rgba(255,255,255,0.02)",
                        border: `1px solid ${linkTarget?.id === e.id ? "var(--accent)" : "var(--border)"}`,
                        borderRadius: "10px",
                        cursor: "pointer",
                        textAlign: "left",
                        display: "flex",
                        justifyContent: "space-between",
                        color: "var(--text-primary)",
                      }}
                    >
                      <div>
                        <p style={{ fontSize: "0.875rem", fontWeight: 600 }}>{e.description}</p>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                          {new Date(`${e.date}T12:00:00`).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <span style={{ fontWeight: 700, color: "#EF4444", alignSelf: "center" }}>{formatCurrency(Number(e.amount))}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Link to invoice */}
            {linkDialog.type === "CREDIT" && invoices.length > 0 && (
              <div>
                <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "8px" }}>Vincular a fatura de receita:</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "200px", overflowY: "auto" }}>
                  {invoices.filter((inv) => inv.status === "paid").slice(0, 20).map((inv) => (
                    <button
                      key={inv.id}
                      onClick={() => setLinkTarget({ type: "invoice", id: inv.id })}
                      style={{
                        padding: "10px 14px",
                        background: linkTarget?.id === inv.id ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.02)",
                        border: `1px solid ${linkTarget?.id === inv.id ? "#22C55E" : "var(--border)"}`,
                        borderRadius: "10px",
                        cursor: "pointer",
                        textAlign: "left",
                        display: "flex",
                        justifyContent: "space-between",
                        color: "var(--text-primary)",
                      }}
                    >
                      <div>
                        <p style={{ fontSize: "0.875rem", fontWeight: 600 }}>{inv.description}</p>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                          {new Date(`${inv.due_date}T12:00:00`).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <span style={{ fontWeight: 700, color: "#22C55E", alignSelf: "center" }}>{formatCurrency(Number(inv.amount))}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogShell>

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
              <button
                className="btn btn-accent"
                onClick={handleConfirmAutoLink}
                disabled={autoLinking || selectedMatchIds.size === 0}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <Sparkles size={14} />
                {autoLinking ? "Vinculando..." : "Confirmar Vínculos"}
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
                Nenhuma correspondência encontrada. Certifique-se de que as transações foram sincronizadas e que existem faturas pendentes com o mesmo valor e mês.
              </p>
            </div>
          ) : (
            <>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                Correspondências encontradas por valor + mês de vencimento. Desmarque os pares que não deseja vincular.
              </p>
              {autoLinkMatches.map(({ txn, invoice }) => {
                const selected = selectedMatchIds.has(txn.id);
                return (
                  <button
                    key={txn.id}
                    onClick={() => {
                      setSelectedMatchIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(txn.id)) next.delete(txn.id); else next.add(txn.id);
                        return next;
                      });
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px",
                      background: selected ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${selected ? "rgba(34,197,94,0.3)" : "var(--border)"}`,
                      borderRadius: "12px", cursor: "pointer", textAlign: "left",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{
                      width: "20px", height: "20px", borderRadius: "6px", flexShrink: 0,
                      background: selected ? "#22C55E" : "rgba(255,255,255,0.08)",
                      border: `2px solid ${selected ? "#22C55E" : "var(--border)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {selected && <CheckCircle2 size={12} color="white" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "2px" }}>Transação Asaas</p>
                      <p style={{ fontSize: "0.875rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {txn.description || txn.id.slice(0, 20) + "…"}
                      </p>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                        {new Date(`${txn.date}T12:00:00`).toLocaleDateString("pt-BR")} · {formatCurrency(Number(txn.value))}
                      </p>
                    </div>
                    <div style={{ fontSize: "1.1rem", color: "var(--text-secondary)" }}>→</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "2px" }}>Fatura</p>
                      <p style={{ fontSize: "0.875rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {invoice.description}
                      </p>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                        Venc. {new Date(`${invoice.due_date}T12:00:00`).toLocaleDateString("pt-BR")} · {formatCurrency(Number(invoice.amount))}
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
