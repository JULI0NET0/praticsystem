"use client";

import { forwardRef, useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ */
/* Field — label + hint + erro                                         */
/* ------------------------------------------------------------------ */

export interface FieldProps {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  /** Erro nunca depende só de cor — sempre acompanha texto. */
  error?: string;
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  required,
  children,
  className,
}: FieldProps) {
  return (
    <div
      className={cn(className)}
      style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}
    >
      {label && (
        <label
          htmlFor={htmlFor}
          style={{
            fontSize: "var(--text-caption)",
            fontWeight: 600,
            color: "var(--color-text-secondary)",
          }}
        >
          {label}
          {required && (
            <span style={{ color: "var(--color-danger)" }}> *</span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <span
          style={{
            fontSize: "var(--text-micro)",
            color: "var(--color-danger-ink)",
          }}
        >
          {error}
        </span>
      ) : (
        hint && (
          <span
            style={{
              fontSize: "var(--text-micro)",
              color: "var(--color-text-tertiary)",
            }}
          >
            {hint}
          </span>
        )
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Input                                                               */
/* ------------------------------------------------------------------ */

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, className, style, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn("input-dark", className)}
      style={
        invalid
          ? { borderColor: "var(--color-danger)", ...style }
          : style
      }
      {...props}
    />
  );
});

/* ------------------------------------------------------------------ */
/* Textarea                                                            */
/* ------------------------------------------------------------------ */

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, style, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn("input-dark", className)}
      style={{ resize: "vertical", minHeight: 76, ...style }}
      {...props}
    />
  );
});

/* ------------------------------------------------------------------ */
/* Select                                                              */
/* ------------------------------------------------------------------ */

/**
 * `data-ui` isenta este select da regra de elemento em components.css
 * (que atinge todo <select> da app, inclusive dentro do FullCalendar
 * e do TipTap). A seta é um ícone lucide posicionado, não o data-URI
 * base64 — assim ela acompanha o tema de verdade.
 */
export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, style, children, ...props }, ref) {
  return (
    <div style={{ position: "relative", display: "flex", minWidth: 0 }}>
      <select
        ref={ref}
        data-ui
        className={cn("input-dark", className)}
        style={{ paddingRight: 30, cursor: "pointer", ...style }}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={15}
        aria-hidden
        style={{
          position: "absolute",
          right: 9,
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--color-text-tertiary)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Checkbox / Switch                                                   */
/* ------------------------------------------------------------------ */

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
}

export function Checkbox({ label, id, className, ...props }: CheckboxProps) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <div
      className={cn(className)}
      style={{ display: "flex", alignItems: "center", gap: 8 }}
    >
      <input
        id={inputId}
        type="checkbox"
        style={{
          width: 15,
          height: 15,
          accentColor: "var(--accent)",
          cursor: "pointer",
        }}
        {...props}
      />
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: "var(--text-ui)",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
          }}
        >
          {label}
        </label>
      )}
    </div>
  );
}

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  id?: string;
}

export function Switch({ checked, onChange, label, disabled, id }: SwitchProps) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button
        id={inputId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        style={{
          width: 34,
          height: 20,
          flexShrink: 0,
          borderRadius: "var(--radius-full)",
          background: checked
            ? "var(--accent)"
            : "var(--color-border-default)",
          position: "relative",
          transition: "background var(--duration-fast) var(--ease-standard)",
          opacity: disabled ? 0.45 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: checked ? 16 : 2,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#fff",
            transition: "left var(--duration-fast) var(--ease-standard)",
          }}
        />
      </button>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: "var(--text-ui)",
            color: "var(--color-text-secondary)",
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          {label}
        </label>
      )}
    </div>
  );
}

export default Field;
