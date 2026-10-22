import { Node, Edge } from "@xyflow/react";
import type { FlowNodeType } from "@/components/diagramas/FlowchartEditor";
import type { CustomNodeData, FlowDirection } from "@/components/diagramas/CustomNodes";
import { getNodeTypeBadge, resolveNodeType } from "./diagramMarkdown";
import { defaultNodeData, directionBetween, edgeStyle, OPPOSITE, placeConnectedNode } from "./flowGraph";

/*
 * Visão em texto (outline) dos diagramas, no estilo do Whimsical: uma lista indentada
 * em que a indentação é a hierarquia. Funciona nos dois sentidos e preserva ids,
 * posições e estilos do que já existe, para editar o texto sem bagunçar o canvas.
 *
 * Fluxograma:
 *   - [Início] Captação
 *     > descrição do bloco (linhas ">" logo abaixo)
 *     - [Decisão] Respondeu?
 *       - Sim → [Etapa] Agendar call
 *       - Não → ↪ Captação          (referência a um bloco já listado: só cria a seta)
 *
 * Mapa mental:
 *   - Tema central
 *     - Tópico
 *       - Subtópico
 */

const INDENT = "  ";
const REF = "↪";
const ARROW = "→";

// ---------------------------------------------------------------------------
// Parsing genérico de lista indentada
// ---------------------------------------------------------------------------

export interface OutlineLine {
  depth: number;
  text: string;
  notes: string[];
  children: OutlineLine[];
}

/** Lê o texto e devolve as linhas de topo com filhos aninhados pela indentação. */
export function parseOutline(text: string): OutlineLine[] {
  const roots: OutlineLine[] = [];
  const stack: { indent: number; line: OutlineLine }[] = [];

  for (const raw of text.replace(/\t/g, INDENT).split("\n")) {
    if (!raw.trim() || raw.trim().startsWith("#")) continue;
    const indent = raw.length - raw.trimStart().length;
    const body = raw.trim();

    // Linha de descrição: pertence ao último item com indentação menor
    if (body.startsWith(">")) {
      // Item mais profundo com indentação menor que a nota; sem nenhum, o último item
      const owner = [...stack].reverse().find((s) => s.indent < indent) ?? stack[stack.length - 1];
      owner?.line.notes.push(body.replace(/^>\s?/, ""));
      continue;
    }

    const content = body.replace(/^[-*+]\s+|^\d+[.)]\s+/, "").trim();
    if (!content) continue;

    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const parent = stack[stack.length - 1];
    const line: OutlineLine = { depth: parent ? parent.line.depth + 1 : 0, text: content, notes: [], children: [] };
    if (parent) parent.line.children.push(line);
    else roots.push(line);
    stack.push({ indent, line });
  }

  return roots;
}

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Casa duas sequências de títulos (antiga x nova) por LCS. Itens não casados que ficam
 * no mesmo "vão" entre âncoras e na mesma posição relativa são tratados como renomeação.
 * Retorna, para cada índice novo, o índice antigo correspondente (ou -1).
 */
