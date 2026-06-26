"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Check } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import DialogShell from "@/components/DialogShell";
import type { AsaasTransaction } from "@/types/database";

interface ExpenseLinkDialogProps {
  isOpen: boolean;
  entry: { id: string; description: string; amount: number; date: string } | null;
  debits: AsaasTransaction[];
  linking: boolean;
  onClose: () => void;
  onConfirm: (txnIds: string[], paymentDate: string) => Promise<void>;
}

export function ExpenseLinkDialog({
  isOpen,
  entry,
  debits,
  linking,
  onClose,
  onConfirm,
}: ExpenseLinkDialogProps) {
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("");
  const [selection, setSelection] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (entry) {
      setSearch("");
      setMonth(entry.date.split("T")[0].slice(0, 7));
      setSelection(new Set());
    }
  }, [entry?.id]);

  const candidates = useMemo(() => {
    return debits.filter((t) => {
      const inMonth = !month || t.date.split("T")[0].slice(0, 7) === month;
      const matchSearch = !search || (t.description || "").toLowerCase().includes(search.toLowerCase());
      return inMonth && matchSearch;
    });
  }, [debits, month, search]);

  const selectedTotal = useMemo(
    () => debits.filter((t) => selection.has(t.id)).reduce((s, t) => s + Number(t.value), 0),
    [debits, selection]
  );

  function toggle(id: string) {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleConfirm() {
    if (!entry || selection.size === 0) return;
    let paymentDate = entry.date.split("T")[0];
    for (const id of selection) {
      const txn = debits.find((t) => t.id === id);
      if (txn) paymentDate = txn.date.split("T")[0];
    }
    await onConfirm(Array.from(selection), paymentDate);
  }

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      title="Vincular Pagamento ao Banco"
      maxWidth="520px"
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-accent"
            onClick={handleConfirm}
            disabled={linking || selection.size === 0}
          >
            {linking ? "Vinculando..." : `Vincular${selection.size > 0 ? ` (${selection.size})` : ""}`}
          </button>
        </div>
      }
    >
      {entry && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Entry summary */}
          <div style={{ padding: "12px 16px", borderRadius: "12px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>{entry.description}</p>
            <p style={{ fontWeight: 800, fontSize: "1.05rem", color: "#EF4444", marginTop: "2px" }}>
              − {formatCurrency(entry.amount)}
            </p>
          </div>

          {/* Search + month */}
          <div style={{ display: "flex", gap: "8px" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Search size={13} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
              <input
                className="input-dark"
                style={{ width: "100%", paddingLeft: "30px", fontSize: "0.85rem" }}
                placeholder="Buscar débito..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <input
              type="month"
              className="input-dark"
              style={{ width: "130px", fontSize: "0.85rem" }}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>

          {selection.size > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: "10px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                {selection.size} selecionada(s)
              </span>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: selectedTotal >= entry.amount ? "#22C55E" : "#F59E0B" }}>
                {formatCurrency(selectedTotal)}{selectedTotal >= entry.amount ? " ✓" : ""}
              </span>
            </div>
          )}

          {/* Candidates */}
          <div style={{ maxHeight: "280px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
            {candidates.length === 0 ? (
              <p style={{ fontSize: "0.82rem", color: "var(--text-tertiary)", textAlign: "center", padding: "24px" }}>
                Nenhum débito sem vínculo no período. Sincronize o Banco se necessário.
              </p>
            ) : candidates.map((txn) => {
              const selected = selection.has(txn.id);
              return (
                <button
                  key={txn.id}
                  onClick={() => toggle(txn.id)}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 14px", borderRadius: "10px",
                    border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                    background: selected ? "rgba(217,72,15,0.08)" : "rgba(255,255,255,0.02)",
                    cursor: "pointer", textAlign: "left", color: "var(--text-primary)", transition: "all 0.15s",
                  }}
                >
                  <div>
                    <p style={{ fontWeight: 600, fontSize: "0.875rem" }}>{txn.description || "Débito"}</p>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", marginTop: "1px" }}>
                      {new Date(`${txn.date.split("T")[0]}T12:00:00`).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    <span style={{ fontWeight: 700, color: "#EF4444" }}>− {formatCurrency(Number(txn.value))}</span>
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
            Ao vincular, o lançamento é baixado automaticamente com a data da movimentação.
          </p>
        </div>
      )}
    </DialogShell>
  );
}
