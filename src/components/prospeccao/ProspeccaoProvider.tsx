"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/CustomToast";
import { useAuth } from "@/hooks/useAuth";
import { maskCnpj, maskPhone, phoneKey, stageLabel, type ParsedLeadRow } from "@/lib/prospeccao/leads";
import type { Campaign, Client, ContactType, Lead, LeadStage, QuickReply } from "@/types/database";

export interface LinkPlan {
  clientPatch: Partial<Client>;
  leadPatch: Partial<Lead>;
  notes: NonNullable<Client["notes"]>;
  changed: number;
}

type LeadInput = Partial<Omit<Lead, "id" | "created_at" | "updated_at">> & { nome: string };

interface ProspeccaoContextValue {
  /** Só contatos do tipo lead: Funil, Leads, Campanhas e KPIs. */
  leads: Lead[];
  /** Todos os contatos (lead, cliente, equipe, triagem…): Conversas e contadores. */
  contacts: Lead[];
  quickReplies: QuickReply[];
  campaigns: Campaign[];
  loading: boolean;
  reload: () => Promise<void>;
  createLead: (input: LeadInput) => Promise<Lead | null>;
  updateLead: (id: string, patch: Partial<Lead>) => Promise<void>;
  moveLead: (id: string, stage: LeadStage) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  importRows: (rows: ParsedLeadRow[]) => Promise<number>;
  convertToClient: (lead: Lead) => Promise<void>;
  setQuickReplies: React.Dispatch<React.SetStateAction<QuickReply[]>>;
  setContactType: (id: string, tipo: ContactType) => Promise<void>;
  linkClient: (leadId: string, client: Client, plan: LinkPlan) => Promise<boolean>;
  unlinkClient: (leadId: string, backToLead: boolean) => Promise<void>;
  setCampaigns: React.Dispatch<React.SetStateAction<Campaign[]>>;
}

const Ctx = createContext<ProspeccaoContextValue | null>(null);

export function useProspeccao() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProspeccao fora do ProspeccaoProvider");
  return ctx;
}

