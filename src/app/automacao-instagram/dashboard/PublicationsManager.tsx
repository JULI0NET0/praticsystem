"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, ExternalLink, Play, Plus, Trash2, Upload, X } from "lucide-react";
import Badge, { type BadgeTone } from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/components/CustomToast";
import { supabaseUrl } from "@/lib/supabase";
import {
  IG_CAPTION_MAX,
  IG_POSTS_BUCKET,
  POST_STATUS_LABEL,
  POST_TYPE_LABEL,
  type IgPostMedia,
  type IgPostStatus,
  type IgPostType,
  type IgScheduledPost,
} from "@/lib/instagramPosts";

const STATUS_TONE: Record<IgPostStatus, BadgeTone> = {
  pending: "info",
  publishing: "warning",
  published: "success",
  failed: "danger",
  canceled: "neutral",
};

const TYPE_HINT: Record<IgPostType, string> = {
  reel: "1 vídeo vertical (9:16).",
  image: "1 foto.",
  carousel: "2 a 10 fotos ou vídeos.",
  story: "1 foto ou 1 vídeo vertical.",
};

const ACCEPT: Record<IgPostType, string> = {
  reel: "video/*",
  image: "image/jpeg,image/png",
  carousel: "image/jpeg,image/png,video/*",
  story: "image/jpeg,image/png,video/*",
};

// Valor para <input type="datetime-local"> (horário local) a partir de uma data.
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

async function uploadMedia(file: File): Promise<IgPostMedia> {
  const res = await fetch("/api/instagram/scheduled-posts/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, content_type: file.type }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Falha ao preparar o envio.");

  // Mesmo formato que o supabase-js usa em uploadToSignedUrl.
  const form = new FormData();
  form.append("cacheControl", "3600");
  form.append("", file);
  const put = await fetch(
    `${supabaseUrl}/storage/v1/object/upload/sign/${IG_POSTS_BUCKET}/${data.path}?token=${encodeURIComponent(data.token)}`,
    { method: "PUT", body: form, headers: { "x-upsert": "false" } }
  );
  if (!put.ok) throw new Error("Falha ao enviar o arquivo.");
  return { url: data.public_url, kind: data.kind };
}

function MediaThumb({ m }: { m: IgPostMedia }) {
  return m.kind === "video" ? (
    <video src={m.url} className="w-full h-full object-cover" muted preload="metadata" />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={m.url} alt="" className="w-full h-full object-cover" />
  );
}

