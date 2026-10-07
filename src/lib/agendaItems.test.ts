import { describe, expect, it } from "vitest";
import {
  addMonths,
  dayHeading,
  groupByDay,
  itemFromAgendaEvent,
  itemFromInvoice,
  matchesResponsible,
  monthGrid,
  relativeDayLabel,
  startOfWeekMonday,
  timeLabel,
  itemsBetween,
  scopeRange,
  upcomingAfter,
  weekDays,
  type AgendaItem,
} from "./agendaItems";

function item(partial: Partial<AgendaItem> & { id: string; start: Date }): AgendaItem {
  return {
    title: partial.id,
    allDay: false,
    type: "meeting",
    status: "scheduled",
    visibility: "public",
    description: "",
    clientId: null,
    googleEventId: null,
    googleAccount: null,
    demandId: null,
    assignedTo: null,
    assigneeIds: [],
    assignAllTeam: false,
    isInvoice: false,
    invoiceStatus: null,
    ...partial,
  };
}

describe("semana e mês (começam na segunda)", () => {
  it("acha a segunda de qualquer dia da semana, inclusive domingo", () => {
    // 28/09/2026 é segunda; 04/10/2026 é domingo da mesma semana
    expect(startOfWeekMonday(new Date(2026, 8, 28)).getDate()).toBe(28);
    expect(startOfWeekMonday(new Date(2026, 9, 4)).getDate()).toBe(28);
    expect(startOfWeekMonday(new Date(2026, 8, 30)).getDate()).toBe(28);
  });

  it("weekDays devolve 7 dias de segunda a domingo", () => {
    const days = weekDays(new Date(2026, 9, 1));
    expect(days).toHaveLength(7);
    expect(days[0].getDay()).toBe(1);
    expect(days[6].getDay()).toBe(0);
  });

  it("monthGrid de setembro/2026 tem 5 semanas cheias, de 31/08 a 04/10", () => {
    const grid = monthGrid(new Date(2026, 8, 15));
    expect(grid).toHaveLength(35);
    expect(grid[0].getMonth()).toBe(7);
    expect(grid[0].getDate()).toBe(31);
    expect(grid[34].getMonth()).toBe(9);
    expect(grid[34].getDate()).toBe(4);
  });

  it("monthGrid usa 6 semanas quando o mês exige (agosto/2026)", () => {
    expect(monthGrid(new Date(2026, 7, 10))).toHaveLength(42);
  });

  it("addMonths não estoura o fim do mês", () => {
    const next = addMonths(new Date(2026, 0, 31), 1);
    expect(next.getMonth()).toBe(1);
    expect(next.getDate()).toBe(28);
  });
});

describe("rótulos", () => {
  const today = new Date(2026, 8, 28, 10, 0);

  it("relativeDayLabel", () => {
    expect(relativeDayLabel(new Date(2026, 8, 28, 23, 59), today)).toBe("Hoje");
    expect(relativeDayLabel(new Date(2026, 8, 29), today)).toBe("Amanhã");
    expect(relativeDayLabel(new Date(2026, 8, 27), today)).toBe("Ontem");
    expect(relativeDayLabel(new Date(2026, 9, 2), today)).toBe("Sexta");
  });

  it("dayHeading não repete o dia da semana", () => {
    expect(dayHeading(new Date(2026, 8, 28), today)).toBe("Hoje, 28 de setembro");
    expect(dayHeading(new Date(2026, 8, 29), today)).toBe("Amanhã, 29 de setembro");
    expect(dayHeading(new Date(2026, 9, 2), today)).toBe("Sexta, 2 de outubro");
  });

  it("timeLabel mostra hora com zero à esquerda ou 'dia todo'", () => {
    expect(timeLabel({ start: new Date(2026, 8, 28, 9, 5), allDay: false })).toBe("09:05");
    expect(timeLabel({ start: new Date(2026, 8, 28), allDay: true })).toBe("dia todo");
  });
});

