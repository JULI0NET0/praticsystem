"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, ExternalLink, Link2Off, UserCheck } from "lucide-react";
import Combobox, { type ComboboxOption } from "@/components/ui/Combobox";
import DialogShell from "@/components/DialogShell";
import { supabase } from "@/lib/supabase";
import { formatPhone } from "@/lib/prospeccao/leads";
import { useProspeccao } from "./ProspeccaoProvider";
import type { Lead } from "@/types/database";

interface ClientRow {
  id: string;
  name: string;
  nome_fantasia?: string | null;
  phone?: string | null;
}

const labelOf = (c: ClientRow) => c.nome_fantasia?.trim() || c.name;

/** Liga o contato a um cliente já cadastrado (ou mostra o vínculo atual, com link para o cliente). */
export default function ClientLinker({ lead }: { lead: Lead }) {
  const { linkClient, unlinkClient, convertToClient } = useProspeccao();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [changing, setChanging] = useState(false);
  const [picked, setPicked] = useState<ClientRow | null>(null);
  const [unlinking, setUnlinking] = useState(false);
  const [busy, setBusy] = useState(false);

  // Clientes só são buscados quando precisam: vínculo existente ou usuário abrindo o seletor.
  const needClients = Boolean(lead.client_id) || changing;
  useEffect(() => {
    if (!needClients || loaded) return;
    let alive = true;
    supabase.from("clients").select("id, name, nome_fantasia, phone").order("name").then(({ data }) => {
      if (!alive) return;
      setClients((data || []) as ClientRow[]);
      setLoaded(true);
    });
    return () => { alive = false; };
  }, [needClients, loaded]);

  const linked = lead.client_id ? clients.find((c) => c.id === lead.client_id) : null;
  const options = useMemo<ComboboxOption[]>(
    () => clients.map((c) => ({
      value: c.id,
      label: labelOf(c),
      keywords: `${c.name} ${c.phone ?? ""}`,
      description: [c.name !== labelOf(c) ? c.name : null, c.phone ? formatPhone(c.phone.replace(/\D/g, "").length <= 11 ? `55${c.phone.replace(/\D/g, "")}` : c.phone.replace(/\D/g, "")) : null].filter(Boolean).join(" · ") || undefined,
      icon: <Building2 size={14} />,
    })),
    [clients]
  );

  const choose = async (moveToClients: boolean) => {
    if (!picked) return;
    setBusy(true);
    await linkClient(lead.id, { id: picked.id, label: labelOf(picked) }, moveToClients);
    setBusy(false);
    setPicked(null);
    setChanging(false);
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
          <button className="btn btn-ghost btn-sm" onClick={() => setChanging(true)}>Trocar</button>
          <button className="btn btn-ghost btn-icon" onClick={() => setUnlinking(true)} aria-label="Desvincular cliente" title="Desvincular"><Link2Off size={15} /></button>
        </div>
      ) : (
        <>
          <Combobox
            options={options}
            value={null}
            onChange={(id) => { const c = clients.find((x) => x.id === id); if (c) setPicked(c); }}
            placeholder={loaded || !needClients ? "Vincular a cliente existente" : "Carregando clientes…"}
            searchPlaceholder="Buscar por nome, razão social ou telefone"
            searchThreshold={0}
            ariaLabel="Vincular a cliente existente"
          />
          <div className="pp-linker-actions">
            {changing && <button className="btn btn-ghost btn-sm" onClick={() => setChanging(false)}>Cancelar</button>}
            {!lead.client_id && <button className="btn btn-ghost btn-sm" onClick={() => convertToClient(lead)}><UserCheck size={13} /> Criar novo cliente com estes dados</button>}
          </div>
          <div className="pp-hint">Ao vincular, você escolhe se o contato vai para <strong>Clientes</strong> ou continua como lead.</div>
        </>
      )}

      {picked && (
        <DialogShell isOpen onClose={() => setPicked(null)} title={`Vincular a ${labelOf(picked)}`} maxWidth="480px"
          footer={<><button className="btn btn-secondary" onClick={() => setPicked(null)} disabled={busy}>Cancelar</button><button className="btn btn-secondary" onClick={() => choose(false)} disabled={busy}>Manter como lead</button><button className="btn btn-accent" onClick={() => choose(true)} disabled={busy}>Mover para Clientes</button></>}>
          <p style={{ margin: 0, fontSize: "var(--text-ui)", lineHeight: 1.5 }}>
            <strong>{lead.nome}</strong> será ligado ao cadastro de <strong>{labelOf(picked)}</strong>.
            Mover para Clientes tira o contato do funil e das campanhas de leads. Manter como lead só cria o vínculo.
          </p>
        </DialogShell>
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
