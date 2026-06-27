"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Search, ChevronDown, Link2, Check, ExternalLink, Building2, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import DialogShell from "@/components/DialogShell";
import type { Invoice, AsaasTransaction } from "@/types/database";

function billingCycleLabel(cycle?: string): string {
  if (cycle === "monthly") return "Mensalidade";
  if (cycle === "quarterly" || cycle === "yearly") return "Recorrente";
  if (cycle === "one_time") return "Avulso";
  return "Mensalidade";
}

function formatShortDate(raw?: string): string {
  if (!raw) return "—";
  const parts = raw.split("T")[0].split("-");
  return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : raw;
}

type FilterStatus = "all" | "paid" | "pending" | "overdue";

interface LancamentosTableProps {
  invoices: Invoice[];
  asaasTransactions: AsaasTransaction[];
  clients: { id: string; name: string; nome_fantasia?: string }[];
  contracts: { id: string; client_id?: string; billing_cycle?: string }[];
  syncing: boolean;
  onSync: (startDate: string, endDate: string) => Promise<void>;
  onLinkTransaction: (asaasId: string, expenseEntryId?: string, invoiceId?: string) => Promise<void>;
  onUpdateInvoiceStatus?: (id: string, status: string, paidAt?: string) => Promise<void>;
  onCreateInvoice?: (data: Partial<Invoice>) => Promise<void>;
  startDate: string;
  endDate: string;
}

interface ReceivableRow {
  id: string;
  invoice: Invoice;
  clientName: string;
  description: string;
  categoryLabel: string;
  dueDate: string;
  paidAt?: string;
  amount: number;
  status: string;
  effectiveStatus: string;
  linkedAmount: number;
  asaasLinked: boolean;
  asaasTransactionId?: string;
}

