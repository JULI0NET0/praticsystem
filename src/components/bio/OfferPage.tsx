"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import BioBackground from "@/components/bio/BioBackground";
import TerminalText from "@/components/bio/TerminalText";
import WhatsAppLeadPopup from "@/components/bio/WhatsAppLeadPopup";
import { WHATSAPP_NUMBER } from "@/components/bio/constants";

interface OfferPageProps {
  title: string;
  tagline: string;
  description: string;
  highlights: string[];
  ctaLabel: string;
}

/**
 * Template compartilhado das páginas dedicadas de cada oferta
 * (Pratic Labs, Consultoria de IA, Pratic Club): mesmo fundo/motion do
 * /bio, hero com tagline em efeito terminal, card com descrição +
 * destaques, e CTA que abre o popup de WhatsApp já com o serviço
 * pré-selecionado.
 */
export default function OfferPage({
  title,
  tagline,
  description,
  highlights,
  ctaLabel,
}: OfferPageProps) {
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
          <Link
            href="/bio"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-1)",
              fontSize: "var(--text-ui)",
              color: "var(--color-text-secondary)",
              marginBottom: "var(--space-6)",
            }}
          >
            <ArrowLeft size={16} /> Voltar
          </Link>

          <div style={{ marginBottom: "var(--space-6)" }}>
            <h1
              style={{
                fontSize: "var(--text-h1)",
                fontWeight: 700,
                color: "var(--color-text-primary)",
                marginBottom: "var(--space-2)",
              }}
            >
              {title}
            </h1>
            <p
              style={{
                fontSize: "var(--text-body)",
                color: "var(--color-text-secondary)",
                minHeight: 24,
              }}
            >
              <TerminalText text={tagline} />
            </p>
          </div>

          <div
            className="surface"
            style={{
              padding: "var(--card-pad)",
              marginBottom: "var(--space-6)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <p
              style={{
                fontSize: "var(--text-ui)",
                color: "var(--color-text-tertiary)",
                lineHeight: 1.5,
                marginBottom: "var(--space-4)",
              }}
            >
              {description}
            </p>
            <ul style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {highlights.map((item) => (
                <li
                  key={item}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "var(--space-2)",
                    fontSize: "var(--text-ui)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  <Check
                    size={16}
                    color="var(--color-terracotta-ink)"
                    style={{ flexShrink: 0, marginTop: 2 }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={() => setPopupOpen(true)}
            className="btn btn-accent"
            style={{ width: "100%" }}
          >
            {ctaLabel}
          </button>
        </div>
      </div>

      <WhatsAppLeadPopup
        isOpen={isPopupOpen}
        onClose={() => setPopupOpen(false)}
        whatsappNumber={WHATSAPP_NUMBER}
        offer={title}
      />
    </BioBackground>
  );
}
