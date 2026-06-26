"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/CustomToast";
import { Loader2, LayoutDashboard, AlertTriangle, ListOrdered, Wallet, RefreshCw, Layers } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { FinancialKPIs } from "@/components/financeiro/FinancialKPIs";
import { DespesasList } from "@/components/financeiro/DespesasList";
import { LancamentosTable } from "@/components/financeiro/LancamentosTable";
import { FluxoCaixa } from "@/components/financeiro/FluxoCaixa";
import { AsaasSync } from "@/components/financeiro/AsaasSync";
import { DespesasVariaveis } from "@/components/financeiro/DespesasVariaveis";
import type { Expense, ExpenseEntry, AsaasTransaction, Invoice } from "@/types/database";

type Tab = "dashboard" | "despesas" | "lancamentos" | "fluxo" | "asaas" | "variaveis";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
  { id: "despesas", label: "Despesas Fixas", icon: <AlertTriangle size={16} /> },
  { id: "variaveis", label: "Despesas Variáveis", icon: <Layers size={16} /> },
  { id: "lancamentos", label: "Sistema", icon: <ListOrdered size={16} /> },
  { id: "asaas", label: "Banco", icon: <RefreshCw size={16} /> },
  { id: "fluxo", label: "Fluxo de Caixa", icon: <Wallet size={16} /> },
];

