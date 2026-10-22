import { describe, it, expect } from "vitest";
import { Node, Edge } from "@xyflow/react";
import {
  flowchartToOutline,
  outlineToFlowchart,
  mindmapToOutline,
  outlineToMindmap,
  parseFlowLine,
  matchSequences,
  MindNode,
} from "./diagramOutline";
import { normalizeEdges } from "./flowGraph";

const nodes: Node[] = [
  { id: "a", type: "startEnd", position: { x: 0, y: 0 }, data: { label: "Lead entra", category: "start" } },
  { id: "b", type: "decision", position: { x: 0, y: 150 }, data: { label: "Respondeu?" } },
  { id: "c", type: "process", position: { x: 300, y: 300 }, data: { label: "Agendar call", description: "Closer assume" } },
  { id: "d", type: "whatsapp", position: { x: -300, y: 300 }, data: { label: "Follow-up" } },
];
const edges: Edge[] = [
  { id: "e1", source: "a", target: "b", sourceHandle: "bottom", targetHandle: "top" },
  { id: "e2", source: "b", target: "c", label: "Sim", sourceHandle: "right", targetHandle: "left" },
  { id: "e3", source: "b", target: "d", label: "Não", sourceHandle: "left", targetHandle: "right" },
  { id: "e4", source: "d", target: "b", sourceHandle: "top", targetHandle: "left" },
];

describe("flowchart outline", () => {
  it("writes hierarchy, edge labels, descriptions and references", () => {
    const text = flowchartToOutline(nodes, edges);
    expect(text).toBe(
      [
        "- [Início] Lead entra",
        "  - [Decisão] Respondeu?",
        "    - Não → [WhatsApp] Follow-up",
        "      - ↪ Respondeu?",
        "    - Sim → [Etapa] Agendar call",
        "      > Closer assume",
      ].join("\n")
    );
  });

  it("round-trips without changing ids, positions or edges", () => {
    const back = outlineToFlowchart(flowchartToOutline(nodes, edges), nodes, edges);
    expect(back.nodes.map((n) => [n.id, n.type, n.position])).toEqual(
      [nodes[0], nodes[1], nodes[3], nodes[2]].map((n) => [n.id, n.type, n.position])
    );
    expect(back.edges.map((e) => `${e.source}->${e.target}:${e.label ?? ""}`).sort()).toEqual(
      ["a->b:", "b->c:Sim", "b->d:Não", "d->b:"].sort()
    );
    expect(back.edges.find((e) => e.id === "e2")).toBe(edges[1]);
  });

  it("applies rename, new child and removal", () => {
    const text = [
      "- [Início] Lead entra",
      "  - [Decisão] Respondeu agora?",
      "    - Sim → [Etapa] Agendar call",
      "      - [Fim] Venda",
    ].join("\n");
    const out = outlineToFlowchart(text, nodes, edges);
    const ids = out.nodes.map((n) => n.id);
    expect(ids).toContain("b"); // renomeado mantém id
    expect(ids).not.toContain("d"); // removido
    expect(out.nodes.find((n) => n.id === "b")!.data.label).toBe("Respondeu agora?");
    expect(out.nodes.find((n) => n.id === "c")!.data.description).toBeUndefined();
    const venda = out.nodes.find((n) => n.data.label === "Venda")!;
    expect(venda.type).toBe("startEnd");
    expect(venda.data.category).toBe("end");
    expect(venda.position.y).toBeGreaterThan(300);
    expect(out.edges.some((e) => e.source === "c" && e.target === venda.id && e.sourceHandle && e.targetHandle)).toBe(true);
  });

  it("parses edge labels without cutting arrows inside titles", () => {
    expect(parseFlowLine("Sim → [Etapa] Ligar")).toEqual({ edgeLabel: "Sim", isRef: false, tag: "Etapa", title: "Ligar" });
    expect(parseFlowLine("[Etapa] A -> B")).toEqual({ edgeLabel: undefined, isRef: false, tag: "Etapa", title: "A -> B" });
    expect(parseFlowLine("Não -> ↪ Início")).toEqual({ edgeLabel: "Não", isRef: true, tag: undefined, title: "Início" });
  });
});

describe("normalizeEdges", () => {
  it("fills missing handles, maps legacy decision handles and drops self-loops", () => {
    const out = normalizeEdges(nodes, [
      { id: "x", source: "a", target: "b" },
      { id: "y", source: "b", target: "c", sourceHandle: "yes" },
      { id: "z", source: "c", target: "c" },
    ]);
    expect(out.map((e) => [e.id, e.sourceHandle, e.targetHandle])).toEqual([
      ["x", "bottom", "top"],
      ["y", "right", "left"],
    ]);
  });
});

describe("matchSequences", () => {
  it("anchors equal items and pairs renames inside gaps", () => {
    expect(matchSequences(["a", "b", "c"], ["a", "x", "c", "d"])).toEqual([0, 1, 2, -1]);
  });
});

describe("mind map outline", () => {
  const data = {
    nodeData: {
      id: "root",
      topic: "Marca",
      children: [
        { id: "n1", topic: "Público", expanded: false, children: [{ id: "n11", topic: "Dores" }] },
        { id: "n2", topic: "Tom de voz", style: { color: "red" } },
      ],
    } as MindNode,
    summaries: [{ id: "s1", label: "Base", parent: "root", start: 0, end: 1 }],
    arrows: [{ id: "a1", from: "n11", to: "n2", label: "" }],
  };

  it("writes an indented list", () => {
    expect(mindmapToOutline(data)).toBe(["- Marca", "  - Público", "    - Dores", "  - Tom de voz"].join("\n"));
  });

  it("preserves ids and props on round-trip and edits", () => {
    const out = outlineToMindmap(["- Marca", "  - Público-alvo", "    - Dores", "    - Desejos", "  - Tom de voz"].join("\n"), data);
    const root = out.nodeData as MindNode;
    expect(root.id).toBe("root");
    expect(root.children![0]).toMatchObject({ id: "n1", topic: "Público-alvo", expanded: false });
    expect(root.children![0].children![1].id).toMatch(/^me-/);
    expect(root.children![1]).toMatchObject({ id: "n2", style: { color: "red" } });
    expect(out.summaries).toHaveLength(1);
    expect(out.arrows).toHaveLength(1);
  });

  it("drops summaries and arrows whose topics disappeared", () => {
    const out = outlineToMindmap(["- Marca", "  - Público"].join("\n"), data);
    expect(out.summaries).toHaveLength(0);
    expect(out.arrows).toHaveLength(0);
  });
});
