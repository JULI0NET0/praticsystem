"use client";

import { useState, useMemo } from "react";
import { Search, Building2, FileText, Layers, Plus, Check } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import DialogShell from "@/components/DialogShell";
import type { Invoice, ExpenseEntry, Expense } from "@/types/database";

type LinkTarget =
  | { kind: "invoice"; id: string; label: string }
  | { kind: "expense_entry"; id: string; label: string }
  | { kind: "variable_group"; groupId: string; label: string };

type ActiveTab = "fatura" | "fixa" | "variavel";

interface AsaasLinkDialogProps {
  isOpen: boolean;
  transaction: {
    id: string;
    description?: string;
    value: number;
    type: "CREDIT" | "DEBIT";
    date: string;
  } | null;
  invoices: Invoice[];
  expenseEntries: ExpenseEntry[];
  expenses: Expense[];
  clients: { id: string; name: string; nome_fantasia?: string }[];
  linking: boolean;
  suggestedClientId?: string;
  defaultCategory?: string;
  onClose: () => void;
  onConfirm: (target: LinkTarget, notes?: string) => Promise<void>;
  onCreateVariableEntry: (groupId: string, amount: number, date: string) => Promise<ExpenseEntry | null>;
}

export function AsaasLinkDialog({
  isOpen,
  transaction,
  invoices,
  expenseEntries,
  expenses,
  clients,
  linking,
  suggestedClientId,
  defaultCategory,
  onClose,
  onConfirm,
  onCreateVariableEntry,
}: AsaasLinkDialogProps) {
  const defaultTab: ActiveTab = transaction?.type === "CREDIT" ? "fatura" : (defaultCategory ? "variavel" : "fixa");
  const [tab, setTab] = useState<ActiveTab>(defaultTab);
  const [search, setSearch] = useState("");

  const txnMonth = transaction ? transaction.date.slice(0, 7) : "";
  const [monthFilter, setMonthFilter] = useState(txnMonth);

  function nextMonthOf(ym: string): string {
    if (!ym) return "";
    const [y, m] = ym.split("-").map(Number);
    const d = new Date(y, m, 1); // m is already 1-based; new Date(y, m, 1) gives first day of next month
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  const [selected, setSelected] = useState<LinkTarget | null>(null);
  const [creatingForGroup, setCreatingForGroup] = useState<string | null>(null);
  const [newEntryAmount, setNewEntryAmount] = useState("");
  const [notes, setNotes] = useState("");

  const suggestedClient = suggestedClientId ? clients.find((c) => c.id === suggestedClientId) : undefined;

  // Reset when transaction changes
  useMemo(() => {
    setTab(transaction?.type === "CREDIT" ? "fatura" : (defaultCategory ? "variavel" : "fixa"));
    // Pre-populate search with suggested client name (invoices) or skip for fees
    setSearch(suggestedClient && !defaultCategory ? (suggestedClient.nome_fantasia || suggestedClient.name) : "");
    setSelected(null);
    setCreatingForGroup(null);
    setNewEntryAmount(transaction ? String(transaction.value) : "");
    setNotes("");
    if (transaction) setMonthFilter(transaction.date.slice(0, 7));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transaction?.id]);

  const pendingInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const inMonth = !monthFilter || inv.due_date.slice(0, 7) === monthFilter;
      const matchSearch = !search || (inv.description + (clients.find((c) => c.id === inv.client_id)?.nome_fantasia ?? "")).toLowerCase().includes(search.toLowerCase());
      return inMonth && matchSearch && inv.status !== "paid";
    });
  }, [invoices, monthFilter, search, clients]);

  const pendingEntries = useMemo(() => {
    const next = nextMonthOf(monthFilter);
    return expenseEntries.filter((e) => {
      const parentExpense = expenses.find((ex) => ex.id === e.expense_id);
      if (parentExpense?.type !== "fixed" && e.expense_id) return false;
      // inclui mês atual do filtro + próximo mês (adiantamentos para o mês seguinte)
      const entryMonth = e.date.slice(0, 7);
      const inMonth = !monthFilter || entryMonth === monthFilter || entryMonth === next;
      const matchSearch = !search || e.description.toLowerCase().includes(search.toLowerCase());
      return inMonth && matchSearch && e.status === "pending";
    });
  }, [expenseEntries, expenses, monthFilter, search]);

  const variableGroups = useMemo(() => {
    return expenses.filter((e) => {
      if (e.type !== "variable") return false;
      // When opened from a fee quick-link, show matching category groups first
      if (defaultCategory && !search && e.category !== defaultCategory) return false;
      return !search || e.description.toLowerCase().includes(search.toLowerCase());
    });
  }, [expenses, search, defaultCategory]);

  async function handleConfirm() {
    if (!selected) return;
    if (selected.kind === "variable_group") {
      const amount = Number(newEntryAmount) || transaction?.value || 0;
      const entry = await onCreateVariableEntry(selected.groupId, amount, transaction?.date ?? new Date().toISOString().split("T")[0]);
      if (entry) {
        await onConfirm({ kind: "expense_entry", id: entry.id, label: selected.label }, notes || undefined);
      }
    } else {
      await onConfirm(selected, notes || undefined);
    }
  }

  // Cobrança recebida (CREDIT) só vincula a Fatura (receita); saída (DEBIT) só a Despesa.
  const allowedTabs: ActiveTab[] = transaction?.type === "CREDIT" ? ["fatura"] : ["fixa", "variavel"];
  const ALL_TABS: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: "fatura", label: "Fatura Cliente", icon: <Building2 size={13} /> },
    { id: "fixa", label: "Despesa Fixa", icon: <FileText size={13} /> },
    { id: "variavel", label: "Despesa Variável", icon: <Layers size={13} /> },
  ];
  const TAB_DEFS = ALL_TABS.filter((t) => allowedTabs.includes(t.id));

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      title="Vincular Transação"
      maxWidth="520px"
      footer={
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {selected && (
            <textarea
              className="input-dark"
              rows={2}
              style={{ width: "100%", fontSize: "0.82rem", resize: "none" }}
              placeholder="Observação interna (opcional) — ex: adiantamento, parte 1/2..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button
              className="btn btn-accent"
              onClick={handleConfirm}
              disabled={!selected || linking}
            >
              {linking ? "Vinculando..." : "Confirmar Vínculo"}
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Transaction summary */}
        {transaction && (
          <div style={{
            padding: "12px 16px", borderRadius: "12px",
            background: transaction.type === "CREDIT" ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)",
            border: `1px solid ${transaction.type === "CREDIT" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
          }}>
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "2px" }}>
              Transação Asaas — {transaction.type === "CREDIT" ? "Crédito" : "Débito"}
            </p>
            <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>{transaction.description || "Sem descrição"}</p>
            <p style={{ fontWeight: 800, fontSize: "1.05rem", color: transaction.type === "CREDIT" ? "#22C55E" : "#EF4444", marginTop: "2px" }}>
              {transaction.type === "CREDIT" ? "+" : "−"} {formatCurrency(transaction.value)}
              <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "var(--text-tertiary)", marginLeft: "8px" }}>
                {new Date(`${transaction.date}T12:00:00`).toLocaleDateString("pt-BR")}
              </span>
            </p>
          </div>
        )}

        {/* Suggested client banner */}
        {suggestedClient && tab === "fatura" && (
          <div style={{
            padding: "10px 14px", borderRadius: "10px",
            background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)",
            display: "flex", alignItems: "center", gap: "8px",
          }}>
            <span style={{ fontSize: "0.78rem", color: "#F59E0B" }}>?</span>
            <p style={{ fontSize: "0.82rem", color: "#F59E0B", fontWeight: 600, margin: 0 }}>
              Possível cliente:{" "}
              <span style={{ fontWeight: 800 }}>{suggestedClient.nome_fantasia || suggestedClient.name}</span>
            </p>
          </div>
        )}

        {/* Search + month */}
        <div style={{ display: "flex", gap: "8px" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={13} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
            <input
              className="input-dark"
              style={{ width: "100%", paddingLeft: "30px", fontSize: "0.85rem" }}
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <input
            type="month"
            className="input-dark"
            style={{ width: "130px", fontSize: "0.85rem" }}
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", background: "rgba(255,255,255,0.02)", padding: "3px", borderRadius: "12px", border: "1px solid var(--border)" }}>
          {TAB_DEFS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSelected(null); }}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
                padding: "7px 10px", borderRadius: "9px", border: "none", cursor: "pointer",
                fontSize: "0.78rem", fontWeight: 700, transition: "all 0.15s",
                background: tab === t.id ? "var(--accent)" : "transparent",
                color: tab === t.id ? "#fff" : "var(--text-secondary)",
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ maxHeight: "280px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
          {/* Fatura Cliente */}
          {tab === "fatura" && (
            pendingInvoices.length === 0 ? (
              <p style={{ fontSize: "0.82rem", color: "var(--text-tertiary)", textAlign: "center", padding: "24px" }}>
                Nenhuma fatura pendente no período.
              </p>
            ) : pendingInvoices.map((inv) => {
              const client = clients.find((c) => c.id === inv.client_id);
              const clientName = client?.nome_fantasia || client?.name || "Cliente";
              const targetId = `inv-${inv.id}`;
              const isSelected = selected?.kind === "invoice" && selected.id === inv.id;
              return (
                <button
                  key={inv.id}
                  onClick={() => setSelected({ kind: "invoice", id: inv.id, label: clientName })}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 14px", borderRadius: "10px", border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                    background: isSelected ? "rgba(217,72,15,0.08)" : "rgba(255,255,255,0.02)",
                    cursor: "pointer", textAlign: "left", color: "var(--text-primary)", transition: "all 0.15s",
                  }}
                >
                  <div>
                    <p style={{ fontWeight: 600, fontSize: "0.875rem" }}>{clientName}</p>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", marginTop: "1px" }}>
                      vcto {new Date(`${inv.due_date}T12:00:00`).toLocaleDateString("pt-BR")} · {inv.description}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    <span style={{ fontWeight: 700, color: "#22C55E" }}>{formatCurrency(Number(inv.amount))}</span>
                    {isSelected && <Check size={14} color="var(--accent)" />}
                  </div>
                </button>
              );
            })
          )}

          {/* Despesa Fixa */}
          {tab === "fixa" && (
            pendingEntries.length === 0 ? (
              <p style={{ fontSize: "0.82rem", color: "var(--text-tertiary)", textAlign: "center", padding: "24px" }}>
                Nenhuma despesa fixa pendente no período.
              </p>
            ) : pendingEntries.map((entry) => {
              const isSelected = selected?.kind === "expense_entry" && selected.id === entry.id;
              return (
                <button
                  key={entry.id}
                  onClick={() => setSelected({ kind: "expense_entry", id: entry.id, label: entry.description })}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 14px", borderRadius: "10px", border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                    background: isSelected ? "rgba(217,72,15,0.08)" : "rgba(255,255,255,0.02)",
                    cursor: "pointer", textAlign: "left", color: "var(--text-primary)", transition: "all 0.15s",
                  }}
                >
                  <div>
                    <p style={{ fontWeight: 600, fontSize: "0.875rem" }}>{entry.description}</p>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", marginTop: "1px" }}>
                      {new Date(`${entry.date.split("T")[0]}T12:00:00`).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    <span style={{ fontWeight: 700, color: "#EF4444" }}>−{formatCurrency(Number(entry.amount))}</span>
                    {isSelected && <Check size={14} color="var(--accent)" />}
                  </div>
                </button>
              );
            })
          )}

          {/* Despesa Variável */}
          {tab === "variavel" && (
            variableGroups.length === 0 ? (
              <p style={{ fontSize: "0.82rem", color: "var(--text-tertiary)", textAlign: "center", padding: "24px" }}>
                Nenhum grupo variável. Crie um na aba Variáveis.
              </p>
            ) : variableGroups.map((group) => {
              const isSelected = selected?.kind === "variable_group" && selected.groupId === group.id;
              return (
                <div key={group.id} style={{ borderRadius: "10px", border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`, overflow: "hidden" }}>
                  <button
                    onClick={() => {
                      setSelected(isSelected ? null : { kind: "variable_group", groupId: group.id, label: group.description });
                      setCreatingForGroup(group.id);
                    }}
                    style={{
                      width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "10px 14px", background: isSelected ? "rgba(217,72,15,0.08)" : "rgba(255,255,255,0.02)",
                      border: "none", cursor: "pointer", textAlign: "left", color: "var(--text-primary)", transition: "all 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Layers size={14} color={isSelected ? "var(--accent)" : "var(--text-secondary)"} />
                      <p style={{ fontWeight: 600, fontSize: "0.875rem" }}>{group.description}</p>
                      <span className="badge" style={{ fontSize: "0.65rem" }}>{group.category}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}>+ Nova entrada</span>
                      {isSelected && <Check size={14} color="var(--accent)" />}
                    </div>
                  </button>

                  {isSelected && (
                    <div style={{ padding: "10px 14px", background: "rgba(217,72,15,0.04)", borderTop: "1px solid var(--border)" }}>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: 600 }}>
                        Valor do lançamento a criar neste grupo:
                      </p>
                      <input
                        className="input-dark"
                        type="number"
                        min="0"
                        step="0.01"
                        style={{ width: "160px", fontSize: "0.85rem" }}
                        value={newEntryAmount}
                        onChange={(e) => setNewEntryAmount(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </DialogShell>
  );
}
