"use client";

import { Check, ChevronRight, Eye, Heart, MessageCircle, MousePointerClick, Radio, Send, Users, Workflow, Percent } from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import Badge from "@/components/ui/Badge";
import type { IgAutomation } from "@/lib/instagram";
import { describeLogEvent, type AutomationStats, type DailyPoint } from "@/lib/instagramStats";
import ActivityChart from "./ActivityChart";
import FollowersChart from "./FollowersChart";
import type { ProfileInsights } from "@/lib/instagramInsights";
import ContactAvatar, { contactTitle, SOURCE_LABEL, type IgContactView } from "./ContactAvatar";
import "./dashboard.css";

export interface DashboardCounts {
  contacts: number;
  newContacts7d: number;
  comments: number;
  sent: number;
  clicks: number;
}

interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  onClick: () => void;
}

interface Props {
  displayName: string;
  displayHandle: string;
  connected: boolean;
  counts: DashboardCounts;
  series: DailyPoint[];
  profile: ProfileInsights | null;
  automations: IgAutomation[];
  automationStats: Record<string, AutomationStats>;
  contacts: IgContactView[];
  logs: Array<{ id: string; level: "info" | "error"; event: string; created_at: string }>;
  checklist: ChecklistItem[];
  onOpenTab: (tab: "contacts" | "automations" | "results") => void;
  onEditAutomation: (a: IgAutomation) => void;
  onCreateAutomation: () => void;
}

