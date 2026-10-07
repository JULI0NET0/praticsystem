import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QR dinâmico",
  description: "Crie um QR Code uma vez e troque o destino quando quiser.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
