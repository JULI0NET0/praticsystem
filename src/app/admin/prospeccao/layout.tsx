"use client";

import "@/components/prospeccao/prospeccao.css";
import { ProspeccaoProvider } from "@/components/prospeccao/ProspeccaoProvider";
import ProspeccaoFrame from "@/components/prospeccao/ProspeccaoFrame";

export default function ProspeccaoLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProspeccaoProvider>
      <ProspeccaoFrame>{children}</ProspeccaoFrame>
    </ProspeccaoProvider>
  );
}
