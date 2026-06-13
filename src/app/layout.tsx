import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import InteractiveBackground from "@/components/InteractiveBackground";
import GlobalClientControls from "@/components/GlobalClientControls";
import { ToastProvider } from "@/components/CustomToast";
import "../styles/globals.css";
import "../styles/components.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0A" },
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
  ],
};

export const metadata: Metadata = {
  title: "Agência Prátic - Sistema de Gestão",
  description: "Plataforma completa de gestão para a Agência Prátic",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
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
