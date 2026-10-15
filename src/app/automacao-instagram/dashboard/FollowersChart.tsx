"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ProfileDay } from "@/lib/instagramInsights";

// Série única (novos seguidores por dia): sem legenda, o título nomeia. Cor = slot 1 da
// paleta validada (ver dashboard.css), sempre a mesma do "Novos contatos" do outro gráfico.
export default function FollowersChart({ data }: { data: ProfileDay[] }) {
  const [asTable, setAsTable] = useState(false);

  return (
    <div className="ig-chart flex flex-col gap-3">
      <div className="flex justify-end">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAsTable((v) => !v)}>
          {asTable ? "Ver gráfico" : "Ver tabela"}
        </button>
      </div>
      {asTable ? (
        <div className="table-container max-h-56 overflow-y-auto">
          <table className="table table-compact">
            <thead>
              <tr>
                <th>Dia</th>
                <th data-numeric="">Novos seguidores</th>
                <th data-numeric="">Alcance</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((d) => (
                <tr key={d.date}>
                  <td>{d.label}</td>
                  <td data-numeric="">{d.seguidores}</td>
                  <td data-numeric="">{d.alcance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
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
                cursor={{ fill: "var(--color-surface-sunken)" }}
                contentStyle={{
                  background: "var(--color-surface-raised)",
                  border: "1px solid var(--color-border-default)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--color-text-primary)",
                }}
                labelStyle={{ color: "var(--color-text-secondary)", marginBottom: 4 }}
              />
              <Bar dataKey="seguidores" name="Novos seguidores" fill="var(--ig-series-1)" radius={[4, 4, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
