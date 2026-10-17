"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  ImagePlus,
  Link2,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import StatCard from "@/components/ui/StatCard";
import { useToast } from "@/components/CustomToast";
import type { IgMaterial, IgMaterialType } from "@/lib/instagram";
import {
  filterMaterials,
  formatFileSize,
  MATERIAL_TYPE_LABEL,
  MATERIAL_TYPE_SHORT,
  splitFeatured,
} from "@/lib/instagramMaterials";

type Material = IgMaterial & { cover_image_url: string | null; file_url: string | null };
type StatusFilter = "all" | "active" | "hidden";

const TYPE_ICON: Record<IgMaterialType, React.ReactNode> = {
  text: <FileText className="w-4 h-4" aria-hidden="true" />,
  file: <Download className="w-4 h-4" aria-hidden="true" />,
  link: <Link2 className="w-4 h-4" aria-hidden="true" />,
};

const TYPE_HINT: Record<IgMaterialType, string> = {
  text: "Prompt, roteiro ou texto que a pessoa copia com um clique.",
  file: "PDF, planilha, imagem ou qualquer arquivo para baixar.",
  link: "Leva a pessoa para um site, aula ou página externa.",
};

const MAX_FILE_MB = 50;
const MAX_COVER_MB = 5;

interface FormState {
  title: string;
  description: string;
  material_type: IgMaterialType;
  copy_text: string;
  external_url: string;
}

const EMPTY_FORM: FormState = { title: "", description: "", material_type: "text", copy_text: "", external_url: "" };

function publicBase() {
  return typeof window === "undefined" ? "" : window.location.origin;
}

// ---------- Prévia: como o card aparece para o seguidor (preto + laranja) ----------
function PublicPreview({
  form,
  coverUrl,
  fileName,
}: {
  form: FormState;
  coverUrl: string | null;
  fileName: string | null;
}) {
  const cta = form.material_type === "file" ? "Baixar →" : form.material_type === "link" ? "Acessar →" : "Ver e copiar →";
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
        Como o seguidor vê
      </p>
      <div
        className="rounded-2xl overflow-hidden border"
        style={{ background: "#141414", borderColor: "#2a2a2a", color: "#fff" }}
        aria-label="Prévia do card na página pública"
      >
        <div className="relative aspect-video" style={{ background: "linear-gradient(135deg,#1f1f1f,#0f0f0f)" }}>
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center" style={{ color: "#F2581A" }}>
              <Sparkles size={26} aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="p-4 space-y-1.5">
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider"
            style={{ color: "#ff7a45" }}
          >
            {TYPE_ICON[form.material_type]}
            {MATERIAL_TYPE_LABEL[form.material_type]}
          </span>
          <p className="text-[15px] font-bold leading-snug">{form.title.trim() || "Título do material"}</p>
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "#a3a3a3" }}>
            {form.description.trim() || "A descrição aparece aqui, em até duas linhas."}
          </p>
          {form.material_type === "file" && fileName && (
            <p className="text-[11px]" style={{ color: "#a3a3a3" }}>
              {fileName}
            </p>
          )}
          <p className="pt-1 text-xs font-bold" style={{ color: "#ff7a45" }}>
            {cta}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------- Editor (painel lateral) ----------
