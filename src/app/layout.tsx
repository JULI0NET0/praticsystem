import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import InteractiveBackground from "@/components/InteractiveBackground";
import GlobalClientControls from "@/components/GlobalClientControls";
import { ToastProvider } from "@/components/CustomToast";
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
          <ToastProvider>
            <InteractiveBackground />
            <GlobalClientControls />
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
