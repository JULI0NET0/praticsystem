"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  DUE_BUCKET_ORDER,
  dueBucketLabel,
  demandDueBucket,
  toISODate,
  type DueBucket,
} from "@/lib/dueDate";
import { compareDemandsInGroup, isDemandDone } from "@/lib/demandSort";
import type { Demand, DemandListGroupBy } from "@/types/demandas";
import { useDemandas } from "./DemandasProvider";
import DemandRow from "./DemandRow";
import QuickAddRow from "./QuickAddRow";
import DemandContextMenu, { useDemandContextMenu } from "./DemandContextMenu";

/**
 * Grupos que aceitam soltar uma demanda, com o prazo que isso aplica.
 * "Atrasadas", "Esta semana" e "Depois" ficam de fora: cobrem um
 * intervalo, então não há data única a atribuir sem inventar.
 */
const DROP_TARGETS: Partial<Record<DueBucket, () => string | null>> = {
  hoje: () => toISODate(new Date()),
  amanha: () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return toISODate(date);
  },
  sem_data: () => null,
};

const QUICK_ADD_BUCKETS: DueBucket[] = ["hoje", "amanha", "sem_data"];

/**
 * Quanto tempo a demanda fica parada no lugar antes de se reordenar.
 *
 * Sem pausa nenhuma a linha sai do campo de visão no mesmo instante em que o
 * risco começa a ser desenhado, e a animação não é vista. Pausa longa demais
 * é pior: o risco termina, nada acontece por um tempo, e só então a linha
 * salta — três tempos desconexos.
 *
 * O valor acompanha de perto a duração do risco (340ms em DemandRow), para o
 * deslocamento começar no quadro seguinte ao fim dele.
 */
const COMPLETION_HOLD_MS = 380;

const TONE: Record<DueBucket, string> = {
  atrasada: "var(--color-danger)",
  hoje: "var(--accent)",
  amanha: "var(--color-warning)",
  semana: "var(--text-secondary)",
  depois: "var(--text-secondary)",
  sem_data: "var(--text-tertiary)",
};

interface Props {
  demands: Demand[];
  onOpenDemand: (id: string) => void;
  groupBy: DemandListGroupBy;
  selectedIds?: Set<string>;
  onSelectDemand?: (id: string, event: React.MouseEvent) => void;
}