export function matchSequences(oldKeys: string[], newKeys: string[]): number[] {
  const n = oldKeys.length;
  const m = newKeys.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = oldKeys[i] === newKeys[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const result = new Array(m).fill(-1);
  const anchors: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (oldKeys[i] === newKeys[j]) {
      result[j] = i;
      anchors.push([i, j]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }

  // Renomeações: dentro de cada vão, pareia os não casados em ordem
  anchors.push([n, m]);
  let prevI = -1;
  let prevJ = -1;
  for (const [ai, aj] of anchors) {
    const gapOld: number[] = [];
    const gapNew: number[] = [];
    for (let x = prevI + 1; x < ai; x++) gapOld.push(x);
    for (let y = prevJ + 1; y < aj; y++) gapNew.push(y);
    for (let k = 0; k < Math.min(gapOld.length, gapNew.length); k++) result[gapNew[k]] = gapOld[k];
    prevI = ai;
    prevJ = aj;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Fluxograma
// ---------------------------------------------------------------------------

interface FlowOccurrence {
  nodeId: string;
  edgeLabel?: string;
  isRef: boolean;
}

function sortByPosition(nodes: Node[]) {
  return [...nodes].sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);
}

/** Percorre o grafo em profundidade a partir das raízes, na ordem visual. */
function walkFlowchart(nodes: Node[], edges: Edge[]) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const outgoing = new Map<string, Edge[]>();
  const incoming = new Set<string>();
  for (const e of edges) {
    if (!byId.has(e.source) || !byId.has(e.target)) continue;
    if (!outgoing.has(e.source)) outgoing.set(e.source, []);
    outgoing.get(e.source)!.push(e);
    incoming.add(e.target);
  }
  for (const list of outgoing.values()) {
    list.sort((a, b) => {
      const ta = byId.get(a.target)!.position;
      const tb = byId.get(b.target)!.position;
      return ta.x - tb.x || ta.y - tb.y;
    });
  }

  const isStart = (n: Node) => n.type === "startEnd" && (n.data as CustomNodeData)?.category !== "end";
  const roots = sortByPosition(nodes.filter((n) => !incoming.has(n.id))).sort((a, b) => Number(isStart(b)) - Number(isStart(a)));

  const visited = new Set<string>();
  const lines: { depth: number; occ: FlowOccurrence }[] = [];

  const visit = (id: string, depth: number, edgeLabel?: string) => {
    if (visited.has(id)) {
      lines.push({ depth, occ: { nodeId: id, edgeLabel, isRef: true } });
      return;
    }
    visited.add(id);
    lines.push({ depth, occ: { nodeId: id, edgeLabel, isRef: false } });
    for (const e of outgoing.get(id) || []) visit(e.target, depth + 1, typeof e.label === "string" ? e.label : undefined);
  };

  for (const r of roots) visit(r.id, 0);
  // Ciclos sem raiz: começa pelo bloco mais acima ainda não visitado
  for (const n of sortByPosition(nodes)) if (!visited.has(n.id)) visit(n.id, 0);

  return lines;
}

function nodeTitle(n: Node) {
  return String((n.data as CustomNodeData)?.label || "").replace(/\s+/g, " ").trim() || "Sem título";
}

export function flowchartToOutline(nodes: Node[], edges: Edge[]): string {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out: string[] = [];

  for (const { depth, occ } of walkFlowchart(nodes, edges)) {
    const node = byId.get(occ.nodeId)!;
    const pad = INDENT.repeat(depth);
    const prefix = occ.edgeLabel ? `${occ.edgeLabel} ${ARROW} ` : "";
    if (occ.isRef) {
      out.push(`${pad}- ${prefix}${REF} ${nodeTitle(node)}`);
      continue;
    }
    out.push(`${pad}- ${prefix}[${getNodeTypeBadge(node)}] ${nodeTitle(node)}`);
    const desc = String((node.data as CustomNodeData)?.description || "").trim();
    if (desc) for (const d of desc.split("\n")) out.push(`${pad}${INDENT}> ${d}`);
  }

  return out.join("\n");
}

interface ParsedFlowLine {
  edgeLabel?: string;
  isRef: boolean;
  tag?: string;
  title: string;
}

/** "Sim → [Etapa] Título" → partes. */
export function parseFlowLine(text: string): ParsedFlowLine {
  let rest = text;
  let edgeLabel: string | undefined;
  const arrow = rest.match(/^(.{1,40}?)\s*(?:→|->)\s*(.*)$/);
  // Só é rótulo de seta se vier antes da tag/referência (evita cortar "A -> B" num título)
  if (arrow && !arrow[1].includes("[") && !arrow[1].includes(REF)) {
    edgeLabel = arrow[1].trim();
    rest = arrow[2].trim();
  }
  const isRef = rest.startsWith(REF);
  if (isRef) rest = rest.slice(REF.length).trim();
  let tag: string | undefined;
  const tagMatch = rest.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (tagMatch) {
    tag = tagMatch[1].trim();
    rest = tagMatch[2].trim();
  }
  return { edgeLabel, isRef, tag, title: rest || "Sem título" };
}

/**
 * Aplica o outline sobre o fluxograma atual: mantém id, posição e estilo dos blocos que
 * continuam no texto, cria os novos ao lado do bloco pai e remove os que saíram.
 */
export function outlineToFlowchart(text: string, prevNodes: Node[], prevEdges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  const prevById = new Map(prevNodes.map((n) => [n.id, n]));

  // Sequência antiga (só definições, sem referências) para casar com a nova
  const oldOcc = walkFlowchart(prevNodes, prevEdges).filter((l) => !l.occ.isRef).map((l) => prevById.get(l.occ.nodeId)!);

  // Achata o outline novo mantendo o pai de cada linha
  type Flat = { parsed: ParsedFlowLine; notes: string[]; parentIdx: number; depth: number };
  const flat: Flat[] = [];
  const flatten = (lines: OutlineLine[], parentIdx: number) => {
    for (const l of lines) {
      flat.push({ parsed: parseFlowLine(l.text), notes: l.notes, parentIdx, depth: l.depth });
      flatten(l.children, flat.length - 1);
    }
  };
  flatten(parseOutline(text), -1);

  const defs = flat.map((f, i) => ({ f, i })).filter(({ f }) => !f.parsed.isRef);
  const match = matchSequences(oldOcc.map((n) => norm(nodeTitle(n))), defs.map(({ f }) => norm(f.parsed.title)));

  // Resolve id de cada linha de definição
  const idOfFlat = new Map<number, string>();
  const used = new Set<string>();
  defs.forEach(({ i }, k) => {
    const old = match[k] >= 0 ? oldOcc[match[k]] : undefined;
    if (old && !used.has(old.id)) {
      idOfFlat.set(i, old.id);
      used.add(old.id);
    } else {
      idOfFlat.set(i, `node-${Date.now().toString(36)}-${i}`);
    }
  });

  // Referências apontam para a primeira definição com o mesmo título
  const firstByTitle = new Map<string, string>();
  for (const { f, i } of defs) if (!firstByTitle.has(norm(f.parsed.title))) firstByTitle.set(norm(f.parsed.title), idOfFlat.get(i)!);
  flat.forEach((f, i) => {
    if (f.parsed.isRef) {
      const target = firstByTitle.get(norm(f.parsed.title));
      if (target) idOfFlat.set(i, target);
    }
  });

  // Monta os nós na ordem do texto (pais antes dos filhos, para posicionar os novos)
  const nodes: Node[] = [];
  const nodesById = new Map<string, Node>();
  for (const { f, i } of defs) {
    const id = idOfFlat.get(i)!;
    const prev = prevById.get(id);
    const resolved = f.parsed.tag ? resolveNodeType(f.parsed.tag, f.parsed.title) : undefined;
    const type = (resolved?.type ?? (prev?.type as FlowNodeType | undefined) ?? resolveNodeType(undefined, f.parsed.title).type) as FlowNodeType;
    const category = resolved?.category ?? (prev?.data as CustomNodeData | undefined)?.category;
    const description = f.notes.join("\n").trim() || undefined;

    let position = prev?.position;
    if (!position) {
      const parentId = f.parentIdx >= 0 ? idOfFlat.get(f.parentIdx) : undefined;
      const parent = parentId ? nodesById.get(parentId) : undefined;
      if (parent) {
        const dir: FlowDirection =
          parent.type === "decision" && f.parsed.edgeLabel
            ? norm(f.parsed.edgeLabel) === "sim" ? "right" : norm(f.parsed.edgeLabel) === "nao" ? "left" : "bottom"
            : "bottom";
        position = placeConnectedNode(parent, dir, nodes);
      } else {
        const maxX = nodes.reduce((m, n) => Math.max(m, n.position.x), prevNodes.reduce((m, n) => Math.max(m, n.position.x), 0));
        position = { x: nodes.length || prevNodes.length ? maxX + 340 : 250, y: 50 };
      }
    }

    const node: Node = {
      ...(prev || {}),
      id,
      type,
      position,
      data: {
        ...(prev ? prev.data : defaultNodeData(type, category)),
        label: f.parsed.title,
        description,
        category: type === "startEnd" ? category || "start" : category,
      },
    };
    nodes.push(node);
    nodesById.set(id, node);
  }

  // Arestas: uma por linha com pai; reaproveita a antiga (handles, estilo) quando existir
  const prevEdgeByPair = new Map(prevEdges.map((e) => [`${e.source}->${e.target}`, e]));
  const edges: Edge[] = [];
  const seen = new Set<string>();
  flat.forEach((f, i) => {
    if (f.parentIdx < 0) return;
    const source = idOfFlat.get(f.parentIdx);
    const target = idOfFlat.get(i);
    if (!source || !target || source === target || !nodesById.has(source) || !nodesById.has(target)) return;
    const key = `${source}->${target}`;
    if (seen.has(key)) return;
    seen.add(key);

    const label = f.parsed.edgeLabel;
    const prev = prevEdgeByPair.get(key);
    if (prev) {
      const prevLabel = typeof prev.label === "string" ? prev.label : undefined;
      edges.push(prevLabel === label ? prev : { ...prev, label, ...edgeStyle(label) });
      return;
    }
    const dir = directionBetween(nodesById.get(source)!, nodesById.get(target)!);
    edges.push({
      id: `e-${source}-${target}`,
      source,
      target,
      sourceHandle: dir,
      targetHandle: OPPOSITE[dir],
      label,
      ...edgeStyle(label),
    });
  });

  return { nodes, edges };
}

// ---------------------------------------------------------------------------
// Mapa mental (formato do mind-elixir: { nodeData: { id, topic, children } })
// ---------------------------------------------------------------------------

export interface MindNode {
  id: string;
  topic: string;
  children?: MindNode[];
  [key: string]: unknown;
}

export function mindmapToOutline(data: { nodeData?: MindNode } | null | undefined): string {
  const root = data?.nodeData;
  if (!root) return "";
  const out: string[] = [];
  const visit = (n: MindNode, depth: number) => {
    out.push(`${INDENT.repeat(depth)}- ${String(n.topic ?? "").replace(/\s+/g, " ").trim()}`);
    for (const c of n.children || []) visit(c, depth + 1);
  };
  visit(root, 0);
  return out.join("\n");
}

/**
 * Reconstrói a árvore do mapa a partir do outline, preservando id e propriedades
 * (estilo, recolhido, ícones) de cada tópico casado. A primeira linha de topo é a raiz;
 * outras linhas de topo viram filhos dela. Resumos e setas cujos tópicos sumiram são descartados.
 */
export function outlineToMindmap(text: string, prevData: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const prevRoot = (prevData?.nodeData as MindNode | undefined) ?? { id: "root", topic: "Tema central" };
  const tops = parseOutline(text);
  if (tops.length === 0) return { ...(prevData || {}), nodeData: { ...prevRoot, children: [] } };

  const rootLine: OutlineLine = { ...tops[0], children: [...tops[0].children, ...tops.slice(1)] };
  let counter = 0;
  const newId = () => `me-${Date.now().toString(36)}-${counter++}`;

  const build = (line: OutlineLine, prev: MindNode | undefined): MindNode => {
    const prevChildren = prev?.children || [];
    const match = matchSequences(prevChildren.map((c) => norm(String(c.topic ?? ""))), line.children.map((c) => norm(c.text)));
    const children = line.children.map((c, k) => build(c, match[k] >= 0 ? prevChildren[match[k]] : undefined));
    return { ...(prev || {}), id: prev?.id ?? newId(), topic: line.text, children };
  };

  const nodeData = build(rootLine, prevRoot);

  // Índice de ids e quantidade de filhos para validar resumos e setas
  const childCount = new Map<string, number>();
  const walk = (n: MindNode) => {
    childCount.set(n.id, n.children?.length ?? 0);
    n.children?.forEach(walk);
  };
  walk(nodeData);

  const summaries = ((prevData?.summaries as { parent: string; end: number }[] | undefined) || []).filter(
    (s) => childCount.has(s.parent) && s.end < (childCount.get(s.parent) ?? 0)
  );
  const arrows = ((prevData?.arrows as { from: string; to: string }[] | undefined) || []).filter(
    (a) => childCount.has(a.from) && childCount.has(a.to)
  );

  return { ...(prevData || {}), nodeData, summaries, arrows };
}
