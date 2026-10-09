"use client";

import { Briefcase, Building2, EyeOff, User, UserCheck, Users } from "lucide-react";
import { TYPE_LABEL } from "@/lib/prospeccao/classify";
import type { ContactType, Lead } from "@/types/database";

const CHOICES: { tipo: ContactType; icon: React.ReactNode }[] = [
  { tipo: "lead", icon: <UserCheck size={13} /> },
  { tipo: "cliente", icon: <Building2 size={13} /> },
  { tipo: "equipe", icon: <Users size={13} /> },
  { tipo: "fornecedor", icon: <Briefcase size={13} /> },
  { tipo: "pessoal", icon: <User size={13} /> },
  { tipo: "ignorado", icon: <EyeOff size={13} /> },
];

/** Faixa de decisão para números que ainda não sabemos quem são. */
export default function TriageBanner({ lead, onChoose }: { lead: Lead; onChoose: (tipo: ContactType) => void }) {
  return (
    <div className="pp-triage" role="region" aria-label="Classificar contato">
      <strong>Número novo. Quem é?</strong>
      {lead.wa_is_business && <span className="pp-type-tag">Conta comercial</span>}
      {lead.wa_contact_name && <span className="pp-type-tag">Na sua agenda: {lead.wa_contact_name}</span>}
      <span style={{ display: "flex", gap: 6, flexWrap: "wrap", marginLeft: "auto" }}>
        {CHOICES.map((c) => (
          <button key={c.tipo} className={`btn btn-sm ${c.tipo === "lead" ? "btn-accent" : "btn-secondary"}`} onClick={() => onChoose(c.tipo)}>
            {c.icon} {TYPE_LABEL[c.tipo]}
          </button>
        ))}
      </span>
    </div>
  );
}
