"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

interface Props {
  variations: string[];
  onChange: (variations: string[]) => void;
}

export default function CommentReplyVariations({ variations, onChange }: Props) {
  const [draft, setDraft] = useState("");

  function addVariation() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...variations, trimmed]);
    setDraft("");
  }

  function removeVariation(index: number) {
    onChange(variations.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addVariation();
            }
          }}
          placeholder="Ex: Te chamei no direct! 📩"
          className="flex-1 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] focus:border-[var(--color-terracotta)] rounded-lg px-3 py-2 text-xs text-[var(--color-text-primary)] outline-none"
        />
        <button
          type="button"
          onClick={addVariation}
          disabled={!draft.trim()}
          className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-inset)] text-[var(--color-text-primary)] disabled:opacity-40"
        >
          <Plus className="w-3.5 h-3.5" /> Adicionar
        </button>
      </div>

      {variations.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {variations.map((v, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 bg-[var(--color-terracotta-100)] text-[var(--color-terracotta-ink)] rounded-full pl-3 pr-1.5 py-1 text-[11px] font-medium max-w-full"
            >
              <span className="truncate max-w-[220px]">{v}</span>
              <button
                type="button"
                onClick={() => removeVariation(i)}
                className="shrink-0 p-0.5 rounded-full hover:bg-black/10"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <p className="text-[11px] text-[var(--color-text-muted)]">
        {variations.length > 1
          ? `${variations.length} variações cadastradas — o sistema escolhe uma aleatoriamente a cada resposta, pra não parecer repetitivo.`
          : "Cadastre mais de uma variação pra evitar responder sempre com o mesmo texto."}
      </p>
    </div>
  );
}
