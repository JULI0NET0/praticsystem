import { Node, Edge, MarkerType } from "@xyflow/react";
import { FlowNodeType } from "@/components/diagramas/FlowchartEditor";
import { CustomNodeData } from "@/components/diagramas/CustomNodes";

// Mapeamento de rótulos de tipos legíveis em português
export const NODE_TYPE_LABELS: Record<string, { label: string; type: FlowNodeType; category?: string }> = {
  inicio: { label: "Início", type: "startEnd", category: "start" },
  start: { label: "Início", type: "startEnd", category: "start" },
  etapa: { label: "Etapa", type: "process" },
  processo: { label: "Etapa", type: "process" },
  process: { label: "Etapa", type: "process" },
  decisao: { label: "Decisão", type: "decision" },
  condicao: { label: "Decisão", type: "decision" },
  decision: { label: "Decisão", type: "decision" },
  automacao: { label: "Automação", type: "automation" },
  automation: { label: "Automação", type: "automation" },
  whatsapp: { label: "WhatsApp", type: "whatsapp" },
  instagram: { label: "Instagram", type: "social" },
  social: { label: "Instagram", type: "social" },
  email: { label: "E-mail", type: "email" },
  reuniao: { label: "Reunião", type: "meeting" },
  call: { label: "Reunião", type: "meeting" },
  meeting: { label: "Reunião", type: "meeting" },
  pagamento: { label: "Pagamento", type: "payment" },
  venda: { label: "Pagamento", type: "payment" },
  payment: { label: "Pagamento", type: "payment" },
  espera: { label: "Aguardar", type: "delay" },
  delay: { label: "Aguardar", type: "delay" },
  aguardar: { label: "Aguardar", type: "delay" },
  aprovacao: { label: "Aprovação", type: "approval" },
  approval: { label: "Aprovação", type: "approval" },
  contrato: { label: "Contrato", type: "document" },
  documento: { label: "Contrato", type: "document" },
  document: { label: "Contrato", type: "document" },
  fim: { label: "Fim", type: "startEnd", category: "end" },
  end: { label: "Fim", type: "startEnd", category: "end" },
  nota: { label: "Nota", type: "note" },
  note: { label: "Nota", type: "note" },
};

function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Converte um nó em um rótulo amigável (ex: "[WhatsApp] Disparo de Mensagem")
 */
function getNodeTypeBadge(node: Node): string {
  if (node.type === "startEnd") {
    const cat = (node.data as CustomNodeData)?.category;
    return cat === "end" ? "Fim" : "Início";
  }
  switch (node.type) {
    case "process": return "Etapa";
    case "decision": return "Decisão";
    case "automation": return "Automação";
    case "whatsapp": return "WhatsApp";
    case "social": return "Instagram";
    case "email": return "E-mail";
    case "meeting": return "Reunião";
    case "payment": return "Pagamento";
    case "delay": return "Aguardar";
    case "approval": return "Aprovação";
    case "document": return "Contrato";
    case "note": return "Nota";
    default: return "Etapa";
  }
}

/**
 * Converte o fluxograma atual (nós e arestas) em Markdown legível e estruturado
 */
