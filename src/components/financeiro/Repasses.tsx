"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Repeat, ArrowUpRight, ArrowDownLeft, Plus, X, Search, Check, ChevronDown } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import DialogShell from "@/components/DialogShell";
import type { AsaasTransaction } from "@/types/database";

interface ClientLite {
  id: string;
  name: string;
  nome_fantasia?: string;
}

interface RepassesProps {
  asaasTransactions: AsaasTransaction[];
  clients: ClientLite[];
  startDate: string;
  endDate: string;
  /** Marca/desmarca como repasse; opcionalmente atribui o cliente e define se o crédito abate o saldo */
  onSetPassthrough: (asaasId: string, isPassthrough: boolean, clientId?: string | null, offsets?: boolean) => Promise<void>;
  onSetClient: (asaasId: string, clientId: string | null) => Promise<void>;
}

const clientLabel = (c?: ClientLite) => c?.nome_fantasia || c?.name || "Cliente";

const fmtDate = (d: string) => new Date(d.split("T")[0] + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

interface ClientGroup {
  clientId: string | null;
  client?: ClientLite;
  adiantado: number;
  /** Reembolsos que abatem o saldo */
  reembolsado: number;
  /** Reembolsos extra/avulsos que NÃO abatem o saldo */
  reembolsadoExtra: number;
  saldo: number;
  txns: AsaasTransaction[];
}

/** Um crédito de repasse abate o saldo, a menos que passthrough_offsets === false */
const creditOffsets = (t: AsaasTransaction) => t.passthrough_offsets !== false;

export function Repasses({ asaasTransactions, clients, startDate, endDate, onSetPassthrough, onSetClient }: RepassesProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  // Saldo é "running": considera TODAS as transações marcadas, sem filtro de data,
  // senão o saldo a receber fica errado (um reembolso fora do período sumiria).
  const passthrough = useMemo(
    () => asaasTransactions.filter((t) => t.is_passthrough),
    [asaasTransactions]
  );

  const groups = useMemo<ClientGroup[]>(() => {
    const map = new Map<string, ClientGroup>();
    for (const t of passthrough) {
      const key = t.client_id || "__none__";
      if (!map.has(key)) {
        map.set(key, {
          clientId: t.client_id || null,
          client: clients.find((c) => c.id === t.client_id),
          adiantado: 0,
          reembolsado: 0,
          reembolsadoExtra: 0,
          saldo: 0,
          txns: [],
        });
      }
      const g = map.get(key)!;
      const val = Math.abs(Number(t.value));
      if (t.type === "DEBIT") g.adiantado += val;
      else if (creditOffsets(t)) g.reembolsado += val;
      else g.reembolsadoExtra += val;
      g.txns.push(t);
    }
    const list = Array.from(map.values());
    for (const g of list) {
      g.saldo = g.adiantado - g.reembolsado;
      g.txns.sort((a, b) => b.date.localeCompare(a.date));
    }
    // Saldo em aberto primeiro, depois "sem cliente", depois alfabético
    return list.sort((a, b) => {
      if (a.clientId === null && b.clientId !== null) return -1;
      if (b.clientId === null && a.clientId !== null) return 1;
      if (Math.abs(b.saldo) !== Math.abs(a.saldo)) return Math.abs(b.saldo) - Math.abs(a.saldo);
      return clientLabel(a.client).localeCompare(clientLabel(b.client));
    });
  }, [passthrough, clients]);

  const totalAdiantado = groups.reduce((s, g) => s + g.adiantado, 0);
  const totalReembolsado = groups.reduce((s, g) => s + g.reembolsado, 0);
  const totalReembolsadoExtra = groups.reduce((s, g) => s + g.reembolsadoExtra, 0);
  const saldoAReceber = totalAdiantado - totalReembolsado;

  async function handleToggleOffsets(txnId: string, nextOffsets: boolean) {
    setBusy(txnId);
    try {
      await onSetPassthrough(txnId, true, undefined, nextOffsets);
    } finally {
      setBusy(null);
    }
  }

  function toggleExpand(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleUnmark(txnId: string) {
    setBusy(txnId);
    try {
      await onSetPassthrough(txnId, false);
    } finally {
      setBusy(null);
    }
  }

  async function handleReassign(txnId: string, clientId: string | null) {
    setBusy(txnId);
    try {
      await onSetClient(txnId, clientId);
    } finally {
      setBusy(null);
    }
  }

  const kpis = [
    { label: "Adiantado", value: totalAdiantado, color: "#F59E0B", icon: <ArrowUpRight size={16} />, hint: "Pago em anúncios (saídas)" },
    {
      label: "Reembolsado",
      value: totalReembolsado,
      color: "#22C55E",
      icon: <ArrowDownLeft size={16} />,
      hint: totalReembolsadoExtra > 0.005
        ? `Abate saldo · + ${formatCurrency(totalReembolsadoExtra)} extra (não abate)`
        : "Devolvido pelos clientes",
    },
    { label: "Saldo a Receber", value: saldoAReceber, color: saldoAReceber > 0.005 ? "var(--accent)" : "#22C55E", icon: <Repeat size={16} />, hint: saldoAReceber > 0.005 ? "Ainda a reembolsar" : "Tudo quitado" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ fontSize: "1.4rem", fontWeight: 800, letterSpacing: "-0.01em" }}>Repasses · Tráfego Pago</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: "560px", marginTop: "4px" }}>
            Pagamentos que são só passagem de dinheiro (ex.: Facebook Ads reembolsado pelo cliente).
            Não entram em Faturamento, Despesas nem Fluxo de Caixa — aqui você acompanha o saldo a receber.
          </p>
        </div>
        <button
          onClick={() => setPickerOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", borderRadius: "12px",
            border: "1px solid var(--accent)", background: "rgba(217,72,15,0.12)", color: "var(--accent)",
            fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", whiteSpace: "nowrap",
          }}
        >
          <Plus size={16} /> Marcar transações
        </button>
      </div>

      {/* KPIs */}
      <div className="responsive-grid-3" style={{ gap: "14px" }}>
        {kpis.map((k) => (
          <div key={k.label} className="glass-card" style={{ padding: "20px", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", color: k.color }}>
              {k.icon}
              <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{k.label}</span>
            </div>
            <p style={{ fontSize: "1.5rem", fontWeight: 800, color: k.color }}>{formatCurrency(k.value)}</p>
            <p style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", marginTop: "4px", fontWeight: 600 }}>{k.hint}</p>
          </div>
        ))}
      </div>

      {/* Grupos por cliente */}
      {groups.length === 0 ? (
        <div className="glass-card" style={{ padding: "40px 24px", textAlign: "center" }}>
          <Repeat size={28} color="var(--text-tertiary)" style={{ margin: "0 auto 12px" }} />
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", fontWeight: 600 }}>Nenhum repasse marcado ainda.</p>
          <p style={{ color: "var(--text-tertiary)", fontSize: "0.82rem", marginTop: "4px" }}>
            Use "Marcar transações" para sinalizar um pagamento de anúncio e o reembolso correspondente.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {groups.map((g) => {
            const key = g.clientId || "__none__";
            const isOpen = expanded.has(key);
            const quitado = Math.abs(g.saldo) < 0.005;
            const statusMeta = g.clientId === null
              ? { label: "Sem cliente", color: "#F59E0B", bg: "rgba(245,158,11,0.12)" }
              : quitado
              ? { label: "Quitado", color: "#22C55E", bg: "rgba(34,197,94,0.12)" }
              : g.saldo > 0
              ? { label: "A receber", color: "var(--accent)", bg: "rgba(217,72,15,0.12)" }
              : { label: "Crédito", color: "#60A5FA", bg: "rgba(96,165,250,0.12)" };
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card"
                style={{ padding: 0, overflow: "hidden", border: "1px solid var(--border)" }}
              >
                <button
                  onClick={() => toggleExpand(key)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: "12px", padding: "16px 18px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                    <ChevronDown size={16} style={{ transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.18s", color: "var(--text-tertiary)", flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 800, fontSize: "0.95rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {g.clientId === null ? "Sem cliente atribuído" : clientLabel(g.client)}
                      </p>
                      <p style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", fontWeight: 600, marginTop: "2px" }}>
                        {g.txns.length} lançamento{g.txns.length !== 1 ? "s" : ""} · Adiantado {formatCurrency(g.adiantado)} · Reembolsado {formatCurrency(g.reembolsado)}
                        {g.reembolsadoExtra > 0.005 && ` · Extra ${formatCurrency(g.reembolsadoExtra)} (não abate)`}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: "1.05rem", fontWeight: 800, color: statusMeta.color }}>{formatCurrency(g.saldo)}</p>
                      <span style={{ fontSize: "0.62rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: statusMeta.color, background: statusMeta.bg, padding: "3px 8px", borderRadius: "999px" }}>
                        {statusMeta.label}
                      </span>
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div style={{ borderTop: "1px solid var(--border)", padding: "8px 18px 14px" }}>
                    {g.txns.map((t) => {
                      const isDebit = t.type === "DEBIT";
                      const offsets = creditOffsets(t);
                      const noOffset = !isDebit && !offsets;
                      return (
                        <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                            <span style={{ color: isDebit ? "#F59E0B" : "#22C55E", flexShrink: 0 }}>
                              {isDebit ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: "0.85rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {t.description || (isDebit ? "Pagamento de anúncio" : "Reembolso")}
                              </p>
                              <p style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", fontWeight: 600 }}>
                                {fmtDate(t.date)} · {isDebit ? "Adiantado" : "Reembolso"}
                                {noOffset && <span style={{ color: "#60A5FA" }}> · não abate saldo</span>}
                              </p>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                            <span style={{ fontSize: "0.9rem", fontWeight: 800, color: isDebit ? "#F59E0B" : "#22C55E" }}>
                              {isDebit ? "−" : "+"}{formatCurrency(Math.abs(Number(t.value)))}
                            </span>
                            {/* Alternar se o crédito abate o saldo (só para reembolsos) */}
                            {!isDebit && (
                              <button
                                onClick={() => handleToggleOffsets(t.id, !offsets)}
                                disabled={busy === t.id}
                                title={offsets ? "Abate o saldo — clique para NÃO abater" : "Não abate o saldo — clique para abater"}
                                style={{
                                  display: "flex", alignItems: "center", justifyContent: "center", width: "26px", height: "26px",
                                  borderRadius: "8px", border: `1px solid ${offsets ? "var(--border)" : "rgba(96,165,250,0.4)"}`,
                                  background: offsets ? "rgba(255,255,255,0.03)" : "rgba(96,165,250,0.12)",
                                  color: offsets ? "var(--text-tertiary)" : "#60A5FA", cursor: "pointer",
                                }}
                              >
                                <Repeat size={13} />
                              </button>
                            )}
                            {/* Reatribuir cliente */}
                            <select
                              value={t.client_id || ""}
                              disabled={busy === t.id}
                              onChange={(e) => handleReassign(t.id, e.target.value || null)}
                              className="input-dark"
                              style={{ fontSize: "0.72rem", padding: "4px 6px", borderRadius: "8px", maxWidth: "130px" }}
                              title="Atribuir a um cliente"
                            >
                              <option value="">Sem cliente</option>
                              {clients.map((c) => (
                                <option key={c.id} value={c.id}>{clientLabel(c)}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleUnmark(t.id)}
                              disabled={busy === t.id}
                              title="Remover do repasse"
                              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "26px", height: "26px", borderRadius: "8px", border: "1px solid var(--border)", background: "rgba(239,68,68,0.08)", color: "#EF4444", cursor: "pointer" }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <PickerDialog
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        transactions={asaasTransactions}
        clients={clients}
        startDate={startDate}
        endDate={endDate}
        onMark={onSetPassthrough}
      />
    </div>
  );
}

interface PickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: AsaasTransaction[];
  clients: ClientLite[];
  startDate: string;
  endDate: string;
  onMark: (asaasId: string, isPassthrough: boolean, clientId?: string | null) => Promise<void>;
}

function PickerDialog({ isOpen, onClose, transactions, clients, startDate, endDate, onMark }: PickerDialogProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Map<string, string>>(new Map()); // txnId -> clientId
  const [saving, setSaving] = useState(false);

  // Candidatas: ainda não marcadas como repasse e sem vínculo financeiro (despesa/fatura),
  // dentro do período selecionado, ordenadas por data desc.
  const candidates = useMemo(() => {
    return transactions
      .filter((t) => !t.is_passthrough && !t.expense_entry_id && !t.invoice_id && !t.confirms_asaas_transaction_id)
      .filter((t) => {
        const d = t.date.split("T")[0];
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
        return true;
      })
      .filter((t) => {
        if (!search.trim()) return true;
        return (t.description || "").toLowerCase().includes(search.trim().toLowerCase());
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, search, startDate, endDate]);

  const clientLbl = (c?: ClientLite) => c?.nome_fantasia || c?.name || "Cliente";

  function toggle(txnId: string) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(txnId)) next.delete(txnId);
      else next.set(txnId, "");
      return next;
    });
  }

  function setClientFor(txnId: string, clientId: string) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(txnId)) next.set(txnId, clientId);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      for (const [txnId, clientId] of selected.entries()) {
        await onMark(txnId, true, clientId || null);
      }
      setSelected(new Map());
      setSearch("");
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      title="Marcar transações como repasse"
      maxWidth="720px"
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-tertiary)" }}>
            {selected.size} selecionada{selected.size !== 1 ? "s" : ""}
          </span>
          <button
            onClick={handleSave}
            disabled={selected.size === 0 || saving}
            style={{
              display: "flex", alignItems: "center", gap: "8px", padding: "10px 18px", borderRadius: "12px",
              border: "none", background: selected.size === 0 ? "rgba(255,255,255,0.06)" : "var(--accent)",
              color: selected.size === 0 ? "var(--text-tertiary)" : "#fff", fontWeight: 700, fontSize: "0.85rem",
              cursor: selected.size === 0 || saving ? "not-allowed" : "pointer",
            }}
          >
            <Check size={16} /> {saving ? "Salvando…" : "Marcar como repasse"}
          </button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "12px" }}>
          <Search size={16} color="var(--text-tertiary)" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por descrição…"
            className="input-dark"
            style={{ border: "none", background: "transparent", padding: 0, fontSize: "0.85rem", flex: 1 }}
          />
        </div>

        <p style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", fontWeight: 600 }}>
          Mostrando transações sem vínculo no período. DÉBITO = pagamento do anúncio · CRÉDITO = reembolso recebido.
        </p>

        {candidates.length === 0 ? (
          <p style={{ color: "var(--text-tertiary)", fontSize: "0.9rem", textAlign: "center", padding: "24px 0" }}>
            Nenhuma transação disponível no período. Sincronize o Banco ou ajuste o filtro de datas.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "44vh", overflowY: "auto" }}>
            {candidates.map((t) => {
              const isSel = selected.has(t.id);
              const isDebit = t.type === "DEBIT";
              return (
                <div
                  key={t.id}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "12px",
                    border: `1px solid ${isSel ? "var(--accent)" : "var(--border)"}`,
                    background: isSel ? "rgba(217,72,15,0.08)" : "rgba(255,255,255,0.02)",
                  }}
                >
                  <button
                    onClick={() => toggle(t.id)}
                    style={{
                      width: "20px", height: "20px", borderRadius: "6px", flexShrink: 0, cursor: "pointer",
                      border: `1px solid ${isSel ? "var(--accent)" : "var(--border)"}`,
                      background: isSel ? "var(--accent)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
                    }}
                  >
                    {isSel && <Check size={13} />}
                  </button>
                  <span style={{ color: isDebit ? "#F59E0B" : "#22C55E", flexShrink: 0 }}>
                    {isDebit ? <ArrowUpRight size={15} /> : <ArrowDownLeft size={15} />}
                  </span>
                  <div style={{ minWidth: 0, flex: 1, cursor: "pointer" }} onClick={() => toggle(t.id)}>
                    <p style={{ fontSize: "0.82rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.description || (isDebit ? "Pagamento" : "Crédito")}
                    </p>
                    <p style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", fontWeight: 600 }}>
                      {fmtDate(t.date)} · {isDebit ? "Saída" : "Entrada"}
                    </p>
                  </div>
                  <span style={{ fontSize: "0.85rem", fontWeight: 800, color: isDebit ? "#F59E0B" : "#22C55E", flexShrink: 0 }}>
                    {isDebit ? "−" : "+"}{formatCurrency(Math.abs(Number(t.value)))}
                  </span>
                  {isSel && (
                    <select
                      value={selected.get(t.id) || ""}
                      onChange={(e) => setClientFor(t.id, e.target.value)}
                      className="input-dark"
                      style={{ fontSize: "0.72rem", padding: "5px 6px", borderRadius: "8px", maxWidth: "140px", flexShrink: 0 }}
                    >
                      <option value="">Sem cliente</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{clientLbl(c)}</option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DialogShell>
  );
}
