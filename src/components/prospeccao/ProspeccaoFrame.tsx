"use client";

import { usePathname } from "next/navigation";
import { ChevronsLeftRight, Link2 } from "lucide-react";
import { useToast } from "@/components/CustomToast";
import ThemeLogo from "@/components/ThemeLogo";
import { useContentWidth } from "@/hooks/useContentWidth";
import { prospeccaoBase, prospeccaoFocusPath } from "@/lib/prospeccao/paths";
import { useAutoSync } from "./useSync";
import ProspeccaoNav from "./ProspeccaoNav";
import ContaWhatsApp from "./ContaWhatsApp";

export default function ProspeccaoFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { showToast } = useToast();
  useAutoSync();
  const base = prospeccaoBase(pathname);
  // Conversas pede a tela toda por padrão; as demais abas, a coluna central. A escolha do usuário vence.
  const [width, toggleWidth] = useContentWidth(pathname.startsWith(`${base}/conversas`) ? "full" : "main");

  const copyLink = async () => {
    const path = prospeccaoFocusPath(pathname, window.location.search);
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      showToast("Link da prospecção copiado.", "success");
    } catch {
      showToast("Não foi possível copiar o link.", "error");
    }
  };

  return (
    <div id="prospeccao-root" data-width={width}>
      <header className="pp-topbar">
        <div className="pp-topbar-title">
          <h1>Prospecção</h1>
          <ThemeLogo width={148} height={32} align="left" />
        </div>
        <ProspeccaoNav />
        <div className="pp-topbar-right">
          <ContaWhatsApp />
          <button
            type="button"
            className="pp-link-btn"
            onClick={copyLink}
            aria-label="Copiar link da prospecção"
            title="Copiar link da prospecção"
          >
            <Link2 size={15} />
          </button>
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
  );
}
