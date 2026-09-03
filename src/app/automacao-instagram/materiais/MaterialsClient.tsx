"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/CustomToast";
import type { IgMaterialType } from "@/lib/instagram";
import type { IgMaterialWithUrls } from "./page";
import {
  ArrowLeft,
  Plus,
  FileText,
  Download,
  ExternalLink,
  Pencil,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  X,
} from "lucide-react";

interface Props {
  initialMaterials: IgMaterialWithUrls[];
}

const TYPE_OPTIONS: { value: IgMaterialType; label: string; icon: React.ReactNode }[] = [
  { value: "text", label: "Texto pra copiar", icon: <FileText className="w-3.5 h-3.5" /> },
  { value: "file", label: "Arquivo", icon: <Download className="w-3.5 h-3.5" /> },
  { value: "link", label: "Link externo", icon: <ExternalLink className="w-3.5 h-3.5" /> },
];

const emptyForm = {
  title: "",
  description: "",
  material_type: "text" as IgMaterialType,
  copy_text: "",
  external_url: "",
};

export default function MaterialsClient({ initialMaterials }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [materials, setMaterials] = useState(initialMaterials);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  function openCreateForm() {
    setForm(emptyForm);
    setCoverFile(null);
    setFile(null);
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(material: IgMaterialWithUrls) {
    setForm({
      title: material.title,
      description: material.description || "",
      material_type: material.material_type,
      copy_text: material.copy_text || "",
      external_url: material.external_url || "",
    });
    setCoverFile(null);
    setFile(null);
    setEditingId(material.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.title) {
      showToast("Preencha o título do material.", "error");
      return;
    }
    if (form.material_type === "text" && !form.copy_text) {
      showToast("Preencha o texto/prompt a ser copiado.", "error");
      return;
    }
    if (form.material_type === "link" && !form.external_url) {
      showToast("Preencha a URL externa.", "error");
      return;
    }
    if (form.material_type === "file" && !editingId && !file) {
      showToast("Selecione um arquivo para upload.", "error");
      return;
    }

    setSaving(true);
    const fd = new FormData();
    fd.set("title", form.title);
    fd.set("description", form.description);
    fd.set("material_type", form.material_type);
    fd.set("copy_text", form.copy_text);
    fd.set("external_url", form.external_url);
    if (coverFile) fd.set("cover_image", coverFile);
    if (file) fd.set("file", file);

    try {
      const res = await fetch(
        editingId ? `/api/instagram/materials/${editingId}` : "/api/instagram/materials",
        { method: editingId ? "PATCH" : "POST", body: fd }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao salvar material.");

      setMaterials((prev) =>
        editingId
          ? prev.map((m) => (m.id === editingId ? data.material : m))
          : [data.material, ...prev]
      );
      showToast(editingId ? "Material atualizado!" : "Material criado!", "success");
      setShowForm(false);
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao salvar.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este material? Essa ação não pode ser desfeita.")) return;
    try {
      const res = await fetch(`/api/instagram/materials/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao excluir.");
      setMaterials((prev) => prev.filter((m) => m.id !== id));
      showToast("Material excluído.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao excluir.", "error");
    }
  }

  async function handleToggleActive(material: IgMaterialWithUrls) {
    const fd = new FormData();
    fd.set("is_active", String(!material.is_active));
    try {
      const res = await fetch(`/api/instagram/materials/${material.id}`, {
        method: "PATCH",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao atualizar.");
      setMaterials((prev) => prev.map((m) => (m.id === material.id ? data.material : m)));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao atualizar.", "error");
    }
  }

  function copyPublicLink(slug: string) {
    const url = `${window.location.origin}/materiais/${slug}`;
    navigator.clipboard.writeText(url);
    showToast("Link público copiado!", "success");
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface-canvas)] text-[var(--color-text-primary)] px-4 py-8 sm:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-terracotta)] text-[var(--color-text-on-accent)] flex items-center justify-center font-bold shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)] tracking-tight">
                Materiais
              </h1>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Textos, arquivos e links entregues pelas automações — {materials.length} cadastrado
                {materials.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openCreateForm}
              className="text-xs bg-[var(--color-terracotta)] text-[var(--color-text-on-accent)] hover:opacity-90 px-3.5 py-2 rounded-lg font-semibold transition-opacity flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Novo Material
            </button>
            <Link
              href="/automacao-instagram"
              className="text-xs bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] hover:bg-[var(--color-surface-sunken)] px-3.5 py-2 rounded-lg font-semibold text-[var(--color-text-primary)] transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar ao Painel
            </Link>
          </div>
        </div>

        {materials.length === 0 ? (
          <p className="text-[var(--color-text-muted)] text-xs py-12 text-center bg-[var(--color-surface-raised)] border border-dashed border-[var(--color-border-default)] rounded-2xl">
            Nenhum material cadastrado ainda. Crie o primeiro pra usar como CTA nas automações.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials.map((material) => {
              const typeMeta = TYPE_OPTIONS.find((t) => t.value === material.material_type)!;
              return (
                <div
                  key={material.id}
                  className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-2xl overflow-hidden flex flex-col shadow-sm"
                >
                  <div className="relative aspect-[16/9] bg-[var(--color-surface-sunken)]">
                    {material.cover_image_url ? (
                      <Image
                        src={material.cover_image_url}
                        alt={material.title}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[var(--color-text-muted)]">
                        {typeMeta.icon}
                      </div>
                    )}
                    {!material.is_active && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-[10px] font-bold uppercase text-white bg-black/60 px-2 py-1 rounded-full">
                          Inativo
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col gap-2 flex-1">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-terracotta)]">
                      {typeMeta.icon}
                      {typeMeta.label}
                    </span>
                    <h3 className="font-bold text-sm text-[var(--color-text-primary)] leading-snug">
                      {material.title}
                    </h3>
                    {material.description && (
                      <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2">
                        {material.description}
                      </p>
                    )}
                    <span className="text-[10px] text-[var(--color-text-muted)] mt-auto pt-1">
                      {material.view_count} visualizaç{material.view_count === 1 ? "ão" : "ões"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 p-3 pt-0">
                    <button
                      onClick={() => copyPublicLink(material.slug)}
                      title="Copiar link público"
                      className="p-2 rounded-lg hover:bg-[var(--color-surface-sunken)] text-[var(--color-text-secondary)]"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(material)}
                      title={material.is_active ? "Desativar" : "Ativar"}
                      className="p-2 rounded-lg hover:bg-[var(--color-surface-sunken)] text-[var(--color-text-secondary)]"
                    >
                      {material.is_active ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => openEditForm(material)}
                      title="Editar"
                      className="p-2 rounded-lg hover:bg-[var(--color-surface-sunken)] text-[var(--color-text-secondary)]"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(material.id)}
                      title="Excluir"
                      className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--color-surface-raised)] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-[var(--color-text-primary)]">
                {editingId ? "Editar Material" : "Novo Material"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--color-surface-sunken)] text-[var(--color-text-secondary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Título</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Ex: Roteiro de vídeo — Skill no Claude"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] text-sm text-[var(--color-text-primary)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                Descrição (opcional)
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] text-sm text-[var(--color-text-primary)] resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                Capa (opcional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-[var(--color-text-secondary)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Tipo</label>
              <div className="grid grid-cols-3 gap-2">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setForm((f) => ({ ...f, material_type: opt.value }))}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[11px] font-semibold transition-colors ${
                      form.material_type === opt.value
                        ? "border-[var(--color-terracotta)] bg-[var(--color-terracotta-100)] text-[var(--color-terracotta-ink)]"
                        : "border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)]"
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {form.material_type === "text" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  Texto / prompt pra copiar
                </label>
                <textarea
                  value={form.copy_text}
                  onChange={(e) => setForm((f) => ({ ...f, copy_text: e.target.value }))}
                  rows={6}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] text-sm font-mono text-[var(--color-text-primary)] resize-none"
                />
              </div>
            )}

            {form.material_type === "file" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  Arquivo {editingId && "(deixe em branco pra manter o atual)"}
                </label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-[var(--color-text-secondary)]"
                />
              </div>
            )}

            {form.material_type === "link" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  URL externa
                </label>
                <input
                  value={form.external_url}
                  onChange={(e) => setForm((f) => ({ ...f, external_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] text-sm text-[var(--color-text-primary)]"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)]"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--color-terracotta)] text-[var(--color-text-on-accent)] hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
