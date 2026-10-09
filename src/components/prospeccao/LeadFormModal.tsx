"use client";

import { useState } from "react";
import DialogShell from "@/components/DialogShell";
import { useToast } from "@/components/CustomToast";
import { useProspeccao } from "./ProspeccaoProvider";
import LeadFields from "./LeadFields";
import { formFromLead, leadPatchFromForm, type LeadFormState } from "./leadForm";
import type { Lead, LeadStage } from "@/types/database";

export default function LeadFormModal({ lead, onClose, defaultStage = "novo" }: { lead?: Lead | null; onClose: () => void; defaultStage?: LeadStage }) {
  const { createLead, updateLead } = useProspeccao();
  const { showToast } = useToast();
  const [form, setForm] = useState<LeadFormState>(() => formFromLead(lead, lead ? undefined : { estagio: defaultStage }));
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const { data, error } = leadPatchFromForm(form);
    if (!data) return showToast(error ?? "Dados inválidos.", "error");
    setSaving(true);
    if (lead) await updateLead(lead.id, data);
    else await createLead(data);
    setSaving(false);
    onClose();
  };

  return (
    <DialogShell
      isOpen
      onClose={onClose}
      title={lead ? "Editar lead" : "Novo lead"}
      maxWidth="720px"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-accent" onClick={submit} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</button>
        </>
      }
    >
      <LeadFields form={form} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} />
    </DialogShell>
  );
}
