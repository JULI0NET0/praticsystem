"use client";

import { Suspense } from "react";
import DemandasView from "@/components/demandas/DemandasView";

// DemandasView lê ?d=<id> com useSearchParams — sem o Suspense o build
// de produção falha com "Missing Suspense boundary with useSearchParams".
export default function DemandasPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 40, color: "var(--text-tertiary)", fontSize: "0.86rem" }}>
          Carregando demandas…
        </div>
      }
    >
      <DemandasView />
    </Suspense>
  );
}