export function flowchartToMarkdown(nodes: Node[], edges: Edge[], title: string = "Fluxograma"): string {
  if (!nodes || nodes.length === 0) {
    return `# ${title}\n\n*Nenhum bloco cadastrado ainda.*`;
  }

  // Ordenação topológica simples (por Y e depois por X para seguir a ordem de leitura do fluxo)
  const sortedNodes = [...nodes].sort((a, b) => {
    if (Math.abs(a.position.y - b.position.y) > 40) {
      return a.position.y - b.position.y;
    }
    return a.position.x - b.position.x;
  });

  const nodeMap = new Map<string, Node>(nodes.map((n) => [n.id, n]));

  // Agrupa conexões de saída por nó de origem
  const outgoingEdges = new Map<string, Edge[]>();
  edges.forEach((edge) => {
    const list = outgoingEdges.get(edge.source) || [];
    list.push(edge);
    outgoingEdges.set(edge.source, list);
  });

  const lines: string[] = [];
  lines.push(`# ${title}`);
  lines.push("");
  lines.push("> Fluxograma estruturado. Você pode editar este texto ou pedir para uma IA otimizar as etapas.");
  lines.push("");

  let stepNumber = 1;
  const regularNodes = sortedNodes.filter((n) => n.type !== "note");
  const noteNodes = sortedNodes.filter((n) => n.type === "note");

  regularNodes.forEach((node) => {
    const data = node.data as CustomNodeData;
    const badge = getNodeTypeBadge(node);
    const label = data?.label || "Sem título";
    const desc = data?.description?.trim();

    lines.push(`${stepNumber}. [${badge}] ${label}`);

    if (desc) {
      lines.push(`   - Descrição: ${desc}`);
    }

    const outs = outgoingEdges.get(node.id) || [];
    if (outs.length > 0) {
      outs.forEach((edge) => {
        const targetNode = nodeMap.get(edge.target);
        const targetLabel = (targetNode?.data as CustomNodeData)?.label || targetNode?.id || "Próxima Etapa";

        if (node.type === "decision") {
          const edgeLabel = edge.label || (edge.sourceHandle === "no" || edge.sourceHandle === "left" ? "Não" : "Sim");
          lines.push(`   - ${edgeLabel} -> ${targetLabel}`);
        } else if (edge.label) {
          lines.push(`   - ${edge.label} -> ${targetLabel}`);
        } else {
          lines.push(`   - Próximo -> ${targetLabel}`);
        }
      });
    }

    lines.push("");
    stepNumber++;
  });

  if (noteNodes.length > 0) {
    lines.push("### Notas e Observações");
    lines.push("");
    noteNodes.forEach((note) => {
      const data = note.data as CustomNodeData;
      lines.push(`- [Nota] ${data?.label || "Nota..."}`);
    });
    lines.push("");
  }

  return lines.join("\n");
}

interface ParsedStep {
  id: string;
  stepNumber?: number;
  type: FlowNodeType;
  category?: string;
  label: string;
  description?: string;
  connections: { label?: string; targetLabel: string }[];
}

/**
 * Faz o parse de texto no formato Mermaid (graph TD / flowchart TD)
 */
function parseMermaid(text: string): ParsedStep[] {
  const lines = text.split("\n");
  const stepsMap = new Map<string, ParsedStep>();
  let idCounter = 1;

  function getOrCreateStep(rawId: string, nodeText?: string, shape?: string): ParsedStep {
    const cleanId = rawId.trim();
    if (stepsMap.has(cleanId)) {
      const existing = stepsMap.get(cleanId)!;
      if (nodeText && !existing.description && existing.label === cleanId) {
        existing.label = nodeText;
        const resolved = resolveNodeType(undefined, nodeText);
        existing.type = shape === "{" ? "decision" : resolved.type;
        existing.category = resolved.category;
      }
      return existing;
    }

    const label = nodeText || cleanId;
    let { type, category } = resolveNodeType(undefined, label);
    if (shape === "{") {
      type = "decision";
    }

    const newStep: ParsedStep = {
      id: `node-${idCounter++}`,
      type,
      category,
      label,
      connections: [],
    };
    stepsMap.set(cleanId, newStep);
    return newStep;
  }

  // Regex para nós com formas: A[Label], B{Label}, C([Label]), D((Label))
  const nodeDefRegex = /([a-zA-Z0-9_-]+)\s*([\[\{\(\/])(?:\()?([^\]\}\)\/]+)(?:\))?([\]\}\)\/])/g;

  // Primeiro passo: registrar os nós
  lines.forEach((line) => {
    let match: RegExpExecArray | null;
    while ((match = nodeDefRegex.exec(line)) !== null) {
      const nodeId = match[1];
      const shape = match[2];
      const nodeLabel = match[3];
      getOrCreateStep(nodeId, nodeLabel, shape);
    }
  });

  // Segundo passo: registrar as conexões
  // Ex: A --> B, A -->|Sim| B, A -- Sim --> B, A -.-> B
  const edgeRegex = /([a-zA-Z0-9_-]+)\s*(?:\[[^\]]*\]|\{[^\}]*\}|\([^\)]*\))?\s*(?:-->|---|--\s*([^|>\-]+)\s*-->|-->\|([^|]+)\||\.->)\s*([a-zA-Z0-9_-]+)/;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("graph") || trimmed.startsWith("flowchart") || trimmed.startsWith("subgraph") || trimmed.startsWith("end")) {
      return;
    }

    const match = trimmed.match(edgeRegex);
    if (match) {
      const sourceId = match[1];
      const edgeLabel = (match[2] || match[3] || "").trim() || undefined;
      const targetId = match[4];

      const sourceStep = getOrCreateStep(sourceId);
      const targetStep = getOrCreateStep(targetId);

      sourceStep.connections.push({
        label: edgeLabel,
        targetLabel: targetStep.label,
      });
    }
  });

  return Array.from(stepsMap.values());
}

