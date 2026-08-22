"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="light"
      /**
       * ⚠️ O bump da chave é o que faz o re-skin aparecer.
       * next-themes persiste o tema escolhido em localStorage; todo
       * usuário existente tem "dark" gravado sob a chave antiga
       * ("theme"), porque esse era o padrão. Sem trocar a chave,
       * eles abririam o app reestilizado e continuariam vendo o
       * tema escuro — o projeto inteiro pareceria não ter subido.
       */
      storageKey="pratic-theme-v2"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
