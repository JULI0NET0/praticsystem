"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, X, FolderPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/CustomToast";

type Action = "criar" | "criada" | "ja_existe" | "sem_pasta" | "erro";

interface Row {
  clientId: string;
  name: string;
  status: string | null;
  action: Action;
  detail?: string;
}

const LABEL: Record<Action, string> = {
  criar: "Vai criar",
  criada: "Criada",
  ja_existe: "Já existe",
  sem_pasta: "Sem pasta do Drive vinculada",
  erro: "Erro",
};

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Cria "PARA APROVAÇÃO" dentro da pasta de cada cliente, depois de mostrar a simulação. */
export default function ApprovalFoldersModal({ onClose }: { onClose: () => void }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/clients/drive/para-aprovacao", { headers: await authHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao ler o Drive.");
        setRows(data.rows);
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Erro ao ler o Drive.", "error");
        onClose();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toCreate = rows.filter((r) => r.action === "criar").length;

  const apply = async () => {
    setApplying(true);
    try {
      const res = await fetch("/api/clients/drive/para-aprovacao", { method: "POST", headers: await authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar as pastas.");
      const result = data.rows as Row[];
      setRows(result);
      setDone(true);
      const created = result.filter((r) => r.action === "criada").length;
      const failed = result.filter((r) => r.action === "erro").length;
      showToast(`${created} pasta(s) criada(s)${failed ? `, ${failed} com erro` : ""}.`, failed ? "error" : "success");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Erro ao criar as pastas.", "error");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }} onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-card"
        style={{ width: "100%", maxWidth: "720px", maxHeight: "90vh", overflowY: "auto", padding: "28px", display: "flex", flexDirection: "column", gap: "20px" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FolderPlus size={22} color="#4285F4" />
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>Criar pasta PARA APROVAÇÃO</h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                Dentro da pasta de cada cliente no Drive. Confira antes de criar.
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}><X size={22} /></button>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "32px" }}><Loader2 className="animate-spin" /></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {rows.map((r) => (
              <div key={r.clientId} style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                <span style={{ fontWeight: 600 }}>{r.name}</span>
                <span style={{ fontSize: "0.8rem", color: r.action === "criar" || r.action === "criada" ? "var(--color-success, #22c55e)" : r.action === "ja_existe" ? "var(--text-tertiary)" : "var(--color-warning, #f59e0b)" }}>
                  {LABEL[r.action]}{r.detail ? ` · ${r.detail}` : ""}
                </span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: "12px" }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose} disabled={applying}>{done ? "Fechar" : "Cancelar"}</button>
          {!done && (
            <button className="btn btn-accent" style={{ flex: 1, backgroundColor: "#4285F4", borderColor: "#4285F4" }} onClick={apply} disabled={applying || loading || toCreate === 0}>
              {applying ? "Criando..." : `Criar (${toCreate})`}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
