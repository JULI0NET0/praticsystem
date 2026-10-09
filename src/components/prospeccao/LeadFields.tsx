"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Briefcase, Globe, Camera, Loader2, MessageCircle, Search, Share2, UserPlus, Users, X } from "lucide-react";
import Combobox, { type ComboboxOption } from "@/components/ui/Combobox";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/CustomToast";
import { ORIGIN_LABEL, SEGMENT_SUGGESTIONS, STAGES, maskCnpj, maskPhone, parseSegments, validateCnpj } from "@/lib/prospeccao/leads";
import type { LeadFormState } from "./leadForm";
import type { LeadOrigin, LeadStage } from "@/types/database";

const ORIGIN_ICON: Record<string, React.ReactNode> = {
  prospeccao_ativa: <Search size={14} />,
  indicacao: <UserPlus size={14} />,
  instagram: <Camera size={14} />,
  whatsapp: <MessageCircle size={14} />,
  site: <Globe size={14} />,
  csv: <Share2 size={14} />,
  manual: <Users size={14} />,
  outro: <Share2 size={14} />,
};

const ORIGIN_OPTIONS: ComboboxOption[] = Object.entries(ORIGIN_LABEL).map(([value, label]) => ({ value, label, icon: ORIGIN_ICON[value] }));
const STAGE_OPTIONS: ComboboxOption[] = STAGES.map((s) => ({ value: s.id, label: s.label, color: s.color }));

interface Props {
  form: LeadFormState;
  onChange: (patch: Partial<LeadFormState>) => void;
  /** Uma coluna (painel lateral) em vez de duas. */
  single?: boolean;
  showStage?: boolean;
}

