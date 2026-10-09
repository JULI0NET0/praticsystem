"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, ExternalLink, GitCompare, Link2Off, UserCheck } from "lucide-react";
import Combobox, { type ComboboxOption } from "@/components/ui/Combobox";
import DialogShell from "@/components/DialogShell";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/CustomToast";
import { formatPhone, normalizePhone } from "@/lib/prospeccao/leads";
import { useProspeccao, type LinkPlan } from "./ProspeccaoProvider";
import ClientMergeDialog from "./ClientMergeDialog";
import type { Client, Lead, LeadActivity } from "@/types/database";

interface ClientRow {
  id: string;
  name: string;
  nome_fantasia?: string | null;
  phone?: string | null;
}

const labelOf = (c: Pick<ClientRow, "name" | "nome_fantasia">) => c.nome_fantasia?.trim() || c.name;

/**
 * Liga o contato a um cliente já cadastrado: abre "Conferir dados", importa o que for escolhido
 * e o contato passa a ser Cliente. Com vínculo, mostra o cliente e permite reconferir os dados.
 */
export default function ClientLinker({ lead }: { lead: Lead }) {
  const { linkClient, unlinkClient, convertToClient } = useProspeccao();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  const [merge, setMerge] = useState<{ client: Client; activities: LeadActivity[] } | null>(null);
  const [unlinking, setUnlinking] = useState(false);
  const [busy, setBusy] = useState(false);

  // Os clientes carregam ao montar (a tabela é pequena): assim o seletor já abre com a lista pronta.
  useEffect(() => {
    let alive = true;
    supabase.from("clients").select("id, name, nome_fantasia, phone").order("name").then(({ data, error }) => {
      if (!alive) return;
      if (error) setLoadError(error.message);
      setClients((data || []) as ClientRow[]);
      setLoaded(true);
    });
    return () => { alive = false; };
  }, []);

  const linked = lead.client_id ? clients.find((c) => c.id === lead.client_id) : null;
  const options = useMemo<ComboboxOption[]>(
    () => clients.map((c) => {
      const n = c.phone ? normalizePhone(c.phone) : null;
      return {
        value: c.id,
        label: labelOf(c),
        keywords: `${c.name} ${c.phone ?? ""}`,
        description: [c.name !== labelOf(c) ? c.name : null, n ? formatPhone(n) : null].filter(Boolean).join(" · ") || undefined,
        icon: <Building2 size={14} />,
      };
    }),
    [clients]
  );

  // Carrega o cadastro completo e as observações do lead para montar a conferência.
  const openMerge = async (clientId: string) => {
    setBusy(true);
    const [c, a] = await Promise.all([
      supabase.from("clients").select("*").eq("id", clientId).single(),
      supabase.from("lead_activities").select("*").eq("lead_id", lead.id).eq("tipo", "nota"),
    ]);
    setBusy(false);
    if (c.error || !c.data) return showToast("Não foi possível abrir o cadastro do cliente: " + (c.error?.message ?? ""), "error");
    setMerge({ client: c.data as Client, activities: (a.data || []) as LeadActivity[] });
  };

  const confirmMerge = async (plan: LinkPlan) => {
    if (!merge) return;
    setBusy(true);
    const ok = await linkClient(lead.id, merge.client, plan);
    setBusy(false);
    if (ok) { setMerge(null); setChanging(false); }
  };

  const unlink = async (backToLead: boolean) => {
    setBusy(true);
    await unlinkClient(lead.id, backToLead);
    setBusy(false);
    setUnlinking(false);
  };

  return (
    <div className="pp-linker">
      {lead.client_id && !changing ? (
        <div className="pp-linker-card">
          <span className="pp-linker-icon"><Building2 size={16} /></span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="pp-linker-name">{linked ? labelOf(linked) : "Cliente vinculado"}</div>
            <Link href={`/admin/clients/${lead.client_id}`} className="pp-linker-link">Abrir cadastro do cliente <ExternalLink size={11} /></Link>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={() => openMerge(lead.client_id!)} disabled={busy} aria-label="Conferir dados com o cliente" title="Conferir dados com o cliente"><GitCompare size={15} /></button>
          <button className="btn btn-ghost btn-sm" onClick={() => setChanging(true)}>Trocar</button>
          <button className="btn btn-ghost btn-icon" onClick={() => setUnlinking(true)} aria-label="Desvincular cliente" title="Desvincular"><Link2Off size={15} /></button>
        </div>
      ) : (
        <>
          <Combobox
            options={options}
            value={null}
            onChange={(id) => { if (id) openMerge(id); }}
            placeholder={loaded ? "Vincular a cliente existente" : "Carregando clientes…"}
            searchPlaceholder="Buscar por nome, razão social ou telefone"
            searchThreshold={0}
            ariaLabel="Vincular a cliente existente"
          />
          {loaded && loadError && <div className="pp-hint" style={{ color: "var(--color-danger)" }}>Não foi possível carregar os clientes: {loadError}</div>}
          {loaded && !loadError && clients.length === 0 && <div className="pp-hint">Nenhum cliente cadastrado ainda.</div>}
          <div className="pp-linker-actions">
            {changing && <button className="btn btn-ghost btn-sm" onClick={() => setChanging(false)}>Cancelar</button>}
            {!lead.client_id && <button className="btn btn-ghost btn-sm" onClick={() => convertToClient(lead)}><UserCheck size={13} /> Criar novo cliente com estes dados</button>}
          </div>
          <div className="pp-hint">Ao vincular, o contato passa a ser <strong>Cliente</strong> e você confere os dados que serão importados.</div>
        </>
      )}

      {merge && (
        <ClientMergeDialog
          lead={lead}
          client={merge.client}
          activities={merge.activities}
          author={currentUser?.name ?? "Equipe"}
          confirmLabel={lead.client_id === merge.client.id ? "Aplicar" : "Vincular e importar"}
          busy={busy}
          onCancel={() => setMerge(null)}
          onConfirm={confirmMerge}
        />
      )}

      {unlinking && (
        <DialogShell isOpen onClose={() => setUnlinking(false)} title="Desvincular cliente" maxWidth="480px"
          footer={<><button className="btn btn-secondary" onClick={() => setUnlinking(false)} disabled={busy}>Cancelar</button><button className="btn btn-secondary" onClick={() => unlink(false)} disabled={busy}>Só desvincular</button>{lead.tipo === "cliente" && <button className="btn btn-accent" onClick={() => unlink(true)} disabled={busy}>Desvincular e voltar a Lead</button>}</>}>
          <p style={{ margin: 0, fontSize: "var(--text-ui)", lineHeight: 1.5 }}>O cadastro do cliente não é apagado. {lead.tipo === "cliente" ? "Este contato está como Cliente: você pode devolvê-lo ao funil." : ""}</p>
        </DialogShell>
      )}
    </div>
  );
}
