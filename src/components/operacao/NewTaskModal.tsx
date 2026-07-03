"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import DialogShell from "@/components/DialogShell";
import { List, MediaType, Task } from "@/types/operacao";
import { useOperacao } from "./OperacaoProvider";
import {
  makeOnboardingTask,
  makeCancelamentoTask,
  makeCaptacaoTask,
  uid,
} from "@/mocks/operacao";
import { FIELD_MIDIA } from "@/mocks/operacao/templates";

export type NewTaskMode = "onboarding" | "cancelamento" | "captacao" | "post";

const TITLES: Record<NewTaskMode, string> = {
  onboarding: "Novo cliente (Onboarding)",
  cancelamento: "Novo cancelamento",
  captacao: "Nova captação",
  post: "Novo post (manual)",
};

interface Props {
  list: List;
  mode: NewTaskMode;
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (taskId: string) => void;
}

export default function NewTaskModal({ list, mode, isOpen, onClose, onCreated }: Props) {
  const { addTask } = useOperacao();
  const [name, setName] = useState("");
  const [captureType, setCaptureType] = useState(0);
  const [media, setMedia] = useState<MediaType>("FEED");
  const [date, setDate] = useState("");
  const [month, setMonth] = useState("2026-07");
  const [endereco, setEndereco] = useState("");
  const [reels, setReels] = useState("");
  const [moodboard, setMoodboard] = useState("");

  const reset = () => {
    setName("");
    setCaptureType(0);
    setMedia("FEED");
    setDate("");
    setEndereco("");
    setReels("");
    setMoodboard("");
  };

  const handleCreate = () => {
    let task: Task;
    if (mode === "onboarding") {
      task = makeOnboardingTask(list.id, name || "Novo cliente");
      task.customValues = { mes_referente: month };
    } else if (mode === "cancelamento") {
      task = makeCancelamentoTask(list.id, name || "Cliente");
      task.customValues = { mes_referente: month };
    } else if (mode === "captacao") {
      task = makeCaptacaoTask(list.id, name || "Cliente", captureType);
      task.customValues = {
        mes_referente: month,
        endereco: endereco || null,
        qtd_reels: reels || null,
        moodboard: moodboard || null,
      };
    } else {
      const postCount = list.tasks.filter((t) => t.taskType === "post").length + 1;
      task = {
        id: uid("task"),
        listId: list.id,
        title: name || `POST ${String(postCount).padStart(2, "0")}`,
        taskType: "post",
        statusId: "cr_planejamento",
        assigneeIds: [],
        dueDate: date || undefined,
        customValues: { midia: media, mes_referente: month, data: date, funil: "TOPO" },
        subtasks: [],
      };
    }
    addTask(list.id, task);
    onCreated?.(task.id);
    reset();
    onClose();
  };

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      title={TITLES[mode]}
      maxWidth="480px"
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn-accent" onClick={handleCreate}>
            <Plus size={16} /> Criar
          </button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {mode === "post" ? (
          <>
            <Field label="Título do post (opcional)">
              <input className="input-dark" value={name} onChange={(e) => setName(e.target.value)} placeholder="POST 01" style={{ height: 40 }} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Canal / Mídia">
                <select className="input-dark" value={media} onChange={(e) => setMedia(e.target.value as MediaType)} style={{ height: 40 }}>
                  {FIELD_MIDIA.options?.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Data de publicação">
                <input className="input-dark" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ height: 40 }} />
              </Field>
            </div>
          </>
        ) : (
          <Field label="Nome do cliente">
            <input className="input-dark" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Balloarts" style={{ height: 40 }} autoFocus />
          </Field>
        )}

        {mode === "captacao" && (
          <>
            <Field label="Tipo de captação">
              <select className="input-dark" value={captureType} onChange={(e) => setCaptureType(Number(e.target.value))} style={{ height: 40 }}>
                <option value={0}>Captação</option>
                <option value={1}>Captação + Ads</option>
                <option value={2}>Editorial</option>
              </select>
            </Field>
            <Field label="Endereço / Local">
              <input className="input-dark" value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, nº — cidade" style={{ height: 40 }} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Qtd. mínima de Reels">
                <input className="input-dark" type="number" min={0} value={reels} onChange={(e) => setReels(e.target.value)} placeholder="Ex.: 4" style={{ height: 40 }} />
              </Field>
              <Field label="Link do moodboard">
                <input className="input-dark" value={moodboard} onChange={(e) => setMoodboard(e.target.value)} placeholder="https://..." style={{ height: 40 }} />
              </Field>
            </div>
          </>
        )}

        <Field label="Mês referente">
          <input className="input-dark" type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ height: 40 }} />
        </Field>
      </div>
    </DialogShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: "0.68rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-tertiary)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}
