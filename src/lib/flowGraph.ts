import { Node, Edge, MarkerType } from "@xyflow/react";
import type { FlowNodeType } from "@/components/diagramas/FlowchartEditor";
import type { FlowDirection } from "@/components/diagramas/CustomNodes";

// Tamanho de referência de um bloco antes do React Flow medir (card = 240px de largura)
export const DEFAULT_NODE_SIZE = { width: 240, height: 90 };
const GAP_X = 90;
const GAP_Y = 70;

export const OPPOSITE: Record<FlowDirection, FlowDirection> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

/** Título e descrição padrão de cada tipo de bloco (paleta, Tab, "+", fio solto). */
export function defaultNodeData(type: FlowNodeType, category?: string): { label: string; description?: string; category?: string } {
  const cat = type === "startEnd" ? category || "start" : category;
  switch (type) {
    case "startEnd":
      return { label: cat === "end" ? "Fim do Processo" : "Início", category: cat };
    case "process":
      return { label: "Nova etapa" };
    case "decision":
      return { label: "Condição?" };
    case "automation":
      return { label: "Disparo automático" };
    case "whatsapp":
      return { label: "Mensagem WhatsApp" };
    case "social":
      return { label: "Instagram / Social" };
    case "email":
      return { label: "Envio de e-mail" };
    case "meeting":
      return { label: "Reunião / Call" };
    case "payment":
      return { label: "Cobrança / Pagamento" };
    case "delay":
      return { label: "Aguardar" };
    case "approval":
      return { label: "Aprovação do cliente" };
    case "document":
      return { label: "Contrato / Briefing" };
    case "note":
      return { label: "Nota" };
    default:
      return { label: "Nova etapa" };
  }
}

/** Estilo padrão da aresta; Sim/Não de decisões ganham verde/vermelho. */
export function edgeStyle(label?: string) {
  const key = (label || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  const color = key === "sim" ? "#10b981" : key === "nao" ? "#ef4444" : "var(--color-terracotta, #d97757)";
  return {
    markerEnd: { type: MarkerType.ArrowClosed, color },
    style: { stroke: color, strokeWidth: 2 },
  };
}

function size(node: Node) {
  return {
    width: node.measured?.width ?? node.width ?? DEFAULT_NODE_SIZE.width,
    height: node.measured?.height ?? node.height ?? DEFAULT_NODE_SIZE.height,
  };
}

function center(node: Node) {
  const s = size(node);
  return { x: node.position.x + s.width / 2, y: node.position.y + s.height / 2 };
}

/** Direção dominante de `from` para `to`, usada para escolher os handles. */
export function directionBetween(from: Node, to: Node): FlowDirection {
  const a = center(from);
  const b = center(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx >= 0 ? "right" : "left";
  return dy >= 0 ? "bottom" : "top";
}

// Handles invisíveis antigos do nó de decisão → handles visíveis equivalentes
const LEGACY_HANDLES: Record<string, FlowDirection> = { yes: "right", no: "left", default: "bottom" };

/**
 * Corrige arestas salvas sem handle (o React Flow ligava as duas pontas pelo "top",
 * criando o laço que sobe do bloco), troca handles legados e remove auto-conexões.
 */
export function normalizeEdges(nodes: Node[], edges: Edge[]): Edge[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));

  return edges
    .filter((e) => e.source !== e.target && byId.has(e.source) && byId.has(e.target))
    .map((e) => {
      const legacySource = e.sourceHandle ? LEGACY_HANDLES[e.sourceHandle] : undefined;
      if (e.sourceHandle && e.targetHandle && !legacySource) return e;

      const dir = directionBetween(byId.get(e.source)!, byId.get(e.target)!);
      const sourceHandle = legacySource ?? (e.sourceHandle || dir);
      const targetHandle = e.targetHandle || OPPOSITE[legacySource ?? dir];
      return { ...e, sourceHandle, targetHandle };
    });
}

function overlaps(pos: { x: number; y: number }, nodes: Node[], ignoreId?: string) {
  const w = DEFAULT_NODE_SIZE.width;
  const h = DEFAULT_NODE_SIZE.height;
  return nodes.some((n) => {
    if (n.id === ignoreId) return false;
    const s = size(n);
    return pos.x < n.position.x + s.width + 20 && pos.x + w + 20 > n.position.x && pos.y < n.position.y + s.height + 20 && pos.y + h + 20 > n.position.y;
  });
}

/**
 * Posição para um bloco novo ao lado de `from`, na direção pedida. Se o lugar estiver
 * ocupado (ex.: segundo filho), desliza no eixo perpendicular até achar espaço.
 */
export function placeConnectedNode(from: Node, direction: FlowDirection, nodes: Node[]): { x: number; y: number } {
  const s = size(from);
  const w = DEFAULT_NODE_SIZE.width;
  const h = DEFAULT_NODE_SIZE.height;

  let pos: { x: number; y: number };
  switch (direction) {
    case "right":
      pos = { x: from.position.x + s.width + GAP_X, y: from.position.y + (s.height - h) / 2 };
      break;
    case "left":
      pos = { x: from.position.x - w - GAP_X, y: from.position.y + (s.height - h) / 2 };
      break;
    case "top":
      pos = { x: from.position.x + (s.width - w) / 2, y: from.position.y - h - GAP_Y };
      break;
    default:
      pos = { x: from.position.x + (s.width - w) / 2, y: from.position.y + s.height + GAP_Y };
  }

  const horizontal = direction === "left" || direction === "right";
  const step = horizontal ? h + 40 : w + 40;
  for (let i = 1; i <= 12 && overlaps(pos, nodes); i++) {
    // Alterna lados: +1, -1, +2, -2...
    const k = Math.ceil(i / 2) * (i % 2 ? 1 : -1);
    const base = horizontal ? { ...pos, y: pos.y + k * step } : { ...pos, x: pos.x + k * step };
    if (!overlaps(base, nodes)) {
      pos = base;
      break;
    }
  }

  return { x: Math.round(pos.x), y: Math.round(pos.y) };
}
