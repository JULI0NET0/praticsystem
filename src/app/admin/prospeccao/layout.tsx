"use client";

import "@/components/prospeccao/prospeccao.css";
import { ProspeccaoProvider } from "@/components/prospeccao/ProspeccaoProvider";
import ProspeccaoNav from "@/components/prospeccao/ProspeccaoNav";
import PageHeader from "@/components/ui/PageHeader";

export default function ProspeccaoLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProspeccaoProvider>
      <PageHeader eyebrow="Gestão Comercial" title="Prospecção" subtitle="Leads, conversas de WhatsApp e campanhas em um só lugar." />
      <ProspeccaoNav />
      {children}
    </ProspeccaoProvider>
  );
}
