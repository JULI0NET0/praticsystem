import { maskCnpj, maskPhone, normalizePhone, parseInstagram, parseSegments, validateCnpj } from "@/lib/prospeccao/leads";
import type { Lead, LeadOrigin, LeadStage } from "@/types/database";

export interface LeadFormState {
  nome: string;
  empresa: string;
  telefone: string; // mascarado
  email: string;
  instagram: string;
  cnpj: string; // mascarado
  cidade: string;
  uf: string;
  cnae_descricao: string;
  razao_social: string;
  servico_interesse: string;
  segmentos: string; // separados por vírgula
  valor_estimado: string;
  origem: LeadOrigin;
  estagio: LeadStage;
  perdido_motivo: string;
}

export function formFromLead(lead?: Lead | null, defaults?: Partial<LeadFormState>): LeadFormState {
  return {
    nome: lead?.nome ?? "",
    empresa: lead?.empresa ?? "",
    telefone: lead?.telefone ? maskPhone(lead.telefone) : "",
    email: lead?.email ?? "",
    instagram: lead?.instagram ? `@${lead.instagram}` : "",
    cnpj: lead?.cnpj ? maskCnpj(lead.cnpj) : "",
    cidade: lead?.cidade ?? "",
    uf: lead?.uf ?? "",
    cnae_descricao: lead?.cnae_descricao ?? "",
    razao_social: lead?.razao_social ?? "",
    servico_interesse: lead?.servico_interesse ?? "",
    segmentos: (lead?.segmentos ?? []).join(", "),
    valor_estimado: lead?.valor_estimado != null ? String(lead.valor_estimado).replace(".", ",") : "",
    origem: lead?.origem ?? "manual",
    estagio: lead?.estagio ?? "novo",
    perdido_motivo: lead?.perdido_motivo ?? "",
    ...defaults,
  };
}

/** Converte o formulário em colunas do banco; devolve `error` quando algo está inválido. */
export function leadPatchFromForm(f: LeadFormState): { data?: Partial<Lead> & { nome: string }; error?: string } {
  if (!f.nome.trim()) return { error: "Informe o nome." };
  const telefone = f.telefone ? normalizePhone(f.telefone) : null;
  if (f.telefone && !telefone) return { error: "WhatsApp inválido. Use DDD + número." };
  if (f.cnpj && !validateCnpj(f.cnpj)) return { error: "CNPJ inválido." };
  if (f.instagram && !parseInstagram(f.instagram)) return { error: "Instagram inválido." };
  const valor = f.valor_estimado.trim() ? Number(f.valor_estimado.replace(/\./g, "").replace(",", ".")) : null;
  if (valor !== null && Number.isNaN(valor)) return { error: "Valor inválido." };
  return {
    data: {
      nome: f.nome.trim(),
      empresa: f.empresa.trim() || null,
      telefone,
      email: f.email.trim() || null,
      instagram: parseInstagram(f.instagram),
      cnpj: f.cnpj ? f.cnpj.replace(/\D/g, "") : null,
      cidade: f.cidade.trim() || null,
      uf: f.uf.trim().toUpperCase() || null,
      cnae_descricao: f.cnae_descricao.trim() || null,
      razao_social: f.razao_social.trim() || null,
      servico_interesse: f.servico_interesse.trim() || null,
      segmentos: parseSegments(f.segmentos),
      valor_estimado: valor,
      origem: f.origem,
      estagio: f.estagio,
      perdido_motivo: f.estagio === "perdido" ? f.perdido_motivo.trim() || null : null,
    },
  };
}