interface GroupSectionProps {
  id: string;
  label: string;
  color: string;
  list: Demand[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isDropTarget: boolean;
  isOver: boolean;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
  dropHintLabel: string;
  quickAdd?: { defaults: Partial<Demand>; placeholder: string };
  onOpenDemand: (id: string) => void;
  onContextMenu: (id: string) => (event: React.MouseEvent) => void;
  onToggleStart: (id: string) => void;
  onDragStartRow: (id: string) => void;
  onDragEndRow: () => void;
  dragId: string | null;
  showStatusPill: boolean;
  selectedIds?: Set<string>;
  onSelectDemand?: (id: string, event: React.MouseEvent) => void;
}

/**
 * Uma seção colapsável (balde de prazo ou coluna de status, a depender do
 * agrupamento ativo). Extraída para não duplicar o cabeçalho/drag/quick-add
 * entre os dois modos — só o que preenche as props muda por modo.
 */
function GroupSection({
  label,
  color,
  list,
  isCollapsed,
  onToggleCollapse,
  isDropTarget,
  isOver,
  onDragOver,
  onDragLeave,
  onDrop,
  dropHintLabel,
  quickAdd,
  onOpenDemand,
  onContextMenu,
  onToggleStart,
  onDragStartRow,
  onDragEndRow,
  dragId,
  showStatusPill,
  selectedIds,
  onSelectDemand,
}: GroupSectionProps) {
  const doneCount = list.filter((d) => d.status_category === "fechado").length;

  // Grupos vazios só aparecem se servirem de destino (quick-add ou drop)
  if (list.length === 0 && !isDropTarget) return null;

  return (
    <section
      onDragOver={(event) => {
        if (!dragId || !isDropTarget) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        onDragOver();
      }}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: isOver ? 8 : 0,
        margin: isOver ? -8 : 0,
        borderRadius: 14,
        background: isOver
          ? "color-mix(in oklab, var(--accent) 7%, transparent)"
          : "transparent",
        outline: isOver
          ? "1px dashed color-mix(in oklab, var(--accent) 45%, transparent)"
          : "none",
        transition: "background 0.15s",
      }}
    >
      <button
        type="button"
        onClick={onToggleCollapse}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "2px 0",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {isCollapsed ? (
          <ChevronRight size={15} color="var(--text-tertiary)" />
        ) : (
          <ChevronDown size={15} color="var(--text-tertiary)" />
        )}
        <span
          style={{
            fontSize: "0.74rem",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color,
          }}
        >
          {label}
        </span>
        <span
          title={
            doneCount > 0
              ? `${list.length - doneCount} em aberto · ${doneCount} concluída(s)`
              : `${list.length} em aberto`
          }
          style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            color: "var(--text-tertiary)",
            background: "var(--color-surface-sunken)",
            padding: "1px 8px",
            borderRadius: 8,
          }}
        >
          {doneCount > 0 ? `${list.length - doneCount}/${list.length}` : list.length}
        </span>
        {isOver && (
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              color: "var(--accent)",
            }}
          >
            soltar aqui
          </span>
        )}
      </button>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {/* `popLayout` tira a linha que sai do fluxo imediatamente,
                  para as vizinhas fecharem o buraco enquanto ela desbota.
                  Sem isso a lista dá um salto quando uma demanda some. */}
              <AnimatePresence initial={false} mode="popLayout">
                {list.map((demand) => (
                  <DemandRow
                    key={demand.id}
                    demand={demand}
                    onOpen={onOpenDemand}
                    onContextMenu={onContextMenu(demand.id)}
                    onToggleStart={onToggleStart}
                    onDragStart={onDragStartRow}
                    onDragEnd={onDragEndRow}
                    dragging={dragId === demand.id}
                    showStatusPill={showStatusPill}
                    selected={selectedIds?.has(demand.id)}
                    onSelect={onSelectDemand}
                  />
                ))}
              </AnimatePresence>

              {list.length === 0 && isOver && (
                <div
                  style={{
                    padding: "14px 8px",
                    textAlign: "center",
                    fontSize: "0.74rem",
                    fontWeight: 600,
                    color: "var(--accent)",
                  }}
                >
                  {dropHintLabel}
                </div>
              )}

              {quickAdd && (
                <div style={{ marginTop: 8 }}>
                  <QuickAddRow defaults={quickAdd.defaults} placeholder={quickAdd.placeholder} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default function DemandListView({
  demands,
  onOpenDemand,
  groupBy,
  selectedIds,
  onSelectDemand,
}: Props) {
  const { loading, updateDemand, demands: allDemands, statuses, moveDemand } = useDemandas();
  const { anchor, openFor, close } = useDemandContextMenu();

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [overGroup, setOverGroup] = useState<string | null>(null);
  /** Demandas que acabaram de mudar de estado e estão seguradas no lugar. */
  const [heldIds, setHeldIds] = useState<ReadonlySet<string>>(() => new Set());

  // Disparado no clique (não num efeito), então é setState em callback.
  const holdForAnimation = (id: string) => {
    setHeldIds((current) => new Set(current).add(id));
    window.setTimeout(() => {
      setHeldIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }, COMPLETION_HOLD_MS);
  };

  // Enquanto segurada, a demanda é ordenada pelo estado ANTERIOR — fica onde
  // está enquanto o risco é desenhado, e só depois desce (ou sobe, ao reabrir).
  const sortAsDone = useCallback(
    (demand: Demand) =>
      heldIds.has(demand.id) ? !isDemandDone(demand) : isDemandDone(demand),
    [heldIds],
  );

  // Com "ocultar concluídas" ligado, a demanda sairia da lista no mesmo
  // clique. As seguradas são reinjetadas para que a animação apareça.
  const visibleWithHeld = useMemo(() => {
    const visible = [...demands];
    const shown = new Set(demands.map((d) => d.id));
    for (const id of heldIds) {
      if (shown.has(id)) continue;
      const held = allDemands.find((d) => d.id === id);
      if (held) visible.push(held);
    }
    return visible;
  }, [demands, allDemands, heldIds]);

  const dueGroups = useMemo(() => {
    const map = new Map<DueBucket, Demand[]>();
    for (const bucket of DUE_BUCKET_ORDER) map.set(bucket, []);
    for (const demand of visibleWithHeld) {
      const bucket = demandDueBucket(
        demand.due_date,
        demand.status_category === "fechado",
        demand.completed_at,
      );
      map.get(bucket)!.push(demand);
    }
    for (const list of map.values()) {
      list.sort((a, b) => compareDemandsInGroup(a, b, sortAsDone));
    }
    return map;
  }, [visibleWithHeld, sortAsDone]);

  const statusGroups = useMemo(() => {
    const map = new Map<string, Demand[]>();
    for (const status of statuses) map.set(status.id, []);
    for (const demand of visibleWithHeld) {
      const bucket = map.get(demand.status);
      if (bucket) bucket.push(demand);
    }
    for (const list of map.values()) {
      list.sort((a, b) => compareDemandsInGroup(a, b, sortAsDone));
    }
    return map;
  }, [visibleWithHeld, statuses, sortAsDone]);

  const endDrag = () => {
    setDragId(null);
    setOverGroup(null);
  };

  const handleDropDue = (bucket: DueBucket) => {
    const resolveDate = DROP_TARGETS[bucket];
    if (dragId && resolveDate) {
      const due = resolveDate();
      // Tirar o prazo também limpa a hora: 14:30 sem data não significa nada
      updateDemand(dragId, due === null ? { due_date: null, due_time: null } : { due_date: due });
    }
    endDrag();
  };

  const handleDropStatus = (statusId: string) => {
    if (dragId) moveDemand(dragId, statusId);
    endDrag();
  };

  if (loading) {
    return (
      <div
        className="glass-card"
        style={{ padding: 40, textAlign: "center", color: "var(--text-tertiary)" }}
      >
        Carregando demandas…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {groupBy === "due"
        ? DUE_BUCKET_ORDER.map((bucket) => (
            <GroupSection
              key={bucket}
              id={bucket}
              label={dueBucketLabel(bucket)}
              color={TONE[bucket]}
              list={dueGroups.get(bucket) ?? []}
              isCollapsed={collapsed[bucket] ?? false}
              onToggleCollapse={() =>
                setCollapsed((c) => ({ ...c, [bucket]: !(c[bucket] ?? false) }))
              }
              isDropTarget={!!DROP_TARGETS[bucket]}
              isOver={overGroup === bucket && !!dragId}
              onDragOver={() => setOverGroup(bucket)}
              onDragLeave={() => setOverGroup((current) => (current === bucket ? null : current))}
              onDrop={() => handleDropDue(bucket)}
              dropHintLabel={`Solte para mover para ${dueBucketLabel(bucket).toLowerCase()}`}
              quickAdd={
                QUICK_ADD_BUCKETS.includes(bucket)
                  ? {
                      defaults: { due_date: DROP_TARGETS[bucket]?.() ?? null },
                      placeholder:
                        bucket === "sem_data"
                          ? "Adicionar demanda sem prazo…"
                          : `Adicionar em "${dueBucketLabel(bucket)}"…`,
                    }
                  : undefined
              }
              onOpenDemand={onOpenDemand}
              onContextMenu={openFor}
              onToggleStart={holdForAnimation}
              onDragStartRow={setDragId}
              onDragEndRow={endDrag}
              dragId={dragId}
              showStatusPill
              selectedIds={selectedIds}
              onSelectDemand={onSelectDemand}
            />
          ))
        : statuses.map((status) => (
            <GroupSection
              key={status.id}
              id={status.id}
              label={status.label}
              color={status.color}
              list={statusGroups.get(status.id) ?? []}
              isCollapsed={collapsed[status.id] ?? false}
              onToggleCollapse={() =>
                setCollapsed((c) => ({ ...c, [status.id]: !(c[status.id] ?? false) }))
              }
              isDropTarget
              isOver={overGroup === status.id && !!dragId}
              onDragOver={() => setOverGroup(status.id)}
              onDragLeave={() =>
                setOverGroup((current) => (current === status.id ? null : current))
              }
              onDrop={() => handleDropStatus(status.id)}
              dropHintLabel={`Solte para mover para "${status.label}"`}
              quickAdd={{
                defaults: { status: status.id },
                placeholder: `Adicionar em "${status.label}"…`,
              }}
              onOpenDemand={onOpenDemand}
              onContextMenu={openFor}
              onToggleStart={holdForAnimation}
              onDragStartRow={setDragId}
              onDragEndRow={endDrag}
              dragId={dragId}
              showStatusPill={false}
              selectedIds={selectedIds}
              onSelectDemand={onSelectDemand}
            />
          ))}

      {anchor && (
        <DemandContextMenu
          anchor={anchor}
          onClose={close}
          onOpenDetails={onOpenDemand}
          onToggleStart={holdForAnimation}
        />
      )}
    </div>
  );
}
