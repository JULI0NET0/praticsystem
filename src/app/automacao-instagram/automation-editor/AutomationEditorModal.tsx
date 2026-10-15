"use client";

import { X } from "lucide-react";
import StepsList from "./StepsList";
import StepMessageForm from "./StepMessageForm";
import PhonePreview from "./PhonePreview";
import type { AutomationFormValues } from "./types";

interface Props {
  form: AutomationFormValues;
  onChange: (patch: Partial<AutomationFormValues>) => void;
  editingId: string | null;
  saving: boolean;
  displayName: string;
  displayHandle: string;
  onClose: () => void;
  onSave: () => void;
}

export default function AutomationEditorModal({
  form,
  onChange,
  editingId,
  saving,
  displayName,
  displayHandle,
  onClose,
  onSave,
}: Props) {
  return (
    <div className="fixed inset-0 bg-[var(--color-scrim)] flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div role="dialog" aria-modal="true" aria-label={editingId ? "Editar Automação" : "Nova Automação de Comentários"} className="bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] rounded-t-2xl sm:rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between shrink-0">
          <h3 className="font-bold text-base text-[var(--color-text-primary)]">
            {editingId ? "Editar Automação" : "Nova Automação de Comentários"}
          </h3>
          <button onClick={onClose} aria-label="Fechar" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col sm:flex-row gap-6">
          <StepsList />
          <StepMessageForm form={form} onChange={onChange} />
          <div className="w-full sm:w-64 shrink-0">
            <PhonePreview
              username={displayName}
              handle={displayHandle}
              messageText={form.dm_message_text}
              ctaType={form.cta_type}
              buttonText={form.dm_button_text}
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[var(--color-border-subtle)] flex items-center justify-end gap-2.5 shrink-0">
          <button
            onClick={onClose}
            className="text-xs bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-inset)] px-4 py-2 rounded-lg font-medium text-[var(--color-text-primary)]"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="text-xs bg-[var(--color-terracotta)] text-[var(--color-text-on-accent)] px-5 py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar Automação"}
          </button>
        </div>
      </div>
    </div>
  );
}