export function timeAgo(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const min = Math.round(diff / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `há ${d} ${d === 1 ? "dia" : "dias"}`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

function pct(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

export default function HomeDashboard({
  displayName,
  displayHandle,
  connected,
  counts,
  series,
  profile,
  automations,
  automationStats,
  contacts,
  logs,
  checklist,
  onOpenTab,
  onEditAutomation,
  onCreateAutomation,
}: Props) {
  const activeAutomations = automations.filter((a) => a.is_active).length;
  const completed = checklist.filter((i) => i.completed).length;
  const recentActivity = logs
    .map((l) => ({ ...l, text: describeLogEvent(l.event) }))
    .filter((l): l is typeof l & { text: string } => !!l.text)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold text-[var(--color-text-primary)] tracking-tight">Olá, {displayName}!</h1>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
            <span
              className={`w-2 h-2 rounded-full ${connected ? "bg-[var(--color-success)]" : "bg-[var(--color-danger)]"}`}
            />
            {connected ? `Conectado como ${displayHandle}` : "Instagram desconectado"}
          </p>
        </div>
      </div>

      {profile && (
        <div className="grid gap-4 xl:grid-cols-3">
          <section aria-label="Seu perfil" className="grid grid-cols-2 gap-3 content-start">
            <StatCard label="Seguidores" value={profile.followers.toLocaleString("pt-BR")} icon={<Heart size={15} />} />
            <StatCard
              label="Novos seguidores"
              value={`${profile.newFollowers30d >= 0 ? "+" : ""}${profile.newFollowers30d}`}
              icon={<Users size={15} />}
              subtitle="últimos 30 dias"
            />
            <StatCard
              label="Alcance"
              value={profile.reach30d !== null ? profile.reach30d.toLocaleString("pt-BR") : "—"}
              icon={<Radio size={15} />}
              subtitle="contas alcançadas em 30 dias"
            />
            <StatCard
              label="Visitas ao perfil"
              value={profile.profileViews30d !== null ? profile.profileViews30d.toLocaleString("pt-BR") : "—"}
              icon={<Eye size={15} />}
              subtitle="últimos 30 dias"
            />
          </section>
          <section className="surface p-4 xl:col-span-2 space-y-1">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Novos seguidores por dia</h2>
            <FollowersChart data={profile.days} />
          </section>
        </div>
      )}

      <section aria-label="Números" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard
          label="Contatos"
          value={counts.contacts}
          icon={<Users size={15} />}
          subtitle={`+${counts.newContacts7d} nos últimos 7 dias`}
          onClick={() => onOpenTab("contacts")}
        />
        <StatCard label="Comentários captados" value={counts.comments} icon={<MessageCircle size={15} />} />
        <StatCard label="DMs entregues" value={counts.sent} icon={<Send size={15} />} />
        <StatCard label="Cliques no link" value={counts.clicks} icon={<MousePointerClick size={15} />} />
        <StatCard
          label="Conversão"
          value={pct(counts.clicks, counts.comments)}
          unit="%"
          icon={<Percent size={15} />}
          subtitle="cliques ÷ comentários"
          onClick={() => onOpenTab("results")}
        />
        <StatCard
          label="Automações ativas"
          value={activeAutomations}
          unit={`/ ${automations.length}`}
          icon={<Workflow size={15} />}
          onClick={() => onOpenTab("automations")}
        />
      </section>

      {completed < checklist.length && (
        <section className="surface p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Primeiros passos</h2>
            <span className="text-xs text-[var(--color-text-secondary)] tabular-nums">
              {completed} de {checklist.length}
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {checklist.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className="flex items-center gap-2.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)] p-3 text-left text-xs hover:border-[var(--color-border-strong)]"
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                    item.completed
                      ? "bg-[var(--color-success-wash)] text-[var(--color-success-ink)]"
                      : "border border-[var(--color-border-strong)]"
                  }`}
                >
                  {item.completed && <Check className="w-2.5 h-2.5" />}
                </span>
                <span
                  className={item.completed ? "text-[var(--color-text-secondary)] line-through" : "font-semibold text-[var(--color-text-primary)]"}
                >
                  {item.title}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="surface p-4 xl:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Atividade nos últimos 30 dias</h2>
          <ActivityChart data={series} />
        </section>

        <section className="surface p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Últimos contatos</h2>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onOpenTab("contacts")}>
              Ver todos <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {contacts.length === 0 ? (
            <p className="text-xs text-[var(--color-text-secondary)] py-6 text-center">Nenhum contato ainda.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-border-subtle)]">
              {contacts.slice(0, 7).map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-2.5">
                  <ContactAvatar contact={c} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate">{contactTitle(c)}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] truncate">
                      {c.username && c.name ? `${c.name} · ` : ""}
                      {c.source ? SOURCE_LABEL[c.source] : "Interação"}
                    </p>
                  </div>
                  <span className="text-xs text-[var(--color-text-secondary)] shrink-0">{timeAgo(c.last_seen_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="surface p-4 xl:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Suas automações</h2>
            <div className="flex gap-2">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => onOpenTab("automations")}>
                Ver todas
              </button>
              <button type="button" className="btn btn-accent btn-sm" onClick={onCreateAutomation}>
                Nova automação
              </button>
            </div>
          </div>
          {automations.length === 0 ? (
            <p className="text-xs text-[var(--color-text-secondary)] py-6 text-center">
              Nenhuma automação ainda. Crie a primeira para começar a captar contatos pelos comentários.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {automations.slice(0, 4).map((a) => {
                const s = automationStats[a.id] ?? { comments: 0, sent: 0, clicks: 0 };
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onEditAutomation(a)}
                    className="text-left rounded-lg border border-[var(--color-border-subtle)] p-3 hover:border-[var(--color-terracotta)] space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate">{a.name}</span>
                      <Badge tone={a.is_active ? "success" : "neutral"} dot>
                        {a.is_active ? "Ativa" : "Pausada"}
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] truncate">
                      {(a.keywords || []).map((k) => `#${k}`).join(" ")}
                    </p>
                    <dl className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <dt className="text-[var(--color-text-secondary)]">Comentários</dt>
                        <dd className="font-semibold tabular-nums text-[var(--color-text-primary)]">{s.comments}</dd>
                      </div>
                      <div>
                        <dt className="text-[var(--color-text-secondary)]">DMs</dt>
                        <dd className="font-semibold tabular-nums text-[var(--color-text-primary)]">{s.sent}</dd>
                      </div>
                      <div>
                        <dt className="text-[var(--color-text-secondary)]">Cliques</dt>
                        <dd className="font-semibold tabular-nums text-[var(--color-text-primary)]">
                          {s.clicks} <span className="text-[var(--color-text-secondary)] font-normal">({pct(s.clicks, s.comments)}%)</span>
                        </dd>
                      </div>
                    </dl>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="surface p-4 space-y-3">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Atividade recente</h2>
          {recentActivity.length === 0 ? (
            <p className="text-xs text-[var(--color-text-secondary)] py-6 text-center">Nada por aqui ainda.</p>
          ) : (
            <ul className="space-y-2.5">
              {recentActivity.map((l) => (
                <li key={l.id} className="flex items-start gap-2 text-xs">
                  <span
                    className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                      l.level === "error" ? "bg-[var(--color-danger)]" : "bg-[var(--color-success)]"
                    }`}
                  />
                  <span className={`flex-1 ${l.level === "error" ? "text-[var(--color-danger-ink)]" : "text-[var(--color-text-primary)]"}`}>
                    {l.text}
                  </span>
                  <span className="text-[var(--color-text-secondary)] shrink-0">{timeAgo(l.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
