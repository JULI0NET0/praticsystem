"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ExternalLink,
  Check,
  Loader2,
  Calendar,
  Tag,
  Trash2,
  Sparkles,
  Clapperboard,
  Unlink,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/CustomToast";
import { useConfirm } from "@/components/ConfirmProvider";
import { unlinkNoteFromPlan } from "@/lib/contentPlans";
import type { Note } from "@/types/database";

const BlockEditor = dynamic(() => import("@/components/notas/BlockEditor"), {
  ssr: false,
  loading: () => (
    <div style={{ padding: "32px 0", color: "var(--text-tertiary)", fontSize: "0.9rem" }}>
      Carregando editor de roteiro…
    </div>
  ),
});

const SAVE_DELAY = 800;

interface Props {
  noteId: string | null;
  onClose: () => void;
  onUpdated?: () => void;
  onUnlinked?: () => void;
}

export default function ScriptNoteDrawer({
  noteId,
  onClose,
  onUpdated,
  onUnlinked,
}: Props) {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [note, setNote] = useState<Note | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newSubject, setNewSubject] = useState("");

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoadedRef = useRef<string | null>(null);

  const fetchNote = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notes")
        .select(`
          *,
          author:users!notes_user_id_fkey(id, name, avatar_url),
          client:clients!notes_client_id_fkey(id, name, nome_fantasia)
        `)
        .eq("id", id)
        .single();

      if (error) {
        const { data: fbData, error: fbErr } = await supabase
          .from("notes")
          .select("*")
          .eq("id", id)
          .single();
        if (fbErr) throw fbErr;
        setNote(fbData as Note);
        setTitleDraft(fbData.title || "");
      } else {
        setNote(data as Note);
        setTitleDraft(data.title || "");
      }
    } catch (err: any) {
      showToast("Erro ao carregar roteiro: " + (err?.message || ""), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!noteId) {
      setNote(null);
      isLoadedRef.current = null;
      return;
    }
    if (isLoadedRef.current !== noteId) {
      isLoadedRef.current = noteId;
      fetchNote(noteId);
    }
  }, [noteId, fetchNote]);

  const persistChanges = useCallback(
    async (patch: Partial<Note>) => {
      if (!noteId || !currentUser) return;
      setSaving(true);
      setSaved(false);

      try {
        const { error } = await supabase
          .from("notes")
          .update({
            ...patch,
            updated_at: new Date().toISOString(),
          })
          .eq("id", noteId);

        if (error) throw error;
        setSaved(true);
        onUpdated?.();
        setTimeout(() => setSaved(false), 2000);
      } catch (err: any) {
        showToast("Erro ao salvar roteiro: " + (err?.message || ""), "error");
      } finally {
        setSaving(false);
      }
    },
    [noteId, currentUser, onUpdated, showToast]
  );

  const handleTitleChange = (val: string) => {
    setTitleDraft(val);
    if (!note) return;
    setNote((prev) => (prev ? { ...prev, title: val } : null));

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      persistChanges({ title: val });
    }, SAVE_DELAY);
  };

  const handleContentChange = (content: any) => {
    if (!note) return;
    setNote((prev) => (prev ? { ...prev, content } : null));

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      persistChanges({ content });
    }, SAVE_DELAY);
  };

  const handleAddSubject = () => {
    const trimmed = newSubject.trim();
    if (!trimmed || !note) return;
    const currentSubjects = note.subjects ?? [];
    if (currentSubjects.includes(trimmed)) {
      setNewSubject("");
      return;
    }
    const next = [...currentSubjects, trimmed];
    setNote({ ...note, subjects: next });
    setNewSubject("");
    persistChanges({ subjects: next });
  };

  const handleRemoveSubject = (tag: string) => {
    if (!note) return;
    const next = (note.subjects ?? []).filter((s) => s !== tag);
    setNote({ ...note, subjects: next });
    persistChanges({ subjects: next });
  };

  const handleUnlink = async () => {
    if (!noteId) return;
    const ok = await confirm({
      title: "Desvincular roteiro",
      message: "Deseja desvincular este roteiro do cronograma? A nota continuará existindo no módulo de Notas.",
      variant: "warning",
      confirmText: "Desvincular",
    });
    if (!ok) return;

    try {
      await unlinkNoteFromPlan(noteId);
      showToast("Roteiro desvinculado com sucesso.", "success");
      onUnlinked?.();
      onClose();
    } catch (err: any) {
      showToast("Erro ao desvincular: " + (err?.message || ""), "error");
    }
  };

  if (!noteId) return null;

  return (
    <AnimatePresence>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9990,
          background: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          justifyContent: "flex-end",
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ x: "100%", opacity: 0.8 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 280 }}
          style={{
            width: "100%",
            maxWidth: "760px",
            height: "100vh",
            background: "var(--bg-secondary)",
            borderLeft: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            boxShadow: "-12px 0 40px rgba(0, 0, 0, 0.45)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: "16px 24px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              background: "var(--color-surface-sunken)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "8px",
                  background: "color-mix(in oklab, var(--accent) 18%, transparent)",
                  color: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Clapperboard size={18} />
              </div>
              <div>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--accent)",
                  }}
                >
                  Roteiro de Conteúdo
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.74rem", color: "var(--text-tertiary)" }}>
                  {saving ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--accent)" }}>
                      <Loader2 size={12} className="animate-spin" /> Salvando...
                    </span>
                  ) : saved ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--color-success, #10b981)" }}>
                      <Check size={12} /> Salvo
                    </span>
                  ) : (
                    <span>Salvo automaticamente</span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Link
                href={`/admin/notas/${noteId}`}
                target="_blank"
                className="btn btn-secondary"
                style={{ fontSize: "0.75rem", padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}
                title="Abrir em tela cheia na página de Notas"
              >
                <ExternalLink size={13} /> Tela cheia
              </Link>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleUnlink}
                style={{ fontSize: "0.75rem", padding: "6px 10px", color: "var(--color-danger, #ef4444)" }}
                title="Desvincular roteiro do cronograma"
              >
                <Unlink size={13} />
              </button>
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
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Body */}
          {loading ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--text-tertiary)" }}>
              <Loader2 size={24} className="animate-spin" color="var(--accent)" />
              <span>Carregando roteiro...</span>
            </div>
          ) : !note ? (
            <div style={{ flex: 1, padding: 32, textAlign: "center", color: "var(--text-tertiary)" }}>
              Roteiro não encontrado.
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Title input */}
              <div>
                <input
                  type="text"
                  value={titleDraft}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Título do Roteiro..."
                  style={{
                    width: "100%",
                    fontSize: "1.45rem",
                    fontWeight: 700,
                    background: "transparent",
                    border: "none",
                    borderBottom: "1px solid transparent",
                    outline: "none",
                    color: "var(--text-primary)",
                    padding: "4px 0",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderBottomColor = "var(--accent)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderBottomColor = "transparent";
                  }}
                />
              </div>

              {/* Tags / Subjects */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {(note.subjects ?? [])
                  .filter((s) => !s.startsWith("_"))
                  .map((tag) => (
                    <span
                      key={tag}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "2px 8px",
                        borderRadius: "6px",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        background: "var(--color-surface-sunken)",
                        border: "1px solid var(--border)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveSubject(tag)}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                          color: "var(--text-tertiary)",
                          display: "flex",
                        }}
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <input
                    type="text"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSubject();
                      }
                    }}
                    placeholder="+ Adicionar tag…"
                    style={{
                      fontSize: "0.72rem",
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: "var(--text-secondary)",
                      width: "110px",
                    }}
                  />
                </div>
              </div>

              {/* Editor */}
              <div
                style={{
                  flex: 1,
                  minHeight: "420px",
                  borderRadius: "14px",
                  border: "1px solid var(--border)",
                  background: "var(--color-surface-sunken)",
                  padding: "12px 18px",
                }}
              >
                <BlockEditor
                  key={note.id}
                  content={note.content}
                  bucket="notes-attachments"
                  placeholder="Escreva a estrutura do roteiro, falas, ganchos, cenas, tom de voz, call-to-action…"
                  onChange={handleContentChange}
                />
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
