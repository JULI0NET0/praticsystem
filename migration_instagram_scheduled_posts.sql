-- =============================================================
-- MIGRAÇÃO: PUBLICAÇÕES AGENDADAS NO INSTAGRAM (Reel, imagem, carrossel, story)
--
-- 1) ig_scheduled_posts: fila de publicações com data/hora.
-- 2) Bucket público ig-posts: a Meta baixa a mídia por URL pública. O upload
--    do painel vai direto do navegador por URL assinada (vídeo passa de 4,5 MB,
--    limite do corpo das funções da Vercel).
-- 3) pg_cron: a cada minuto chama /api/instagram/scheduled-posts/run.
--
-- ⚠️ ANTES DE RODAR a parte 3: troque COLE_AQUI_O_IG_CRON_SECRET pelo valor
-- real de IG_CRON_SECRET só na caixa do SQL Editor (não versione o valor).
--
-- Seguro rodar mais de uma vez.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.ig_scheduled_posts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_type     TEXT NOT NULL CHECK (post_type IN ('reel', 'image', 'carousel', 'story')),
    -- [{ "url": "https://...", "kind": "image" | "video" }]
    media         JSONB NOT NULL,
    caption       TEXT,
    cover_url     TEXT,
    share_to_feed BOOLEAN NOT NULL DEFAULT TRUE,
    scheduled_at  TIMESTAMPTZ NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'publishing', 'published', 'failed', 'canceled')),
    attempts      INTEGER NOT NULL DEFAULT 0,
    error         TEXT,
    media_id      TEXT,
    permalink     TEXT,
    started_at    TIMESTAMPTZ,
    published_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ig_scheduled_posts_due
    ON public.ig_scheduled_posts (scheduled_at) WHERE status = 'pending';

ALTER TABLE public.ig_scheduled_posts ENABLE ROW LEVEL SECURITY;
-- Sem policies: acesso só pelo servidor com service_role (como as demais ig_*).

DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('ig-posts', 'ig-posts', true)
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN insufficient_privilege THEN
    RAISE WARNING 'Sem permissão para criar o bucket ig-posts. Crie-o no Dashboard (Storage → New bucket, público).';
END $$;

-- ---------- Parte 3: agendador (a cada minuto) ----------
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ig-publish-scheduled') THEN
    PERFORM cron.unschedule('ig-publish-scheduled');
  END IF;
END $$;

SELECT cron.schedule(
  'ig-publish-scheduled',
  '* * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://praticsystem.vercel.app/api/instagram/scheduled-posts/run',
    headers := jsonb_build_object(
      'Authorization', 'Bearer COLE_AQUI_O_IG_CRON_SECRET',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $cron$
);
