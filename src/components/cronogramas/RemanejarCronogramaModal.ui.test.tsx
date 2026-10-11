import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ContentPlan } from "@/types/cronogramas";
import type { Demand } from "@/types/demandas";
import RemanejarCronogramaModal from "./RemanejarCronogramaModal";

function demand(overrides: Partial<Demand>): Demand {
  return {
    id: "1",
    title: "Conteúdo",
    client_id: null,
    scope: "internal",
    status: "aberto",
    status_category: "ativo",
    priority: "none",
    assignee_ids: [],
    assign_all_team: false,
    due_date: "2026-09-07",
    position: 0,
    created_at: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

const plan = {
  weekdays: [1, 3, 5],
  posts_per_week: 3,
  channels: ["FEED"],
  first_date: null,
  start_date: null,
} as ContentPlan;

const posts = [
  demand({ id: "01", title: "Conteúdo 01", due_date: "2026-09-07", position: 0 }),
  demand({ id: "02", title: "Conteúdo 02", due_date: "2026-09-09", position: 1 }),
  demand({ id: "03", title: "Conteúdo 03", due_date: "2026-09-11", position: 2 }),
];

describe("RemanejarCronogramaModal", () => {
  it("mostra a prévia ao inserir o extra e só grava ao confirmar", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(async () => undefined);
    const onClose = vi.fn();

    render(
      <RemanejarCronogramaModal
        plan={plan}
        posts={posts}
        nextPosition={10}
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );

    expect((screen.getByRole("button", { name: "Confirmar remanejamento" }) as HTMLButtonElement).disabled).toBe(true);

    const insertAbove = screen.getAllByRole("button", { name: "Inserir conteúdo extra acima" });
    await user.click(insertAbove[1]);

    expect(screen.getAllByText("09/09 · Quarta").length).toBeGreaterThan(0);
    expect(screen.getAllByText("11/09 · Sexta").length).toBeGreaterThan(0);
    expect(screen.getByText("14/09 · Segunda")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Confirmar remanejamento" }));

    expect(onClose).not.toHaveBeenCalled();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    const result = onConfirm.mock.calls[0][0];
    expect(result.extras).toEqual([
      expect.objectContaining({
        title: "Conteúdo extra",
        dueDate: "2026-09-09",
        contentType: "extra",
        channel: "FEED",
        position: 10,
      }),
    ]);
    expect(result.updates).toEqual([
      { id: "02", dueDate: "2026-09-11", position: 1 },
      { id: "03", dueDate: "2026-09-14", position: 2 },
    ]);
  });

  it("cancelar descarta a prévia", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(async () => undefined);
    const onClose = vi.fn();

    render(
      <RemanejarCronogramaModal
        plan={plan}
        posts={posts}
        nextPosition={10}
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );

    await user.click(screen.getAllByRole("button", { name: "Descer" })[0]);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("mantém o publicado fora da fila que muda de data", () => {
    render(
      <RemanejarCronogramaModal
        plan={plan}
        posts={[
          ...posts,
          demand({
            id: "pub",
            title: "Já saiu",
            status_category: "fechado",
            due_date: "2026-09-04",
            position: 3,
          }),
        ]}
        nextPosition={10}
        onConfirm={vi.fn(async () => undefined)}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Publicados — data fixa")).toBeTruthy();
    expect(screen.getByText("Já saiu")).toBeTruthy();
    expect(screen.getByText("04/09 · Sexta")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Subir" })).toHaveLength(3);
  });
});
