"use client";

import { useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import DataTable from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/components/CustomToast";
import ContactAvatar, { contactTitle, SOURCE_LABEL, type IgContactView } from "./ContactAvatar";
import { timeAgo } from "./HomeDashboard";

type Filter = "all" | "followers" | "unidentified";

export default function ContactsView({ contacts, total }: { contacts: IgContactView[]; total: number }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [syncing, setSyncing] = useState(false);

  const unidentified = contacts.filter((c) => !c.username && !c.name).length;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^@/, "");
    return contacts.filter((c) => {
      if (filter === "followers" && !c.is_follower) return false;
      if (filter === "unidentified" && (c.username || c.name)) return false;
      if (!q) return true;
      return [c.username, c.name, c.igsid].some((v) => v?.toLowerCase().includes(q));
    });
  }, [contacts, query, filter]);

  async function syncProfiles() {
    setSyncing(true);
    try {
      let remaining = 0;
      let updated = 0;
      // Lotes de 25 até acabar (ou até 8 rodadas, para não prender a tela).
      for (let round = 0; round < 8; round++) {
        const res = await fetch("/api/instagram/contacts/backfill", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao atualizar perfis.");
        updated += data.updated;
        remaining = data.remaining;
        if (remaining === 0 || data.updated + data.failed === 0) break;
      }
      showToast(
        remaining > 0
          ? `${updated} perfis atualizados. Faltam ${remaining}; clique de novo para continuar.`
          : `${updated} perfis atualizados.`,
        "success"
      );
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), "error");
    } finally {
      setSyncing(false);
    }
  }

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: `Todos (${contacts.length})` },
    { id: "followers", label: `Seguidores (${contacts.filter((c) => c.is_follower).length})` },
    { id: "unidentified", label: `Sem perfil (${unidentified})` },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Contatos ({total})</h1>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
            Quem comentou, mandou direct ou tocou em um botão das suas automações.
          </p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={syncProfiles} disabled={syncing}>
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Atualizando..." : "Atualizar perfis"}
        </button>
      </div>

      {unidentified > 0 && (
        <p className="text-xs rounded-lg border border-[var(--color-info)] bg-[var(--color-info-wash)] text-[var(--color-info-ink)] px-3 py-2">
          {unidentified} contatos ainda sem @ ou nome. Use “Atualizar perfis” para buscar no Instagram. Perfis que nunca
          mandaram direct podem não liberar esses dados.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1" role="group" aria-label="Filtro de contatos">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`btn btn-sm ${filter === f.id ? "btn-secondary" : "btn-ghost"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Buscar contato</span>
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por @, nome ou ID"
            className="input-dark pl-8"
          />
        </label>
      </div>

      <DataTable<IgContactView>
        rows={rows}
        rowKey={(c) => c.id}
        empty={<EmptyState title="Nenhum contato encontrado" description="Ajuste a busca ou o filtro." compact />}
        columns={[
          {
            key: "contact",
            header: "Contato",
            render: (c) => (
              <div className="flex items-center gap-3 min-w-0">
                <ContactAvatar contact={c} />
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--color-text-primary)] truncate">{contactTitle(c)}</p>
                  <p className="text-xs text-[var(--color-text-secondary)] truncate">
                    {c.username && c.name ? c.name : `ID ${c.igsid}`}
                  </p>
                </div>
              </div>
            ),
          },
          {
            key: "source",
            header: "Origem",
            render: (c) => (c.source ? SOURCE_LABEL[c.source] : "—"),
          },
          {
            key: "follower",
            header: "Segue você",
            render: (c) =>
              c.is_follower === true ? (
                <Badge tone="success" dot>
                  Segue
                </Badge>
              ) : c.is_follower === false ? (
                <Badge tone="neutral">Não segue</Badge>
              ) : (
                <span className="text-[var(--color-text-secondary)]">—</span>
              ),
          },
          {
            key: "interactions",
            header: "Interações",
            numeric: true,
            // Contatos anteriores à contagem de interações ficam sem número.
            render: (c) => (c.interactions ? c.interactions : "—"),
          },
          {
            key: "first",
            header: "Primeiro contato",
            render: (c) => new Date(c.first_seen_at).toLocaleDateString("pt-BR"),
          },
          {
            key: "last",
            header: "Última interação",
            render: (c) => (
              <span title={new Date(c.last_seen_at).toLocaleString("pt-BR")}>{timeAgo(c.last_seen_at)}</span>
            ),
          },
        ]}
      />
      {total > contacts.length && (
        <p className="text-xs text-[var(--color-text-secondary)]">
          Mostrando os {contacts.length} contatos com interação mais recente.
        </p>
      )}
    </div>
  );
}
