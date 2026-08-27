import { describe, it, expect } from "vitest";
import {
  generateWhatsAppSummary,
  filterDemandsForSummary,
  buildWhatsAppShareUrl,
} from "./whatsappDemandSummary";
import type { Demand, DemandClientRef, DemandStatus } from "@/types/demandas";

describe("whatsappDemandSummary", () => {
  const mockClients: DemandClientRef[] = [
    { id: "c1", name: "CAVEZZO MOVEIS LTDA", nome_fantasia: "CAVEZZO MOVEIS", status: "active" },
    { id: "c2", name: "RECLOSET BAZAR E MODA", nome_fantasia: "RECLOSET BAZAR", status: "active" },
  ];

  const mockUsers = [
    { id: "u1", name: "Julio Neto", username: "julioneto", phone: "11999998888" },
  ];

  const mockStatuses: DemandStatus[] = [
    { id: "st-fazer", label: "A Fazer", color: "#64748b", category: "ativo", position: 1 },
    { id: "st-concluido", label: "Concluído", color: "#10b981", category: "fechado", position: 2 },
  ];

  const baseDate = new Date(2026, 7, 27); // 27/08/2026

  const mockDemands: Demand[] = [
    {
      id: "d1",
      title: "DRIVE IMAGENS COLD",
      client_id: "c1",
      scope: "client",
      status: "st-fazer",
      status_category: "ativo",
      priority: "urgent",
      assignee_ids: ["u1"],
      assign_all_team: false,
      due_date: "2026-08-27",
      position: 1,
      created_at: "2026-08-27T08:00:00Z",
    },
    {
      id: "d2",
      title: "DRIVE IMAGENS COLD",
      client_id: "c2",
      scope: "client",
      status: "st-fazer",
      status_category: "ativo",
      priority: "urgent",
      assignee_ids: ["u1"],
      assign_all_team: false,
      due_date: "2026-08-27",
      position: 2,
      created_at: "2026-08-27T08:00:00Z",
    },
  ];

  it("generates WhatsApp summary in the minimalist square format requested", () => {
    const text = generateWhatsAppSummary({
      demands: mockDemands,
      clients: mockClients,
      users: mockUsers,
      statuses: mockStatuses,
      dateScope: "today",
      targetAssigneeId: "u1",
      referenceDate: baseDate,
    });

    expect(text).toContain("Olá *Julio Neto*, segue seu resumo de demandas:");
    expect(text).toContain("*DEMANDAS DE HOJE* - Quinta-feira, _27/08/2026_");
    expect(text).toContain("*Total:* 2 demandas (🟥 2)");
    expect(text).toContain("🟥 *URGENTE*");
    expect(text).toContain("• *CAVEZZO MOVEIS* | DRIVE IMAGENS COLD");
    expect(text).toContain("• *RECLOSET BAZAR* | DRIVE IMAGENS COLD");
  });

  it("builds WhatsApp share url with phone number", () => {
    const url = buildWhatsAppShareUrl("Olá!", "11999998888");
    expect(url).toBe("https://wa.me/5511999998888?text=Ol%C3%A1!");
  });
});
