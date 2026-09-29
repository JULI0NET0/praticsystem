"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, ExternalLink, FolderPlus, Plus, Trash2, X, Loader2, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/CustomToast";
import {
  DEFAULT_CAPTURE_SUBFOLDERS,
  formatCaptureFolderName,
  type CaptureFolderRecord,
} from "@/lib/driveFolders";

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

interface CaptureFoldersProps {
  clientId: string;
  clientLabel: string;
  hasDriveFolder: boolean;
}

/** Lista as captações criadas no Drive (com links das subpastas) e o botão de nova captação. */
export default function CaptureFolders({ clientId, clientLabel, hasDriveFolder }: CaptureFoldersProps) {
  const { showToast } = useToast();
  const [records, setRecords] = useState<CaptureFolderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [date, setDate] = useState(todayIso());
  const [customName, setCustomName] = useState<string | null>(null);
  const [subfolders, setSubfolders] = useState<string[]>(DEFAULT_CAPTURE_SUBFOLDERS);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/drive/capture`, { headers: await authHeaders() });
      if (res.ok) setRecords(await res.json());
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  // Sugestão acompanha a data até o nome ser editado à mão.
  const folderName = customName ?? formatCaptureFolderName(clientLabel, date);

  const openModal = () => {
    setDate(todayIso());
    setCustomName(null);
    setSubfolders(DEFAULT_CAPTURE_SUBFOLDERS);
    setModalOpen(true);
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/drive/capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ folderName, captureDate: date, subfolders }),
      });
      const data = await res.json();
      if (res.status === 409 && data.url) {
        showToast("Já existe uma pasta com esse nome. Abrindo...", "info");
        window.open(data.url, "_blank");
        return;
      }
      if (!res.ok) throw new Error(data.error || "Erro ao criar pastas.");
      showToast("Pasta de captação criada!", "success");
      setModalOpen(false);
      await load();
      if (data.record?.id) setExpanded(data.record.id);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Erro ao criar pastas.", "error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className="glass-card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(66, 133, 244, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#4285F4" }}>
              <Camera size={20} />
            </div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Captações</h3>
          </div>
          <button
            onClick={openModal}
            disabled={!hasDriveFolder}
            title={hasDriveFolder ? undefined : "Vincule a pasta do Google Drive primeiro"}
            className="btn btn-accent"
            style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#4285F4", borderColor: "#4285F4", opacity: hasDriveFolder ? 1 : 0.5 }}
          >
            <FolderPlus size={18} /> Nova captação
          </button>
        </div>

        {loading ? (
          <Loader2 size={18} className="animate-spin" style={{ color: "var(--text-tertiary)" }} />
        ) : records.length === 0 ? (
          <p style={{ color: "var(--text-tertiary)", fontSize: "0.875rem" }}>
            Nenhuma pasta de captação criada pelo sistema ainda.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {records.map((r) => {
              const open = expanded === r.id;
              return (
                <div key={r.id} style={{ border: "1px solid var(--border-subtle, rgba(255,255,255,0.08))", borderRadius: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 14px" }}>
                    <button
                      onClick={() => setExpanded(open ? null : r.id)}
                      style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, background: "none", border: "none", color: "inherit", cursor: "pointer", textAlign: "left" }}
                    >
                      <ChevronDown size={16} style={{ transform: open ? "none" : "rotate(-90deg)", transition: "transform .15s" }} />
                      <span style={{ fontWeight: 600 }}>{r.name}</span>
                      {r.capture_date && <span style={{ color: "var(--text-tertiary)", fontSize: "0.8rem" }}>{formatDate(r.capture_date)}</span>}
                    </button>
                    <a href={r.folder_url} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", fontSize: "0.8rem" }}>
                      <ExternalLink size={14} /> Abrir
                    </a>
                  </div>
                  {open && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "0 14px 14px" }}>
                      {r.subfolders.map((s) => (
                        <a key={s.id} href={s.url} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", fontSize: "0.8rem" }}>
                          {s.name}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {modalOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 110, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", backgroundColor: "var(--color-scrim)" }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card"
              style={{ width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto", padding: "32px" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Nova captação</h2>
                <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}>
                  <X size={24} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Data da captação</label>
                  <input type="date" className="input-dark" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Nome da pasta</label>
                  <input
                    className="input-dark"
                    value={folderName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Subpastas</label>
                  {subfolders.map((name, i) => (
                    <div key={i} style={{ display: "flex", gap: "8px" }}>
                      <input
                        className="input-dark"
                        style={{ flex: 1 }}
                        value={name}
                        onChange={(e) => setSubfolders(subfolders.map((s, j) => (j === i ? e.target.value : s)))}
                      />
                      <button
                        className="btn btn-secondary"
                        style={{ padding: "10px" }}
                        onClick={() => setSubfolders(subfolders.filter((_, j) => j !== i))}
                        aria-label="Remover subpasta"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    className="btn btn-secondary"
                    style={{ display: "flex", alignItems: "center", gap: "6px", alignSelf: "flex-start" }}
                    onClick={() => setSubfolders([...subfolders, ""])}
                  >
                    <Plus size={16} /> Adicionar subpasta
                  </button>
                </div>

                <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setModalOpen(false)} disabled={creating}>Cancelar</button>
                  <button
                    className="btn btn-accent"
                    style={{ flex: 1, backgroundColor: "#4285F4", borderColor: "#4285F4", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                    onClick={handleCreate}
                    disabled={creating || !folderName.trim()}
                  >
                    {creating ? <><Loader2 size={16} className="animate-spin" /> Criando...</> : "Criar pastas"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
