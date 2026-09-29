import { describe, expect, it } from "vitest";
import type { Demand } from "@/types/demandas";
import {
  nextMondayISO,
  openOverdueDemands,
  reschedulePresetDate,
} from "./RescheduleOverdueMenu";

// Quarta-feira, 26 de agosto de 2026
const NOW = new Date(2026, 7, 26, 12, 0, 0);

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
    due_date: "2026-08-25",
    position: 0,
    created_at: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("reschedulePresetDate", () => {
  it("hoje e amanhã usam a data local", () => {
    expect(reschedulePresetDate("hoje", NOW)).toBe("2026-08-26");
    expect(reschedulePresetDate("amanha", NOW)).toBe("2026-08-27");
  });

  it("próxima semana cai na segunda seguinte, inclusive se hoje já é segunda", () => {
    expect(nextMondayISO(NOW)).toBe("2026-08-31");
    expect(reschedulePresetDate("proxima_semana", NOW)).toBe("2026-08-31");
    expect(nextMondayISO(new Date(2026, 7, 31, 9, 0, 0))).toBe("2026-09-07");
    expect(nextMondayISO(new Date(2026, 7, 30, 9, 0, 0))).toBe("2026-08-31");
  });
});

describe("openOverdueDemands", () => {
  it("fica só com as abertas cujo prazo já passou", () => {
    const ids = openOverdueDemands(
      [
        demand({ id: "aberta-ontem" }),
        demand({ id: "aberta-hoje", due_date: "2026-08-26" }),
        demand({ id: "concluida-atrasada", status_category: "fechado", due_date: "2026-08-20" }),
        demand({ id: "sem-prazo", due_date: null }),
      ],
      NOW,
    ).map((item) => item.id);

    expect(ids).toEqual(["aberta-ontem"]);
  });
});
