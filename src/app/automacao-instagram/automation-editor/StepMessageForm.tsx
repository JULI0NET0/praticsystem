"use client";

import InstagramPostPicker from "../InstagramPostPicker";
import CommentReplyVariations from "./CommentReplyVariations";
import MaterialPickerField from "./MaterialPickerField";
import type { AutomationFormValues } from "./types";

interface Props {
  form: AutomationFormValues;
  onChange: (patch: Partial<AutomationFormValues>) => void;
}

export default function StepMessageForm({ form, onChange }: Props) {
  return (
    <div className="flex-1 min-w-0 space-y-5 text-xs">
      <div>
        <label className="block font-bold text-[var(--color-text-primary)] mb-1">
          Nome da Automação
        </label>
        <input
          value={form.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Ex: Envio de Link Reels"
          className="w-full bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] focus:border-[var(--color-terracotta)] rounded-lg px-3 py-2 text-xs text-[var(--color-text-primary)] outline-none"
        />
      </div>

      <div>
        <label className="block font-bold text-[var(--color-text-primary)] mb-1">
          Palavras-chave do Comentário (separadas por vírgula)
        </label>
        <input
          value={form.keywords}
          onChange={(e) => onChange({ keywords: e.target.value })}
          placeholder="Ex: link, eu quero, preco"
          className="w-full bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] focus:border-[var(--color-terracotta)] rounded-lg px-3 py-2 text-xs text-[var(--color-text-primary)] outline-none"
        />
      </div>

      <div>
        <label className="block font-bold text-[var(--color-text-primary)] mb-1">
          Tipo de Correspondência do Comentário
        </label>
        <select
          value={form.match_mode}
          onChange={(e) => onChange({ match_mode: e.target.value as "contains" | "exact" })}
          className="w-full bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-lg px-3 py-2 text-xs text-[var(--color-text-primary)] outline-none"
        >
          <option value="contains">Contém a palavra-chave (recomendado)</option>
          <option value="exact">Comentário exato (somente a palavra digitada)</option>
        </select>
      </div>

      <div>
        <label className="block font-bold text-[var(--color-text-primary)] mb-1.5">
          Publicação / Reel de Origem
        </label>
        <InstagramPostPicker
          selectedPostId={form.post_id}
          onSelectPost={(postId) => onChange({ post_id: postId })}
        />
      </div>

      {/* Bloco: Texto da mensagem */}
      <div className="border border-[var(--color-border-subtle)] rounded-xl p-4 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
          Texto da mensagem (DM)
        </p>
        <textarea
          rows={3}
          value={form.dm_message_text}
          onChange={(e) => onChange({ dm_message_text: e.target.value })}
          placeholder="Olá! Conforme você pediu, aqui está seu link..."
          className="w-full bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-lg px-3 py-2 text-xs text-[var(--color-text-primary)] outline-none"
        />
      </div>

      {/* Bloco: Botão */}
      <div className="border border-[var(--color-border-subtle)] rounded-xl p-4 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
          + Botão Adicionar (opcional)
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-[var(--color-text-primary)] mb-1">
              Texto do Botão
            </label>
            <input
              value={form.dm_button_text}
              onChange={(e) => onChange({ dm_button_text: e.target.value })}
              placeholder="Ex: 👉 Acessar Agora"
              className="w-full bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-lg px-3 py-2 text-xs text-[var(--color-text-primary)] outline-none"
            />
          </div>
          <MaterialPickerField
            url={form.dm_button_url}
            linkedMaterialId={form.linked_material_id}
            onChange={(url, materialId) => onChange({ dm_button_url: url, linked_material_id: materialId })}
          />
        </div>

        {(form.dm_button_text || form.dm_button_url) && (
          <div>
            <label className="block font-bold text-[var(--color-text-primary)] mb-1">
              Como o botão chega na DM
            </label>
            <div className="flex items-center gap-1 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] p-1 rounded-lg w-fit flex-wrap">
              <button
                type="button"
                onClick={() => onChange({ cta_type: "link" })}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  form.cta_type === "link"
                    ? "bg-[var(--color-terracotta)] text-[var(--color-text-on-accent)]"
                    : "text-[var(--color-text-secondary)]"
                }`}
              >
                Link direto
              </button>
              <button
                type="button"
                onClick={() => onChange({ cta_type: "button" })}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  form.cta_type === "button"
                    ? "bg-[var(--color-terracotta)] text-[var(--color-text-on-accent)]"
                    : "text-[var(--color-text-secondary)]"
                }`}
              >
                Botão fixo
              </button>
              <button
                type="button"
                onClick={() => onChange({ cta_type: "quick_reply" })}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  form.cta_type === "quick_reply"
                    ? "bg-[var(--color-terracotta)] text-[var(--color-text-on-accent)]"
                    : "text-[var(--color-text-secondary)]"
                }`}
              >
                Sugestão de resposta
              </button>
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5">
              {form.cta_type === "link"
                ? "Abre o link direto ao tocar — mais rápido, sem esperar uma 2ª mensagem."
                : form.cta_type === "button"
                ? "Fica fixo dentro do balão. Ao tocar, manda o link de verdade na hora numa 2ª DM."
                : "Some se a pessoa ignorar ou responder outra coisa. Ao tocar, manda o link de verdade na hora numa 2ª DM."}
            </p>
          </div>
        )}
      </div>

      {/* Bloco: Resposta pública no comentário */}
      <div className="border border-[var(--color-border-subtle)] rounded-xl p-4 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
          Resposta pública no comentário (opcional)
        </p>
        <CommentReplyVariations
          variations={form.comment_reply_texts}
          onChange={(variations) => onChange({ comment_reply_texts: variations })}
        />
      </div>

      {/* Follow Gate Toggle */}
      <div className="border border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)]/60 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <label
                className="font-bold text-xs text-[var(--color-text-primary)] cursor-pointer"
                htmlFor="require_follow_toggle"
              >
                Conteúdo exclusivo para seguidores
              </label>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-terracotta)]/15 text-[var(--color-terracotta)]">
                Follow Gate
              </span>
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              Só libera o material depois que a pessoa seguir o seu perfil no Instagram.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              id="require_follow_toggle"
              type="checkbox"
              checked={form.require_follow}
              onChange={(e) => {
                const checked = e.target.checked;
                onChange({
                  require_follow: checked,
                  follow_gate_message:
                    checked && !form.follow_gate_message
                      ? "Para liberar o seu material, você precisa me seguir no Instagram! Siga o perfil e depois toque no botão abaixo 👇"
                      : form.follow_gate_message,
                  follow_gate_button_text:
                    checked && !form.follow_gate_button_text ? "Pronto, agora te sigo" : form.follow_gate_button_text,
                });
              }}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-terracotta)]"></div>
          </label>
        </div>

        {form.require_follow && (
          <div className="pt-3 border-t border-[var(--color-border-subtle)] space-y-3">
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">
                Mensagem do Gate (Pedindo pra seguir)
              </label>
              <textarea
                rows={2}
                value={form.follow_gate_message}
                onChange={(e) => onChange({ follow_gate_message: e.target.value })}
                placeholder="Ex: Para liberar o material, você precisa me seguir no Instagram! Siga o perfil e toque no botão abaixo 👇"
                className="w-full bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-lg px-3 py-2 text-xs text-[var(--color-text-primary)] outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">
                Texto do Botão do Gate
              </label>
              <input
                value={form.follow_gate_button_text}
                onChange={(e) => onChange({ follow_gate_button_text: e.target.value })}
                placeholder="Ex: Pronto, agora te sigo"
                className="w-full bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-lg px-3 py-2 text-xs text-[var(--color-text-primary)] outline-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
