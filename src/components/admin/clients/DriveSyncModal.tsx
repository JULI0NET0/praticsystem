"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, X, HardDrive } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/CustomToast";

interface SyncRow {
  clientId: string;
  name: string;
  status: string;
  currentUrl: string | null;
  folderId: string | null;
  confidence: "exact" | "partial" | null;
}

interface DriveFolder { id: string; name: string }

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Casa cada cliente com a pasta dele em "01 PRATIC" e atualiza google_drive_url. */
export default function DriveSyncModal({ onClose, onApplied }: { onClose: () => void; onApplied: () => void }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [rows, setRows] = useState<SyncRow[]>([]);
  const [choice, setChoice] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/clients/drive-sync", { headers: await authHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao ler o Drive.");
        setFolders(data.folders);
        setRows(data.rows);
        const initial: Record<string, string> = {};
        for (const r of data.rows as SyncRow[]) if (r.folderId) initial[r.clientId] = r.folderId;
        setChoice(initial);
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Erro ao ler o Drive.", "error");
        onClose();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isChanged = (r: SyncRow) => {
    const fid = choice[r.clientId];
    return !!fid && !(r.currentUrl || "").includes(fid);
  };
  const pending = rows.filter(isChanged);

  const apply = async () => {
    setApplying(true);
    try {
      const res = await fetch("/api/clients/drive-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ updates: pending.map((r) => ({ clientId: r.clientId, folderId: choice[r.clientId] })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao atualizar.");
      showToast(`${data.updated} link(s) atualizado(s)${data.failed ? `, ${data.failed} com erro` : ""}.`, data.failed ? "error" : "success");
      onApplied();
      onClose();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Erro ao atualizar.", "error");
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
            <HardDrive size={22} color="#4285F4" />
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>Sincronizar links do Drive</h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                Confira a pasta sugerida para cada cliente antes de aplicar.
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}><X size={22} /></button>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "32px" }}><Loader2 className="animate-spin" /></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {rows.map((r) => (
              <div key={r.clientId} style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{r.name}</div>
                  <div style={{ fontSize: "0.75rem", color: isChanged(r) ? "var(--color-warning, #f59e0b)" : "var(--text-tertiary)" }}>
                    {!choice[r.clientId] ? (r.currentUrl ? "Mantém o link atual" : "Sem pasta") : isChanged(r) ? (r.currentUrl ? "Vai substituir o link atual" : "Vai vincular") : "Já está atualizado"}
                    {r.confidence === "partial" && choice[r.clientId] === r.folderId ? " · nome parecido, confira" : ""}
                  </div>
                </div>
                <select
                  className="input-dark"
                  style={{ flex: "1 1 220px" }}
                  value={choice[r.clientId] || ""}
                  onChange={(e) => setChoice({ ...choice, [r.clientId]: e.target.value })}
                >
                  <option value="">— não alterar —</option>
                  {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: "12px" }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose} disabled={applying}>Cancelar</button>
          <button className="btn btn-accent" style={{ flex: 1, backgroundColor: "#4285F4", borderColor: "#4285F4" }} onClick={apply} disabled={applying || loading || pending.length === 0}>
            {applying ? "Aplicando..." : `Aplicar (${pending.length})`}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