/**
 * Faz o parse de texto em Markdown e gera o grafo de nós e arestas com layout automático
 */
export function markdownToFlowchart(markdownText: string): { nodes: Node[]; edges: Edge[] } {
  // Se for código Mermaid
  if (markdownText.includes("graph TD") || markdownText.includes("flowchart TD") || markdownText.includes("graph LR") || markdownText.includes("flowchart LR")) {
    const mermaidSteps = parseMermaid(markdownText);
    if (mermaidSteps.length > 0) {
      return layoutStepsToFlowchart(mermaidSteps);
    }
  }

  const lines = markdownText.split("\n");
  const steps: ParsedStep[] = [];
  let currentStep: ParsedStep | null = null;
  let idCounter = 1;

  // Regex para início de etapa numerada: "1. [Tipo] Título" ou "1. Título"
  const numberedStepRegex = /^(\d+)\.\s*(?:\[([^\]]+)\])?\s*(.+)$/;

  // Regex para sub-itens de conexão: "- Sim -> Destino", "- -> Destino", "Sim -> Destino", "-> Destino"
  const subConnectionRegex = /^(?:[-*]\s*)?(?:([^:\->]+)\s*[:\->]\s*)?->\s*(.+)$/;

  // Regex para sub-itens de detalhe/descrição: "- Descrição: texto" ou "- texto qualquer"
  const bulletRegex = /^(?:[-*]\s*|\s{2,})(.+)$/;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith(">") || trimmed.startsWith("```")) {
      continue;
    }

    // 1. Testa se é uma nova etapa numerada (ex: "1. [Início] Lead")
    const numMatch = trimmed.match(numberedStepRegex);
    if (numMatch) {
      const stepNum = parseInt(numMatch[1], 10);
      const typeTag = numMatch[2];
      let cleanLabel = numMatch[3].trim();

      let inlineTarget: string | null = null;
      if (cleanLabel.includes("->")) {
        const segs = cleanLabel.split("->");
        cleanLabel = segs[0].trim();
        inlineTarget = segs.slice(1).join("->").trim();
      }

      const { type, category } = resolveNodeType(typeTag, cleanLabel);

      currentStep = {
        id: `node-${idCounter++}`,
        stepNumber: stepNum,
        type,
        category,
        label: cleanLabel,
        connections: [],
      };
      steps.push(currentStep);

      if (inlineTarget) {
        currentStep.connections.push({ targetLabel: inlineTarget });
      }
      continue;
    }

    // 2. Se já existe uma etapa atual, verifica se a linha é conexão filha ou descrição
    if (currentStep) {
      if (trimmed.includes("->") || trimmed.includes("-->")) {
        const arrow = trimmed.includes("-->") ? "-->" : "->";
        const withoutBullet = trimmed.replace(/^[-*]\s*/, "");
        const [leftPart, ...rightParts] = withoutBullet.split(arrow);
        const targetLabel = rightParts.join(arrow).trim();
        const rawLabel = leftPart.trim();
        const connLabel = rawLabel && !rawLabel.toLowerCase().includes("proximo") && !rawLabel.toLowerCase().includes("next")
          ? rawLabel
          : undefined;

        currentStep.connections.push({
          label: connLabel,
          targetLabel,
        });
        continue;
      }

      // Se for marcador de texto / descrição
      const bulletMatch = trimmed.match(bulletRegex);
      if (bulletMatch) {
        let descContent = bulletMatch[1].trim();
        descContent = descContent.replace(/^(?:descri[cç][aã]o|detalhes?)\s*:\s*/i, "");
        if (descContent) {
          if (!currentStep.description) {
            currentStep.description = descContent;
          } else {
            currentStep.description += ` • ${descContent}`;
          }
        }
        continue;
      }
    }

    // 3. Fallback para itens com marcador no nível raiz se não foram numerados: "- [Tipo] Título"
    const rootBulletMatch = trimmed.match(/^[-*]\s*(?:\[([^\]]+)\])?\s*(.+)$/);
    if (rootBulletMatch) {
      const typeTag = rootBulletMatch[1];
      let cleanLabel = rootBulletMatch[2].trim();

      let inlineTarget: string | null = null;
      if (cleanLabel.includes("->")) {
        const segs = cleanLabel.split("->");
        cleanLabel = segs[0].trim();
        inlineTarget = segs.slice(1).join("->").trim();
      }

      const { type, category } = resolveNodeType(typeTag, cleanLabel);

      currentStep = {
        id: `node-${idCounter++}`,
        type,
        category,
        label: cleanLabel,
        connections: [],
      };
      steps.push(currentStep);

      if (inlineTarget) {
        currentStep.connections.push({ targetLabel: inlineTarget });
      }
      continue;
    }
  }

  return layoutStepsToFlowchart(steps);
}

