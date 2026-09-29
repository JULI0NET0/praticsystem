import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Demand } from "@/types/demandas";
import { toISODate } from "@/lib/dueDate";

const { confirm, batchUpdateDemands } = vi.hoisted(() => ({
  confirm: vi.fn(async () => true),
  batchUpdateDemands: vi.fn(async () => undefined),
}));

vi.mock("@/components/ConfirmProvider", () => ({
  useConfirm: () => ({ confirm }),
}));

vi.mock("./DemandasProvider", () => ({
  useDemandas: () => ({ batchUpdateDemands }),
}));

vi.mock("@/components/ui/DatePicker", () => ({
  CalendarPopover: ({
    open,
    onSelect,
  }: {
    open: boolean;
    onSelect: (date: string | null) => void;
  }) =>
    open ? (
      <button type="button" onClick={() => onSelect("2026-10-05")}>
        aplicar data
      </button>
    ) : null,
}));

const { default: RescheduleOverdueMenu } = await import("./RescheduleOverdueMenu");

function demand(overrides: Partial<Demand>): Demand {
  return {
    id: "1",
    title: "Tarefa",
    client_id: null,
    scope: "internal",
    status: "aberto",
    status_category: "ativo",
    priority: "none",
    assignee_ids: [],
    assign_all_team: false,
    due_date: "2020-01-01",
    position: 0,
    created_at: "2020-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const overdueOpen = [
  demand({ id: "aberta-1", title: "Uma" }),
  demand({ id: "aberta-2", title: "Duas" }),
];

const mixed = [
  ...overdueOpen,
  demand({ id: "concluida", status_category: "fechado", due_date: "2020-01-02" }),
  demand({ id: "hoje", due_date: "2099-01-01" }),
];

describe("RescheduleOverdueMenu", () => {
  beforeEach(() => {
    confirm.mockReset();
    confirm.mockResolvedValue(true);
    batchUpdateDemands.mockReset();
  });

  it("não oferece reagendar quando não há atraso em aberto", () => {
    render(
      <RescheduleOverdueMenu
        demands={[demand({ id: "concluida", status_category: "fechado" })]}
        variant="button"
      />,
    );
    expect(screen.queryByRole("button", { name: "Reagendar" })).toBeNull();
  });

  it("pede confirmação e grava só o prazo das abertas", async () => {
    const user = userEvent.setup();
    confirm.mockResolvedValueOnce(true);

    render(<RescheduleOverdueMenu demands={mixed} variant="button" />);

    await user.click(screen.getByRole("button", { name: "Reagendar" }));
    await user.click(screen.getByRole("menuitem", { name: "Hoje" }));

    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Reagendar atrasadas",
        message: "Reagendar 2 demandas atrasadas para hoje?",
        confirmText: "Reagendar",
      }),
    );
    expect(batchUpdateDemands).toHaveBeenCalledWith(["aberta-1", "aberta-2"], {
      due_date: toISODate(new Date()),
    });
  });

  it("não grava se a confirmação for cancelada", async () => {
    const user = userEvent.setup();
    confirm.mockResolvedValueOnce(false);

    render(<RescheduleOverdueMenu demands={overdueOpen} variant="count" />);

    await user.click(screen.getByRole("button", { name: "2 atrasadas" }));
    await user.click(screen.getByRole("menuitem", { name: "Próxima semana" }));

    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Reagendar 2 demandas atrasadas para próxima semana?",
      }),
    );
    expect(batchUpdateDemands).not.toHaveBeenCalled();
  });

  it("escolhe uma data e confirma com o rótulo dela", async () => {
    const user = userEvent.setup();
    confirm.mockResolvedValueOnce(true);

    render(<RescheduleOverdueMenu demands={overdueOpen} variant="button" />);

    await user.click(screen.getByRole("button", { name: "Reagendar" }));
    await user.click(screen.getByRole("menuitem", { name: "Escolher data..." }));
    await user.click(screen.getByRole("button", { name: "aplicar data" }));

    expect(batchUpdateDemands).toHaveBeenCalledWith(["aberta-1", "aberta-2"], {
      due_date: "2026-10-05",
    });
  });
});
