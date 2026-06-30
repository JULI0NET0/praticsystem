import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FinancialKPIs, type FaturamentoItem } from "./FinancialKPIs";

afterEach(cleanup);

const faturamentoItems: FaturamentoItem[] = [
  { id: "1", description: "Cobrança Mensal - Ballo Arts", client: "Ballo Arts", date: "2026-06-10", amount: 1500, status: "paid" },
  { id: "2", description: "Cobrança Mensal - Looom", client: "Looom", date: "2026-06-20", amount: 2000, status: "pending" },
  { id: "3", description: "Cobrança Mensal - Recloset", client: "Recloset", date: "2026-06-05", amount: 800, status: "overdue" },
];

function renderKPIs() {
  return render(
    <FinancialKPIs
      faturamentoPrevisto={4300}
      faturamentoRealizado={1500}
      faturamentoItems={faturamentoItems}
      despesas={0}
      despesasPrevistas={0}
      despesaItems={[]}
      clientesAtivos={3}
      dateRange={{ start: "2026-06-01", end: "2026-06-30" }}
      datePreset="this_month"
      onPresetChange={() => {}}
      onRangeChange={() => {}}
    />
  );
}

// Abre o diálogo do card Faturamento e devolve o elemento do modal (escopo das asserções)
async function openFaturamentoDialog(): Promise<HTMLElement> {
  const user = userEvent.setup();
  await user.click(screen.getByText("Faturamento"));
  const heading = await screen.findByRole("heading", { name: "Cobranças do Período" });
  return heading.closest(".glass-card") as HTMLElement;
}

describe("FinancialKPIs — card Faturamento clicável", () => {
  it("abre o diálogo detalhado ao clicar no card Faturamento", async () => {
    renderKPIs();
    // O diálogo não está visível antes do clique
    expect(screen.queryByRole("heading", { name: "Cobranças do Período" })).toBeNull();
    const modal = await openFaturamentoDialog();
    expect(modal).toBeTruthy();
  });

  it("mostra cada cobrança com cliente, valor e badge de status", async () => {
    renderKPIs();
    const modal = await openFaturamentoDialog();

    // Itens detalhados
    expect(within(modal).getByText("Cobrança Mensal - Ballo Arts")).toBeTruthy();
    expect(within(modal).getByText("Cobrança Mensal - Looom")).toBeTruthy();
    expect(within(modal).getByText("Cobrança Mensal - Recloset")).toBeTruthy();

    // Badges de status: realizado vs previsto vs vencido (escopados ao modal)
    expect(within(modal).getByText("Recebido")).toBeTruthy();
    expect(within(modal).getByText("Previsto")).toBeTruthy();
    expect(within(modal).getByText("Vencido")).toBeTruthy();
  });

  it("exibe no rodapé os totais Previsto e Realizado", async () => {
    renderKPIs();
    const modal = await openFaturamentoDialog();

    // Rótulos e contagem no rodapé do diálogo
    expect(within(modal).getByText(/Previsto:/)).toBeTruthy();
    expect(within(modal).getByText(/Realizado:/)).toBeTruthy();
    expect(within(modal).getByText("3 cobrança(s)")).toBeTruthy();

    // Totais formatados em BRL: Previsto R$ 4.300,00 e Realizado R$ 1.500,00
    expect(within(modal).getAllByText(/4\.300,00/).length).toBeGreaterThanOrEqual(1);
    expect(within(modal).getAllByText(/1\.500,00/).length).toBeGreaterThanOrEqual(1);
  });
});
