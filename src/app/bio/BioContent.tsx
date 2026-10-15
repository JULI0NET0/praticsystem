"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import BioBackground from "@/components/bio/BioBackground";
import BioLinkCard from "@/components/bio/BioLinkCard";
import TerminalText from "@/components/bio/TerminalText";
import WhatsAppLeadPopup from "@/components/bio/WhatsAppLeadPopup";
import { WHATSAPP_NUMBER } from "@/components/bio/constants";
import {
  InstagramIcon,
  WhatsAppIcon,
  YouTubeIcon,
} from "@/components/SocialIcons";

// TODO: substituir pelos handles reais antes de publicar.
const INSTAGRAM_URL = "#";
const YOUTUBE_URL = "#";

interface Offer {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  external?: boolean;
  featured?: { image: string; imageAlt: string; ctaLabel: string };
}

const UTM = "utm_source=instagram&utm_medium=bio&utm_campaign=";

const offers: Offer[] = [
  {
    id: "curso",
    eyebrow: "CURSO",
    title: "Edição no Automático",
    description: "Edite vídeos com IA, só dando comando.",
    href: `https://edicaonoautomatico.vercel.app/?${UTM}curso`,
    external: true,
    featured: {
      image: "/bio/curso-edicao-no-automatico.jpg",
      imageAlt:
        "Capa do curso Edição no Automático: linha do tempo de edição de vídeo com clipes e forma de onda de áudio",
      ctaLabel: "Quero editar no automático",
    },
  },
  {
    id: "labs",
    eyebrow: "IA & AUTOMAÇÕES",
    title: "Pratic Labs",
    description: "IA e automações rodando no seu negócio.",
    href: `/pratic-labs?${UTM}labs`,
  },
  {
    id: "consultoria",
    eyebrow: "CONSULTORIA",
    title: "Consultoria de IA",
    description: "Diagnóstico: onde a IA entra no seu negócio.",
    href: `/consultoria-ia?${UTM}consultoria`,
  },
];

const footerLinks = [
  { label: "Agência Pratic", href: "/agencia-pratic" },
  { label: "Pratic Club", href: "/pratic-club" },
];

export default function BioContent() {
  const [isPopupOpen, setPopupOpen] = useState(false);

  return (
    <BioBackground>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "var(--space-8) var(--space-4)",
        }}
      >
        <div style={{ width: "100%", maxWidth: 440 }}>
          {/* Cabeçalho pessoal */}
          <div style={{ textAlign: "center", marginBottom: "var(--space-7)" }}>
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: "var(--radius-full)",
                overflow: "hidden",
                position: "relative",
                margin: "0 auto var(--space-4)",
                border: "2px solid var(--color-terracotta)",
              }}
            >
              <Image
                src="/bio/avatar.jpg"
                alt="Julio Neto"
                fill
                priority
                style={{ objectFit: "cover" }}
              />
            </div>
            <h1
              style={{
                fontSize: "var(--text-h2)",
                fontWeight: 700,
                color: "var(--color-text-primary)",
              }}
            >
              Julio Neto
            </h1>
            <p
              style={{
                fontSize: "var(--text-body)",
                color: "var(--color-text-secondary)",
                marginTop: "var(--space-3)",
                minHeight: 24,
              }}
            >
              <TerminalText text="IA aplicada a negócio — sem enrolação." />
            </p>
          </div>

          {/* Ofertas — peso visual igual, grid 2 colunas que colapsa sozinho */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "var(--space-4)",
              marginBottom: "var(--space-7)",
              alignItems: "start",
            }}
          >
            {offers.map((offer, index) => (
              <div
                key={offer.id}
                style={{ height: "100%" }}
              >
                <BioLinkCard
                  index={index}
                  eyebrow={offer.eyebrow}
                  title={offer.title}
                  description={offer.description}
                  href={offer.href}
                  external={offer.external}
                  featured={offer.featured}
                />
              </div>
            ))}
          </div>

          {/* Rodapé */}
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "var(--space-5)",
                marginBottom: "var(--space-4)",
                color: "var(--color-text-secondary)",
              }}
            >
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
              >
                <InstagramIcon size={20} />
              </a>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
              >
                <WhatsAppIcon size={20} />
              </a>
              <a
                href={YOUTUBE_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
              >
                <YouTubeIcon size={20} />
              </a>
            </div>
            <nav
              aria-label="Outros links"
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "var(--space-2)",
                fontSize: "var(--text-ui)",
                color: "#A8A8A8",
              }}
            >
              {footerLinks.map((link, i) => (
                <span key={link.href} style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}>
                  {i > 0 && <span aria-hidden>·</span>}
                  <Link
                    href={link.href}
                    style={{ color: "#A8A8A8", display: "inline-flex", alignItems: "center", minHeight: 44, padding: "0 var(--space-2)" }}
                  >
                    {link.label}
                  </Link>
                </span>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Botão flutuante de WhatsApp — abre o popup, sempre visível */}
      <button
        type="button"
        onClick={() => setPopupOpen(true)}
        aria-label="Falar no WhatsApp"
        className="btn-accent"
        style={{
          position: "fixed",
          bottom: "var(--space-5)",
          right: "var(--space-5)",
          width: 52,
          height: 52,
          borderRadius: "var(--radius-full)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "var(--shadow-lg)",
          zIndex: 10,
        }}
      >
        <WhatsAppIcon size={24} />
      </button>

      <WhatsAppLeadPopup
        isOpen={isPopupOpen}
        onClose={() => setPopupOpen(false)}
        whatsappNumber={WHATSAPP_NUMBER}
      />
    </BioBackground>
  );
}
