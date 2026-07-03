"use client";

import { CustomValue, FieldDef } from "@/types/operacao";

interface Props {
  field: FieldDef;
  value: CustomValue;
  onChange: (value: CustomValue) => void;
}

export default function CustomFieldControl({ field, value, onChange }: Props) {
  const label = (
    <label
      style={{
        fontSize: "0.68rem",
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        color: "var(--text-tertiary)",
      }}
    >
      {field.label}
    </label>
  );

  if (field.type === "dropdown" || field.type === "label") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {label}
        <select
          className="input-dark"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          style={{ height: 40 }}
        >
          <option value="">—</option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const inputType = field.type === "date" ? "date" : field.type === "month" ? "text" : "text";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label}
      <input
        className="input-dark"
        type={inputType}
        value={(value as string) ?? ""}
        placeholder={field.type === "month" ? "Jul/2026" : ""}
        onChange={(e) => onChange(e.target.value || null)}
        style={{ height: 40 }}
      />
    </div>
  );
}
