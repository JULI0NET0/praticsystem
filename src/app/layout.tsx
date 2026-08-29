import type { Metadata, Viewport } from "next";
import { Inter, Newsreader, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import GlobalClientControls from "@/components/GlobalClientControls";
import { ToastProvider } from "@/components/CustomToast";
import { ConfirmProvider } from "@/components/ConfirmProvider";
import "../styles/globals.css";

/**
 * Inter carrega UI e dados: tem `tnum`, essencial para colunas de
 * valores alinharem numa tabela financeira. Newsreader fica só no
 * display/PageHeader — serifa em 13px numa tabela densa prejudica
 * a leitura. Substituem o @import render-blocking da Outfit.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#141413" },
    { media: "(prefers-color-scheme: light)", color: "#FAF9F5" },
  ],
};

export const metadata: Metadata = {
  title: "Agência Prátic - Sistema de Gestão",
  description: "Plataforma completa de gestão para a Agência Prátic",
  manifest: "/manifest.json",
  icons: {
    icon: "/SIMBOLO-BRANCO.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Prátic",
  },
  formatDetection: { telephone: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${inter.variable} ${newsreader.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <ThemeProvider>
          <ToastProvider>
            <ConfirmProvider>
              <GlobalClientControls />
              {children}
            </ConfirmProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
