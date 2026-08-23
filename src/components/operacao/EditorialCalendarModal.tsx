"use client";

import { useMemo, useState } from "react";
import { CalendarPlus, Sparkles } from "lucide-react";
import DialogShell from "@/components/DialogShell";
import { List, MediaType, Weekday } from "@/types/operacao";
import { useOperacao } from "./OperacaoProvider";
import { parseMonthRef, selectEditorialDates } from "@/mocks/operacao/editorialCalendar";
import { FIELD_MIDIA } from "@/mocks/operacao/templates";

const WEEKDAYS: { value: Weekday; label: string }[] = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

interface Props {
  list: List;
  isOpen: boolean;
  onClose: () => void;
  onGenerated?: (count: number) => void;
}

export default function EditorialCalendarModal({ list, isOpen, onClose, onGenerated }: Props) {
  const { generateEditorialCalendar } = useOperacao();
  const cfg = list.editorialConfig;

  const [postsPerWeek, setPostsPerWeek] = useState(cfg?.postsPerWeek ?? 3);
  const [weeks, setWeeks] = useState(cfg?.weeks ?? 4);
  const [weekdays, setWeekdays] = useState<Weekday[]>(cfg?.weekdays ?? [1, 3, 5]);
  const [channel, setChannel] = useState<MediaType>(cfg?.channels?.[0] ?? "FEED");
  const [monthRef, setMonthRef] = useState("2026-07");

  const preview = useMemo(() => {
    const { year, month0 } = parseMonthRef(monthRef);
    return selectEditorialDates(year, month0, postsPerWeek, weeks, weekdays);
  }, [monthRef, postsPerWeek, weeks, weekdays]);

  const toggleWeekday = (d: Weekday) =>
    setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));

  const handleGenerate = () => {
    const posts = generateEditorialCalendar({
      listId: list.id,
      monthRef,
      postsPerWeek,
      weeks,
      weekdays,
      channels: [channel],
      startFunnel: cfg?.startFunnel ?? "TOPO",
    });
    onGenerated?.(posts.length);
    onClose();
  };

  const inputStyle = { height: 40, width: "100%" } as const;

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      title="Gerar calendário editorial"
      maxWidth="560px"
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>
            {preview.length} demandas serão criadas
          </span>
          <button className="btn btn-accent" onClick={handleGenerate} disabled={preview.length === 0}>
            <Sparkles size={16} /> Gerar {preview.length} posts
          </button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Posts por semana">
            <input
              className="input-dark"
              type="number"
              min={1}
              max={14}
              value={postsPerWeek}
              onChange={(e) => setPostsPerWeek(Math.max(1, Number(e.target.value)))}
              style={inputStyle}
            />
          </Field>
          <Field label="Semanas">
            <input
              className="input-dark"
              type="number"
              min={1}
              max={6}
              value={weeks}
              onChange={(e) => setWeeks(Math.max(1, Number(e.target.value)))}
              style={inputStyle}
            />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Mês referente">
            <input
              className="input-dark"
              type="month"
              value={monthRef}
              onChange={(e) => setMonthRef(e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="Canal">
            <select className="input-dark" value={channel} onChange={(e) => setChannel(e.target.value as MediaType)} style={inputStyle}>
              {FIELD_MIDIA.options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Dias da semana">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {WEEKDAYS.map((d) => {
              const active = weekdays.includes(d.value);
              return (
                <button
                  key={d.value}
                  onClick={() => toggleWeekday(d.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    background: active ? "var(--accent)" : "var(--color-surface-sunken)",
                    color: active ? "#fff" : "var(--text-secondary)",
                    border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                  }}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </Field>

        {/* Preview */}
        <div
          style={{
            padding: 14,
            borderRadius: 14,
            background: "color-mix(in oklab, var(--accent) 6%, transparent)",
            border: "1px solid color-mix(in oklab, var(--accent) 20%, transparent)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CalendarPlus size={16} color="var(--accent)" />
            <span style={{ fontSize: "0.8rem", fontWeight: 800 }}>
              {postsPerWeek} × {weeks} semanas = {postsPerWeek * weeks} previstos · {preview.length} datas encontradas
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {preview.slice(0, 16).map((d) => (
              <span
                key={d}
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 6,
                  background: "var(--color-surface-sunken)",
                  color: "var(--text-secondary)",
                }}
              >
                {new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              </span>
            ))}
          </div>
        </div>
      </div>
    </DialogShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: "0.68rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-tertiary)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}
