"use client";

import { MessageSquare, Plus } from "lucide-react";

export default function StepsList() {
  return (
    <div className="w-full sm:w-40 shrink-0 space-y-2 border-b sm:border-b-0 sm:border-r border-[var(--color-border-subtle)] pb-4 sm:pb-0 sm:pr-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
        Passo Inicial
      </p>
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 border-[var(--color-terracotta)] bg-[var(--color-terracotta-100)] text-[var(--color-terracotta-ink)]">
        <MessageSquare className="w-4 h-4 shrink-0" />
        <span className="text-xs font-bold truncate">Enviar Mensagem</span>
      </div>

      <button
        type="button"
        disabled
        title="Em breve — por enquanto cada automação envia 1 mensagem"
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-dashed border-[var(--color-border-default)] text-[var(--color-text-muted)] text-[11px] font-semibold cursor-not-allowed opacity-60"
      >
        <Plus className="w-3.5 h-3.5" /> Criar Nova Etapa
      </button>
    </div>
  );
}
