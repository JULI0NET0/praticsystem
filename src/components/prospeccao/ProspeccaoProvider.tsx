"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/CustomToast";
import { useAuth } from "@/hooks/useAuth";
import { stageLabel, type ParsedLeadRow } from "@/lib/prospeccao/leads";
import type { Campaign, Lead, LeadStage, QuickReply } from "@/types/database";

type LeadInput = Partial<Omit<Lead, "id" | "created_at" | "updated_at">> & { nome: string };

interface ProspeccaoContextValue {
  leads: Lead[];
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
  const [leads, setLeads] = useState<Lead[]>([]);
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
    const { data, error } = await supabase.from("leads").insert(input).select().single();
    if (error) {
      showToast(error.code === "23505" ? "Já existe um lead com este telefone." : "Erro ao criar lead: " + error.message, "error");
      return null;
    }
    setLeads((prev) => (prev.some((x) => x.id === data.id) ? prev : [data as Lead, ...prev]));
    showToast("Lead criado.", "success");
    return data as Lead;
  }, [showToast]);

  const updateLead = useCallback(async (id: string, patch: Partial<Lead>) => {
    const before = leads;
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    const { error } = await supabase.from("leads").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) {
      setLeads(before);
      showToast("Erro ao atualizar lead: " + error.message, "error");
    }
  }, [leads, showToast]);

  const moveLead = useCallback(async (id: string, stage: LeadStage) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.estagio === stage) return;
    await updateLead(id, { estagio: stage });
    await logActivity(id, "estagio", `${stageLabel(lead.estagio)} → ${stageLabel(stage)}`);
  }, [leads, updateLead, logActivity]);

  const deleteLead = useCallback(async (id: string) => {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) return showToast("Erro ao excluir: " + error.message, "error");
    setLeads((prev) => prev.filter((l) => l.id !== id));
    showToast("Lead excluído.", "success");
  }, [showToast]);

  const importRows = useCallback(async (rows: ParsedLeadRow[]) => {
    const existing = new Set(leads.map((l) => l.telefone).filter(Boolean));
    const fresh = rows.filter((r) => !r.telefone || !existing.has(r.telefone));
    if (!fresh.length) return 0;
    const { data, error } = await supabase.from("leads").insert(fresh.map((r) => ({ ...r, origem: r.origem ?? "csv" }))).select();
    if (error) {
      showToast("Erro na importação: " + error.message, "error");
      return 0;
    }
    setLeads((prev) => [...((data || []) as Lead[]), ...prev]);
    return data?.length ?? 0;
  }, [leads, showToast]);

  const convertToClient = useCallback(async (lead: Lead) => {
    if (lead.client_id) return;
    const { data, error } = await supabase
      .from("clients")
      .insert({ name: lead.empresa || lead.nome, phone: lead.telefone, status: "prospect", servico_interesse: lead.servico_interesse })
      .select("id")
      .single();
    if (error) return showToast("Erro ao converter em cliente: " + error.message, "error");
    await updateLead(lead.id, { client_id: data.id });
    await logActivity(lead.id, "conversao", "Convertido em cliente");
    showToast("Cliente criado em Clientes.", "success");
  }, [updateLead, logActivity, showToast]);

  const value = useMemo(
    () => ({ leads, quickReplies, campaigns, loading, reload, createLead, updateLead, moveLead, deleteLead, importRows, convertToClient, setQuickReplies, setCampaigns }),
    [leads, quickReplies, campaigns, loading, reload, createLead, updateLead, moveLead, deleteLead, importRows, convertToClient]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
