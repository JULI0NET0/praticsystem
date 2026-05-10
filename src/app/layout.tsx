import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import InteractiveBackground from "@/components/InteractiveBackground";
import GlobalClientControls from "@/components/GlobalClientControls";
import "../styles/globals.css";
import "../styles/components.css";

export const metadata: Metadata = {
  title: "Agência Prátic - Sistema de Gestão",
  description: "Plataforma completa de gestão para a Agência Prátic",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <InteractiveBackground />
          <GlobalClientControls />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
