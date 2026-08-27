import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Demand, DemandStatus } from "@/types/demandas";

// --- Dependências pesadas fora do caminho: o que importa aqui é o título ---
vi.mock("next/dynamic", () => ({ default: () => () => <div /> }));
vi.mock("./CommentThread", () => ({ default: () => <div /> }));
vi.mock("./AttachmentList", () => ({ default: () => <div /> }));
vi.mock("./AssigneePicker", () => ({
  default: () => <div />,
  UserAvatar: () => <div />,
  AssigneeStack: () => <div />,
}));
vi.mock("@/components/ui/Combobox", () => ({ default: () => <div /> }));
vi.mock("@/components/ConfirmProvider", () => ({
  useConfirm: () => ({ confirm: vi.fn() }),
  ConfirmProvider: ({ children }: any) => children,
}));

const STATUS: DemandStatus = {
  id: "pending",
  label: "A fazer",
  color: "#888",
  category: "nao_iniciado",
  position: 0,
};

const DEMAND: Demand = {
  id: "d1",
  title: "PROPOSTA LETICIA",
  client_id: null,
  scope: "internal",
  status: "pending",
  status_category: "nao_iniciado",
  priority: "none",
  assignee_ids: [],
  assign_all_team: false,
  position: 0,
  created_at: "2026-08-25T15:13:48.440355+00:00",
};

/** Lista de demandas que o provider falso enxerga — trocada por teste. */
let demands: Demand[] = [];

vi.mock("./DemandasProvider", () => ({
  useDemandas: () => ({
    getDemand: (id: string) => demands.find((d) => d.id === id),
    getStatus: () => STATUS,
    statuses: [STATUS],
    clients: [],
    updateDemand: vi.fn(),
    deleteDemand: vi.fn(),
    loadDetails: vi.fn(),
    // Checklist (BLOCO 13) — DemandModal renderiza <ChecklistSection>, que lê
    // isso do contexto mesmo quando a demanda não tem nenhuma etapa ainda.
    checklistOf: () => [],
    toggleChecklistItem: vi.fn(),
    addChecklistItem: vi.fn(),
    removeChecklistItem: vi.fn(),
    applyTemplate: vi.fn(),
    templates: [],
  }),
}));

const { default: DemandModal } = await import("./DemandModal");

const title = () => screen.getByLabelText("Título da demanda") as HTMLTextAreaElement;

describe("DemandModal", () => {
  beforeEach(() => {
    demands = [DEMAND];
  });

  it("mostra o título da demanda ao abrir", () => {
    render(<DemandModal demandId="d1" onClose={() => {}} />);
    expect(title().value).toBe("PROPOSTA LETICIA");
  });

  it("preenche o título quando a demanda chega depois (deep link ?d=)", () => {
    // Primeiro render sem a demanda carregada, como em /admin/demandas?d=<id>
    demands = [];
    const { rerender } = render(<DemandModal demandId="d1" onClose={() => {}} />);

    demands = [DEMAND];
    rerender(<DemandModal demandId="d1" onClose={() => {}} />);

    expect(title().value).toBe("PROPOSTA LETICIA");
  });
});
