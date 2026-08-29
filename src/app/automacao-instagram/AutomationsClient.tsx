"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/CustomToast";
import type { IgAutomation, IgConfig } from "@/lib/instagram";

interface LogRow {
  id: string;
  level: "info" | "error";
  event: string;
  payload: unknown;
  created_at: string;
}

interface Props {
  initialConfig: IgConfig | null;
  initialAutomations: IgAutomation[];
  initialLogs: LogRow[];
  queueStats: { pending: number; failed: number };
}

const emptyForm = {
  name: "",
  keywords: "",
  match_mode: "contains" as "contains" | "exact",
  post_id: "",
  comment_reply_text: "",
  dm_message_text: "",
  dm_button_text: "",
  dm_button_url: "",
  is_active: true,
};

export default function AutomationsClient({
  initialConfig,
  initialAutomations,
  initialLogs,
  queueStats,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [config] = useState(initialConfig);
  const [automations, setAutomations] = useState(initialAutomations);
  const [logs] = useState(initialLogs);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [now] = useState(() => Date.now());

  const tokenExpiresInDays = config
    ? Math.max(0, Math.ceil((new Date(config.token_expires_at).getTime() - now) / 86400000))
    : null;

  useEffect(() => {
    if (searchParams.get("ig_connected")) {
      showToast("Instagram conectado com sucesso!", "success");
      router.replace("/automacao-instagram");
    }
    const err = searchParams.get("ig_error");
    if (err) {
      showToast(`Erro ao conectar: ${decodeURIComponent(err)}`, "error");
      router.replace("/automacao-instagram");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreateForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(automation: IgAutomation) {
    setForm({
      name: automation.name,
      keywords: (automation.keywords || []).join(", "),
      match_mode: automation.match_mode,
      post_id: automation.post_id || "",
      comment_reply_text: automation.comment_reply_text || "",
      dm_message_text: automation.dm_message_text,
      dm_button_text: automation.dm_button_text || "",
      dm_button_url: automation.dm_button_url || "",
      is_active: automation.is_active,
    });
    setEditingId(automation.id);
    setShowForm(true);
  }

  async function handleSave() {
    const keywords = form.keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    if (!form.name || keywords.length === 0 || !form.dm_message_text) {
      showToast("Preencha nome, palavras-chave e a mensagem da DM.", "error");
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name,
      keywords,
      match_mode: form.match_mode,
      post_id: form.post_id || null,
      comment_reply_text: form.comment_reply_text || null,
      dm_message_text: form.dm_message_text,
      dm_button_text: form.dm_button_text || null,
      dm_button_url: form.dm_button_url || null,
      is_active: form.is_active,
    };

    try {
      const res = await fetch(
        editingId ? `/api/instagram/automations/${editingId}` : "/api/instagram/automations",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar.");

      if (editingId) {
        setAutomations((prev) => prev.map((a) => (a.id === editingId ? data.automation : a)));
        showToast("Automação atualizada!", "success");
      } else {
        setAutomations((prev) => [data.automation, ...prev]);
        showToast("Automação criada!", "success");
      }
      setShowForm(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(automation: IgAutomation) {
    const res = await fetch(`/api/instagram/automations/${automation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !automation.is_active }),
    });
    if (res.ok) {
      const data = await res.json();
      setAutomations((prev) => prev.map((a) => (a.id === automation.id ? data.automation : a)));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta automação? Essa ação não pode ser desfeita.")) return;
    const res = await fetch(`/api/instagram/automations/${id}`, { method: "DELETE" });
    if (res.ok) {
      setAutomations((prev) => prev.filter((a) => a.id !== id));
      showToast("Automação excluída.", "info");
    }
  }

  async function handleLogout() {
    await fetch("/api/instagram/auth/logout", { method: "POST" });
    router.push("/automacao-instagram/login");
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white px-4 py-8 sm:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold">Automação Instagram</h1>
            <p className="text-neutral-400 text-sm">Substituto do ManyChat — @juli0net0</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-neutral-400 hover:text-white transition-colors"
          >
            Sair
          </button>
        </div>

        {/* Conexão */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 mb-6">
          {config ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-400">Conectado como</p>
                <p className="text-lg font-medium">@{config.ig_username || config.ig_user_id}</p>
                <p className="text-xs text-neutral-500 mt-1">
                  Token expira em {tokenExpiresInDays} dia{tokenExpiresInDays === 1 ? "" : "s"}
                </p>
              </div>
              <a
                href="/api/instagram/oauth/start"
                className="text-sm bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded-lg transition-colors"
              >
                Reconectar
              </a>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Instagram não conectado</p>
                <p className="text-sm text-neutral-400">Conecte sua conta para começar a automatizar.</p>
              </div>
              <a
                href="/api/instagram/oauth/start"
                className="text-sm bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Conectar Instagram
              </a>
            </div>
          )}
        </div>

        {/* Fila stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
            <p className="text-xs text-neutral-400">Na fila (pendente)</p>
            <p className="text-2xl font-semibold">{queueStats.pending}</p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
            <p className="text-xs text-neutral-400">Falharam</p>
            <p className="text-2xl font-semibold text-red-400">{queueStats.failed}</p>
          </div>
        </div>

        {/* Automações */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-lg">Automações</h2>
          <button
            onClick={openCreateForm}
            className="text-sm bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Nova automação
          </button>
        </div>

        <div className="space-y-3 mb-8">
          {automations.length === 0 && (
            <p className="text-neutral-500 text-sm py-6 text-center border border-dashed border-neutral-800 rounded-xl">
              Nenhuma automação ainda. Crie a primeira.
            </p>
          )}
          {automations.map((automation) => (
            <div
              key={automation.id}
              className="bg-neutral-900 border border-neutral-800 rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{automation.name}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Palavras: {(automation.keywords || []).join(", ")}
                  </p>
                  <p className="text-xs text-neutral-500 truncate mt-0.5">
                    DM: {automation.dm_message_text}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleActive(automation)}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      automation.is_active
                        ? "bg-green-500/15 text-green-400"
                        : "bg-neutral-800 text-neutral-500"
                    }`}
                  >
                    {automation.is_active ? "Ativa" : "Pausada"}
                  </button>
                  <button
                    onClick={() => openEditForm(automation)}
                    className="text-xs text-neutral-400 hover:text-white px-2"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(automation.id)}
                    className="text-xs text-red-400 hover:text-red-300 px-2"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Logs recentes */}
        <h2 className="font-medium text-lg mb-3">Últimos eventos</h2>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl divide-y divide-neutral-800 mb-8">
          {logs.length === 0 && (
            <p className="text-neutral-500 text-sm p-4">Nenhum evento registrado ainda.</p>
          )}
          {logs.map((log) => (
            <div key={log.id} className="p-3 flex items-center justify-between text-sm">
              <span className={log.level === "error" ? "text-red-400" : "text-neutral-300"}>
                {log.event}
              </span>
              <span className="text-xs text-neutral-500">
                {new Date(log.created_at).toLocaleString("pt-BR")}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="font-medium text-lg mb-4">
              {editingId ? "Editar automação" : "Nova automação"}
            </h3>

            <div className="space-y-3">
              <Field label="Nome interno">
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Promo reels agosto"
                />
              </Field>

              <Field label="Palavras-chave (separadas por vírgula)">
                <input
                  className={inputClass}
                  value={form.keywords}
                  onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                  placeholder="Ex: eu quero, link, quero saber"
                />
              </Field>

              <Field label="Modo de comparação">
                <select
                  className={inputClass}
                  value={form.match_mode}
                  onChange={(e) =>
                    setForm({ ...form, match_mode: e.target.value as "contains" | "exact" })
                  }
                >
                  <option value="contains">Contém a palavra</option>
                  <option value="exact">Comentário igual à palavra</option>
                </select>
              </Field>

              <Field label="ID do post/reel (opcional — vazio = qualquer post)">
                <input
                  className={inputClass}
                  value={form.post_id}
                  onChange={(e) => setForm({ ...form, post_id: e.target.value })}
                  placeholder="Deixe em branco para valer em todos os posts"
                />
              </Field>

              <Field label="Resposta pública no comentário (opcional)">
                <input
                  className={inputClass}
                  value={form.comment_reply_text}
                  onChange={(e) => setForm({ ...form, comment_reply_text: e.target.value })}
                  placeholder="Ex: Te chamei no direct! 📩"
                />
              </Field>

              <Field label="Mensagem da DM">
                <textarea
                  className={inputClass}
                  rows={3}
                  value={form.dm_message_text}
                  onChange={(e) => setForm({ ...form, dm_message_text: e.target.value })}
                  placeholder="Texto que a pessoa recebe no direct"
                />
              </Field>

              <Field label="Texto do botão (opcional)">
                <input
                  className={inputClass}
                  value={form.dm_button_text}
                  onChange={(e) => setForm({ ...form, dm_button_text: e.target.value })}
                  placeholder="Ex: Ver agora"
                />
              </Field>

              <Field label="Link do botão (opcional)">
                <input
                  className={inputClass}
                  value={form.dm_button_url}
                  onChange={(e) => setForm({ ...form, dm_button_url: e.target.value })}
                  placeholder="https://..."
                />
              </Field>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 bg-neutral-800 hover:bg-neutral-700 py-2.5 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-2.5 rounded-lg font-medium transition-colors"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm text-white placeholder-neutral-500 outline-none focus:border-blue-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-neutral-400 mb-1">{label}</span>
      {children}
    </label>
  );
}