/**
 * Posiciona e interliga os passos estruturados gerando nós e arestas React Flow
 */
function layoutStepsToFlowchart(steps: ParsedStep[]): { nodes: Node[]; edges: Edge[] } {
  // Se nenhum passo foi identificado, cria um fluxo de fallback inicial
  if (steps.length === 0) {
    return {
      nodes: [
        {
          id: "1",
          type: "startEnd",
          position: { x: 260, y: 60 },
          data: { label: "Início", category: "start" },
        },
        {
          id: "2",
          type: "process",
          position: { x: 240, y: 190 },
          data: { label: "Etapa Inicial", description: "Edite o Markdown para adicionar mais etapas." },
        },
      ],
      edges: [
        {
          id: "e1-2",
          source: "1",
          target: "2",
          sourceHandle: "bottom",
          targetHandle: "top",
          markerEnd: { type: MarkerType.ArrowClosed, color: "var(--color-terracotta, #e05d38)" },
          style: { stroke: "var(--color-terracotta, #e05d38)", strokeWidth: 2 },
        },
      ],
    };
  }

  // Mapas de busca para resolver conexões por Rótulo ou por Número de Etapa
  const labelToStepMap = new Map<string, ParsedStep>();
  const stepNumberMap = new Map<string, ParsedStep>();

  steps.forEach((s) => {
    labelToStepMap.set(normalizeKey(s.label), s);
    if (s.stepNumber !== undefined) {
      stepNumberMap.set(String(s.stepNumber), s);
    }
  });

  // Função para resolver o alvo de uma conexão (por nome ou número)
  function resolveTargetStep(targetRaw: string): ParsedStep | undefined {
    const trimmed = targetRaw.trim();
    // Verifica se é número puro (ex: "2", "3")
    if (stepNumberMap.has(trimmed)) {
      return stepNumberMap.get(trimmed);
    }
    // Verifica se é rótulo
    const norm = normalizeKey(trimmed);
    if (labelToStepMap.has(norm)) {
      return labelToStepMap.get(norm);
    }
    // Procura por inclusão parcial de nome
    for (const [key, step] of labelToStepMap.entries()) {
      if (key.includes(norm) || norm.includes(key)) {
        return step;
      }
    }
    return undefined;
  }

  // Se não houver conexões explícitas em fluxo linear, conecta sequencialmente (1 -> 2 -> 3...)
  const hasAnyExplicitConnections = steps.some((s) => s.connections.length > 0);
  if (!hasAnyExplicitConnections && steps.length > 1) {
    for (let i = 0; i < steps.length - 1; i++) {
      if (steps[i].type !== "note") {
        steps[i].connections.push({ targetLabel: steps[i + 1].label });
      }
    }
  }

  // Algoritmo de Camadas (DAG Depth Layering) para layout simétrico e organizado
  const inDegree = new Map<string, number>();
  steps.forEach((s) => inDegree.set(s.id, 0));

  steps.forEach((s) => {
    s.connections.forEach((c) => {
      const target = resolveTargetStep(c.targetLabel);
      if (target && target.id !== s.id) {
        inDegree.set(target.id, (inDegree.get(target.id) || 0) + 1);
      }
    });
  });

  // Atribui nível / profundidade a cada nó
  const levels = new Map<string, number>();
  const queue: string[] = [];

  // Começa pelos nós raiz (in-degree 0)
  steps.forEach((s) => {
    if ((inDegree.get(s.id) || 0) === 0) {
      levels.set(s.id, 0);
      queue.push(s.id);
    }
  });

  // Se todos tiverem inDegree > 0 (ciclo), começa pelo primeiro nó
  if (queue.length === 0 && steps.length > 0) {
    levels.set(steps[0].id, 0);
    queue.push(steps[0].id);
  }

  const stepMap = new Map<string, ParsedStep>(steps.map((s) => [s.id, s]));

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentLvl = levels.get(currentId) || 0;
    const currentStepObj = stepMap.get(currentId);

    if (currentStepObj) {
      currentStepObj.connections.forEach((c) => {
        const target = resolveTargetStep(c.targetLabel);
        if (target) {
          const existingLvl = levels.get(target.id);
          const nextLvl = currentLvl + 1;
          if (existingLvl === undefined || nextLvl > existingLvl) {
            levels.set(target.id, nextLvl);
            queue.push(target.id);
          }
        }
      });
    }
  }

  // Agrupa nós por camada (nível vertical)
  const levelGroups = new Map<number, ParsedStep[]>();
  steps.forEach((s) => {
    const lvl = levels.get(s.id) ?? 0;
    const group = levelGroups.get(lvl) || [];
    group.push(s);
    levelGroups.set(lvl, group);
  });

  // Gera coordenadas { x, y } bem espaçadas
  const nodes: Node[] = [];
  const nodePositionMap = new Map<string, { x: number; y: number }>();

  levelGroups.forEach((group, lvl) => {
    const count = group.length;
    const spacingX = 260;
    const totalWidth = (count - 1) * spacingX;
    const startX = 350 - totalWidth / 2;
    const y = 60 + lvl * 160;

    group.forEach((step, idx) => {
      const x = count === 1 ? 350 - 100 : startX + idx * spacingX - 100;
      nodePositionMap.set(step.id, { x, y });

      nodes.push({
        id: step.id,
        type: step.type,
        position: { x, y },
        data: {
          label: step.label,
          description: step.description,
          category: step.category,
        },
      });
    });
  });

  // Cria as arestas com conexões inteligentes nos handles
  const edges: Edge[] = [];
  const edgeSet = new Set<string>();

  steps.forEach((sourceStep) => {
    const sourcePos = nodePositionMap.get(sourceStep.id) || { x: 0, y: 0 };

    sourceStep.connections.forEach((conn) => {
      const targetStep = resolveTargetStep(conn.targetLabel);
      if (!targetStep || targetStep.id === sourceStep.id) return;

      const edgeKey = `${sourceStep.id}->${targetStep.id}`;
      if (edgeSet.has(edgeKey)) return;
      edgeSet.add(edgeKey);

      const targetPos = nodePositionMap.get(targetStep.id) || { x: 0, y: 0 };
      const dx = targetPos.x - sourcePos.x;
      const dy = targetPos.y - sourcePos.y;

      let sourceHandle = "bottom";
      let targetHandle = "top";
      let strokeColor = "var(--color-terracotta, #e05d38)";

      // Decisões Sim/Não
      const isSim = conn.label && normalizeKey(conn.label) === "sim";
      const isNao = conn.label && (normalizeKey(conn.label) === "nao" || normalizeKey(conn.label) === "não");

      if (sourceStep.type === "decision") {
        if (isSim) {
          sourceHandle = "right";
          targetHandle = dx > 0 ? "left" : "top";
          strokeColor = "#10b981";
        } else if (isNao) {
          sourceHandle = "left";
          targetHandle = dx < 0 ? "right" : "top";
          strokeColor = "#ef4444";
        }
      } else {
        // Alinhamento direcional natural
        if (Math.abs(dx) > 180 && Math.abs(dy) < 60) {
          if (dx > 0) {
            sourceHandle = "right";
            targetHandle = "left";
          } else {
            sourceHandle = "left";
            targetHandle = "right";
          }
        } else if (dy < -40) {
          sourceHandle = "top";
          targetHandle = "bottom";
        }
      }

      edges.push({
        id: `e-${sourceStep.id}-${targetStep.id}-${Date.now()}`,
        source: sourceStep.id,
        target: targetStep.id,
        sourceHandle,
        targetHandle,
        label: conn.label,
        markerEnd: { type: MarkerType.ArrowClosed, color: strokeColor },
        style: { stroke: strokeColor, strokeWidth: 2 },
      });
    });
  });

  return { nodes, edges };
}

