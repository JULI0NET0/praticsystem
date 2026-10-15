"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/CustomToast";
import { IG_MESSAGE_VARS } from "@/lib/instagramVars";
import MaterialPickerField from "../automation-editor/MaterialPickerField";

interface Form {
  welcome_enabled: boolean;
  welcome_text: string;
  welcome_button_text: string;
  welcome_button_url: string;
}

const EMPTY: Form = { welcome_enabled: false, welcome_text: "", welcome_button_text: "", welcome_button_url: "" };

export default function WelcomeSettings() {
  const { showToast } = useToast();
  const [form, setForm] = useState<Form>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/instagram/settings", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!alive) return;
        if (!res.ok) {
          setBlocked(data.error || "Erro ao carregar as configurações.");
        } else if (data.settings) {
          setForm({
            welcome_enabled: !!data.settings.welcome_enabled,
            welcome_text: data.settings.welcome_text || "",
            welcome_button_text: data.settings.welcome_button_text || "",
            welcome_button_url: data.settings.welcome_button_url || "",
          });
        }
        setLoaded(true);
      })
      .catch(() => alive && setBlocked("Erro de conexão ao carregar as configurações."));
    return () => {
      alive = false;
    };
  }, []);

  async function save(next: Form) {
    setSaving(true);
    try {
      const res = await fetch("/api/instagram/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar.");
      setForm(next);
      showToast(next.welcome_enabled ? "Boas-vindas ativas." : "Boas-vindas salvas (desativadas).", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), "error");
    } finally {
      setSaving(false);
    }
  }

  const patch = (p: Partial<Form>) => setForm((f) => ({ ...f, ...p }));

  return (
    <section className="surface p-5 space-y-4" aria-labelledby="welcome-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="welcome-title" className="text-sm font-semibold text-[var(--color-text-primary)]">
            Boas-vindas automáticas
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 max-w-xl">
            Enviada uma única vez para quem manda a primeira DM para o perfil. O Instagram não avisa quando alguém
            novo começa a seguir, então não dá para mandar só por seguir.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-primary)] cursor-pointer">
          <input
            type="checkbox"
            checked={form.welcome_enabled}
            disabled={!loaded || !!blocked || saving}
            onChange={(e) => save({ ...form, welcome_enabled: e.target.checked })}
            className="w-4 h-4 accent-[var(--color-terracotta)]"
          />
          {form.welcome_enabled ? "Ativa" : "Desativada"}
        </label>
      </div>

      {blocked ? (
        <p className="text-xs rounded-lg border border-[var(--color-warning)] bg-[var(--color-warning-wash)] text-[var(--color-warning-ink)] px-3 py-2">
          {blocked}
        </p>
      ) : (
        <form
          className="space-y-4 text-xs"
          onSubmit={(e) => {
            e.preventDefault();
            save(form);
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor="welcome-text" className="block font-bold text-[var(--color-text-primary)]">
              Mensagem
            </label>
            <textarea
              id="welcome-text"
              rows={4}
              maxLength={1000}
              value={form.welcome_text}
              onChange={(e) => patch({ welcome_text: e.target.value })}
              placeholder="Oi {first_name|tudo bem}! Que bom te ver por aqui. Me conta: o que você quer aprender sobre IA?"
              className="input-dark resize-y"
              disabled={!loaded}
            />
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--color-text-secondary)]">
              <span>Variáveis:</span>
              {IG_MESSAGE_VARS.map((v) => (
                <button
                  key={v.tag}
                  type="button"
                  title={v.label}
                  onClick={() => patch({ welcome_text: `${form.welcome_text}${v.tag}` })}
                  className="btn btn-ghost btn-sm font-mono"
                >
                  {v.tag}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="welcome-btn" className="block font-bold text-[var(--color-text-primary)]">
                Texto do botão (opcional)
              </label>
              <input
                id="welcome-btn"
                value={form.welcome_button_text}
                onChange={(e) => patch({ welcome_button_text: e.target.value })}
                placeholder="Ex: Ver materiais gratuitos"
                className="input-dark"
                disabled={!loaded}
              />
            </div>
            <MaterialPickerField
              url={form.welcome_button_url}
              linkedMaterialId={null}
              onChange={(url) => patch({ welcome_button_url: url })}
            />
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn btn-accent" disabled={!loaded || saving}>
              {saving ? "Salvando..." : "Salvar boas-vindas"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