export default function FinanceiroPage() {
  const now = new Date();
  const { showToast } = useToast();

  const [tab, setTab] = useState<Tab>("dashboard");
  const [dateRange, setDateRange] = useState(() => {
    const y = now.getFullYear();
    const m = now.getMonth();
    return {
      start: new Date(y, m, 1).toISOString().split('T')[0],
      end: new Date(y, m + 1, 0).toISOString().split('T')[0],
    };
  });
  const [datePreset, setDatePreset] = useState<'all' | 'this_month' | 'prev_month' | 'next_month' | 'custom'>('this_month');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseEntries, setExpenseEntries] = useState<ExpenseEntry[]>([]);
  const [asaasTransactions, setAsaasTransactions] = useState<AsaasTransaction[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string; nome_fantasia?: string }[]>([]);
  const [asaasBalance, setAsaasBalance] = useState<{ balance: number; availableBalance: number } | null>(null);

  const handlePresetChange = (preset: 'all' | 'this_month' | 'prev_month' | 'next_month' | 'custom') => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const y = now.getFullYear();
      const m = now.getMonth();
      if (preset === 'all') {
        setDateRange({ start: "", end: "" });
      } else if (preset === 'this_month') {
        setDateRange({
          start: new Date(y, m, 1).toISOString().split('T')[0],
          end: new Date(y, m + 1, 0).toISOString().split('T')[0]
        });
      } else if (preset === 'prev_month') {
        setDateRange({
          start: new Date(y, m - 1, 1).toISOString().split('T')[0],
          end: new Date(y, m, 0).toISOString().split('T')[0]
        });
      } else if (preset === 'next_month') {
        setDateRange({
          start: new Date(y, m + 1, 1).toISOString().split('T')[0],
          end: new Date(y, m + 2, 0).toISOString().split('T')[0]
        });
      }
    }
  };

  const startDate = dateRange.start;
  const endDate = dateRange.end;
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const selectedMonthForComponents = startDate ? startDate.slice(0, 7) : currentMonthStr;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, expRes, entRes, txnRes, usrRes, ctrRes, cliRes] = await Promise.all([
        supabase.from("invoices").select("*"),
        supabase.from("expenses").select("*").order("created_at", { ascending: false }),
        supabase.from("expense_entries").select("*, expenses(id, description, category)").order("date", { ascending: false }),
        supabase.from("asaas_transactions").select("*").order("date", { ascending: false }),
        supabase.from("users").select("id, name"),
        supabase.from("contracts").select("id, status, client_id, billing_cycle"),
        supabase.from("clients").select("id, name, nome_fantasia"),
      ]);

      if (invRes.data) setInvoices(invRes.data);
      if (expRes.data) setExpenses(expRes.data);
      if (entRes.data) setExpenseEntries(entRes.data);
      if (txnRes.data) setAsaasTransactions(txnRes.data);
      if (usrRes.data) setUsers(usrRes.data);
      if (ctrRes.data) setContracts(ctrRes.data);
      if (cliRes.data) setClients(cliRes.data);
      if (cliRes.error) console.error("[financeiro] clients fetch error:", cliRes.error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/financeiro/asaas/balance");
      if (res.ok) {
        const data = await res.json();
        setAsaasBalance(data);
      }
    } catch {
      // saldo indisponível não bloqueia a página
    }
  }, []);

  useEffect(() => { fetchAll(); fetchBalance(); }, [fetchAll, fetchBalance]);

  // Dashboard KPI calculations
  const periodInvoices = invoices.filter((i) => {
    const d = i.due_date.split("T")[0];
    const startMatch = !startDate || d >= startDate;
    const endMatch = !endDate || d <= endDate;
    return startMatch && endMatch;
  });
  const faturamentoRealizado = periodInvoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.amount), 0);
  const faturamentoPrevisto = periodInvoices.reduce((s, i) => s + Number(i.amount), 0);

  const periodEntries = expenseEntries.filter((e) => {
    const d = e.date.split("T")[0];
    const startMatch = !startDate || d >= startDate;
    const endMatch = !endDate || d <= endDate;
    return startMatch && endMatch;
  });
  const despesas = periodEntries.filter((e) => e.status === "paid").reduce((s, e) => s + Number(e.amount), 0);
  const despesasPrevistas = periodEntries.filter((e) => e.status === "pending").reduce((s, e) => s + Number(e.amount), 0);

  const clientesAtivos = contracts.filter((c) => c.status === "active").length;

  // --- Handlers ---

  async function handleSaveExpense(data: Partial<Expense>) {
    let error: any;
    if (data.id) {
      const { id, ...rest } = data;
      ({ error } = await supabase.from("expenses").update(rest).eq("id", id));
    } else {
      ({ error } = await supabase.from("expenses").insert([data]));
    }
    if (error) {
      showToast(`Erro ao salvar despesa: ${error.message}`, "error");
      throw error;
    }
    const { data: updated } = await supabase.from("expenses").select("*").order("created_at", { ascending: false });
    if (updated) setExpenses(updated);
  }

  async function handleDeleteExpense(id: string) {
    const entries = expenseEntries.filter((e) => e.expense_id === id);
    const msg = entries.length > 0
      ? `Remover esta despesa e as ${entries.length} fatura(s) gerada(s)? Esta ação não pode ser desfeita.`
      : "Remover esta despesa? Esta ação não pode ser desfeita.";
    if (!confirm(msg)) return;
    await supabase.from("expense_entries").delete().eq("expense_id", id);
    await supabase.from("expenses").delete().eq("id", id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    setExpenseEntries((prev) => prev.filter((e) => e.expense_id !== id));
  }

  async function handleToggleExpense(id: string, status: "active" | "inactive") {
    await supabase.from("expenses").update({ status }).eq("id", id);
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
  }

  async function handleCreateEntry(data: Partial<ExpenseEntry>): Promise<ExpenseEntry | null> {
    const { data: created, error } = await supabase.from("expense_entries").insert([data]).select("*, expenses(id,description,category)").single();
    if (error) {
      showToast(`Erro ao registrar lançamento: ${error.message}`, "error");
      return null;
    }
    if (created) setExpenseEntries((prev) => [created, ...prev]);
    return created ?? null;
  }

  async function handleDeleteEntry(id: string) {
    await supabase.from("expense_entries").delete().eq("id", id);
    setExpenseEntries((prev) => prev.filter((e) => e.id !== id));
  }

  async function handleUpdateEntry(id: string, data: Partial<ExpenseEntry>) {
    const { data: updated } = await supabase.from("expense_entries").update(data).eq("id", id).select("*, expenses(id,description,category)").single();
    if (updated) setExpenseEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
  }

  async function handleSync(start: string, end: string) {
    setSyncing(true);
    try {
      const res = await fetch("/api/financeiro/asaas/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: start, endDate: end }),
      });
      const result = await res.json();
      if (result.imported > 0) {
        const { data } = await supabase.from("asaas_transactions").select("*").order("date", { ascending: false });
        if (data) setAsaasTransactions(data);
      }
      return result;
    } finally {
      setSyncing(false);
    }
  }

  async function handleLinkTransaction(asaasId: string, expenseEntryId?: string, invoiceId?: string) {
    await fetch("/api/financeiro/asaas/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asaas_transaction_id: asaasId, expense_entry_id: expenseEntryId, invoice_id: invoiceId }),
    });
    const [txnRes, entRes] = await Promise.all([
      supabase.from("asaas_transactions").select("*").order("date", { ascending: false }),
      supabase.from("expense_entries").select("*, expenses(id,description,category)").order("date", { ascending: false }),
    ]);
    if (txnRes.data) setAsaasTransactions(txnRes.data);
    if (entRes.data) setExpenseEntries(entRes.data);
  }

  async function handleUnlinkTransaction(asaasId: string) {
    await fetch("/api/financeiro/asaas/unlink", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asaas_transaction_id: asaasId }),
    });
    const [txnRes, invRes, entRes] = await Promise.all([
      supabase.from("asaas_transactions").select("*").order("date", { ascending: false }),
      supabase.from("invoices").select("*"),
      supabase.from("expense_entries").select("*, expenses(id,description,category)").order("date", { ascending: false }),
    ]);
    if (txnRes.data) setAsaasTransactions(txnRes.data);
    if (invRes.data) setInvoices(invRes.data);
    if (entRes.data) setExpenseEntries(entRes.data);
  }

  async function handleCreateInvoice(data: Partial<Invoice>) {
    const { data: created, error } = await supabase.from("invoices").insert([data]).select("*").single();
    if (error) {
      showToast(`Erro ao registrar cobrança: ${error.message}`, "error");
      throw error;
    }
    if (created) {
      setInvoices((prev) => [created, ...prev]);

      if (data.status === "paid") {
        const txnDate = (data.paid_at || data.due_date || new Date().toISOString().split("T")[0]) as string;
        const { data: txn } = await supabase
          .from("asaas_transactions")
          .insert([{
            description: data.description,
            value: data.amount,
            type: "CREDIT",
            date: txnDate,
            status: "RECEIVED",
            invoice_id: created.id,
            synced_at: new Date().toISOString(),
          }])
          .select("*")
          .single();
        if (txn) setAsaasTransactions((prev) => [txn, ...prev]);
      }
    }
    showToast("Cobrança registrada com sucesso!", "success");
  }

  async function handleUpdateInvoiceStatus(id: string, status: string, paidAt?: string) {
    const update: { status: string; paid_at?: string | null } = { status };
    if (status === "paid") {
      update.paid_at = paidAt || new Date().toISOString().split("T")[0];
    } else {
      update.paid_at = null;
    }
    const { error } = await supabase.from("invoices").update(update).eq("id", id);
    if (!error) {
      fetchAll();
    }
  }

  async function handleGenerateEntries(expenseId: string, startMonth: string, months: number) {
    const expense = expenses.find((e) => e.id === expenseId);
    if (!expense) return;
    const [y, m] = startMonth.split("-").map(Number);
    const entries = Array.from({ length: months }, (_, i) => {
      const d = new Date(y, m - 1 + i, expense.due_day || 1);
      return {
        expense_id: expenseId,
        description: expense.description,
        category: expense.category,
        amount: expense.amount,
        date: d.toISOString().split("T")[0],
        status: "pending",
      };
    });
    const { data } = await supabase
      .from("expense_entries")
      .insert(entries)
      .select("*, expenses(id,description,category)");
    if (data) setExpenseEntries((prev) => [...(data as typeof prev), ...prev]);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "120px" }}>
        <Loader2 size={40} color="var(--accent)" className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* KPIs + date controls (always visible) */}
      <FinancialKPIs
        faturamentoPrevisto={faturamentoPrevisto}
        faturamentoRealizado={faturamentoRealizado}
        despesas={despesas}
        despesasPrevistas={despesasPrevistas}
        clientesAtivos={clientesAtivos}
        dateRange={dateRange}
        datePreset={datePreset}
        onPresetChange={handlePresetChange}
        onRangeChange={setDateRange}
      />

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", background: "rgba(255,255,255,0.02)", padding: "4px", borderRadius: "16px", border: "1px solid var(--border)", overflowX: "auto" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              padding: "9px 18px",
              borderRadius: "12px",
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.875rem",
              whiteSpace: "nowrap",
              transition: "all 0.18s ease",
              background: tab === t.id ? "var(--accent)" : "transparent",
              color: tab === t.id ? "#fff" : "var(--text-secondary)",
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "dashboard" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Revenue vs Expenses bar comparison */}
          <div className="responsive-grid-2" style={{ gap: "20px" }}>
            <div className="glass-card" style={{ padding: "28px" }}>
              <h4 style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: "20px" }}>
                Receita × Despesa — {datePreset === "all" ? "Todos os Períodos" : datePreset === "this_month" ? "Este Mês" : datePreset === "prev_month" ? "Mês Anterior" : datePreset === "next_month" ? "Próximo Mês" : `${startDate} a ${endDate}`}
              </h4>
              {[
                { label: "Previsto", value: faturamentoPrevisto, color: "#60A5FA", max: Math.max(faturamentoPrevisto, despesas, 1) },
                { label: "Realizado", value: faturamentoRealizado, color: "#22C55E", max: Math.max(faturamentoPrevisto, despesas, 1) },
                { label: "Despesas", value: despesas, color: "#EF4444", max: Math.max(faturamentoPrevisto, despesas, 1) },
                { label: "Lucro", value: Math.max(faturamentoRealizado - despesas, 0), color: "var(--accent)", max: Math.max(faturamentoPrevisto, despesas, 1) },
              ].map((item) => (
                <div key={item.label} style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "0.825rem", fontWeight: 700, color: "var(--text-secondary)" }}>{item.label}</span>
                    <span style={{ fontSize: "0.9rem", fontWeight: 800, color: item.color }}>
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.value)}
                    </span>
                  </div>
                  <div style={{ height: "8px", background: "rgba(255,255,255,0.04)", borderRadius: "8px", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${(item.value / item.max) * 100}%`,
                        background: item.color,
                        borderRadius: "8px",
                        transition: "width 0.6s ease",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="glass-card" style={{ padding: "28px" }}>
              <h4 style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: "20px" }}>Despesas por Categoria</h4>
              {(() => {
                const cats: Record<string, number> = {};
                periodEntries.filter((e) => e.status === "paid").forEach((e) => {
                  const cat = e.category || "outros";
                  cats[cat] = (cats[cat] || 0) + Number(e.amount);
                });
                const catLabels: Record<string, string> = { pro_labore: "Pro-labore", funcionario_pj: "Func. PJ", sistema: "Sistemas", internet: "Internet", taxa_asaas: "Taxas Asaas", taxa_boleto: "Tx. Boleto", taxa_mensageria: "Tx. Mensageria", outros: "Outros" };
                const catColors: Record<string, string> = { pro_labore: "#A78BFA", funcionario_pj: "#60A5FA", sistema: "#34D399", internet: "#F59E0B", taxa_asaas: "#FB923C", taxa_boleto: "#F472B6", taxa_mensageria: "#38BDF8", outros: "var(--text-secondary)" };
                const total = Object.values(cats).reduce((s, v) => s + v, 0) || 1;
                const entries = Object.entries(cats).sort((a, b) => b[1] - a[1]);

                if (entries.length === 0) {
                  return <p style={{ color: "var(--text-tertiary)", fontSize: "0.875rem", paddingTop: "8px" }}>Sem despesas pagas no período.</p>;
                }

                return entries.map(([cat, val]) => (
                  <div key={cat} style={{ marginBottom: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: catColors[cat] || "var(--text-secondary)" }}>{catLabels[cat] || cat}</span>
                      <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val)}
                        <span style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", marginLeft: "6px" }}>({((val / total) * 100).toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div style={{ height: "6px", background: "rgba(255,255,255,0.04)", borderRadius: "6px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(val / total) * 100}%`, background: catColors[cat] || "var(--text-secondary)", borderRadius: "6px", transition: "width 0.5s ease" }} />
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Upcoming fixed expenses this month */}
          <div className="glass-card" style={{ padding: "28px" }}>
            <h4 style={{ fontWeight: 800, fontSize: "1rem", marginBottom: "16px" }}>Despesas Fixas — Próximos vencimentos</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px" }}>
              {expenses.filter((e) => e.status === "active" && e.recurrence === "monthly").slice(0, 8).map((e) => (
                <div key={e.id} style={{ padding: "14px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "14px" }}>
                  <p style={{ fontSize: "0.8rem", fontWeight: 700, marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description}</p>
                  <p style={{ fontSize: "1.1rem", fontWeight: 800, color: "#EF4444" }}>
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(e.amount))}
                  </p>
                  {e.due_day && <p style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", marginTop: "2px" }}>Dia {String(e.due_day).padStart(2, "0")}</p>}
                </div>
              ))}
              {expenses.filter((e) => e.status === "active" && e.recurrence === "monthly").length === 0 && (
                <p style={{ color: "var(--text-tertiary)", fontSize: "0.875rem", gridColumn: "1 / -1" }}>Nenhuma despesa fixa ativa cadastrada.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "despesas" && (
        <DespesasList
          expenses={expenses}
          expenseEntries={expenseEntries}
          users={users}
          asaasTransactions={asaasTransactions}
          onSave={handleSaveExpense}
          onDelete={handleDeleteExpense}
          onToggle={handleToggleExpense}
          onGenerateEntries={handleGenerateEntries}
          onUpdateEntry={handleUpdateEntry}
          onLinkTransaction={handleLinkTransaction}
        />
      )}

      {tab === "lancamentos" && (
        <LancamentosTable
          invoices={invoices}
          asaasTransactions={asaasTransactions}
          clients={clients}
          contracts={contracts}
          syncing={syncing}
          onSync={handleSync}
          onLinkTransaction={handleLinkTransaction}
          onUpdateInvoiceStatus={handleUpdateInvoiceStatus}
          onCreateInvoice={handleCreateInvoice}
          startDate={startDate}
          endDate={endDate}
        />
      )}

      {tab === "fluxo" && (
        <FluxoCaixa
          invoices={invoices}
          expenseEntries={expenseEntries}
          expenses={expenses}
          selectedMonth={selectedMonthForComponents}
        />
      )}

      {tab === "asaas" && (
        <AsaasSync
          asaasTransactions={asaasTransactions}
          expenseEntries={expenseEntries}
          invoices={invoices}
          expenses={expenses}
          clients={clients}
          users={users}
          syncing={syncing}
          onSync={handleSync}
          onLink={handleLinkTransaction}
          onUnlink={handleUnlinkTransaction}
          onUpdateInvoiceStatus={handleUpdateInvoiceStatus}
          onCreateEntry={handleCreateEntry}
          selectedMonth={selectedMonthForComponents}
          startDate={startDate}
          endDate={endDate}
          balance={asaasBalance}
          onRefreshBalance={fetchBalance}
        />
      )}

      {tab === "variaveis" && (
        <DespesasVariaveis
          expenses={expenses}
          expenseEntries={expenseEntries}
          clients={clients}
          users={users}
          asaasTransactions={asaasTransactions}
          startDate={startDate}
          endDate={endDate}
          onSaveGroup={handleSaveExpense}
          onDeleteGroup={handleDeleteExpense}
          onCreateEntry={handleCreateEntry}
          onUpdateEntry={handleUpdateEntry}
          onDeleteEntry={handleDeleteEntry}
          onLinkTransaction={handleLinkTransaction}
        />
      )}
    </div>
  );
}
