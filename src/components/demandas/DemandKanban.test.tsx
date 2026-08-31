import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Demand } from "@/types/demandas";
import DemandKanban from "./DemandKanban";

vi.mock("./DemandasProvider", () => {
  const value = {
    statuses: [
      { id: "pending", label: "Não iniciado", color: "#8a8a83", category: "nao_iniciado", position: 0 },
      { id: "in_progress", label: "Em andamento", color: "#4f7fb8", category: "ativo", position: 1 },
      { id: "completed", label: "Concluído", color: "#22c55e", category: "fechado", position: 2 },
    ],
    moveDemand: vi.fn(),
    updateDemand: vi.fn(),
    reorderStatuses: vi.fn(),
    loading: false,
    getClient: () => undefined,
    getStatus: (id: string) => ({ id, label: id, color: "#888", category: "ativo", position: 0 }),
    commentsOf: () => [],
    attachmentsOf: () => [],
  };
  return {
    useDemandas: () => value,
    useOptionalDemandas: () => value,
  };
});

const mockDemands: Demand[] = [
  {
    id: "d1",
    title: "Demanda Urgente",
    client_id: null,
    scope: "internal",
    status: "pending",
    status_category: "nao_iniciado",
    priority: "urgent",
    assignee_ids: [],
    assign_all_team: false,
    position: 0,
    created_at: "2026-08-25T00:00:00Z",
  },
  {
    id: "d2",
    title: "Demanda Baixa",
    client_id: null,
    scope: "internal",
    status: "in_progress",
    status_category: "ativo",
    priority: "low",
    assignee_ids: [],
    assign_all_team: false,
    position: 1,
    created_at: "2026-08-25T00:00:00Z",
  },
];

describe("DemandKanban", () => {
  it("renderiza colunas por status por padrão", () => {
    render(
      <DemandKanban
        demands={mockDemands}
        onOpenDemand={() => {}}
        onManageStatuses={() => {}}
        groupBy="status"
      />
    );

    expect(screen.getByText("Não iniciado")).toBeTruthy();
    expect(screen.getByText("Em andamento")).toBeTruthy();
    expect(screen.getByText("Concluído")).toBeTruthy();
  });

  it("renderiza colunas por prioridade quando groupBy='priority'", () => {
    render(
      <DemandKanban
        demands={mockDemands}
        onOpenDemand={() => {}}
        onManageStatuses={() => {}}
        groupBy="priority"
      />
    );

    expect(screen.getByText("Urgente")).toBeTruthy();
    expect(screen.getByText("Alta")).toBeTruthy();
    expect(screen.getByText("Média")).toBeTruthy();
    expect(screen.getByText("Baixa")).toBeTruthy();
    expect(screen.getByText("Sem prioridade")).toBeTruthy();
    expect(screen.getByText("Demanda Urgente")).toBeTruthy();
    expect(screen.getByText("Demanda Baixa")).toBeTruthy();
  });
});
