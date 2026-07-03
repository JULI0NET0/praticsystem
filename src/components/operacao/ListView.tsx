"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, CalendarPlus, Copy, ChevronLeft, Archive } from "lucide-react";
import { ViewType } from "@/types/operacao";
import { useOperacao } from "./OperacaoProvider";
import { useToast } from "@/components/CustomToast";
import KanbanBoard from "./KanbanBoard";
import TaskTable from "./TaskTable";
import TaskDrawer from "./TaskDrawer";
import ViewSwitcher from "./ViewSwitcher";
import EditorialCalendarView from "./EditorialCalendarView";
import EditorialCalendarModal from "./EditorialCalendarModal";
import NewTaskModal, { NewTaskMode } from "./NewTaskModal";
import { CRIACAO_CHANNELS } from "@/mocks/operacao/templates";

function detectKind(listName: string, isTemplate: boolean, isCriacao: boolean, firstStatus: string) {
  if (isCriacao) return isTemplate ? "criacao_template" : "criacao_client";
  if (firstStatus.startsWith("ob_")) return "onboarding";
  if (firstStatus.startsWith("cx_")) return "cancelamento";
  if (firstStatus.startsWith("av_")) return "captacao";
  return "other";
}

export default function ListView({ areaId, listId }: { areaId: string; listId: string }) {
  const { space, getArea, getList, cloneTemplateList, moveListToArea } = useOperacao();
  const { showToast } = useToast();
  const router = useRouter();

  const area = getArea(areaId);
  const list = getList(listId);

  const [view, setView] = useState<ViewType>("board");
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [newMode, setNewMode] = useState<NewTaskMode | null>(null);
  const [editorialOpen, setEditorialOpen] = useState(false);
  const [channelFilter, setChannelFilter] = useState<string | null>(null);

  const isCriacao = !!list?.customFields.some((f) => f.key === "midia");

  const visibleTasks = useMemo(() => {
    if (!list) return [];
    if (isCriacao) {
      let posts = list.tasks.filter((t) => t.taskType === "post");
      if (channelFilter) posts = posts.filter((t) => t.customValues["midia"] === channelFilter);
      return posts;
    }
    return list.tasks.filter((t) => t.taskType !== "pack_entrega");
  }, [list, isCriacao, channelFilter]);

  if (!area || !list) {
    return (
      <div className="glass-card" style={{ padding: 32, textAlign: "center", color: "var(--text-tertiary)" }}>
        Lista não encontrada.{" "}
        <Link href="/admin/operacao" style={{ color: "var(--accent)" }}>
          Voltar ao Espaço
        </Link>
      </div>
    );
  }

  const firstStatus = list.statuses[0]?.id ?? "";
  const kind = detectKind(list.name, list.isTemplate, isCriacao, firstStatus);

  const renderActions = () => {
    if (kind === "onboarding")
      return (
        <button className="btn btn-accent" onClick={() => setNewMode("onboarding")}>
          <Plus size={16} /> Novo cliente
        </button>
      );
    if (kind === "cancelamento")
      return (
        <button className="btn btn-accent" onClick={() => setNewMode("cancelamento")}>
          <Plus size={16} /> Novo cancelamento
        </button>
      );
    if (kind === "captacao")
      return (
        <button className="btn btn-accent" onClick={() => setNewMode("captacao")}>
          <Plus size={16} /> Nova captação
        </button>
      );
    if (kind === "criacao_client")
      return (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-secondary" onClick={() => setNewMode("post")}>
            <Plus size={16} /> Novo post
          </button>
          <button className="btn btn-accent" onClick={() => setEditorialOpen(true)}>
            <CalendarPlus size={16} /> Gerar calendário
          </button>
          {area?.name !== "Ex-clientes" && (
            <button className="btn btn-secondary" onClick={handleArchive}>
              <Archive size={16} /> Arquivar cliente
            </button>
          )}
        </div>
      );
    if (kind === "criacao_template")
      return (
        <button className="btn btn-accent" onClick={handleCloneTemplate}>
          <Copy size={16} /> Clonar para novo cliente
        </button>
      );
    return null;
  };

  const handleCloneTemplate = () => {
    const name = window.prompt("Nome do novo cliente:");
    if (!name) return;
    cloneTemplateList(areaId, name);
    showToast(`Lista de ${name} criada a partir do template!`, "success");
  };

  const handleArchive = () => {
    if (!list) return;
    const exArea = space.areas.find((a) => a.name === "Ex-clientes");
    if (!exArea) {
      showToast("Área Ex-clientes não encontrada.", "error");
      return;
    }
    moveListToArea(list.id, exArea.id);
    showToast(`${list.name} arquivado em Ex-clientes.`, "success");
    router.push(`/admin/operacao/${exArea.id}/${list.id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
      {/* Cabeçalho */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Link
          href="/admin/operacao"
          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.78rem", color: "var(--text-tertiary)", fontWeight: 600 }}
        >
          <ChevronLeft size={14} /> {area.name}
        </Link>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 900, margin: 0, letterSpacing: "-0.02em" }}>{list.name}</h1>
            {list.isTemplate && (
              <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--accent)", background: "rgba(217,72,15,0.12)", border: "1px solid rgba(217,72,15,0.25)", padding: "3px 8px", borderRadius: 6, textTransform: "uppercase" }}>
                Template
              </span>
            )}
            <span style={{ fontSize: "0.82rem", color: "var(--text-tertiary)", fontWeight: 600 }}>
              {visibleTasks.length} {isCriacao ? "posts" : "tarefas"}
            </span>
          </div>
          {renderActions()}
        </div>

        {/* Filtro de canal (Criação) */}
        {isCriacao && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <ChannelChip label="Todos" active={channelFilter === null} onClick={() => setChannelFilter(null)} />
            {CRIACAO_CHANNELS.filter((c) => c.media !== "DEMANDA_EXTRA").map((c) => (
              <ChannelChip
                key={c.media}
                label={c.label}
                active={channelFilter === c.media}
                onClick={() => setChannelFilter(c.media)}
              />
            ))}
          </div>
        )}

        <ViewSwitcher views={list.views} active={view} onChange={setView} />
      </div>

      {/* Conteúdo por view */}
      {view === "board" && <KanbanBoard list={list} tasks={visibleTasks} onOpenTask={setSelectedTask} />}
      {view === "table" && <TaskTable list={list} tasks={visibleTasks} onOpenTask={setSelectedTask} />}
      {view === "calendar" && <EditorialCalendarView list={list} tasks={visibleTasks} onOpenTask={setSelectedTask} />}

      {/* Drawer + modais */}
      <TaskDrawer list={list} taskId={selectedTask} onClose={() => setSelectedTask(null)} />
      {newMode && (
        <NewTaskModal
          list={list}
          mode={newMode}
          isOpen={!!newMode}
          onClose={() => setNewMode(null)}
          onCreated={(id) => {
            setSelectedTask(id);
            showToast("Tarefa criada!", "success");
          }}
        />
      )}
      <EditorialCalendarModal
        list={list}
        isOpen={editorialOpen}
        onClose={() => setEditorialOpen(false)}
        onGenerated={(n) => showToast(`${n} demandas de post geradas!`, "success")}
      />
    </motion.div>
  );
}

function ChannelChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 12px",
        borderRadius: 999,
        fontSize: "0.74rem",
        fontWeight: 700,
        cursor: "pointer",
        background: active ? "var(--accent)" : "rgba(255,255,255,0.04)",
        color: active ? "#fff" : "var(--text-secondary)",
        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
      }}
    >
      {label}
    </button>
  );
}
