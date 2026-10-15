"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyPoint } from "@/lib/instagramStats";

// Paleta categórica validada (light/dark) com scripts/validate_palette.js da skill dataviz.
// Ordem fixa: azul, laranja, verde-água. O verde-água fica abaixo de 3:1 no claro,
// então a tabela alternativa e o tooltip com rótulos são obrigatórios.
const SERIES = [
  { key: "contatos", label: "Novos contatos", cssVar: "--ig-series-1" },
  { key: "dms", label: "DMs entregues", cssVar: "--ig-series-2" },
  { key: "cliques", label: "Cliques no link", cssVar: "--ig-series-3" },
] as const;

export default function ActivityChart({ data }: { data: DailyPoint[] }) {
  const [asTable, setAsTable] = useState(false);
  const totals = SERIES.map((s) => data.reduce((n, p) => n + p[s.key], 0));
  const empty = totals.every((t) => t === 0);

  return (
    <div className="ig-chart flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-4 text-xs text-[var(--color-text-secondary)]" aria-label="Legenda">
          {SERIES.map((s, i) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-[3px] rounded-full" style={{ background: `var(${s.cssVar})` }} />
              {s.label}
              <span className="font-semibold text-[var(--color-text-primary)] tabular-nums">{totals[i]}</span>
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAsTable((v) => !v)}>
          {asTable ? "Ver gráfico" : "Ver tabela"}
        </button>
      </div>

      {asTable ? (
        <div className="table-container max-h-72 overflow-y-auto">
          <table className="table table-compact">
            <thead>
              <tr>
                <th>Dia</th>
                {SERIES.map((s) => (
                  <th key={s.key} data-numeric="">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((p) => (
                <tr key={p.date}>
                  <td>{p.label}</td>
                  {SERIES.map((s) => (
                    <td key={s.key} data-numeric="">
                      {p[s.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : empty ? (
        <p className="h-80 flex items-center justify-center text-xs text-[var(--color-text-secondary)] border border-dashed border-[var(--color-border-default)] rounded-xl">
          Sem atividade nos últimos 30 dias.
        </p>
      ) : (
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--color-border-default)" }}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ stroke: "var(--color-border-strong)", strokeWidth: 1 }}
                contentStyle={{
                  background: "var(--color-surface-raised)",
                  border: "1px solid var(--color-border-default)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--color-text-primary)",
                }}
                labelStyle={{ color: "var(--color-text-secondary)", marginBottom: 4 }}
              />
              {SERIES.map((s) => (
                <Line
                  key={s.key}
                  type="linear"
                  dataKey={s.key}
                  name={s.label}
                  stroke={`var(${s.cssVar})`}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--color-surface-raised)" }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
