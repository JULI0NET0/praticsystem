"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Link2, X, FileText, Loader2, Sparkles, Check } from "lucide-react";
import { fetchAvailableNotesForLinking, linkNoteToPlan } from "@/lib/contentPlans";
import { useToast } from "@/components/CustomToast";
import type { Note } from "@/types/database";

interface Props {
  isOpen: boolean;
  planId: string;
  clientId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LinkExistingNoteModal({
  isOpen,
  planId,
  clientId,
  onClose,
  onSuccess,
}: Props) {
  const { showToast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAllClients, setFilterAllClients] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setSearchTerm("");
    fetchAvailableNotesForLinking(filterAllClients ? null : clientId, planId)
      .then((data) => {
        setNotes(data);
      })
      .catch((err) => {
        showToast("Erro ao buscar notas: " + (err?.message || ""), "error");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, clientId, planId, filterAllClients, showToast]);

  const filteredNotes = useMemo(() => {
    if (!searchTerm.trim()) return notes;
    const term = searchTerm.toLowerCase();
    return notes.filter((n) => {
      const matchTitle = (n.title || "").toLowerCase().includes(term);
      const matchSubject = (n.subjects || []).some((s) => s.toLowerCase().includes(term));
      const matchClient = (n.client?.nome_fantasia || n.client?.name || "").toLowerCase().includes(term);
      return matchTitle || matchSubject || matchClient;
    });
  }, [notes, searchTerm]);

  const handleLink = async (note: Note) => {
    try {
      setLinkingId(note.id);
      await linkNoteToPlan(note.id, planId, { isScript: true, clientId: clientId || undefined });
      showToast(`Nota "${note.title || 'Sem título'}" vinculada como roteiro!`, "success");
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast("Erro ao vincular nota: " + (err?.message || ""), "error");
    } finally {
      setLinkingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{
          width: "100%",
          maxWidth: "580px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "20px",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "10px",
                background: "color-mix(in oklab, var(--accent) 15%, transparent)",
                color: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Link2 size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Vincular Nota como Roteiro
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", margin: 0 }}>
                Escolha uma nota existente para transformar em roteiro deste cronograma
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-tertiary)",
              cursor: "pointer",
              padding: 6,
              borderRadius: "8px",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div style={{ padding: "14px 22px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "var(--color-surface-sunken)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "8px 12px",
            }}
          >
            <Search size={16} color="var(--text-tertiary)" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por título, assunto ou cliente..."
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--text-primary)",
                fontSize: "0.85rem",
                width: "100%",
              }}
              autoFocus
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                style={{ background: "transparent", border: "none", color: "var(--text-tertiary)", cursor: "pointer" }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {clientId && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}>
                {filterAllClients ? "Mostrando notas de todos os clientes" : "Mostrando notas deste cliente"}
              </span>
              <button
                type="button"
                onClick={() => setFilterAllClients((prev) => !prev)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--accent)",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {filterAllClients ? "Filtrar apenas por este cliente" : "Buscar em todas as notas"}
              </button>
            </div>
          )}
        </div>

        {/* Notes List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
          {loading ? (
            <div style={{ padding: "36px 0", textAlign: "center", color: "var(--text-tertiary)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <Loader2 size={24} className="animate-spin" color="var(--accent)" />
              <span style={{ fontSize: "0.82rem" }}>Carregando notas disponíveis...</span>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div style={{ padding: "36px 0", textAlign: "center", color: "var(--text-tertiary)" }}>
              <FileText size={32} style={{ margin: "0 auto 8px auto", opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600 }}>Nenhuma nota encontrada</p>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.75rem" }}>
                {searchTerm ? "Tente buscar com outros termos." : "Crie uma nova nota ou use a busca geral."}
              </p>
            </div>
          ) : (
            filteredNotes.map((n) => {
              const isLinking = linkingId === n.id;
              const dateStr = n.updated_at || n.created_at || n.date;
              const formattedDate = dateStr
                ? new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
                : "";

              return (
                <div
                  key={n.id}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "12px",
                    background: "var(--color-surface-sunken)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {n.title || "Sem título"}
                      </span>
                      {n.is_script && (
                        <span
                          style={{
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: "6px",
                            background: "color-mix(in oklab, var(--accent) 15%, transparent)",
                            color: "var(--accent)",
                          }}
                        >
                          Roteiro
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.72rem", color: "var(--text-tertiary)" }}>
                      {formattedDate && <span>{formattedDate}</span>}
                      {n.client && (
                        <>
                          <span>•</span>
                          <span>{n.client.nome_fantasia || n.client.name}</span>
                        </>
                      )}
                      {(n.subjects ?? []).filter((s) => !s.startsWith("_")).length > 0 && (
                        <>
                          <span>•</span>
                          <span>{n.subjects.filter((s) => !s.startsWith("_")).slice(0, 2).join(", ")}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={isLinking}
                    onClick={() => handleLink(n)}
                    style={{
                      padding: "6px 14px",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isLinking ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Vinculando...
                      </>
                    ) : (
                      <>
                        <Link2 size={14} />
                        Vincular
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 22px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            justifyContent: "flex-end",
            background: "var(--color-surface-sunken)",
          }}
        >
          <button type="button" className="btn btn-secondary" onClick={onClose} style={{ fontSize: "0.82rem" }}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