export function LancamentosTable({
  invoices,
  asaasTransactions,
  clients,
  contracts,
  syncing,
  onSync,
  onLinkTransaction,
  onUpdateInvoiceStatus,
  onCreateInvoice,
  startDate,
  endDate,
}: LancamentosTableProps) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [openingAsaas, setOpeningAsaas] = useState<string | null>(null);
  const [hoveredVinculo, setHoveredVinculo] = useState<string | null>(null);

  // Dar baixa
  const [baixaDialog, setBaixaDialog] = useState<ReceivableRow | null>(null);
  const [baixaDate, setBaixaDate] = useState("");
  const [baixaSaving, setBaixaSaving] = useState(false);

  // Detalhe do vínculo
  const [detailRow, setDetailRow] = useState<ReceivableRow | null>(null);

  // Nova cobrança / entrada de receita
  const today = new Date().toISOString().split("T")[0];
  const [newDialog, setNewDialog] = useState(false);
  const [newForm, setNewForm] = useState({
    client_id: "",
    description: "",
    amount: "",
    due_date: today,
    status: "paid" as "paid" | "pending",
    paid_at: today,
  });
  const [newSaving, setNewSaving] = useState(false);

  function openNewDialog() {
    setNewForm({ client_id: "", description: "", amount: "", due_date: today, status: "paid", paid_at: today });
    setNewDialog(true);
  }

  async function handleNewConfirm() {
    if (!newForm.client_id || !newForm.amount || !newForm.due_date) return;
    setNewSaving(true);
    try {
      await onCreateInvoice?.({
        client_id: newForm.client_id,
        description: newForm.description || "Cobrança avulsa",
        amount: parseFloat(newForm.amount.replace(",", ".")),
        due_date: newForm.due_date,
        status: newForm.status,
        paid_at: newForm.status === "paid" ? newForm.paid_at : undefined,
      });
      setNewDialog(false);
    } finally {
      setNewSaving(false);
    }
  }

  // Vincular ao Asaas (busca)
  const [linkDialog, setLinkDialog] = useState<ReceivableRow | null>(null);
  const [linkSearch, setLinkSearch] = useState("");
  const [linkMonth, setLinkMonth] = useState("");
  const [linkSelection, setLinkSelection] = useState<Set<string>>(new Set());
  const [linking, setLinking] = useState(false);

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

  const rows = useMemo<ReceivableRow[]>(() => {
    const result: ReceivableRow[] = [];
    for (const inv of invoices) {
      const d = inv.due_date.split("T")[0];
      if (startDate && d < startDate) continue;
      if (endDate && d > endDate) continue;
      const client = clients.find((c) => c.id === inv.client_id);
      const clientName = client?.nome_fantasia || client?.name || "Cliente";
      const linkedTxns = asaasTransactions.filter((t) => t.invoice_id === inv.id && !t.confirms_asaas_transaction_id);
      const linkedAmount = linkedTxns.reduce((s, t) => s + Number(t.value), 0);
      const contract = inv.contract_id
        ? contracts.find((c) => c.id === inv.contract_id)
        : contracts.find((c) => c.client_id === inv.client_id);
      const amount = Number(inv.amount);
      let effectiveStatus: string = inv.status;
      if (inv.status !== "paid") {
        if (linkedAmount >= amount && amount > 0) effectiveStatus = "paid";
        else if (linkedAmount > 0) effectiveStatus = "partial";
      }
      result.push({
        id: inv.id,
        invoice: inv,
        clientName,
        description: inv.description,
        categoryLabel: billingCycleLabel(contract?.billing_cycle),
        dueDate: d,
        paidAt: inv.paid_at,
        amount,
        status: inv.status,
        effectiveStatus,
        linkedAmount,
        asaasLinked: linkedTxns.length > 0,
        asaasTransactionId: linkedTxns[0]?.id,
      });
    }
    return result.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  }, [invoices, asaasTransactions, clients, contracts, startDate, endDate]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!r.description.toLowerCase().includes(q) && !r.clientName.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, filterStatus, search]);

  const totalRecebido = rows.reduce((s, r) => s + (r.effectiveStatus === "paid" ? r.amount : r.linkedAmount), 0);
  const totalAReceber = rows.reduce((s, r) => s + (r.effectiveStatus === "paid" ? 0 : Math.max(r.amount - r.linkedAmount, 0)), 0);

  const unlinkedCredits = useMemo(
    () => asaasTransactions.filter((t) => t.type === "CREDIT" && !t.invoice_id && !t.expense_entry_id),
    [asaasTransactions]
  );

  const linkCandidates = useMemo(() => {
    return unlinkedCredits.filter((t) => {
      const inMonth = !linkMonth || t.date.slice(0, 7) === linkMonth;
      const matchSearch = !linkSearch || (t.description || "").toLowerCase().includes(linkSearch.toLowerCase());
      return inMonth && matchSearch;
    });
  }, [unlinkedCredits, linkMonth, linkSearch]);

  const linkSelectedTotal = useMemo(
    () => unlinkedCredits.filter((t) => linkSelection.has(t.id)).reduce((s, t) => s + Number(t.value), 0),
    [unlinkedCredits, linkSelection]
  );

  function openBaixaDialog(row: ReceivableRow) {
    setBaixaDate(new Date().toISOString().split("T")[0]);
    setBaixaDialog(row);
  }

  async function handleBaixaConfirm() {
    if (!baixaDialog) return;
    setBaixaSaving(true);
    try {
      await onUpdateInvoiceStatus?.(baixaDialog.id, "paid", baixaDate);
      setBaixaDialog(null);
    } finally {
      setBaixaSaving(false);
    }
  }

  function openLinkDialog(row: ReceivableRow) {
    setLinkDialog(row);
    setLinkSearch("");
    setLinkMonth(row.dueDate.slice(0, 7));
    setLinkSelection(new Set());
  }

  function toggleLinkSelection(id: string) {
    setLinkSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleLinkConfirm() {
    if (!linkDialog || linkSelection.size === 0) return;
    setLinking(true);
    try {
      let paymentDate = linkDialog.dueDate;
      for (const txnId of linkSelection) {
        await onLinkTransaction(txnId, undefined, linkDialog.id);
        const txn = asaasTransactions.find((t) => t.id === txnId);
        if (txn) paymentDate = txn.date.split("T")[0];
      }
      // Marca como pago só quando o total vinculado (já existente + selecionado agora) cobre o valor.
      const totalLinked = linkDialog.linkedAmount + linkSelectedTotal;
      if (linkDialog.status !== "paid" && totalLinked >= linkDialog.amount) {
        await onUpdateInvoiceStatus?.(linkDialog.id, "paid", paymentDate);
      }
      setLinkDialog(null);
      setLinkSelection(new Set());
    } finally {
      setLinking(false);
    }
  }

  const statusColor: Record<string, string> = {
    paid: "#22C55E",
    partial: "#F59E0B",
    pending: "#F59E0B",
    overdue: "#EF4444",
    cancelled: "var(--text-tertiary)",
  };

  const statusLabel: Record<string, string> = {
    paid: "Pago",
    partial: "Parcial",
    pending: "Pendente",
    overdue: "Vencido",
    cancelled: "Cancelado",
  };

  const activeStart = startDate || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;
  const activeEnd = endDate || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()).padStart(2, "0")}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Totals bar */}
      <div className="responsive-grid-3" style={{ gap: "12px" }}>
        {[
          { label: "A receber (pendente)", value: totalAReceber, color: "#F59E0B" },
          { label: "Recebido (pago)", value: totalRecebido, color: "#22C55E" },
          { label: "Total do período", value: totalAReceber + totalRecebido, color: "var(--accent)" },
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
            placeholder="Buscar por cliente ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ position: "relative" }}>
          <select className="input-dark" style={{ appearance: "none", paddingRight: "32px" }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}>
            <option value="all">Todos os status</option>
            <option value="paid">Pago</option>
            <option value="pending">Pendente</option>
            <option value="overdue">Vencido</option>
          </select>
          <ChevronDown size={13} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-secondary)" }} />
        </div>

        <button
          className="btn btn-accent"
          onClick={() => onSync(activeStart, activeEnd)}
          disabled={syncing}
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Sincronizando..." : "Sincronizar Asaas"}
        </button>

        <button
          className="btn"
          onClick={openNewDialog}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(34,197,94,0.12)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.25)" }}
        >
          <Plus size={15} />
          Nova Cobrança
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: "150px" }}>Cliente</th>
              <th>Descrição</th>
              <th style={{ width: "120px" }}>Categoria</th>
              <th style={{ width: "90px" }}>Vencimento</th>
              <th style={{ width: "90px" }}>Pagamento</th>
              <th style={{ textAlign: "right", width: "110px" }}>Valor</th>
              <th style={{ width: "100px" }}>Status</th>
              <th style={{ width: "64px", textAlign: "center" }}>Vínculo</th>
              <th style={{ width: "44px" }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "var(--text-tertiary)" }}>
                  Nenhuma conta a receber encontrada para o período.
                </td>
              </tr>
            )}
            {filtered.map((row, i) => (
              <motion.tr
                key={row.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                {/* Cliente */}
                <td>
                  <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.85rem", fontWeight: 600 }}>
                    <Building2 size={11} style={{ flexShrink: 0, color: "var(--text-tertiary)" }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.clientName}</span>
                  </span>
                </td>

                {/* Descrição */}
                <td style={{ maxWidth: "220px" }}>
                  <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                    {row.description}
                  </span>
                </td>

                {/* Categoria */}
                <td>
                  <span className="badge" style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                    {row.categoryLabel}
                  </span>
                </td>

                {/* Vencimento */}
                <td style={{ color: "var(--text-secondary)", fontWeight: 500, whiteSpace: "nowrap" }}>
                  {formatShortDate(row.dueDate)}
                </td>

                {/* Pagamento */}
                <td style={{ color: row.paidAt ? "#22C55E" : "var(--text-tertiary)", fontWeight: 500, whiteSpace: "nowrap" }}>
                  {formatShortDate(row.paidAt)}
                </td>

                {/* Valor */}
                <td style={{ textAlign: "right", fontWeight: 700, fontSize: "0.9rem", color: "#22C55E", whiteSpace: "nowrap" }}>
                  + {formatCurrency(row.amount)}
                </td>

                {/* Status */}
                <td>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "flex-start" }}>
                    <span
                      className="badge"
                      style={{
                        fontSize: "0.75rem",
                        padding: "2px 8px",
                        color: statusColor[row.effectiveStatus] || "var(--text-secondary)",
                        background: `${statusColor[row.effectiveStatus] || "var(--text-secondary)"}18`,
                        border: `1px solid ${statusColor[row.effectiveStatus] || "var(--text-secondary)"}30`,
                      }}
                    >
                      {statusLabel[row.effectiveStatus] || row.effectiveStatus}
                    </span>
                    {row.effectiveStatus === "partial" && (
                      <span style={{ fontSize: "0.68rem", color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
                        {formatCurrency(row.linkedAmount)} de {formatCurrency(row.amount)}
                      </span>
                    )}
                  </div>
                </td>

                {/* Vínculo com hover */}
                <td style={{ textAlign: "center", position: "relative" }}>
                  <button
                    onMouseEnter={() => setHoveredVinculo(row.id)}
                    onMouseLeave={() => setHoveredVinculo(null)}
                    onClick={() => {
                      if (row.asaasLinked) setDetailRow(row);
                      else openLinkDialog(row);
                    }}
                    title={row.asaasLinked ? "Vinculado ao Asaas — clique para ver detalhes" : "Vincular ao Asaas"}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "inline-flex", color: row.asaasLinked ? "#22C55E" : "#F59E0B" }}
                  >
                    {openingAsaas === row.asaasTransactionId
                      ? <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} />
                      : <Link2 size={14} style={{ opacity: row.asaasLinked ? 1 : 0.5 }} />
                    }
                  </button>
                  {hoveredVinculo === row.id && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "calc(100% + 4px)",
                        left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: 50,
                        width: "220px",
                        background: "rgba(18,18,18,0.98)",
                        border: "1px solid var(--border)",
                        borderRadius: "12px",
                        padding: "12px",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                        pointerEvents: "none",
                        textAlign: "left",
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{row.clientName}</p>
                        {row.invoice.contract_id && (
                          <span className="badge" style={{ fontSize: "0.72rem", alignSelf: "flex-start" }}>Contrato</span>
                        )}
                        <span style={{ fontSize: "0.72rem", fontWeight: 600, color: row.asaasLinked ? "#22C55E" : "#F59E0B" }}>
                          {row.asaasLinked ? "Asaas ✓" : "Sem vínculo Asaas"}
                        </span>
                      </div>
                    </div>
                  )}
                </td>

                {/* Ação: Dar Baixa */}
                <td style={{ textAlign: "right" }}>
                  {row.status !== "paid" && (
                    <button
                      onClick={() => openBaixaDialog(row)}
                      title="Dar Baixa"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#22C55E", padding: "4px", display: "inline-flex" }}
                    >
                      <Check size={14} />
                    </button>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mobile-table-cards">
        {filtered.length === 0 && (
          <p style={{ textAlign: "center", padding: "32px", color: "var(--text-tertiary)" }}>
            Nenhuma conta a receber encontrada para o período.
          </p>
        )}
        {filtered.map((row) => (
          <div key={row.id} className="mobile-data-card" style={{ padding: "12px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: "block", fontWeight: 700, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {row.clientName}
                </span>
                <span style={{ display: "block", fontSize: "0.78rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {row.description}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}>Venc {formatShortDate(row.dueDate)}</span>
                  {row.paidAt && (
                    <>
                      <span style={{ fontSize: "0.65rem", color: "var(--text-tertiary)" }}>·</span>
                      <span style={{ fontSize: "0.72rem", color: "#22C55E" }}>Pago {formatShortDate(row.paidAt)}</span>
                    </>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
                <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#22C55E" }}>
                  + {formatCurrency(row.amount)}
                </span>
                <span className="badge" style={{ fontSize: "0.65rem", padding: "1px 6px", color: statusColor[row.effectiveStatus] || "var(--text-secondary)", background: `${statusColor[row.effectiveStatus] || "var(--text-secondary)"}18`, border: `1px solid ${statusColor[row.effectiveStatus] || "var(--text-secondary)"}30` }}>
                  {statusLabel[row.effectiveStatus] || row.effectiveStatus}
                  {row.effectiveStatus === "partial" ? ` (${formatCurrency(row.linkedAmount)}/${formatCurrency(row.amount)})` : ""}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
              <span className="badge" style={{ fontSize: "0.7rem", padding: "2px 8px" }}>{row.categoryLabel}</span>
              <div style={{ display: "flex", gap: "4px" }}>
                {row.asaasLinked ? (
                  <button onClick={() => setDetailRow(row)} style={{ background: "none", border: "none", cursor: "pointer", color: "#22C55E", padding: "4px", display: "flex" }} title="Ver detalhe do vínculo">
                    <ExternalLink size={13} />
                  </button>
                ) : (
                  <button
                    onClick={() => openLinkDialog(row)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#F59E0B", padding: "4px", display: "flex" }} title="Vincular Asaas"
                  >
                    <Link2 size={13} />
                  </button>
                )}
                {row.effectiveStatus !== "paid" && (
                  <button
                    onClick={() => openBaixaDialog(row)}
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

      {/* Modal de detalhe do vínculo */}
      {detailRow && (() => {
        const linkedTxn = asaasTransactions.find((t) => t.invoice_id === detailRow.id)
          ?? (detailRow.asaasTransactionId ? asaasTransactions.find((t) => t.id === detailRow.asaasTransactionId) : undefined);
        return (
          <DialogShell
            isOpen
            onClose={() => setDetailRow(null)}
            title="Detalhe do Vínculo"
            maxWidth="440px"
            footer={
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                {linkedTxn && (
                  <button className="btn btn-secondary" onClick={() => openAsaasLink(linkedTxn.id)}>
                    Abrir no Asaas
                  </button>
                )}
                <button className="btn btn-accent" onClick={() => setDetailRow(null)}>Fechar</button>
              </div>
            }
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Fatura Sistema */}
              <div style={{ padding: "12px 16px", borderRadius: "12px", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "2px" }}>Fatura · {detailRow.clientName}</p>
                <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>{detailRow.description}</p>
                <p style={{ fontWeight: 800, fontSize: "1.05rem", color: "#22C55E", marginTop: "2px" }}>
                  + {formatCurrency(detailRow.amount)}
                </p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "2px" }}>
                  Vcto {new Date(`${detailRow.dueDate.split("T")[0]}T12:00:00`).toLocaleDateString("pt-BR")}
                  {detailRow.paidAt && ` · Pago ${new Date(`${detailRow.paidAt.split("T")[0]}T12:00:00`).toLocaleDateString("pt-BR")}`}
                </p>
              </div>
              {/* Transação Asaas vinculada */}
              {linkedTxn ? (
                <div style={{ padding: "12px 16px", borderRadius: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Transação Asaas</p>
                  <p style={{ fontWeight: 700 }}>{linkedTxn.description || "Sem descrição"}</p>
                  <p style={{ fontWeight: 800, color: "#22C55E" }}>+ {formatCurrency(Number(linkedTxn.value))}</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                    {new Date(`${linkedTxn.date.split("T")[0]}T12:00:00`).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              ) : (
                <p style={{ fontSize: "0.82rem", color: "var(--text-tertiary)", textAlign: "center", padding: "16px" }}>
                  Transação Asaas não encontrada no histórico local. Sincronize o Banco.
                </p>
              )}
            </div>
          </DialogShell>
        );
      })()}

      {/* Nova cobrança dialog */}
      <DialogShell
        isOpen={newDialog}
        onClose={() => setNewDialog(false)}
        title="Nova Cobrança Recebida"
        maxWidth="480px"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button className="btn btn-secondary" onClick={() => setNewDialog(false)}>Cancelar</button>
            <button
              className="btn btn-accent"
              onClick={handleNewConfirm}
              disabled={newSaving || !newForm.client_id || !newForm.amount || !newForm.due_date}
            >
              {newSaving ? "Registrando..." : "Registrar"}
            </button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "6px" }}>
              Cliente *
            </label>
            <select
              className="input-dark"
              style={{ width: "100%" }}
              value={newForm.client_id}
              onChange={(e) => setNewForm({ ...newForm, client_id: e.target.value })}
            >
              <option value="">Selecione o cliente...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.nome_fantasia || c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "6px" }}>
              Descrição
            </label>
            <input
              className="input-dark"
              style={{ width: "100%" }}
              placeholder="Ex: Mensalidade Social Media — Jun/2026"
              value={newForm.description}
              onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
            />
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "6px" }}>
                Valor (R$) *
              </label>
              <input
                className="input-dark"
                style={{ width: "100%" }}
                placeholder="0,00"
                value={newForm.amount}
                onChange={(e) => setNewForm({ ...newForm, amount: e.target.value })}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "6px" }}>
                Vencimento *
              </label>
              <input
                className="input-dark"
                style={{ width: "100%" }}
                type="date"
                value={newForm.due_date}
                onChange={(e) => setNewForm({ ...newForm, due_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "8px" }}>
              Status
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              {(["paid", "pending"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setNewForm({ ...newForm, status: s })}
                  style={{
                    flex: 1, padding: "10px", borderRadius: "10px", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem",
                    border: `1px solid ${newForm.status === s ? (s === "paid" ? "#22C55E" : "#F59E0B") : "var(--border)"}`,
                    background: newForm.status === s ? (s === "paid" ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)") : "rgba(255,255,255,0.02)",
                    color: newForm.status === s ? (s === "paid" ? "#22C55E" : "#F59E0B") : "var(--text-secondary)",
                    transition: "all 0.15s",
                  }}
                >
                  {s === "paid" ? "Recebida" : "Pendente"}
                </button>
              ))}
            </div>
          </div>

          {newForm.status === "paid" && (
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "6px" }}>
                Data do Recebimento
              </label>
              <input
                className="input-dark"
                style={{ width: "100%" }}
                type="date"
                value={newForm.paid_at}
                onChange={(e) => setNewForm({ ...newForm, paid_at: e.target.value })}
              />
            </div>
          )}
        </div>
      </DialogShell>

      {/* Baixa dialog */}
      <DialogShell
        isOpen={!!baixaDialog}
        onClose={() => setBaixaDialog(null)}
        title="Confirmar Recebimento"
        maxWidth="380px"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button className="btn btn-secondary" onClick={() => setBaixaDialog(null)}>Cancelar</button>
            <button className="btn btn-accent" onClick={handleBaixaConfirm} disabled={!baixaDate || baixaSaving}>
              {baixaSaving ? "Salvando..." : "Confirmar Baixa"}
            </button>
          </div>
        }
      >
        {baixaDialog && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ padding: "14px 16px", background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: "12px" }}>
              <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "2px" }}>{baixaDialog.clientName}</p>
              <p style={{ fontWeight: 700, fontSize: "0.95rem" }}>{baixaDialog.description}</p>
              <p style={{ fontWeight: 800, color: "#22C55E", fontSize: "1.1rem", marginTop: "4px" }}>
                + {formatCurrency(baixaDialog.amount)}
              </p>
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
                Data do Recebimento
              </label>
              <input
                className="input-dark"
                style={{ width: "100%" }}
                type="date"
                value={baixaDate}
                onChange={(e) => setBaixaDate(e.target.value)}
              />
              <p style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", marginTop: "4px" }}>
                Padrão: hoje. Altere se o recebimento ocorreu em outra data.
              </p>
            </div>
          </div>
        )}
      </DialogShell>

      {/* Link dialog (busca de transações CREDIT do Asaas) */}
      <DialogShell
        isOpen={!!linkDialog}
        onClose={() => { setLinkDialog(null); setLinkSelection(new Set()); }}
        title="Vincular Recebimento Asaas"
        maxWidth="520px"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button className="btn btn-secondary" onClick={() => { setLinkDialog(null); setLinkSelection(new Set()); }}>Cancelar</button>
            <button
              className="btn btn-accent"
              onClick={handleLinkConfirm}
              disabled={linking || linkSelection.size === 0}
            >
              {linking ? "Vinculando..." : `Vincular${linkSelection.size > 0 ? ` (${linkSelection.size})` : ""}`}
            </button>
          </div>
        }
      >
        {linkDialog && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Invoice summary */}
            <div style={{ padding: "12px 16px", borderRadius: "12px", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "2px" }}>{linkDialog.clientName}</p>
              <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>{linkDialog.description}</p>
              <p style={{ fontWeight: 800, fontSize: "1.05rem", color: "#22C55E", marginTop: "2px" }}>
                + {formatCurrency(linkDialog.amount)}
                <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "var(--text-tertiary)", marginLeft: "8px" }}>
                  vcto {formatShortDate(linkDialog.dueDate)}
                </span>
              </p>
            </div>

            {/* Search + month */}
            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Search size={13} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
                <input
                  className="input-dark"
                  style={{ width: "100%", paddingLeft: "30px", fontSize: "0.85rem" }}
                  placeholder="Buscar recebimento..."
                  value={linkSearch}
                  onChange={(e) => setLinkSearch(e.target.value)}
                />
              </div>
              <input
                type="month"
                className="input-dark"
                style={{ width: "130px", fontSize: "0.85rem" }}
                value={linkMonth}
                onChange={(e) => setLinkMonth(e.target.value)}
              />
            </div>

            {linkSelection.size > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: "10px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                  {linkSelection.size} selecionada(s)
                </span>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: linkSelectedTotal >= linkDialog.amount ? "#22C55E" : "#F59E0B" }}>
                  {formatCurrency(linkSelectedTotal)}{linkSelectedTotal >= linkDialog.amount ? " ✓" : ""}
                </span>
              </div>
            )}

            {/* Candidates */}
            <div style={{ maxHeight: "280px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
              {linkCandidates.length === 0 ? (
                <p style={{ fontSize: "0.82rem", color: "var(--text-tertiary)", textAlign: "center", padding: "24px" }}>
                  Nenhum recebimento CREDIT sem vínculo no período. Sincronize o Asaas se necessário.
                </p>
              ) : linkCandidates.map((txn) => {
                const selected = linkSelection.has(txn.id);
                return (
                  <button
                    key={txn.id}
                    onClick={() => toggleLinkSelection(txn.id)}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "10px 14px", borderRadius: "10px",
                      border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                      background: selected ? "rgba(217,72,15,0.08)" : "rgba(255,255,255,0.02)",
                      cursor: "pointer", textAlign: "left", color: "var(--text-primary)", transition: "all 0.15s",
                    }}
                  >
                    <div>
                      <p style={{ fontWeight: 600, fontSize: "0.875rem" }}>{txn.description || "Recebimento"}</p>
                      <p style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", marginTop: "1px" }}>
                        {new Date(`${txn.date.split("T")[0]}T12:00:00`).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                      <span style={{ fontWeight: 700, color: "#22C55E" }}>+ {formatCurrency(Number(txn.value))}</span>
                      {selected && (
                        <span style={{ width: "18px", height: "18px", borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Check size={11} color="#fff" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <p style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}>
              Ao vincular, a fatura é baixada automaticamente com a data do recebimento.
            </p>
          </div>
        )}
      </DialogShell>
    </div>
  );
}
