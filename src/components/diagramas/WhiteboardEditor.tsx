"use client";

import React, { useEffect, useRef, useState } from "react";
import "@excalidraw/excalidraw/index.css";
import { Excalidraw, FONT_FAMILY, MainMenu, WelcomeScreen } from "@excalidraw/excalidraw";
import { useTheme } from "next-themes";

interface WhiteboardEditorProps {
  initialData?: Record<string, unknown> | null;
  onChange?: (data: Record<string, unknown>) => void;
}

// Tipos mínimos: os tipos completos do Excalidraw ficam em subpastas de dist/types
// e não são re-exportados de forma estável pela raiz do pacote.
type ExcalidrawElement = { id: string; version: number; isDeleted?: boolean };
type WhiteboardAppState = { viewBackgroundColor?: string };

// Fundo padrão = superfície canvas da marca (no escuro o Excalidraw inverte o canvas)
const PRATIC_CANVAS = "#faf9f5";

// Assinatura barata do estado: o onChange do Excalidraw dispara a cada movimento
// do ponteiro, e só queremos salvar quando algum elemento realmente mudou.
function signature(elements: readonly ExcalidrawElement[], files: object): string {
  let sig = `${elements.length}:${Object.keys(files).length}`;
  for (const el of elements) sig += `|${el.id}.${el.version}`;
  return sig;
}

// Identidade Pratic sobre as variáveis do Excalidraw: terracota no lugar do roxo,
// superfícies e fonte do design system (src/styles/theme.css).
const PRATIC_WHITEBOARD_CSS = `
.pratic-whiteboard .excalidraw {
  --ui-font: var(--font-sans, Inter), system-ui, sans-serif;
  --color-primary: #d97757;
  --color-primary-darker: #c96442;
  --color-primary-darkest: #b84627;
  --color-primary-hover: #c96442;
  --color-primary-light: #fff1ed;
  --color-brand-hover: #c96442;
  --color-brand-active: #b84627;
  --color-selection: #d97757;
  --color-surface-primary-container: #f3dfd3;
  --color-on-primary-container: #a54a29;
  --island-bg-color: #ffffff;
  --default-bg-color: #faf9f5;
  --color-surface-lowest: #ffffff;
  --color-surface-low: #f4f4f0;
  --color-surface-mid: #efeeea;
  --color-surface-high: #f3dfd3;
  --color-on-surface: #1b1c1a;
  --sidebar-bg-color: #ffffff;
  --default-border-color: #e3e2df;
  --border-radius-md: 8px;
  --border-radius-lg: 12px;
}
.pratic-whiteboard .excalidraw.theme--dark {
  --color-primary: #e08a6e;
  --color-primary-darker: #eba48f;
  --color-primary-darkest: #f3c4b4;
  --color-primary-hover: #eba48f;
  --color-primary-light: #3a2419;
  --color-brand-hover: #eba48f;
  --color-brand-active: #f3c4b4;
  --color-selection: #c96442;
  --color-surface-primary-container: #4a2e20;
  --color-on-primary-container: #e8a98d;
  --island-bg-color: #22211e;
  --default-bg-color: #141413;
  --color-surface-lowest: #141413;
  --color-surface-low: #22211e;
  --color-surface-mid: #1a1917;
  --color-surface-high: #2a2825;
  --color-on-surface: #f5f4ef;
  --sidebar-bg-color: #22211e;
  --default-border-color: #3a3833;
}
.pratic-whiteboard .excalidraw .welcome-screen-center__logo img { height: 56px; width: auto; }
`;

export default function WhiteboardEditor({ initialData, onChange }: WhiteboardEditorProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  // Estado inicial congelado na montagem: o Excalidraw só lê initialData uma vez
  const [initial] = useState<Record<string, unknown>>(() => initialData ?? {});
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const lastSigRef = useRef<string>(
    signature(
      ((initial.elements as ExcalidrawElement[]) ?? []).filter((e) => !e.isDeleted),
      (initial.files as object) ?? {}
    )
  );

  return (
    <div className="pratic-whiteboard" style={{ width: "100%", height: "100%" }}>
      <style>{PRATIC_WHITEBOARD_CSS}</style>
      <Excalidraw
        theme={isDark ? "dark" : "light"}
        langCode="pt-BR"
        name="Quadro Pratic"
        initialData={{
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          elements: ((initial.elements as any[]) ?? []),
          appState: {
            viewBackgroundColor:
              ((initial.appState as WhiteboardAppState | undefined)?.viewBackgroundColor) ?? PRATIC_CANVAS,
            // Traço limpo e fonte arredondada: mais próximo da marca que o "rabisco" padrão
            currentItemRoughness: 0,
            currentItemFontFamily: FONT_FAMILY.Nunito,
            currentItemStrokeColor: "#1b1c1a",
            currentItemStrokeWidth: 2,
            currentItemRoundness: "round",
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          files: ((initial.files as any) ?? undefined),
          scrollToContent: true,
        }}
        UIOptions={{
          // O quadro é salvo no banco: abrir/salvar arquivo local só confundiria
          canvasActions: { loadScene: false, saveToActiveFile: false },
        }}
        onChange={(elements, appState, files) => {
          const live = (elements as readonly ExcalidrawElement[]).filter((e) => !e.isDeleted);
          const sig = signature(live, files);
          if (sig === lastSigRef.current) return;
          lastSigRef.current = sig;

          onChangeRef.current?.({
            elements: live,
            appState: { viewBackgroundColor: appState.viewBackgroundColor },
            files,
          });
        }}
      >
        <MainMenu>
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.DefaultItems.Export />
          <MainMenu.DefaultItems.SearchMenu />
          <MainMenu.DefaultItems.Help />
          <MainMenu.Separator />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
          <MainMenu.DefaultItems.ClearCanvas />
        </MainMenu>

        <WelcomeScreen>
          <WelcomeScreen.Hints.ToolbarHint>Escolha uma ferramenta e comece a desenhar</WelcomeScreen.Hints.ToolbarHint>
          <WelcomeScreen.Hints.MenuHint>Exportar, fundo e limpar quadro</WelcomeScreen.Hints.MenuHint>
          <WelcomeScreen.Hints.HelpHint>Atalhos e ajuda</WelcomeScreen.Hints.HelpHint>
          <WelcomeScreen.Center>
            <WelcomeScreen.Center.Logo>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={isDark ? "/SIMBOLO-BRANCO.png" : "/SIMBOLO-PRETO.png"} alt="Pratic" />
            </WelcomeScreen.Center.Logo>
            <WelcomeScreen.Center.Heading>Quadro livre: rascunhos, wireframes e ideias à mão</WelcomeScreen.Center.Heading>
          </WelcomeScreen.Center>
        </WelcomeScreen>
      </Excalidraw>
    </div>
  );
}
