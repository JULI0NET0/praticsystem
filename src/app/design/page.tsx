"use client";

/**
 * Style guide vivo — superfície de aceite dos primitivos.
 *
 * Existe porque o repo não tem teste visual nenhum: é aqui que se
 * responde "o escuro ainda tem contraste?" antes de 3.933 inline
 * styles passarem a depender dos primitivos.
 *
 * Os swatches leem os valores via getComputedStyle em vez de
 * hardcodar, então esta página não consegue divergir do theme.css.
 */

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  Users,
  Wallet,
  Clock,
  AlertTriangle,
  Inbox,
  Search,
  Plus,
} from "lucide-react";

import Button from "@/components/ui/Button";
import Badge, { type BadgeTone } from "@/components/ui/Badge";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import StatCard from "@/components/ui/StatCard";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Skeleton from "@/components/ui/Skeleton";
import { Field, Input, Select, Textarea, Checkbox, Switch } from "@/components/ui/Field";
import { CATEGORICAL_RAMP } from "@/lib/statusColors";

/* ------------------------------------------------------------------ */
/* Contraste — WCAG relative luminance                                 */
/* ------------------------------------------------------------------ */

function parseColor(value: string): [number, number, number] | null {
  const m = value.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
  if (parts.length < 3 || parts.some(Number.isNaN)) return null;
  return [parts[0], parts[1], parts[2]];
}

function luminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(fg: string, bg: string): number | null {
  const a = parseColor(fg);
  const b = parseColor(bg);
  if (!a || !b) return null;
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/* ------------------------------------------------------------------ */

const SURFACE_TOKENS = [
  "--color-surface-canvas",
  "--color-surface-raised",
  "--color-surface-sunken",
  "--color-surface-inset",
  "--color-border-subtle",
  "--color-border-default",
  "--color-border-strong",
];

const TEXT_TOKENS = [
  "--color-text-primary",
  "--color-text-secondary",
  "--color-text-tertiary",
  "--color-text-muted",
];

const ACCENT_TOKENS = [
  "--color-terracotta",
  "--color-terracotta-700",
  "--color-terracotta-800",
  "--color-terracotta-100",
  "--color-terracotta-200",
];

const SEMANTIC_TOKENS = [
  "--color-success",
  "--color-success-ink",
  "--color-success-wash",
  "--color-info",
  "--color-info-ink",
  "--color-info-wash",
  "--color-warning",
  "--color-warning-ink",
  "--color-warning-wash",
  "--color-danger",
  "--color-danger-ink",
  "--color-danger-wash",
];

const TONES: BadgeTone[] = [
  "neutral",
  "accent",
  "success",
  "warning",
  "danger",
  "info",
];

interface Row {
  cliente: string;
  plano: string;
  tone: BadgeTone;
  status: string;
  valor: string;
}

const ROWS: Row[] = [
  { cliente: "Cold Joias", plano: "Híbrido", tone: "success", status: "Ativo", valor: "R$ 4.850,00" },
  { cliente: "LOOOM Iluminação", plano: "Essencial", tone: "warning", status: "Pendente", valor: "R$ 1.200,00" },
  { cliente: "Bild Londrina", plano: "Enterprise", tone: "danger", status: "Pausado", valor: "R$ 12.300,50" },
  { cliente: "Thamires Arquitetura", plano: "Essencial", tone: "info", status: "Onboarding", valor: "R$ 890,00" },
];

const COLUMNS: Column<Row>[] = [
  { key: "cliente", header: "Cliente", render: (r) => r.cliente },
  { key: "plano", header: "Plano", render: (r) => r.plano },
  {
    key: "status",
    header: "Status",
    render: (r) => (
      <Badge tone={r.tone} dot>
        {r.status}
      </Badge>
    ),
  },
  { key: "valor", header: "Valor", numeric: true, render: (r) => r.valor },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2
        style={{
          fontSize: "var(--text-micro)",
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--color-text-tertiary)",
          marginBottom: 12,
          paddingBottom: 6,
          borderBottom: "1px solid var(--color-border-subtle)",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Swatches({ tokens }: { tokens: string[] }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    // rAF em vez de leitura síncrona: garante que o browser já aplicou
    // o CSS do tema novo antes de medirmos os valores computados.
    const id = requestAnimationFrame(() => {
      const cs = getComputedStyle(document.documentElement);
      const next: Record<string, string> = {};
      for (const t of tokens) next[t] = cs.getPropertyValue(t).trim();
      setValues(next);
    });
    return () => cancelAnimationFrame(id);
  }, [tokens, resolvedTheme]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
        gap: 8,
      }}
    >
      {tokens.map((t) => (
        <div
          key={t}
          className="surface"
          style={{ overflow: "hidden", padding: 0 }}
        >
          <div
            style={{
              height: 44,
              background: `var(${t})`,
              borderBottom: "1px solid var(--color-border-subtle)",
            }}
          />
          <div style={{ padding: "6px 8px" }}>
            <div
              style={{
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                color: "var(--color-text-secondary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {t.replace("--color-", "")}
            </div>
            <div
              style={{
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                color: "var(--color-text-tertiary)",
              }}
            >
              {values[t] || "—"}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Leitura de contraste real — a única forma de responder AA de verdade. */
function ContrastAudit() {
  const { resolvedTheme } = useTheme();
  const [rows, setRows] = useState<
    { fg: string; bg: string; ratio: number }[]
  >([]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
    const probe = document.createElement("div");
    document.body.appendChild(probe);
    const resolve = (token: string) => {
      probe.style.color = `var(${token})`;
      return getComputedStyle(probe).color;
    };

    const pairs: [string, string][] = [];
    for (const fg of TEXT_TOKENS) {
      for (const bg of ["--color-surface-canvas", "--color-surface-raised"]) {
        pairs.push([fg, bg]);
      }
    }
    pairs.push(["--color-success-ink", "--color-success-wash"]);
    pairs.push(["--color-info-ink", "--color-info-wash"]);
    pairs.push(["--color-warning-ink", "--color-warning-wash"]);
    pairs.push(["--color-danger-ink", "--color-danger-wash"]);
    // O par real de texto-sobre-wash é o -ink, não o -700 (que ficou
    // só para hover e borda, justamente por reprovar como texto).
    pairs.push(["--color-terracotta-ink", "--color-terracotta-100"]);
    // Rótulo do CTA sólido.
    pairs.push(["--color-text-on-accent", "--color-terracotta"]);
    pairs.push(["--color-text-on-accent", "--color-terracotta-hover-solid"]);
    pairs.push(["--color-text-on-danger", "--color-danger"]);

    const out = pairs.map(([fg, bg]) => ({
      fg,
      bg,
      ratio: contrast(resolve(fg), resolve(bg)) ?? 0,
    }));

      document.body.removeChild(probe);
      setRows(out);
    });
    return () => cancelAnimationFrame(id);
  }, [resolvedTheme]);

  return (
    <div className="table-container surface" style={{ overflow: "hidden" }}>
      <table className="table table-compact" style={{ minWidth: 0 }}>
        <thead>
          <tr>
            <th>Texto</th>
            <th>Sobre</th>
            <th data-numeric>Razão</th>
            <th>WCAG</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const aaa = r.ratio >= 7;
            const aa = r.ratio >= 4.5;
            const aaLarge = r.ratio >= 3;
            return (
              <tr key={`${r.fg}-${r.bg}`}>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                  {r.fg.replace("--color-", "")}
                </td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                  {r.bg.replace("--color-", "")}
                </td>
                <td data-numeric>{r.ratio.toFixed(2)}</td>
                <td>
                  <Badge
                    tone={aa ? "success" : aaLarge ? "warning" : "danger"}
                  >
                    {aaa ? "AAA" : aa ? "AA" : aaLarge ? "AA grande" : "reprova"}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function DesignSystemPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [density, setDensity] = useState<"standard" | "compact">("standard");
  const [switchOn, setSwitchOn] = useState(true);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  if (!mounted) return null;

  return (
    <div
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        padding: "32px 24px 96px",
        fontSize: "var(--text-ui)",
      }}
    >
      <PageHeader
        eyebrow="Sistema visual · v2"
        title="Design System"
        subtitle="Todo token e primitivo, nos dois temas e nas duas densidades."
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setDensity(density === "standard" ? "compact" : "standard")
              }
            >
              Densidade: {density === "standard" ? "padrão" : "compacta"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            >
              Tema: {resolvedTheme === "dark" ? "escuro" : "claro"}
            </Button>
          </>
        }
      />

      <Section title="Superfícies e bordas">
        <Swatches tokens={SURFACE_TOKENS} />
      </Section>

      <Section title="Texto">
        <Swatches tokens={TEXT_TOKENS} />
      </Section>

      <Section title="Acento">
        <Swatches tokens={ACCENT_TOKENS} />
      </Section>

      <Section title="Semântica">
        <Swatches tokens={SEMANTIC_TOKENS} />
      </Section>

      <Section title="Rampa categórica (kanban, séries de gráfico)">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {CATEGORICAL_RAMP.map((c) => (
            <div key={c} style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 56,
                  height: 36,
                  background: c,
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-border-subtle)",
                }}
              />
              <div
                style={{
                  fontSize: 9,
                  fontFamily: "var(--font-mono)",
                  color: "var(--color-text-tertiary)",
                  marginTop: 2,
                }}
              >
                {c}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Contraste (WCAG)">
        <ContrastAudit />
      </Section>

      <Section title="Botões">
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <Button variant="primary">Ação principal</Button>
          <Button variant="secondary">Secundário</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Excluir</Button>
          <Button variant="primary" loading>
            Salvando
          </Button>
          <Button variant="primary" disabled>
            Desativado
          </Button>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Button variant="primary" size="sm" leftIcon={<Plus size={13} />}>
            Pequeno
          </Button>
          <Button variant="primary">Padrão</Button>
          <Button variant="primary" size="lg">
            Grande
          </Button>
          <Button variant="secondary" size="icon" aria-label="Adicionar">
            <Plus size={15} />
          </Button>
        </div>
      </Section>

      <Section title="Badges">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {TONES.map((t) => (
            <Badge key={t} tone={t}>
              {t}
            </Badge>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {TONES.map((t) => (
            <Badge key={t} tone={t} dot>
              {t}
            </Badge>
          ))}
        </div>
      </Section>

      <Section title="Campos">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            maxWidth: 760,
          }}
        >
          <Field label="Nome do cliente" hint="Visível só para a equipe.">
            <Input placeholder="Ex.: Cold Joias" />
          </Field>
          <Field label="E-mail" error="Insira um e-mail válido.">
            <Input defaultValue="julio@agencia" invalid />
          </Field>
          <Field label="Plano">
            <Select defaultValue="hibrido">
              <option value="essencial">Essencial</option>
              <option value="hibrido">Híbrido</option>
              <option value="enterprise">Enterprise</option>
            </Select>
          </Field>
          <Field label="Observações">
            <Textarea placeholder="Descreva o caso..." />
          </Field>
          <Field label="Preferências">
            <Checkbox label="Notificações por e-mail" defaultChecked />
            <Switch
              checked={switchOn}
              onChange={setSwitchOn}
              label="Ativar assistente"
            />
          </Field>
          <Field label="Busca">
            <div className="search-wrapper">
              <input className="input-dark" placeholder="Buscar..." />
              <Search size={15} />
            </div>
          </Field>
        </div>
      </Section>

      <Section title="KPIs">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "var(--page-gap)",
          }}
        >
          <StatCard
            label="Demandas"
            value="18"
            icon={<Inbox size={15} />}
            trend="up"
            trendValue="+12%"
            density={density}
          />
          <StatCard
            label="Finalizadas"
            value="11"
            icon={<Users size={15} />}
            trend="down"
            trendValue="-4%"
            density={density}
          />
          <StatCard
            label="Tempo hoje"
            value="6,5"
            unit="hrs"
            icon={<Clock size={15} />}
            density={density}
          />
          <StatCard
            label="Receita"
            value="R$ 48.230"
            icon={<Wallet size={15} />}
            trend="up"
            trendValue="+8%"
            density={density}
          />
        </div>
      </Section>

      <Section title="Cards">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "var(--page-gap)",
          }}
        >
          <Card padding="none">
            <CardHeader
              icon={<Inbox size={15} />}
              title="Minhas demandas"
              count="12"
              action={
                <Button variant="ghost" size="sm">
                  Ver
                </Button>
              }
            />
            <CardBody>
              <p style={{ color: "var(--color-text-secondary)", margin: 0 }}>
                Cabeçalho de 40px com borda inferior — o padrão do mockup.
              </p>
            </CardBody>
          </Card>
          <Card>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Card simples</div>
            <p style={{ color: "var(--color-text-secondary)", margin: 0 }}>
              Superfície branca, borda de 1px, raio 12px. Sem sombra.
            </p>
          </Card>
          <Card sunken>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Rebaixado</div>
            <p style={{ color: "var(--color-text-secondary)", margin: 0 }}>
              Para blocos aninhados dentro de outro card.
            </p>
          </Card>
        </div>
      </Section>

      <Section title={`Tabela — densidade ${density}`}>
        <div className="surface" style={{ overflow: "hidden" }}>
          <DataTable
            columns={COLUMNS}
            rows={ROWS}
            rowKey={(r) => r.cliente}
            density={density}
          />
        </div>
      </Section>

      <Section title="Estado vazio">
        <EmptyState
          icon={<AlertTriangle size={28} strokeWidth={1.5} />}
          title="Nenhuma automação criada"
          description="Crie seu primeiro fluxo para começar a processar pedidos automaticamente."
          action={
            <Button variant="primary" size="sm">
              Criar automação
            </Button>
          }
        />
      </Section>

      <Section title="Carregando">
        <div style={{ maxWidth: 400 }}>
          <Skeleton lines={4} />
        </div>
      </Section>
    </div>
  );
}