function MaterialEditor({
  editing,
  onClose,
  onSaved,
}: {
  editing: Material | null;
  onClose: () => void;
  onSaved: (m: Material) => void;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>(
    editing
      ? {
          title: editing.title,
          description: editing.description || "",
          material_type: editing.material_type,
          copy_text: editing.copy_text || "",
          external_url: editing.external_url || "",
        }
      : EMPTY_FORM
  );
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(editing?.cover_image_url ?? null);
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | "cover" | "file", string>>>({});
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !saving && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  useEffect(
    () => () => {
      if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
    },
    [coverPreview]
  );

  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }));

  function pickCover(f: File | undefined | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setErrors((e) => ({ ...e, cover: "A capa precisa ser uma imagem (JPG, PNG ou WebP)." }));
      return;
    }
    if (f.size > MAX_COVER_MB * 1024 * 1024) {
      setErrors((e) => ({ ...e, cover: `A capa passa de ${MAX_COVER_MB} MB. Use uma imagem menor.` }));
      return;
    }
    setErrors((e) => ({ ...e, cover: undefined }));
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.title.trim()) next.title = "Dê um título ao material.";
    if (form.material_type === "text" && !form.copy_text.trim()) next.copy_text = "Cole o texto que a pessoa vai copiar.";
    if (form.material_type === "link") {
      if (!form.external_url.trim()) next.external_url = "Informe o link.";
      else if (!/^https?:\/\//i.test(form.external_url.trim())) next.external_url = "O link precisa começar com https://";
    }
    if (form.material_type === "file" && !editing?.file_path && !file) next.file = "Escolha o arquivo para baixar.";
    if (file && file.size > MAX_FILE_MB * 1024 * 1024) next.file = `O arquivo passa de ${MAX_FILE_MB} MB.`;
    setErrors(next);
    // Leva o foco ao primeiro campo com erro (também rola até ele).
    const firstId = next.title ? "mat-title" : next.copy_text ? "mat-copy" : next.external_url ? "mat-url" : null;
    if (firstId) requestAnimationFrame(() => document.getElementById(firstId)?.focus());
    return Object.keys(next).length === 0;
  }

  async function save() {
    if (!validate()) return;
    setSaving(true);
    const fd = new FormData();
    fd.set("title", form.title.trim());
    fd.set("description", form.description.trim());
    fd.set("material_type", form.material_type);
    fd.set("copy_text", form.copy_text);
    fd.set("external_url", form.external_url.trim());
    if (coverFile) fd.set("cover_image", coverFile);
    if (file) fd.set("file", file);

    try {
      const res = await fetch(editing ? `/api/instagram/materials/${editing.id}` : "/api/instagram/materials", {
        method: editing ? "PATCH" : "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível salvar o material.");
      showToast(editing ? "Material atualizado." : "Material criado.", "success");
      onSaved(data.material);
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), "error");
    } finally {
      setSaving(false);
    }
  }

  const fileLabel = file?.name ?? editing?.file_name ?? null;
  const fileSize = formatFileSize(file?.size ?? editing?.file_size_bytes);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[var(--color-scrim)]" onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mat-editor-title"
        className="h-full w-full max-w-[980px] bg-[var(--color-surface-raised)] border-l border-[var(--color-border-default)] flex flex-col"
      >
        <header className="h-14 shrink-0 px-5 flex items-center justify-between border-b border-[var(--color-border-subtle)]">
          <h2 id="mat-editor-title" className="text-sm font-bold text-[var(--color-text-primary)]">
            {editing ? "Editar material" : "Novo material"}
          </h2>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Fechar" disabled={saving}>
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 grid gap-6 lg:grid-cols-[1fr_300px]">
          <form
            id="mat-form"
            className="space-y-5 text-xs"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            noValidate
          >
            <fieldset className="space-y-2 border-0 p-0 m-0 min-w-0">
              <legend className="font-bold text-[var(--color-text-primary)] mb-1">O que é este material?</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {(["text", "file", "link"] as IgMaterialType[]).map((t) => (
                  <label
                    key={t}
                    className={`cursor-pointer rounded-xl border p-3 space-y-1 ${
                      form.material_type === t
                        ? "border-[var(--color-terracotta)] bg-[var(--color-terracotta-100)]"
                        : "border-[var(--color-border-default)] hover:border-[var(--color-border-strong)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="material_type"
                      value={t}
                      checked={form.material_type === t}
                      onChange={() => patch({ material_type: t })}
                      className="sr-only"
                    />
                    <span className="flex items-center gap-1.5 font-bold text-[var(--color-text-primary)]">
                      {TYPE_ICON[t]}
                      {MATERIAL_TYPE_LABEL[t]}
                    </span>
                    <span className="block text-[11px] leading-snug text-[var(--color-text-secondary)]">{TYPE_HINT[t]}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="space-y-1.5">
              <label htmlFor="mat-title" className="font-bold text-[var(--color-text-primary)]">
                Título
              </label>
              <input
                id="mat-title"
                ref={titleRef}
                value={form.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="Ex: Roteiro de Reels que prende em 3 segundos"
                className="input-dark"
                aria-invalid={!!errors.title}
                aria-describedby={errors.title ? "mat-title-err" : undefined}
                maxLength={120}
              />
              {errors.title && (
                <p id="mat-title-err" className="text-[var(--color-danger-ink)]" role="alert">
                  {errors.title}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="mat-desc" className="font-bold text-[var(--color-text-primary)]">
                Descrição <span className="font-normal text-[var(--color-text-secondary)]">(opcional)</span>
              </label>
              <textarea
                id="mat-desc"
                rows={2}
                value={form.description}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder="Uma frase dizendo o que a pessoa ganha com isso."
                className="input-dark resize-none"
                maxLength={220}
              />
            </div>

            <div className="space-y-1.5">
              <span id="mat-cover-label" className="font-bold text-[var(--color-text-primary)]">
                Capa <span className="font-normal text-[var(--color-text-secondary)]">(opcional · 1280×720)</span>
              </span>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  pickCover(e.dataTransfer.files?.[0]);
                }}
                className={`relative rounded-xl border-2 border-dashed overflow-hidden ${
                  dragging ? "border-[var(--color-terracotta)] bg-[var(--color-terracotta-100)]" : "border-[var(--color-border-default)]"
                }`}
              >
                {coverPreview ? (
                  <div className="relative aspect-video">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={coverPreview} alt="Capa escolhida" className="absolute inset-0 w-full h-full object-cover" />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm absolute right-2 top-2"
                      onClick={() => {
                        setCoverFile(null);
                        setCoverPreview(null);
                      }}
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-1.5 py-8 cursor-pointer text-center text-[var(--color-text-secondary)]">
                    <ImagePlus className="w-6 h-6" aria-hidden="true" />
                    <span className="font-semibold text-[var(--color-text-primary)]">Arraste a imagem aqui ou clique para escolher</span>
                    <span className="text-[11px]">JPG, PNG ou WebP, até {MAX_COVER_MB} MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      aria-labelledby="mat-cover-label"
                      onChange={(e) => pickCover(e.target.files?.[0])}
                    />
                  </label>
                )}
              </div>
              {errors.cover && (
                <p className="text-[var(--color-danger-ink)]" role="alert">
                  {errors.cover}
                </p>
              )}
            </div>

            {form.material_type === "text" && (
              <div className="space-y-1.5">
                <label htmlFor="mat-copy" className="font-bold text-[var(--color-text-primary)]">
                  Texto para copiar
                </label>
                <textarea
                  id="mat-copy"
                  rows={9}
                  value={form.copy_text}
                  onChange={(e) => patch({ copy_text: e.target.value })}
                  placeholder="Cole aqui o prompt ou roteiro completo."
                  className="input-dark font-mono"
                  aria-invalid={!!errors.copy_text}
                />
                {errors.copy_text && (
                  <p className="text-[var(--color-danger-ink)]" role="alert">
                    {errors.copy_text}
                  </p>
                )}
              </div>
            )}

            {form.material_type === "link" && (
              <div className="space-y-1.5">
                <label htmlFor="mat-url" className="font-bold text-[var(--color-text-primary)]">
                  Link de destino
                </label>
                <input
                  id="mat-url"
                  value={form.external_url}
                  onChange={(e) => patch({ external_url: e.target.value })}
                  placeholder="https://"
                  className="input-dark"
                  inputMode="url"
                  aria-invalid={!!errors.external_url}
                />
                {errors.external_url && (
                  <p className="text-[var(--color-danger-ink)]" role="alert">
                    {errors.external_url}
                  </p>
                )}
              </div>
            )}

            {form.material_type === "file" && (
              <div className="space-y-1.5">
                <span id="mat-file-label" className="font-bold text-[var(--color-text-primary)]">
                  Arquivo {editing?.file_path && <span className="font-normal text-[var(--color-text-secondary)]">(deixe em branco para manter o atual)</span>}
                </span>
                <label className="flex items-center gap-3 rounded-xl border border-[var(--color-border-default)] p-3 cursor-pointer hover:border-[var(--color-border-strong)]">
                  <Upload className="w-5 h-5 text-[var(--color-text-secondary)]" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-[var(--color-text-primary)] truncate">
                      {fileLabel ?? "Escolher arquivo"}
                    </span>
                    <span className="block text-[11px] text-[var(--color-text-secondary)]">
                      {fileSize || `até ${MAX_FILE_MB} MB`}
                    </span>
                  </span>
                  <input
                    type="file"
                    className="sr-only"
                    aria-labelledby="mat-file-label"
                    onChange={(e) => {
                      setFile(e.target.files?.[0] ?? null);
                      setErrors((er) => ({ ...er, file: undefined }));
                    }}
                  />
                </label>
                {errors.file && (
                  <p className="text-[var(--color-danger-ink)]" role="alert">
                    {errors.file}
                  </p>
                )}
              </div>
            )}

            {editing && (
              <p className="text-[11px] text-[var(--color-text-secondary)] break-all">
                Link público: {publicBase()}/materiais/{editing.slug}
              </p>
            )}
          </form>

          <aside className="lg:sticky lg:top-0 lg:self-start">
            <PublicPreview form={form} coverUrl={coverPreview} fileName={fileLabel} />
          </aside>
        </div>

        <footer className="shrink-0 px-5 py-3 border-t border-[var(--color-border-subtle)] flex justify-end gap-2.5">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" form="mat-form" className="btn btn-accent" disabled={saving}>
            {saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar material"}
          </button>
        </footer>
      </div>
    </div>
  );
}

// ---------- Tela principal ----------
export default function MaterialsManager() {
  const { showToast } = useToast();
  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [type, setType] = useState<IgMaterialType | "all">("all");
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<{ material: Material | null } | null>(null);
  const [toDelete, setToDelete] = useState<Material | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/instagram/materials", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar materiais.");
      setMaterials(data.materials);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial vinda da API
    load();
  }, [load]);

  const all = useMemo(() => materials ?? [], [materials]);
  const featuredId = useMemo(() => splitFeatured(all.filter((m) => m.is_active)).featured?.id ?? null, [all]);
  const totalViews = all.reduce((n, m) => n + (m.view_count || 0), 0);

  const visible = useMemo(() => {
    const byStatus = all.filter((m) => (status === "active" ? m.is_active : status === "hidden" ? !m.is_active : true));
    return filterMaterials(byStatus, { type, query });
  }, [all, status, type, query]);

  async function copy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(id);
      setTimeout(() => setCopiedLink((c) => (c === id ? null : c)), 2000);
    } catch {
      showToast("Não foi possível copiar. Copie o link na barra do navegador.", "error");
    }
  }

  async function toggleActive(m: Material) {
    setBusy(m.id);
    const fd = new FormData();
    fd.set("is_active", String(!m.is_active));
    try {
      const res = await fetch(`/api/instagram/materials/${m.id}`, { method: "PATCH", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao atualizar.");
      setMaterials((prev) => prev?.map((x) => (x.id === m.id ? data.material : x)) ?? prev);
      showToast(data.material.is_active ? "Material visível na página pública." : "Material oculto da página pública.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), "error");
    } finally {
      setBusy(null);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setBusy(toDelete.id);
    try {
      const res = await fetch(`/api/instagram/materials/${toDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao excluir.");
      setMaterials((prev) => prev?.filter((x) => x.id !== toDelete.id) ?? prev);
      showToast("Material excluído.", "success");
      setToDelete(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), "error");
    } finally {
      setBusy(null);
    }
  }

  function onSaved(m: Material) {
    setMaterials((prev) => {
      const list = prev ?? [];
      return list.some((x) => x.id === m.id) ? list.map((x) => (x.id === m.id ? m : x)) : [m, ...list];
    });
    setEditor(null);
  }

  const presentTypes = (["text", "file", "link"] as IgMaterialType[]).filter((t) => all.some((m) => m.material_type === t));
  const statusChips: { id: StatusFilter; label: string }[] = [
    { id: "all", label: `Todos (${all.length})` },
    { id: "active", label: `Visíveis (${all.filter((m) => m.is_active).length})` },
    { id: "hidden", label: `Ocultos (${all.filter((m) => !m.is_active).length})` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Materiais</h1>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 max-w-xl">
            Prompts, arquivos e links que você entrega aos seguidores. O mais recente vira destaque na página pública.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => copy(`${publicBase()}/materiais`, "public")}
          >
            {copiedLink === "public" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedLink === "public" ? "Link copiado" : "Copiar link da página"}
          </button>
          <a href="/materiais" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
            <ExternalLink className="w-3.5 h-3.5" /> Ver página pública
          </a>
          <button type="button" className="btn btn-accent btn-sm" onClick={() => setEditor({ material: null })}>
            <Plus className="w-3.5 h-3.5" /> Novo material
          </button>
        </div>
      </div>

      {loadError ? (
        <EmptyState
          title="Não foi possível carregar os materiais"
          description={loadError}
          action={
            <button type="button" className="btn btn-secondary btn-sm" onClick={load}>
              Tentar de novo
            </button>
          }
        />
      ) : materials === null ? (
        <p className="text-xs text-[var(--color-text-secondary)]">Carregando materiais...</p>
      ) : (
        <>
          <section aria-label="Números" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Materiais" value={all.length} icon={<FileText size={15} />} />
            <StatCard label="Visíveis ao público" value={all.filter((m) => m.is_active).length} icon={<Eye size={15} />} />
            <StatCard label="Ocultos" value={all.filter((m) => !m.is_active).length} icon={<EyeOff size={15} />} />
            <StatCard label="Visualizações" value={totalViews} icon={<Download size={15} />} subtitle="soma de todos os materiais" />
          </section>

          {all.length === 0 ? (
            <EmptyState
              icon={<Sparkles size={20} />}
              title="Cadastre seu primeiro material"
              description="Crie um prompt, suba um arquivo ou aponte para um link. Ele já aparece na página pública que você manda para os seguidores."
              action={
                <button type="button" className="btn btn-accent btn-sm" onClick={() => setEditor({ material: null })}>
                  <Plus className="w-3.5 h-3.5" /> Novo material
                </button>
              }
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1" role="group" aria-label="Filtros">
                  {statusChips.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={status === c.id}
                      onClick={() => setStatus(c.id)}
                      className={`btn btn-sm ${status === c.id ? "btn-secondary" : "btn-ghost"}`}
                    >
                      {c.label}
                    </button>
                  ))}
                  {presentTypes.length > 1 &&
                    presentTypes.map((t) => (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={type === t}
                        onClick={() => setType(type === t ? "all" : t)}
                        className={`btn btn-sm ${type === t ? "btn-secondary" : "btn-ghost"}`}
                      >
                        {MATERIAL_TYPE_SHORT[t]}
                      </button>
                    ))}
                </div>
                <label className="relative w-full sm:w-72">
                  <span className="sr-only">Buscar material</span>
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar por título ou descrição"
                    className="input-dark pl-8"
                  />
                </label>
              </div>

              {visible.length === 0 ? (
                <EmptyState title="Nenhum material encontrado" description="Ajuste a busca ou os filtros." compact />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {visible.map((m) => (
                    <article key={m.id} className="surface p-0 overflow-hidden flex flex-col">
                      <div className="relative aspect-video bg-[var(--color-surface-sunken)]">
                        {m.cover_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.cover_image_url}
                            alt=""
                            loading="lazy"
                            className={`absolute inset-0 w-full h-full object-cover ${m.is_active ? "" : "opacity-40"}`}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-[var(--color-text-muted)]">
                            {TYPE_ICON[m.material_type]}
                          </div>
                        )}
                        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                          {m.id === featuredId && <Badge tone="accent">Em destaque na página pública</Badge>}
                          {!m.is_active && <Badge tone="neutral">Oculto</Badge>}
                        </div>
                      </div>
                      <div className="p-4 flex flex-col gap-1.5 flex-1">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--color-terracotta-ink)]">
                          {TYPE_ICON[m.material_type]}
                          {MATERIAL_TYPE_LABEL[m.material_type]}
                        </span>
                        <h3 className="text-sm font-bold text-[var(--color-text-primary)] leading-snug">{m.title}</h3>
                        {m.description && (
                          <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2">{m.description}</p>
                        )}
                        <p className="mt-auto pt-1 text-xs text-[var(--color-text-secondary)] tabular-nums">
                          {m.view_count} visualizaç{m.view_count === 1 ? "ão" : "ões"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 px-3 py-2.5 border-t border-[var(--color-border-subtle)]">
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditor({ material: m })}>
                          <Pencil className="w-3 h-3" /> Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon"
                          aria-label={`Copiar link de ${m.title}`}
                          title="Copiar link do material"
                          onClick={() => copy(`${publicBase()}/materiais/${m.slug}`, m.id)}
                        >
                          {copiedLink === m.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon"
                          aria-label={m.is_active ? `Ocultar ${m.title}` : `Mostrar ${m.title}`}
                          title={m.is_active ? "Ocultar da página pública" : "Mostrar na página pública"}
                          disabled={busy === m.id}
                          onClick={() => toggleActive(m)}
                        >
                          {m.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon hover-danger ml-auto"
                          aria-label={`Excluir ${m.title}`}
                          title="Excluir"
                          onClick={() => setToDelete(m)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {editor && <MaterialEditor editing={editor.material} onClose={() => setEditor(null)} onSaved={onSaved} />}

      {toDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[var(--color-scrim)] p-0 sm:p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="mat-del-title"
            aria-describedby="mat-del-desc"
            className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] p-6 space-y-4"
          >
            <h2 id="mat-del-title" className="text-sm font-bold text-[var(--color-text-primary)]">
              Excluir “{toDelete.title}”?
            </h2>
            <p id="mat-del-desc" className="text-xs text-[var(--color-text-secondary)]">
              O material sai da página pública e os arquivos enviados são apagados. Links já enviados por DM deixam de
              funcionar. Para só esconder, use “Ocultar”.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setToDelete(null)} disabled={busy === toDelete.id} autoFocus>
                Cancelar
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmDelete} disabled={busy === toDelete.id}>
                {busy === toDelete.id ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
