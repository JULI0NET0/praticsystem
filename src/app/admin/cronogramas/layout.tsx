"use client";

import { DemandasProvider } from "@/components/demandas/DemandasProvider";

/**
 * Cronogramas reaproveita o provider de Demandas: precisa da lista de
 * clientes, dos status e dos templates, e as linhas de conteúdo são as
 * mesmas demandas — inclusive para refletir na hora o que muda no modal.
 */
export default function CronogramasLayout({ children }: { children: React.ReactNode }) {
  return <DemandasProvider>{children}</DemandasProvider>;
}