function Composer({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { showToast } = useToast();
  const [type, setType] = useState<IgPostType>("reel");
  const [media, setMedia] = useState<IgPostMedia[]>([]);
  const [caption, setCaption] = useState("");
  const [when, setWhen] = useState(() => toLocalInput(new Date(Date.now() + 60 * 60 * 1000)));
  const [shareToFeed, setShareToFeed] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const changeType = (t: IgPostType) => {
    setType(t);
    setMedia([]);
  };

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: IgPostMedia[] = [];
      for (const f of Array.from(files)) uploaded.push(await uploadMedia(f));
      setMedia((prev) => (type === "carousel" ? [...prev, ...uploaded].slice(0, 10) : uploaded.slice(0, 1)));
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), "error");
    } finally {
      setUploading(false);
    }
  };

  const save = async (now: boolean) => {
    setSaving(true);
    try {
      const res = await fetch("/api/instagram/scheduled-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_type: type,
          media,
          caption,
          share_to_feed: shareToFeed,
          scheduled_at: now ? new Date().toISOString() : new Date(when).toISOString(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Falha ao agendar.");
      showToast(now ? "Na fila para publicar em instantes." : "Publicação agendada.", "success");
      onSaved();
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" role="dialog" aria-modal="true" aria-label="Nova publicação">
      <div className="w-full max-w-md h-full overflow-y-auto bg-[var(--color-surface-canvas)] border-l border-[var(--color-border)] p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Nova publicação</h2>
          <button onClick={onClose} aria-label="Fechar" className="p-1 rounded hover:bg-black/10">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {(Object.keys(POST_TYPE_LABEL) as IgPostType[]).map((t) => (
            <button
              key={t}
              onClick={() => changeType(t)}
              className={`text-xs font-semibold rounded-lg border px-2 py-2 ${
                type === t
                  ? "border-[var(--color-terracotta)] text-[var(--color-terracotta)]"
                  : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
              }`}
            >
              {POST_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
        <p className="text-xs text-[var(--color-text-secondary)]">{TYPE_HINT[type]}</p>

        <div className="space-y-2">
          {media.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {media.map((m, i) => (
                <div key={m.url} className="relative aspect-[9/16] rounded-lg overflow-hidden bg-black/20">
                  <MediaThumb m={m} />
                  <button
                    onClick={() => setMedia((prev) => prev.filter((_, j) => j !== i))}
                    aria-label="Remover mídia"
                    className="absolute top-1 right-1 rounded-full bg-black/70 text-white p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <label className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--color-border)] py-4 text-sm cursor-pointer hover:border-[var(--color-terracotta)]">
            <Upload className="w-4 h-4" aria-hidden="true" />
            {uploading ? "Enviando…" : media.length ? "Trocar / adicionar" : "Escolher arquivo"}
            <input
              type="file"
              className="sr-only"
              accept={ACCEPT[type]}
              multiple={type === "carousel"}
              disabled={uploading}
              onChange={(e) => {
                void onFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        {type !== "story" && (
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]" htmlFor="ig-caption">
              Legenda
            </label>
            <textarea
              id="ig-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={6}
              maxLength={IG_CAPTION_MAX}
              className="w-full rounded-lg border border-[var(--color-border)] bg-transparent p-2 text-sm"
            />
            <p className="text-[11px] text-[var(--color-text-tertiary)] text-right">
              {caption.length}/{IG_CAPTION_MAX}
            </p>
          </div>
        )}

        {type === "reel" && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={shareToFeed} onChange={(e) => setShareToFeed(e.target.checked)} />
            Mostrar também no feed
          </label>
        )}

        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]" htmlFor="ig-when">
            Data e hora
          </label>
          <input
            id="ig-when"
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-transparent p-2 text-sm"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            disabled={saving || uploading || media.length === 0}
            onClick={() => void save(false)}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-terracotta)] text-white text-sm font-semibold py-2.5 disabled:opacity-50"
          >
            <CalendarClock className="w-4 h-4" aria-hidden="true" /> Agendar
          </button>
          <button
            disabled={saving || uploading || media.length === 0}
            onClick={() => void save(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] text-sm font-semibold px-4 py-2.5 disabled:opacity-50"
          >
            <Play className="w-4 h-4" aria-hidden="true" /> Agora
          </button>
        </div>
        <p className="text-[11px] text-[var(--color-text-tertiary)]">
          O agendador roda a cada minuto. A Meta baixa a mídia pela URL pública, então o arquivo fica no bucket ig-posts.
        </p>
      </div>
    </div>
  );
}

export default function PublicationsManager() {
  const { showToast } = useToast();
  const [posts, setPosts] = useState<IgScheduledPost[] | null>(null);
  const [composing, setComposing] = useState(false);

  const [tick, setTick] = useState(0);
  const load = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let alive = true;
    fetch("/api/instagram/scheduled-posts")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Falha ao carregar.");
        if (alive) setPosts(data.posts);
      })
      .catch((err) => {
        if (!alive) return;
        showToast(err instanceof Error ? err.message : String(err), "error");
        setPosts((prev) => prev ?? []);
      });
    return () => {
      alive = false;
    };
  }, [tick, showToast]);

  // Atualiza sozinho enquanto a aba está aberta.
  useEffect(() => {
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const act = async (id: string, init: RequestInit, okMsg: string) => {
    const res = await fetch(`/api/instagram/scheduled-posts/${id}`, init);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast(data.error || "Falha na operação.", "error");
      return;
    }
    showToast(okMsg, "success");
    load();
  };

  const runNow = async () => {
    const res = await fetch("/api/instagram/scheduled-posts/run", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) showToast(data.error || "Falha ao executar.", "error");
    else showToast(`${data.processed ?? 0} publicação(ões) processada(s).`, "success");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-[var(--color-text-secondary)]">Reels, fotos, carrosséis e stories com data e hora.</p>
        <div className="flex gap-2">
          <button onClick={() => void runNow()} className="text-xs font-semibold rounded-lg border border-[var(--color-border)] px-3 py-2">
            Publicar vencidas agora
          </button>
          <button
            onClick={() => setComposing(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg bg-[var(--color-terracotta)] text-white px-3 py-2"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Nova publicação
          </button>
        </div>
      </div>

      {posts && posts.length === 0 && (
        <EmptyState title="Nada agendado ainda" description="Crie a primeira publicação com o botão acima." />
      )}

      <ul className="space-y-2">
        {(posts ?? []).map((p) => (
          <li key={p.id} className="flex gap-3 rounded-xl border border-[var(--color-border)] p-3">
            <div className="w-14 h-20 shrink-0 rounded-lg overflow-hidden bg-black/20">
              <MediaThumb m={p.media[0]} />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={STATUS_TONE[p.status]} dot>
                  {POST_STATUS_LABEL[p.status]}
                </Badge>
                <span className="text-xs font-semibold">{POST_TYPE_LABEL[p.post_type]}</span>
                {p.post_type === "carousel" && (
                  <span className="text-xs text-[var(--color-text-tertiary)]">{p.media.length} itens</span>
                )}
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {p.status === "published" && p.published_at ? formatWhen(p.published_at) : formatWhen(p.scheduled_at)}
                </span>
              </div>
              <p className="text-sm line-clamp-2">{p.caption || <em className="text-[var(--color-text-tertiary)]">Sem legenda</em>}</p>
              {p.error && <p className="text-xs text-[var(--color-danger-ink)]">{p.error}</p>}
              <div className="flex gap-3 pt-1 text-xs">
                {p.permalink && (
                  <a href={p.permalink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[var(--color-terracotta)]">
                    Ver no Instagram <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </a>
                )}
                {p.status === "pending" && (
                  <button
                    className="font-semibold text-[var(--color-text-secondary)]"
                    onClick={() =>
                      void act(p.id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel" }) }, "Cancelada.")
                    }
                  >
                    Cancelar
                  </button>
                )}
                {(p.status === "failed" || p.status === "canceled") && (
                  <button
                    className="font-semibold text-[var(--color-terracotta)]"
                    onClick={() =>
                      void act(
                        p.id,
                        {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ scheduled_at: new Date().toISOString() }),
                        },
                        "Reenfileirada."
                      )
                    }
                  >
                    Tentar de novo
                  </button>
                )}
                {p.status !== "publishing" && (
                  <button
                    aria-label="Excluir"
                    className="inline-flex items-center gap-1 text-[var(--color-text-tertiary)]"
                    onClick={() => void act(p.id, { method: "DELETE" }, "Excluída.")}
                  >
                    <Trash2 className="w-3 h-3" aria-hidden="true" /> Excluir
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {composing && (
        <Composer
          onClose={() => setComposing(false)}
          onSaved={() => {
            setComposing(false);
            load();
          }}
        />
      )}
    </div>
  );
}