export function ProspeccaoProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const { currentUser } = useAuth();
  const [contacts, setLeads] = useState<Lead[]>([]);
  const leads = useMemo(() => contacts.filter((l) => (l.tipo ?? "lead") === "lead"), [contacts]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [l, q, c] = await Promise.all([
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      supabase.from("quick_replies").select("*").order("titulo"),
      supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
    ]);
    if (l.error) showToast("Erro ao carregar leads: " + l.error.message + " (a migration_prospeccao.sql foi executada?)", "error");
    setLeads((l.data || []) as Lead[]);
    setQuickReplies((q.data || []) as QuickReply[]);
    setCampaigns((c.data || []) as Campaign[]);
    setLoading(false);
  }, [showToast]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial dos dados
  useEffect(() => { reload(); }, [reload]);

  // Realtime: leads novos (webhook/site) e mudanças de mensagens não lidas.
  useEffect(() => {
    const channel = supabase
      .channel("prospeccao-leads")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, (payload) => {
        if (payload.eventType === "DELETE") {
          setLeads((prev) => prev.filter((x) => x.id !== (payload.old as Lead).id));
        } else {
          const row = payload.new as Lead;
          setLeads((prev) => (prev.some((x) => x.id === row.id) ? prev.map((x) => (x.id === row.id ? row : x)) : [row, ...prev]));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const logActivity = useCallback(
    async (lead_id: string, tipo: "estagio" | "conversao", descricao: string) => {
      await supabase.from("lead_activities").insert({ lead_id, tipo, descricao, user_id: currentUser?.id ?? null });
    },
    [currentUser?.id]
  );

  const createLead = useCallback(async (input: LeadInput) => {
    const key = phoneKey(input.telefone);
    const dup = key ? contacts.find((l) => phoneKey(l.telefone) === key) : null;
    if (dup) {
      showToast(`Já existe um lead com este número: ${dup.nome}.`, "error");
      return null;
    }
    const { data, error } = await supabase.from("leads").insert(input).select().single();
    if (error) {
      showToast(error.code === "23505" ? "Já existe um lead com este telefone." : "Erro ao criar lead: " + error.message, "error");
      return null;
    }
    setLeads((prev) => (prev.some((x) => x.id === data.id) ? prev : [data as Lead, ...prev]));
    showToast("Lead criado.", "success");
    return data as Lead;
  }, [contacts, showToast]);

  const updateLead = useCallback(async (id: string, patch: Partial<Lead>) => {
    const before = contacts;
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    const { error } = await supabase.from("leads").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) {
      setLeads(before);
      showToast("Erro ao atualizar lead: " + error.message, "error");
    }
  }, [contacts, showToast]);

  const moveLead = useCallback(async (id: string, stage: LeadStage) => {
    const lead = contacts.find((l) => l.id === id);
    if (!lead || lead.estagio === stage) return;
    await updateLead(id, { estagio: stage });
    await logActivity(id, "estagio", `${stageLabel(lead.estagio)} → ${stageLabel(stage)}`);
  }, [contacts, updateLead, logActivity]);

  const deleteLead = useCallback(async (id: string) => {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) return showToast("Erro ao excluir: " + error.message, "error");
    setLeads((prev) => prev.filter((l) => l.id !== id));
    showToast("Lead excluído.", "success");
  }, [showToast]);

  const importRows = useCallback(async (rows: ParsedLeadRow[]) => {
    const existing = new Set(contacts.map((l) => phoneKey(l.telefone)).filter(Boolean));
    const fresh = rows.filter((r) => !r.telefone || !existing.has(phoneKey(r.telefone)));
    if (!fresh.length) return 0;
    const { data, error } = await supabase.from("leads").insert(fresh.map((r) => ({ ...r, origem: r.origem ?? "csv" }))).select();
    if (error) {
      showToast("Erro na importação: " + error.message, "error");
      return 0;
    }
    setLeads((prev) => [...((data || []) as Lead[]), ...prev]);
    return data?.length ?? 0;
  }, [contacts, showToast]);

  const convertToClient = useCallback(async (lead: Lead) => {
    if (lead.client_id) return;
    const { data, error } = await supabase
      .from("clients")
      .insert({
        name: lead.razao_social || lead.empresa || lead.nome,
        nome_fantasia: lead.empresa || null,
        contact_name: lead.nome,
        cnpj: lead.cnpj ? maskCnpj(lead.cnpj) : "",
        email: lead.email || "",
        phone: lead.telefone ? maskPhone(lead.telefone) : "",
        setor: (lead.segmentos ?? []).join(", ") || null,
        servico_interesse: lead.servico_interesse || null,
        status: "active",
        ...(lead.cidade || lead.uf ? { address: { cep: "", logradouro: "", numero: "", bairro: "", cidade: lead.cidade ?? "", uf: lead.uf ?? "" } } : {}),
        ...(lead.instagram ? { social_access: { instagram: { usuario: lead.instagram } } } : {}),
      })
      .select("id")
      .single();
    if (error) return showToast("Erro ao criar o cliente: " + error.message, "error");
    await updateLead(lead.id, { client_id: data.id, tipo: "cliente", estagio: "ganho", classificado_em: new Date().toISOString() });
    await logActivity(lead.id, "conversao", "Convertido em cliente (cadastro novo criado)");
    showToast("Cliente criado e contato movido para Clientes.", "success");
  }, [updateLead, logActivity, showToast]);

  const setContactType = useCallback(async (id: string, tipo: ContactType) => {
    await updateLead(id, {
      tipo,
      classificado_em: new Date().toISOString(),
      ...(tipo === "lead" ? { estagio: "novo" as LeadStage } : {}),
      ...(["equipe", "ignorado"].includes(tipo) ? { unread_count: 0 } : {}),
    });
  }, [updateLead]);

  /**
   * Vincula o contato ao cliente: importa os dados escolhidos para o cadastro do cliente e para o lead,
   * muda o tipo para Cliente (sai do funil) e registra a conversão. Devolve false se algo falhar.
   */
  const linkClient = useCallback(async (leadId: string, client: Client, plan: LinkPlan) => {
    const clientUpdate: Partial<Client> = { ...plan.clientPatch };
    if (plan.notes.length) clientUpdate.notes = [...(client.notes ?? []), ...plan.notes];
    if (Object.keys(clientUpdate).length) {
      const { error } = await supabase.from("clients").update(clientUpdate).eq("id", client.id);
      if (error) { showToast("Erro ao atualizar o cadastro do cliente: " + error.message, "error"); return false; }
    }
    await updateLead(leadId, {
      ...plan.leadPatch,
      client_id: client.id,
      tipo: "cliente",
      estagio: "ganho",
      classificado_em: new Date().toISOString(),
    });
    const label = client.nome_fantasia?.trim() || client.name;
    const extra = plan.changed || plan.notes.length ? `; ${plan.changed} campo(s) e ${plan.notes.length} nota(s) importados` : "";
    await logActivity(leadId, "conversao", `Vinculado ao cliente ${label}${extra}`);
    showToast("Contato vinculado: agora é Cliente.", "success");
    return true;
  }, [updateLead, logActivity, showToast]);

  const unlinkClient = useCallback(async (leadId: string, backToLead: boolean) => {
    await updateLead(leadId, {
      client_id: null,
      ...(backToLead ? { tipo: "lead" as ContactType, estagio: "novo" as LeadStage, classificado_em: new Date().toISOString() } : {}),
    });
    await logActivity(leadId, "conversao", backToLead ? "Vínculo com o cliente removido (voltou a Lead)" : "Vínculo com o cliente removido");
  }, [updateLead, logActivity]);

  const value = useMemo(
    () => ({ leads, contacts, setContactType, linkClient, unlinkClient, quickReplies, campaigns, loading, reload, createLead, updateLead, moveLead, deleteLead, importRows, convertToClient, setQuickReplies, setCampaigns }),
    [leads, contacts, setContactType, linkClient, unlinkClient, quickReplies, campaigns, loading, reload, createLead, updateLead, moveLead, deleteLead, importRows, convertToClient]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
