import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DueChip from "./DueChip";
import DueDatePickerPopover from "./DueDatePickerPopover";
import { toISODate } from "@/lib/dueDate";

const updateDemand = vi.fn();

vi.mock("./DemandasProvider", () => ({
  useOptionalDemandas: () => ({
    updateDemand,
  }),
}));

describe("DueDatePickerPopover & DueChip", () => {
  it("renderiza o label 'Hoje' formatado corretamente no chip", () => {
    const today = toISODate(new Date());
    render(<DueChip dueDate={today} demandId="demand-1" />);

    expect(screen.getByText("Hoje")).toBeTruthy();
  });

  it("abre o calendário ao clicar no chip de data da demanda", async () => {
    const today = toISODate(new Date());
    render(<DueChip dueDate={today} demandId="demand-1" />);

    const chip = screen.getByRole("button", { name: /hoje/i });
    await userEvent.click(chip);

    // O popover de remarcação deve estar visível
    expect(screen.getByText("Remarcar Prazo")).toBeTruthy();
    expect(screen.getByText("Amanhã")).toBeTruthy();
    expect(screen.getByText("Próx. semana")).toBeTruthy();
    expect(screen.getByText("Sem prazo")).toBeTruthy();
  });

  it("chama onSelect ao selecionar um atalho rápido no popover", async () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    const anchor = document.createElement("div");
    document.body.appendChild(anchor);

    render(
      <DueDatePickerPopover
        open={true}
        onClose={onClose}
        anchorEl={anchor}
        dueDate="2026-08-27"
        onSelect={onSelect}
      />
    );

    // Clica no botão "Sem prazo"
    const semPrazoBtn = screen.getByText("Sem prazo");
    await userEvent.click(semPrazoBtn);

    expect(onSelect).toHaveBeenCalledWith(null, null);
    expect(onClose).toHaveBeenCalled();
  });
});
