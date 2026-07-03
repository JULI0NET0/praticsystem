"use client";

import { OperacaoProvider } from "@/components/operacao/OperacaoProvider";
import OperacaoTree from "@/components/operacao/OperacaoTree";

export default function OperacaoLayout({ children }: { children: React.ReactNode }) {
  return (
    <OperacaoProvider>
      <div
        style={{
          display: "flex",
          gap: 24,
          alignItems: "flex-start",
          width: "100%",
        }}
      >
        <div className="operacao-tree-wrapper">
          <OperacaoTree />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </div>
    </OperacaoProvider>
  );
}