export default function LeadFields({ form, onChange, single, showStage = true }: Props) {
  const { showToast } = useToast();
  const [services, setServices] = useState<string[]>([]);
  const [looking, setLooking] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.from("services").select("name").order("name").then(({ data }) => {
      if (alive) setServices((data || []).map((s) => s.name as string));
    });
    return () => { alive = false; };
  }, []);

  const serviceOptions = useMemo<ComboboxOption[]>(() => {
    const names = form.servico_interesse && !services.includes(form.servico_interesse) ? [...services, form.servico_interesse] : services;
    return names.map((n) => ({ value: n, label: n, icon: <Briefcase size={14} /> }));
  }, [services, form.servico_interesse]);

  const segments = parseSegments(form.segmentos);
  const setSegments = (list: string[]) => onChange({ segmentos: list.join(", ") });

  const lookupCnpj = async () => {
    if (!validateCnpj(form.cnpj)) return showToast("CNPJ inválido.", "error");
    setLooking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/prospeccao/cnpj/${form.cnpj.replace(/\D/g, "")}`, { headers: { Authorization: `Bearer ${session?.access_token ?? ""}` } });
      const json = await res.json();
      if (!res.ok) return showToast(json.error || "Falha na consulta.", "error");
      onChange({
        razao_social: json.razao_social ?? form.razao_social,
        empresa: form.empresa || json.nome_fantasia || json.razao_social || "",
        cidade: json.cidade ?? form.cidade,
        uf: json.uf ?? form.uf,
        cnae_descricao: json.cnae_descricao ?? form.cnae_descricao,
        email: form.email || json.email || "",
        telefone: form.telefone || (json.telefone ? maskPhone(json.telefone) : ""),
      });
      showToast(`Dados carregados${json.situacao ? ` (${json.situacao})` : ""}.`, "success");
    } finally {
      setLooking(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className={single ? "pp-col1" : "pp-grid2"}>
        <label className="pp-label">Nome *<input className="pp-input" value={form.nome} onChange={(e) => onChange({ nome: e.target.value })} /></label>
        <label className="pp-label">Empresa<input className="pp-input" value={form.empresa} onChange={(e) => onChange({ empresa: e.target.value })} /></label>
        <label className="pp-label">WhatsApp
          <input className="pp-input" inputMode="tel" placeholder="(11) 99999-8888" value={form.telefone} onChange={(e) => onChange({ telefone: maskPhone(e.target.value) })} />
        </label>
        <label className="pp-label">Instagram
          <input className="pp-input" placeholder="@perfil ou link" value={form.instagram} onChange={(e) => onChange({ instagram: e.target.value })} />
        </label>
        <div className="pp-label">CNPJ
          <div style={{ display: "flex", gap: 6 }}>
            <input className="pp-input" inputMode="numeric" placeholder="00.000.000/0000-00" value={form.cnpj} onChange={(e) => onChange({ cnpj: maskCnpj(e.target.value) })} />
            <button type="button" className="btn btn-secondary btn-icon" onClick={lookupCnpj} disabled={looking || form.cnpj.replace(/\D/g, "").length !== 14} title="Buscar dados da empresa" aria-label="Buscar CNPJ">
              {looking ? <Loader2 size={15} className="spin" /> : <BadgeCheck size={15} />}
            </button>
          </div>
        </div>
        <label className="pp-label">E-mail<input className="pp-input" type="email" value={form.email} onChange={(e) => onChange({ email: e.target.value })} /></label>
        {(form.razao_social || form.cidade || form.cnae_descricao) && (
          <div className="pp-label" style={{ gridColumn: "1 / -1" }}>
            Dados da empresa
            <div style={{ fontWeight: 400, fontSize: "var(--text-caption)", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
              {form.razao_social}{form.cidade && ` · ${form.cidade}${form.uf ? `/${form.uf}` : ""}`}{form.cnae_descricao && <><br />{form.cnae_descricao}</>}
            </div>
          </div>
        )}
        <div className="pp-label">Serviço de interesse
          <Combobox options={serviceOptions} value={form.servico_interesse || null} onChange={(v) => onChange({ servico_interesse: v ?? "" })} placeholder="Selecione o serviço" searchPlaceholder="Buscar serviço..." clearOption={{ label: "Nenhum" }} />
        </div>
        <div className="pp-label">Canal de origem
          <Combobox options={ORIGIN_OPTIONS} value={form.origem} onChange={(v) => onChange({ origem: (v ?? "manual") as LeadOrigin })} placeholder="Como chegou?" searchThreshold={99} />
        </div>
        <label className="pp-label">Valor estimado (R$)
          <input className="pp-input" inputMode="decimal" placeholder="0,00" value={form.valor_estimado} onChange={(e) => onChange({ valor_estimado: e.target.value.replace(/[^\d.,]/g, "") })} />
        </label>
        {showStage && (
          <div className="pp-label">Estágio
            <Combobox options={STAGE_OPTIONS} value={form.estagio} onChange={(v) => onChange({ estagio: (v ?? "novo") as LeadStage })} searchThreshold={99} />
          </div>
        )}
      </div>

      {form.estagio === "perdido" && (
        <label className="pp-label">Motivo da perda<input className="pp-input" value={form.perdido_motivo} onChange={(e) => onChange({ perdido_motivo: e.target.value })} placeholder="Preço, sem retorno, fechou com outro..." /></label>
      )}

      <div className="pp-label">Segmentos (separe por vírgula)
        <input className="pp-input" placeholder="parlamentar, empresa" value={form.segmentos} onChange={(e) => onChange({ segmentos: e.target.value })} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
          {segments.map((s) => (
            <span key={s} className="pp-badge">{s}<button type="button" onClick={() => setSegments(segments.filter((x) => x !== s))} aria-label={`Remover ${s}`} style={{ border: 0, background: "none", padding: 0, cursor: "pointer", color: "inherit", display: "inline-flex" }}><X size={11} /></button></span>
          ))}
          {SEGMENT_SUGGESTIONS.filter((s) => !segments.includes(s)).map((s) => (
            <button key={s} type="button" className="pp-badge" style={{ cursor: "pointer", borderStyle: "dashed" }} onClick={() => setSegments([...segments, s])}>+ {s}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
