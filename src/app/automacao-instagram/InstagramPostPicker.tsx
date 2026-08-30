"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import {
  Eye,
  Film,
  Layers,
  Check,
  RefreshCw,
  ExternalLink,
  Sparkles,
  AlertCircle,
  Hash,
  Globe,
} from "lucide-react";
import type { InstagramMediaItem, InstagramProfile } from "@/app/api/instagram/media/route";

export function formatInstagramViews(views: number | null | undefined): string {
  if (views === null || views === undefined) return "-";
  if (views < 10000) {
    return views.toLocaleString("pt-BR"); // Ex: 3.661
  }
  if (views < 1000000) {
    const thousands = views / 1000;
    if (thousands < 100) {
      const formatted = thousands.toFixed(1).replace(".", ",");
      return `${formatted.endsWith(",0") ? formatted.slice(0, -2) : formatted} mil`;
    }
    return `${Math.floor(thousands).toLocaleString("pt-BR")} mil`;
  }
  const millions = views / 1000000;
  const formatted = millions.toFixed(1).replace(".", ",");
  return `${formatted.endsWith(",0") ? formatted.slice(0, -2) : formatted} mi`;
}

interface Props {
  selectedPostId: string;
  onSelectPost: (postId: string) => void;
}

export default function InstagramPostPicker({ selectedPostId, onSelectPost }: Props) {
  const [profile, setProfile] = useState<InstagramProfile | null>(null);
  const [mediaList, setMediaList] = useState<InstagramMediaItem[]>([]);
  const [limit, setLimit] = useState<9 | 12 | 15>(12);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInsightsPermission, setHasInsightsPermission] = useState(true);
  const [showManualInput, setShowManualInput] = useState(false);

  const fetchMedia = async (targetLimit: number = limit) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/instagram/media?limit=${targetLimit}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Falha ao carregar posts do Instagram");
      }
      const data = await res.json();
      setProfile(data.profile || null);
      setMediaList(data.media || []);
      setHasInsightsPermission(data.hasInsightsPermission ?? true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia(limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  const handleLimitChange = (newLimit: 9 | 12 | 15) => {
    setLimit(newLimit);
  };

  const isGlobalSelected = !selectedPostId;
  const selectedMediaItem = mediaList.find((m) => m.id === selectedPostId);

  return (
    <div className="space-y-3 bg-[var(--color-surface-sunken)]/60 border border-[var(--color-border-default)] rounded-xl p-3.5 sm:p-4">
      {/* ========================================================
          CABEÇALHO DO PERFIL INSTAGRAM
         ======================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--color-border-subtle)]">
        <div className="flex items-center gap-3">
          {/* Avatar com Anel Gradiente Instagram */}
          <div className="relative p-[2px] rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] shadow-sm shrink-0">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--color-surface-raised)] border-2 border-[var(--color-surface-sunken)] flex items-center justify-center">
              {profile?.profile_picture_url ? (
                <Image
                  src={profile.profile_picture_url}
                  alt={profile.username || "Instagram"}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <span className="font-black text-xs text-[var(--color-text-primary)]">
                  {profile?.username?.slice(0, 2).toUpperCase() || "IG"}
                </span>
              )}
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs sm:text-sm text-[var(--color-text-primary)] truncate">
                @{profile?.username || "juli0net0"}
              </span>
              <a
                href={`https://instagram.com/${profile?.username || "juli0net0"}`}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--color-text-muted)] hover:text-[var(--color-terracotta)] transition-colors p-0.5"
                title="Abrir no Instagram"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] text-[var(--color-text-secondary)] truncate">
              {profile?.name || "JULIO NETO | IA para Negócios"}
            </p>
          </div>
        </div>

        {/* Controles de Topo: Seletor de Quantidade (9 | 12 | 15) & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] rounded-lg p-0.5 text-[11px] font-semibold">
            {([9, 12, 15] as const).map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => handleLimitChange(count)}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  limit === count
                    ? "bg-[var(--color-terracotta)] text-[var(--color-text-on-accent)] shadow-xs"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {count}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => fetchMedia(limit)}
            disabled={loading}
            className="p-1.5 bg-[var(--color-surface-raised)] hover:bg-[var(--color-surface-inset)] border border-[var(--color-border-default)] rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors disabled:opacity-50"
            title="Recarregar publicações"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ========================================================
          AVISO DE RECONEXÃO PARA INSIGHTS (SE NECESSÁRIO)
         ======================================================== */}
      {!hasInsightsPermission && (
        <div className="flex items-start gap-2.5 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-200">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <div className="flex-1 min-w-0">
            <span className="font-semibold block text-amber-300">
              Visualizações de vídeo em modo de compatibilidade
            </span>
            <p className="text-[11px] text-amber-200/90 mt-0.5">
              Para carregar as métricas exatas de visualizações de cada Reel, é necessário reconectar a conta com a nova permissão de Insights.
            </p>
          </div>
          <a
            href="/api/instagram/oauth/start"
            className="shrink-0 text-[10px] font-bold uppercase tracking-wider bg-amber-500 hover:bg-amber-600 text-black px-2.5 py-1 rounded transition-colors self-center"
          >
            Reconectar
          </a>
        </div>
      )}

      {/* ========================================================
          OPÇÃO DE SELEÇÃO: TODOS OS POSTS (GLOBAL)
         ======================================================== */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onSelectPost("")}
          className={`flex-1 flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
            isGlobalSelected
              ? "bg-[var(--color-terracotta)]/15 border-[var(--color-terracotta)] text-[var(--color-terracotta)] shadow-xs"
              : "bg-[var(--color-surface-raised)] border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5" />
            <span>Todos os posts & reels (Gatilho Global)</span>
          </div>
          {isGlobalSelected && (
            <span className="w-4 h-4 rounded-full bg-[var(--color-terracotta)] text-[var(--color-text-on-accent)] flex items-center justify-center text-[10px]">
              ✓
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setShowManualInput(!showManualInput)}
          className={`p-2 rounded-lg border text-[11px] transition-colors ${
            showManualInput
              ? "bg-[var(--color-surface-inset)] border-[var(--color-terracotta)] text-[var(--color-terracotta)]"
              : "bg-[var(--color-surface-raised)] border-[var(--color-border-default)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          }`}
          title="Inserir ID manualmente"
        >
          <Hash className="w-3.5 h-3.5" />
        </button>
      </div>

      {showManualInput && (
        <div className="p-2.5 bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] rounded-lg space-y-1">
          <label className="block text-[11px] font-semibold text-[var(--color-text-primary)]">
            ID do Post / Reel (manual)
          </label>
          <input
            value={selectedPostId}
            onChange={(e) => onSelectPost(e.target.value.trim())}
            placeholder="Ex: 18174893935430314"
            className="w-full bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] focus:border-[var(--color-terracotta)] rounded-md px-2.5 py-1.5 text-xs text-[var(--color-text-primary)] outline-none"
          />
        </div>
      )}

      {/* ========================================================
          GRADE DE 3 COLUNAS NO FORMATO DO INSTAGRAM (FEED / REELS)
         ======================================================== */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
            Ou escolha um Post / Reel específico:
          </span>
          {selectedPostId && (
            <span className="text-[10px] text-[var(--color-terracotta)] font-medium">
              1 post selecionado
            </span>
          )}
        </div>

        {error ? (
          <div className="p-4 bg-[var(--color-surface-raised)] border border-red-500/20 rounded-lg text-center space-y-2">
            <p className="text-xs text-red-400">{error}</p>
            <button
              type="button"
              onClick={() => fetchMedia(limit)}
              className="text-xs bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-inset)] px-3 py-1.5 rounded-md font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" /> Tentar novamente
            </button>
          </div>
        ) : loading && mediaList.length === 0 ? (
          /* Skeleton Loader 3 Colunas */
          <div className="grid grid-cols-3 gap-1 md:gap-1.5">
            {Array.from({ length: limit }).map((_, idx) => (
              <div
                key={idx}
                className="aspect-[9/14] bg-[var(--color-surface-raised)]/70 rounded-md animate-pulse border border-[var(--color-border-subtle)] relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>
            ))}
          </div>
        ) : mediaList.length === 0 ? (
          <div className="p-6 bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-lg text-center text-xs text-[var(--color-text-muted)]">
            Nenhuma publicação recente encontrada.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 md:gap-1.5">
            {mediaList.map((item) => {
              const isSelected = selectedPostId === item.id;
              const isReel =
                item.media_type === "VIDEO" || item.media_product_type === "REELS";
              const isCarousel = item.media_type === "CAROUSEL_ALBUM";
              const displayImage = item.thumbnail_url || item.media_url;

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectPost(isSelected ? "" : item.id)}
                  className={`group relative aspect-[9/14] sm:aspect-[9/13] rounded-md overflow-hidden cursor-pointer border-2 transition-all select-none ${
                    isSelected
                      ? "border-[var(--color-terracotta)] ring-2 ring-[var(--color-terracotta)]/40 shadow-lg scale-[0.98]"
                      : "border-transparent hover:border-[var(--color-border-strong)] hover:opacity-95"
                  }`}
                >
                  {/* Imagem Thumbnail */}
                  {displayImage ? (
                    <Image
                      src={displayImage}
                      alt={item.caption?.slice(0, 40) || "Post Instagram"}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 33vw, 200px"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-neutral-600">
                      <Film className="w-6 h-6" />
                    </div>
                  )}

                  {/* Gradiente sutil superior e inferior para legibilidade das métricas */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/50 pointer-events-none" />

                  {/* Selo Superior Direito: Reel ou Carrossel */}
                  <div className="absolute top-1.5 right-1.5 pointer-events-none drop-shadow-md">
                    {isReel ? (
                      <div className="bg-black/60 backdrop-blur-xs p-1 rounded text-white flex items-center justify-center">
                        <Film className="w-3 h-3" />
                      </div>
                    ) : isCarousel ? (
                      <div className="bg-black/60 backdrop-blur-xs p-1 rounded text-white flex items-center justify-center">
                        <Layers className="w-3 h-3" />
                      </div>
                    ) : null}
                  </div>

                  {/* Checkmark no Canto Superior Esquerdo quando Selecionado */}
                  {isSelected && (
                    <div className="absolute top-1.5 left-1.5 bg-[var(--color-terracotta)] text-[var(--color-text-on-accent)] w-5 h-5 rounded-full flex items-center justify-center shadow-md drop-shadow">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}

                  {/* Visualizações no Canto Inferior (Ícone de Olho + Formato Instagram) */}
                  <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between text-white pointer-events-none">
                    <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold drop-shadow-md">
                      <Eye className="w-3 h-3 drop-shadow text-white/90" />
                      <span>{formatInstagramViews(item.views)}</span>
                    </div>
                  </div>

                  {/* Hover Overlay com tooltip de resumo do caption */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end text-white text-[10px] pointer-events-none pb-7">
                    <p className="line-clamp-2 leading-tight drop-shadow font-medium">
                      {item.caption || "Sem legenda"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Prévia do Post Selecionado */}
      {selectedMediaItem && (
        <div className="p-2 bg-[var(--color-surface-raised)] border border-[var(--color-terracotta)]/40 rounded-lg flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded relative overflow-hidden shrink-0 border border-[var(--color-border-default)]">
              {selectedMediaItem.thumbnail_url || selectedMediaItem.media_url ? (
                <Image
                  src={selectedMediaItem.thumbnail_url || selectedMediaItem.media_url!}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : null}
            </div>
            <div className="min-w-0 truncate">
              <span className="font-semibold text-[var(--color-text-primary)] block truncate">
                {selectedMediaItem.caption?.slice(0, 50) || `Post ID: ${selectedMediaItem.id}`}
              </span>
              <span className="text-[10px] text-[var(--color-text-muted)]">
                {formatInstagramViews(selectedMediaItem.views)} visualizações
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelectPost("")}
            className="text-[11px] text-[var(--color-text-muted)] hover:text-red-400 font-medium shrink-0 px-1"
          >
            Remover
          </button>
        </div>
      )}
    </div>
  );
}