/**
 * Resolve o tipo de nó a partir da tag ou do texto da etapa
 */
function resolveNodeType(typeTag?: string, label: string = ""): { type: FlowNodeType; category?: string } {
  if (typeTag) {
    const norm = normalizeKey(typeTag);
    if (NODE_TYPE_LABELS[norm]) {
      return {
        type: NODE_TYPE_LABELS[norm].type,
        category: NODE_TYPE_LABELS[norm].category,
      };
    }
  }

  // Inferência inteligente pelo nome
  const normLabel = normalizeKey(label);

  if (normLabel.startsWith("inicio") || normLabel.startsWith("start") || normLabel === "comeco") {
    return { type: "startEnd", category: "start" };
  }
  if (normLabel.startsWith("fim") || normLabel.startsWith("end") || normLabel.includes("venda fechada") || normLabel.includes("concluido") || normLabel.includes("encerrar")) {
    return { type: "startEnd", category: "end" };
  }
  if (normLabel.includes("?") || normLabel.includes("respondeu") || normLabel.includes("decisao") || normLabel.includes("condicao")) {
    return { type: "decision" };
  }
  if (normLabel.includes("whatsapp") || normLabel.includes("zap") || normLabel.includes("mensagem")) {
    return { type: "whatsapp" };
  }
  if (normLabel.includes("instagram") || normLabel.includes("direct") || normLabel.includes("feed") || normLabel.includes("story")) {
    return { type: "social" };
  }
  if (normLabel.includes("email") || normLabel.includes("e-mail") || normLabel.includes("newsletter")) {
    return { type: "email" };
  }
  if (normLabel.includes("reuniao") || normLabel.includes("call") || normLabel.includes("meet") || normLabel.includes("apresentacao")) {
    return { type: "meeting" };
  }
  if (normLabel.includes("pagamento") || normLabel.includes("pix") || normLabel.includes("cobranca") || normLabel.includes("checkout")) {
    return { type: "payment" };
  }
  if (normLabel.includes("aguardar") || normLabel.includes("espera") || normLabel.includes("delay") || normLabel.includes("horas") || normLabel.includes("dias")) {
    return { type: "delay" };
  }
  if (normLabel.includes("aprovacao") || normLabel.includes("aprovar") || normLabel.includes("validacao")) {
    return { type: "approval" };
  }
  if (normLabel.includes("contrato") || normLabel.includes("briefing") || normLabel.includes("documento") || normLabel.includes("assinatura")) {
    return { type: "document" };
  }
  if (normLabel.startsWith("nota") || normLabel.startsWith("obs")) {
    return { type: "note" };
  }

  return { type: "process" };
}
