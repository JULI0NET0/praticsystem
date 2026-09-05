import { describe, it, expect } from "vitest";
import { flowchartToMarkdown, markdownToFlowchart } from "./diagramMarkdown";
import { Node, Edge } from "@xyflow/react";

describe("diagramMarkdown", () => {
  it("converts nodes and edges to markdown text cleanly", () => {
    const nodes: Node[] = [
      {
        id: "node-1",
        type: "startEnd",
        position: { x: 0, y: 0 },
        data: { label: "Lead Cadastrado", category: "start" },
      },
      {
        id: "node-2",
        type: "decision",
        position: { x: 0, y: 150 },
        data: { label: "Perfil Qualificado?", description: "Checar faturamento" },
      },
      {
        id: "node-3",
        type: "whatsapp",
        position: { x: 150, y: 300 },
        data: { label: "Enviar WhatsApp" },
      },
    ];

    const edges: Edge[] = [
      { id: "e1-2", source: "node-1", target: "node-2" },
      { id: "e2-3", source: "node-2", target: "node-3", label: "Sim" },
    ];

    const md = flowchartToMarkdown(nodes, edges);

    expect(md).toContain("# Fluxograma");
    expect(md).toContain("[Início] Lead Cadastrado");
    expect(md).toContain("[Decisão] Perfil Qualificado?");
    expect(md).toContain("Checar faturamento");
    expect(md).toContain("- Sim ->");
    expect(md).toContain("[WhatsApp] Enviar WhatsApp");
  });

  it("parses markdown steps into valid React Flow nodes and edges with topological coordinates", () => {
    const markdown = `
# Fluxo de Vendas

1. [Início] Novo Lead
   - Inicia o processo de qualificação
   - -> 2

2. [Decisão] Validar Contato
   - Telefone e email válidos?
   - Sim -> 3
   - Não -> 4

3. [WhatsApp] Mensagem de Boas-vindas
   - Disparo automático

4. [Fim] Encerrar Lead
`;

    const { nodes, edges } = markdownToFlowchart(markdown);

    expect(nodes.length).toBe(4);
    expect(edges.length).toBe(3);

    // Verify node 1
    const node1 = nodes.find((n) => n.data.label === "Novo Lead");
    expect(node1).toBeDefined();
    expect(node1?.type).toBe("startEnd");
    expect(node1?.data.description).toContain("Inicia o processo de qualificação");

    // Verify node 2
    const node2 = nodes.find((n) => n.data.label === "Validar Contato");
    expect(node2).toBeDefined();
    expect(node2?.type).toBe("decision");
    expect(node2?.data.description).toContain("Telefone e email válidos?");

    // Verify node 3
    const node3 = nodes.find((n) => n.data.label === "Mensagem de Boas-vindas");
    expect(node3).toBeDefined();
    expect(node3?.type).toBe("whatsapp");

    // Verify node 4
    const node4 = nodes.find((n) => n.data.label === "Encerrar Lead");
    expect(node4).toBeDefined();
    expect(node4?.type).toBe("startEnd");

    // Verify edges have proper handles (source and target handles)
    const yesEdge = edges.find((e) => e.label === "Sim");
    expect(yesEdge).toBeDefined();
    expect(yesEdge?.sourceHandle).toBe("right");

    const noEdge = edges.find((e) => e.label === "Não");
    expect(noEdge).toBeDefined();
    expect(noEdge?.sourceHandle).toBe("left");
  });

  it("handles Mermaid graph TD syntax seamlessly", () => {
    const mermaid = `
graph TD
  A[Início do Atendimento] --> B{Dúvida Financeira?}
  B -->|Sim| C[Encaminhar ao Financeiro]
  B -->|Não| D[Atendimento Geral]
`;

    const { nodes, edges } = markdownToFlowchart(mermaid);

    expect(nodes.length).toBe(4);
    expect(edges.length).toBe(3);

    const financeiroEdge = edges.find((e) => e.label === "Sim");
    expect(financeiroEdge).toBeDefined();
  });
});
