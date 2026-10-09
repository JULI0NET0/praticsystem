"use client";

import "@/components/prospeccao/prospeccao.css";
import { usePathname } from "next/navigation";
import { ChevronsLeftRight } from "lucide-react";
import { ProspeccaoProvider } from "@/components/prospeccao/ProspeccaoProvider";
import ProspeccaoNav from "@/components/prospeccao/ProspeccaoNav";
import ContaWhatsApp from "@/components/prospeccao/ContaWhatsApp";
import { useContentWidth } from "@/hooks/useContentWidth";

export default function ProspeccaoLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Conversas pede a tela toda por padrão; as demais abas, a coluna central. A escolha do usuário vence.
  const [width, toggleWidth] = useContentWidth(pathname.startsWith("/admin/prospeccao/conversas") ? "full" : "main");

  return (
    <ProspeccaoProvider>
      <div id="prospeccao-root" data-width={width}>
        <header className="pp-topbar">
          <div className="pp-topbar-title">
            <span>Gestão comercial</span>
            <h1>Prospecção</h1>
          </div>
          <ProspeccaoNav />
          <div className="pp-topbar-right">
            <ContaWhatsApp />
            <button
              type="button"
              className="pp-width-btn"
              onClick={toggleWidth}
              aria-pressed={width === "full"}
              aria-label="Largura total"
              title={width === "full" ? "Voltar à largura principal" : "Usar a largura total"}
            >
              <ChevronsLeftRight size={15} />
            </button>
          </div>
        </header>
        <div className="pp-content">{children}</div>
      </div>
    </ProspeccaoProvider>
  );
}
