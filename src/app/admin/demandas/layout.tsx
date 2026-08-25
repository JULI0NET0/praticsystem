"use client";

import { DemandasProvider } from "@/components/demandas/DemandasProvider";

export default function DemandasLayout({ children }: { children: React.ReactNode }) {
  return <DemandasProvider>{children}</DemandasProvider>;
}
