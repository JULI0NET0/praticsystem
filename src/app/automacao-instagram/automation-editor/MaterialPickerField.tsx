"use client";

import { useState } from "react";
import { FolderOpen, X, Check } from "lucide-react";

interface MaterialOption {
  id: string;
  slug: string;
  title: string;
  is_active: boolean;
}

interface Props {
  url: string;
  linkedMaterialId: string | null;
  onChange: (url: string, materialId: string | null) => void;
}

export default function MaterialPickerField({ url, linkedMaterialId, onChange }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [materials, setMaterials] = useState<MaterialOption[] | null>(null);
  const [loading, setLoading] = useState(false);

  function openPicker() {
    setShowPicker(true);
    if (materials !== null) return;
    setLoading(true);
    fetch("/api/instagram/materials")
      .then((r) => r.json())
      .then((data) => setMaterials((data.materials || []).filter((m: MaterialOption) => m.is_active)))
      .catch(() => setMaterials([]))
      .finally(() => setLoading(false));
  }

  function selectMaterial(material: MaterialOption) {
    const publicUrl = `${window.location.origin}/materiais/${material.slug}`;
    onChange(publicUrl, material.id);
    setShowPicker(false);
  }

  function clearMaterial() {
    onChange(url, null);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block font-bold text-[var(--color-text-primary)]">Link do Botão</label>
        <button
          type="button"
          onClick={openPicker}
          className="flex items-center gap-1 text-[11px] font-semibold text-[var(--color-terracotta)] hover:underline"
        >
          <FolderOpen className="w-3 h-3" /> Escolher da Galeria de Materiais
        </button>
      </div>

      <input
        value={url}
        onChange={(e) => onChange(e.target.value, null)}
        placeholder="https://..."
        className="w-full bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] focus:border-[var(--color-terracotta)] rounded-lg px-3 py-2 text-xs text-[var(--color-text-primary)] outline-none"
      />

      {linkedMaterialId && (
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-success)] font-medium">
          <Check className="w-3 h-3" /> Vinculado a um material da galeria
          <button type="button" onClick={clearMaterial} className="text-[var(--color-text-muted)] hover:underline ml-1">
            desvincular
          </button>
        </div>
      )}

      {showPicker && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]">
          <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] rounded-2xl w-full max-w-sm max-h-[70vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-4 py-3 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
              <h4 className="font-bold text-xs text-[var(--color-text-primary)]">Escolher Material</h4>
              <button onClick={() => setShowPicker(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {loading && <p className="text-[11px] text-[var(--color-text-muted)] p-3">Carregando...</p>}
              {!loading && materials?.length === 0 && (
                <p className="text-[11px] text-[var(--color-text-muted)] p-3">
                  Nenhum material ativo cadastrado ainda.
                </p>
              )}
              {materials?.map((m) => (
                <button
                  key={m.id}
                  onClick={() => selectMaterial(m)}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-sunken)] transition-colors"
                >
                  {m.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
