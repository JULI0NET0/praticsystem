import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { isAgendaPrimarySelection } from "@/lib/agendaCategories";
import type { AgendaItem } from "@/lib/agendaItems";
import CategoryFilterChips from "./CategoryFilterChips";
import DayEventList from "./DayEventList";
import { EventFormFields, type EventFormData } from "./EventForm";
import MobileAgenda, { type MobileView } from "./MobileAgenda";

afterEach(cleanup);

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

const NOW = new Date(2026, 8, 28, 10, 24);
const DAY = new Date(2026, 8, 28);
const noClients = new Map<string, string>();

describe("DayEventList", () => {
  const items = [
    item({ id: "Alinhamento", start: new Date(2026, 8, 28, 9, 0), status: "completed" }),
    item({ id: "Gravação Cavezzo", start: new Date(2026, 8, 28, 11, 0), type: "prospecting" }),
  ];

  it("põe a linha de 'agora' entre o que já passou e o que vem", () => {
    render(
      <DayEventList items={items} day={DAY} now={NOW} clientNames={noClients} size="panel" onOpen={vi.fn()} onToggleComplete={vi.fn()} />,
    );
    const marker = screen.getByRole("separator", { name: "Agora, 10:24" });
    const before = screen.getByText("Alinhamento");
    const after = screen.getByText("Gravação Cavezzo");
    expect(before.compareDocumentPosition(marker) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(marker.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("não mostra 'agora' em outro dia", () => {
    render(
      <DayEventList items={items} day={new Date(2026, 8, 29)} now={NOW} clientNames={noClients} size="panel" onOpen={vi.fn()} onToggleComplete={vi.fn()} />,
    );
    expect(screen.queryByRole("separator")).toBeNull();
  });

  it("dia vazio convida a agir", () => {
    const onNew = vi.fn();
    render(
      <DayEventList
        items={[]}
        day={DAY}
        now={NOW}
        clientNames={noClients}
        size="mobile"
        onOpen={vi.fn()}
        onToggleComplete={vi.fn()}
        emptyAction={<button onClick={onNew}>Novo compromisso</button>}
      />,
    );
    expect(screen.getByText("Nada marcado para este dia.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Novo compromisso" }));
    expect(onNew).toHaveBeenCalledOnce();
  });

  it("concluir e abrir são botões separados e nomeados", () => {
    const onOpen = vi.fn();
    const onToggle = vi.fn();
    render(
      <DayEventList items={[items[1]]} day={DAY} now={NOW} clientNames={noClients} size="mobile" onOpen={onOpen} onToggleComplete={onToggle} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Concluir Gravação Cavezzo" }));
    expect(onToggle).toHaveBeenCalledWith(items[1]);
    expect(onOpen).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Abrir Gravação Cavezzo" }));
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("fatura e espelho de demanda não têm botão de concluir", () => {
    const readonly = [
      item({ id: "Pagamento: Cavezzo", start: DAY, allDay: true, isInvoice: true, type: "payment" }),
      item({ id: "Roteiro", start: new Date(2026, 8, 28, 15, 0), demandId: "d1", type: "demand" }),
    ];
    render(
      <DayEventList items={readonly} day={DAY} now={NOW} clientNames={noClients} size="panel" onOpen={vi.fn()} onToggleComplete={vi.fn()} />,
    );
    expect(screen.queryByRole("button", { name: /^Concluir/ })).toBeNull();
  });

  it("concluído aparece como reabrir", () => {
    render(
      <DayEventList items={[items[0]]} day={DAY} now={NOW} clientNames={noClients} size="panel" onOpen={vi.fn()} onToggleComplete={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Reabrir Alinhamento" }).getAttribute("aria-pressed")).toBe("true");
  });
});

describe("EventFormFields", () => {
  function Harness({ onChange }: { onChange: (v: EventFormData) => void }) {
    const [value, setValue] = useState<EventFormData>({
      title: "",
      type: "meeting",
      date: "2026-09-28T10:00",
      client_id: "",
      visibility: "public",
      status: "scheduled",
      description: "",
    });
    return (
      <EventFormFields
        value={value}
        clients={[]}
        onChange={(next) => {
          setValue(next);
          onChange(next);
        }}
      />
    );
  }

  it("escolher o assunto por chip, sem oferecer Pagamento", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    expect(screen.queryByRole("button", { name: "Pagamento" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Captação" }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ type: "prospecting" }));
    expect(screen.getByRole("button", { name: "Captação" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Reunião" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("trocar a data mantém o horário, e vice-versa", () => {
    const onChange = vi.fn();
    const { container } = render(<Harness onChange={onChange} />);
    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    const timeInput = container.querySelector('input[type="time"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: "2026-10-02" } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ date: "2026-10-02T10:00" }));
    fireEvent.change(timeInput, { target: { value: "14:30" } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ date: "2026-10-02T14:30" }));
  });

  it("visibilidade é uma chave acessível", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const toggle = screen.getByRole("switch");
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ visibility: "private" }));
    expect(screen.getByText("Só para mim")).toBeTruthy();
  });
});

describe("MobileAgenda", () => {
  const all = [
    item({ id: "Alinhamento", start: new Date(2026, 8, 28, 9, 0) }),
    item({ id: "Captação Cavezzo", start: new Date(2026, 8, 28, 11, 0), type: "prospecting" }),
    item({ id: "Entrega vídeo", start: new Date(2026, 8, 29, 10, 0), type: "demand", demandId: "d1" }),
    item({ id: "Reunião mensal", start: new Date(2026, 8, 30, 15, 0) }),
  ];

  function setup(initialView: MobileView = "day", overrides: Partial<Parameters<typeof MobileAgenda>[0]> = {}) {
    const spies = {
      onNew: vi.fn(),
      onOpen: vi.fn(),
      onToggleComplete: vi.fn(),
      onMoveTomorrow: vi.fn(),
      onEdit: vi.fn(),
      onToggleCategory: vi.fn(),
      onResetCategories: vi.fn(),
    };
    function Harness() {
      const [day, setDay] = useState(DAY);
      const [view, setView] = useState<MobileView>(initialView);
      return (
        <MobileAgenda
          items={all}
          clientNames={noClients}
          now={NOW}
          day={day}
          onDayChange={setDay}
          view={view}
          onView={setView}
          activeCategories={["meeting", "prospecting", "task", "payment", "demand"]}
          categoryCounts={{ meeting: 2, prospecting: 1, task: 0, payment: 0, demand: 1 }}
          filtersExtra={null}
          filtersActiveCount={0}
          searchQuery=""
          onSearch={vi.fn()}
          google={{ state: "ok", syncing: false, lastSyncedAt: null, onClick: vi.fn() }}
          onRefresh={async () => {}}
          {...spies}
          {...overrides}
        />
      );
    }
    render(<Harness />);
    return spies;
  }

  it("abre no Dia, com os compromissos de hoje", () => {
    setup();
    const views = screen.getByRole("group", { name: "Visão da agenda" });
    expect(within(views).getByRole("button", { name: "Dia" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Alinhamento")).toBeTruthy();
    expect(screen.getByText("Captação Cavezzo")).toBeTruthy();
    expect(screen.queryByText("Entrega vídeo")).toBeNull();
  });

  it("tocar num dia da faixa troca a lista", () => {
    setup();
    const strip = screen.getByRole("group", { name: "Dias da semana" });
    fireEvent.click(within(strip).getByRole("button", { name: /terça, 29 de setembro/i }));
    expect(screen.getByText("Entrega vídeo")).toBeTruthy();
    expect(screen.queryByText("Alinhamento")).toBeNull();
  });

  it("a faixa da semana começa na segunda e marca hoje", () => {
    setup();
    const strip = screen.getByRole("group", { name: "Dias da semana" });
    const days = within(strip).getAllByRole("button");
    expect(days).toHaveLength(7);
    expect(days[0].getAttribute("aria-label")).toMatch(/^Segunda, 28 de setembro, hoje$/);
    expect(days[6].getAttribute("aria-label")).toMatch(/^Domingo, 4 de outubro/);
  });

  it("o botão flutuante cria no dia que está na tela", () => {
    const spies = setup();
    fireEvent.click(screen.getByRole("button", { name: "Novo compromisso" }));
    expect(spies.onNew).toHaveBeenCalledWith(DAY);
  });

  it("ir para a semana seguinte por botão (o mesmo que arrastar a faixa)", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Próxima semana" }));
    const strip = screen.getByRole("group", { name: "Dias da semana" });
    expect(within(strip).getAllByRole("button")[0].getAttribute("aria-label")).toMatch(/^Segunda, 5 de outubro/);
  });

  it("Mês mostra a grade e a lista do dia escolhido", () => {
    setup("month");
    expect(screen.getByRole("grid", { name: "Setembro 2026" })).toBeTruthy();
    expect(screen.getAllByRole("gridcell")).toHaveLength(35);
    fireEvent.click(screen.getByRole("gridcell", { name: /quarta, 30 de setembro/i }));
    expect(screen.getByText("Reunião mensal")).toBeTruthy();
  });

  it("Mês: chips de assunto alternam o filtro e 'Todos' restaura", () => {
    const spies = setup("month", { activeCategories: ["meeting"] });
    fireEvent.click(screen.getByRole("button", { name: "Captação" }));
    expect(spies.onToggleCategory).toHaveBeenCalledWith("prospecting");
    fireEvent.click(screen.getByRole("button", { name: "Todos" }));
    expect(spies.onResetCategories).toHaveBeenCalledOnce();
  });

  it("Lista agrupa por dia a partir de hoje", () => {
    setup("list");
    expect(screen.getByRole("heading", { name: "Hoje, 28 de setembro" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Amanhã, 29 de setembro" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Quarta, 30 de setembro" })).toBeTruthy();
  });

  it("filtros abrem numa gaveta, com contagem por assunto", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Filtros" }));
    const dialog = screen.getByRole("dialog", { name: "Filtros da agenda" });
    expect(within(dialog).getByRole("checkbox", { name: /Reunião/ })).toBeTruthy();
    expect(within(dialog).getByText("2")).toBeTruthy();
  });

  it("o contador de filtros ativos aparece no rótulo do botão", () => {
    setup("day", { filtersActiveCount: 2 });
    expect(screen.getByRole("button", { name: "Filtros (2 ativos)" })).toBeTruthy();
  });

  function period() {
    return screen.getByRole("group", { name: "Período da lista" });
  }

  it("dia vazio mostra os próximos compromissos", () => {
    setup("day", {
      items: [item({ id: "Entrega futura", start: new Date(2026, 8, 30, 10, 0), type: "demand", demandId: "d1" })],
    });
    expect(screen.getByText("Nada marcado para este dia.")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Próximos" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Quarta, 30 de setembro" })).toBeTruthy();
    expect(screen.getByText("Entrega futura")).toBeTruthy();
  });

  it("mês vazio também mostra os próximos", () => {
    setup("month", {
      items: [item({ id: "Entrega futura", start: new Date(2026, 8, 30, 10, 0), type: "demand", demandId: "d1" })],
    });
    expect(screen.getByText("Nada marcado para este dia.")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Próximos" })).toBeTruthy();
    expect(screen.getByText("Entrega futura")).toBeTruthy();
  });

  it("filtro Semana, Próxima e Mês muda o que a lista mostra", () => {
    setup();
    fireEvent.click(within(period()).getByRole("button", { name: "Semana" }));
    expect(screen.getByRole("heading", { name: "Amanhã, 29 de setembro" })).toBeTruthy();
    expect(screen.getByText("Entrega vídeo")).toBeTruthy();
    expect(screen.getByText("Reunião mensal")).toBeTruthy();

    fireEvent.click(within(period()).getByRole("button", { name: "Lista da próxima semana" }));
    expect(screen.getByText("Nenhum compromisso neste período.")).toBeTruthy();
    expect(screen.queryByText("Alinhamento")).toBeNull();

    fireEvent.click(within(period()).getByRole("button", { name: "Mês" }));
    expect(screen.getByText("Alinhamento")).toBeTruthy();
    expect(screen.getByText("Reunião mensal")).toBeTruthy();
  });

  it("a seta de próxima semana move a faixa e mantém o dia da lista", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Próxima semana" }));
    const strip = screen.getByRole("group", { name: "Dias da semana" });
    expect(within(strip).getAllByRole("button")[0].getAttribute("aria-label")).toMatch(/^Segunda, 5 de outubro/);
    expect(screen.getByText("Alinhamento")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mostrar no calendário" })).toBeTruthy();
  });

  it("Hoje marca o dia de hoje sem trocar o mês visível", () => {
    setup("month");
    fireEvent.click(screen.getByRole("button", { name: "Próximo mês" }));
    fireEvent.click(screen.getByRole("button", { name: "Próximo mês" }));
    expect(screen.getByRole("grid", { name: "Novembro 2026" })).toBeTruthy();
    fireEvent.click(screen.getByRole("gridcell", { name: /quarta, 4 de novembro/i }));
    expect(screen.getByText("Nada marcado para este dia.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Hoje" }));
    expect(screen.getByRole("grid", { name: "Novembro 2026" })).toBeTruthy();
    expect(screen.getByText("Alinhamento")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Mostrar no calendário" }));
    expect(screen.getByRole("grid", { name: "Setembro 2026" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Mostrar no calendário" })).toBeNull();
  });

  it("escolher o mês move o calendário e não o dia selecionado", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Escolher mês, Setembro 2026" }));
    const dialog = screen.getByRole("dialog", { name: "Escolher mês" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Novembro" }));
    expect(screen.getByRole("button", { name: "Escolher mês, Novembro 2026" })).toBeTruthy();
    expect(screen.getByText("Alinhamento")).toBeTruthy();
    const strip = screen.getByRole("group", { name: "Dias da semana" });
    expect(within(strip).getAllByRole("button")[0].getAttribute("aria-label")).toMatch(/^Segunda, 26 de outubro/);
  });
});

describe("CategoryFilterChips", () => {
  const ALL = ["meeting", "prospecting", "task", "payment", "demand"];
  const counts = { meeting: 2, prospecting: 10, task: 0, payment: 12, demand: 133 };

  it("mostra um chip por assunto, com a contagem do período", () => {
    render(<CategoryFilterChips active={ALL} counts={counts} onToggle={vi.fn()} onReset={vi.fn()} />);
    const group = screen.getByRole("group", { name: "Filtrar por assunto" });
    expect(within(group).getAllByRole("button")).toHaveLength(5);
    expect(within(screen.getByRole("button", { name: /Demanda/ })).getByText("133")).toBeTruthy();
    expect(within(screen.getByRole("button", { name: /Tarefa Interna/ })).getByText("0")).toBeTruthy();
  });

  it("clicar liga/desliga o assunto e reflete no aria-pressed", () => {
    const onToggle = vi.fn();
    render(<CategoryFilterChips active={["meeting"]} counts={counts} onToggle={onToggle} onReset={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Reunião/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: /Captação/ }).getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: /Captação/ }));
    expect(onToggle).toHaveBeenCalledWith("prospecting");
  });

  it("'Mostrar todos' só aparece quando há filtro e restaura", () => {
    const onReset = vi.fn();
    const { rerender } = render(<CategoryFilterChips active={ALL} counts={counts} onToggle={vi.fn()} onReset={onReset} />);
    expect(screen.queryByRole("button", { name: "Mostrar todos" })).toBeNull();
    rerender(<CategoryFilterChips active={["meeting"]} counts={counts} onToggle={vi.fn()} onReset={onReset} />);
    fireEvent.click(screen.getByRole("button", { name: "Mostrar todos" }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("a visão limpa deixa reunião e captação ligadas e o resto pronto para ligar", () => {
    const primary = ["meeting", "prospecting"];
    expect(isAgendaPrimarySelection(primary)).toBe(true);
    expect(isAgendaPrimarySelection(ALL)).toBe(false);
    render(<CategoryFilterChips active={primary} counts={counts} onToggle={vi.fn()} onReset={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Reunião/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: /Captação/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: /Tarefa Interna/ }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("button", { name: /Pagamento/ }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("button", { name: /Demanda/ }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("button", { name: "Mostrar todos" })).toBeTruthy();
  });
});
