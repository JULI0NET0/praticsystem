import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Demand } from "@/types/demandas";

vi.mock("./DemandStatusPill", () => ({ default: () => <div /> }));
vi.mock("./DueChip", () => ({ default: () => <div /> }));
vi.mock("./PriorityFlag", () => ({ PriorityBadge: () => <div /> }));
vi.mock("./AssigneePicker", () => ({
  AssigneeStack: () => <div />,
  UserAvatar: () => <div />,
}));

const toggleComplete = vi.fn();

vi.mock("./DemandasProvider", () => ({
  useDemandas: () => ({
    getStatus: () => undefined,
    getClient: () => undefined,
    commentsOf: () => [],
    attachmentsOf: () => [],
    toggleComplete,
  }),
}));

const { default: DemandRow } = await import("./DemandRow");

function demand(overrides: Partial<Demand> = {}): Demand {
  return {
    id: "d1",
    title: "Revisar Imagens BOLSAS",
    client_id: null,
    scope: "internal",
    status: "pending",
    status_category: "nao_iniciado",
    priority: "none",
    assignee_ids: [],
    assign_all_team: false,
    position: 0,
    created_at: "2026-08-25T00:00:00Z",
    ...overrides,
  };
}

/** O risco é o único filho aria-hidden com transformOrigin à esquerda. */
const strike = (container: HTMLElement) =>
  container.querySelector('span[aria-hidden="true"][style*="transform-origin"]');

describe("DemandRow", () => {
  it("renderiza o risco do título junto com o texto", () => {
    const { container } = render(<DemandRow demand={demand()} onOpen={() => {}} />);
    expect(screen.getByText("Revisar Imagens BOLSAS")).toBeTruthy();
    expect(strike(container)).not.toBeNull();
  });

  it("reflete o estado no checkbox", () => {
    render(<DemandRow demand={demand()} onOpen={() => {}} />);
    expect(screen.getByLabelText("Concluir demanda").getAttribute("aria-pressed")).toBe("false");

    render(
      <DemandRow
        demand={demand({ id: "d2", status_category: "fechado" })}
        onOpen={() => {}}
      />,
    );
    expect(screen.getByLabelText("Reabrir demanda").getAttribute("aria-pressed")).toBe("true");
  });

  it("avisa a lista antes de concluir, para segurar a linha no lugar", async () => {
    const onToggleStart = vi.fn();
    render(
      <DemandRow demand={demand()} onOpen={() => {}} onToggleStart={onToggleStart} />,
    );

    await userEvent.click(screen.getByLabelText("Concluir demanda"));

    expect(onToggleStart).toHaveBeenCalledWith("d1");
    expect(toggleComplete).toHaveBeenCalledWith("d1");
  });

  it("clicar no checkbox não abre a demanda", async () => {
    const onOpen = vi.fn();
    render(<DemandRow demand={demand()} onOpen={onOpen} />);

    await userEvent.click(screen.getByLabelText("Concluir demanda"));

    expect(onOpen).not.toHaveBeenCalled();
  });
});
