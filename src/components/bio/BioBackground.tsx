import Image from "next/image";
import "@/styles/bio.css";

/**
 * Fundo compartilhado das páginas públicas de bio (/bio, /pratic-labs):
 * a mesma foto com um Ken Burns sutil (scale + pan lento em loop) e uma
 * vinheta escura por cima pra manter o texto legível.
 */
export default function BioBackground({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-theme="dark"
      style={
        {
          position: "relative",
          minHeight: "100vh",
          isolation: "isolate",
          overflow: "hidden",
          // Acento mais forte, só nestas páginas públicas: sobrescreve a
          // família terracota localmente (não mexe em theme.css). Como
          // --accent/.btn-accent/.badge-accent leem essas custom
          // properties em tempo de uso, tudo que já usa "acento" nesta
          // subárvore herda o laranja mais saturado automaticamente.
          "--color-terracotta": "#ff6a35",
          "--color-terracotta-700": "#ec5820",
          "--color-terracotta-800": "#c94413",
          "--color-terracotta-hover-solid": "#ff8557",
          "--color-terracotta-active-solid": "#ffa47d",
          "--color-terracotta-100": "#3a1f10",
          "--color-terracotta-200": "#4a2814",
          "--color-terracotta-ink": "#ffab7d",
        } as React.CSSProperties
      }
    >
      <div className="bio-ken-burns">
        <Image
          src="/bio/bio-background.jpg"
          alt=""
          fill
          priority
          style={{ objectFit: "cover" }}
        />
      </div>
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: -1,
          background:
            "radial-gradient(120% 90% at 50% 0%, rgba(20,20,19,0.35) 0%, rgba(20,20,19,0.8) 60%, rgba(20,20,19,0.95) 100%)",
        }}
      />
      {children}
    </div>
  );
}