describe("normalização", () => {
  it("fatura vira compromisso de dia todo no dia certo (sem voltar um dia por UTC)", () => {
    const invoice = itemFromInvoice({ id: "1", due_date: "2026-10-01", status: "paid" }, "Cavezzo");
    expect(invoice.allDay).toBe(true);
    expect(invoice.isInvoice).toBe(true);
    expect(invoice.id).toBe("inv-1");
    expect(invoice.title).toBe("Pagamento: Cavezzo");
    expect(invoice.start.getDate()).toBe(1);
    expect(invoice.start.getMonth()).toBe(9);
    // fatura paga não vira "concluída": o status de pagamento fica à parte
    expect(invoice.status).toBe("scheduled");
    expect(invoice.invoiceStatus).toBe("paid");
  });

  it("evento espelho de demanda carrega os responsáveis", () => {
    const mirrored = itemFromAgendaEvent({
      id: "a",
      title: "Roteiro",
      date: "2026-09-28T17:00:00.000Z",
      type: "demand",
      demand_id: "d1",
      demands: { assignee_ids: ["u1", "u2"], assign_all_team: false },
    });
    expect(mirrored.demandId).toBe("d1");
    expect(mirrored.assigneeIds).toEqual(["u1", "u2"]);
    expect(mirrored.assignAllTeam).toBe(false);
  });

  it("valores ausentes caem nos padrões da página antiga", () => {
    const bare = itemFromAgendaEvent({ id: "x", date: "2026-09-28T12:00:00.000Z" });
    expect(bare.type).toBe("meeting");
    expect(bare.status).toBe("scheduled");
    expect(bare.visibility).toBe("public");
  });
});

describe("filtro por responsável", () => {
  it("sem filtro mostra tudo", () => {
    expect(matchesResponsible(item({ id: "a", start: new Date() }), null)).toBe(true);
  });

  it("casa por criador, por responsável da demanda ou por 'equipe toda'", () => {
    const start = new Date();
    expect(matchesResponsible(item({ id: "a", start, assignedTo: "u1" }), "u1")).toBe(true);
    expect(matchesResponsible(item({ id: "b", start, assigneeIds: ["u1"] }), "u1")).toBe(true);
    expect(matchesResponsible(item({ id: "c", start, assignAllTeam: true }), "u1")).toBe(true);
    expect(matchesResponsible(item({ id: "d", start, assignedTo: "u2" }), "u1")).toBe(false);
  });
});

describe("agrupamento e próximos", () => {
  const items = [
    item({ id: "tarde", start: new Date(2026, 8, 29, 15, 0) }),
    item({ id: "manha", start: new Date(2026, 8, 29, 9, 0) }),
    item({ id: "dia-todo", start: new Date(2026, 8, 29), allDay: true }),
    item({ id: "hoje", start: new Date(2026, 8, 28, 11, 0) }),
    item({ id: "feito", start: new Date(2026, 8, 30, 10, 0), status: "completed" }),
    item({ id: "depois", start: new Date(2026, 9, 2, 10, 0) }),
  ];

  it("groupByDay ordena os dias e põe 'dia todo' antes dos horários", () => {
    const groups = groupByDay(items);
    expect(groups.map((g) => g.day.getDate())).toEqual([28, 29, 30, 2]);
    expect(groups[1].items.map((i) => i.id)).toEqual(["dia-todo", "manha", "tarde"]);
  });

  it("scopeRange cobre o dia, a semana, a próxima semana e o mês", () => {
    const day = new Date(2026, 8, 30, 15, 0);
    const on = (range: { start: Date; end: Date }) =>
      [range.start.getMonth(), range.start.getDate(), range.end.getMonth(), range.end.getDate()];
    expect(on(scopeRange(day, "day"))).toEqual([8, 30, 9, 1]);
    expect(on(scopeRange(day, "week"))).toEqual([8, 28, 9, 5]);
    expect(on(scopeRange(day, "nextWeek"))).toEqual([9, 5, 9, 12]);
    expect(on(scopeRange(day, "month"))).toEqual([8, 1, 9, 1]);
  });

  it("itemsBetween é meio-aberto e cronológico", () => {
    const range = scopeRange(new Date(2026, 8, 28), "day");
    expect(itemsBetween(items, range.start, range.end).map((i) => i.id)).toEqual(["hoje"]);
    const week = scopeRange(new Date(2026, 8, 28), "week");
    expect(itemsBetween(items, week.start, week.end).map((i) => i.id)).toEqual([
      "hoje",
      "dia-todo",
      "manha",
      "tarde",
      "feito",
      "depois",
    ]);
  });

  it("upcomingAfter começa no dia seguinte, ignora concluídos e respeita o limite", () => {
    const next = upcomingAfter(items, new Date(2026, 8, 28), 3);
    expect(next.map((i) => i.id)).toEqual(["dia-todo", "manha", "tarde"]);
    expect(upcomingAfter(items, new Date(2026, 8, 29), 5).map((i) => i.id)).toEqual(["depois"]);
  });
});
