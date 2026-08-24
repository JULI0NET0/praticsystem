"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Field, Input, Select } from "@/components/ui/Field";

const SERVICE_OPTIONS = [
  "Agência Pratic",
  "Pratic Labs",
  "Consultoria de IA",
  "Pratic Club",
];

interface WhatsAppLeadPopupProps {
  isOpen: boolean;
  onClose: () => void;
  whatsappNumber: string;
  offer?: string;
}

/**
 * Popup só de front-end: pede nome/empresa/serviço/WhatsApp e monta o
 * link wa.me com a mensagem já preenchida. Não salva em lugar nenhum
 * ainda.
 * TODO: quando existir uma tabela/endpoint de leads, salvar aqui antes
 * do `window.open` — hoje o sistema só tem `/api/clients` (fluxo interno
 * de admin), sem infraestrutura pública de captação.
 */
export default function WhatsAppLeadPopup({
  isOpen,
  onClose,
  whatsappNumber,
  offer,
}: WhatsAppLeadPopupProps) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const serviceRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const service = serviceRef.current?.value;
    const lines = [
      `Olá! Vim pela página de bio.`,
      `Nome: ${name || "—"}`,
      company && `Empresa: ${company}`,
      `Interesse: ${service || "—"}`,
      phone && `WhatsApp: ${phone}`,
    ].filter(Boolean);
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
      lines.join("\n")
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setName("");
    setCompany("");
    setPhone("");
    onClose();
  };

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "var(--color-scrim)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-4)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Falar no WhatsApp"
        data-theme="dark"
        onClick={(e) => e.stopPropagation()}
        className="surface"
        style={{
          width: "100%",
          maxWidth: 380,
          padding: "var(--space-5)",
          position: "relative",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="btn btn-ghost btn-icon"
          style={{ position: "absolute", top: "var(--space-3)", right: "var(--space-3)" }}
        >
          <X size={16} />
        </button>

        <h2
          style={{
            fontSize: "var(--text-h3)",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            marginBottom: "var(--space-1)",
          }}
        >
          Falar no WhatsApp
        </h2>
        <p
          style={{
            fontSize: "var(--text-ui)",
            color: "var(--color-text-tertiary)",
            marginBottom: "var(--space-4)",
          }}
        >
          Deixa seus dados que eu já abro a conversa.
        </p>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}
        >
          <Field label="Nome" htmlFor="bio-lead-name" required>
            <Input
              id="bio-lead-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              autoFocus
              required
            />
          </Field>

          <Field label="Empresa" htmlFor="bio-lead-company">
            <Input
              id="bio-lead-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Nome da empresa"
            />
          </Field>

          <Field label="Serviço de interesse" htmlFor="bio-lead-service">
            <Select
              id="bio-lead-service"
              ref={serviceRef}
              defaultValue={offer ?? ""}
            >
              <option value="">Selecione</option>
              {SERVICE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="WhatsApp (opcional)" htmlFor="bio-lead-phone">
            <Input
              id="bio-lead-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </Field>

          <button
            type="submit"
            className="btn btn-accent"
            style={{ width: "100%", marginTop: "var(--space-1)" }}
          >
            Continuar no WhatsApp
          </button>
        </form>
      </div>
    </div>
  );
}
