-- =============================================================
-- MIGRAÇÃO: AUTOMAÇÃO DE INSTAGRAM (área pessoal @juli0net0)
--
-- Substituto do ManyChat: comentário com palavra-chave num post/reel
-- dispara uma DM automática. Todas as tabelas usam prefixo `ig_` para
-- não colidir com o restante do PraticSystem.
--
-- Acesso: SOMENTE via service_role key, no servidor (webhook, painel
-- admin e job de fila). RLS fica ativado sem nenhuma policy — isso
-- bloqueia completamente `anon`/`authenticated` (chave pública do
-- browser) e não afeta o service_role, que sempre ignora RLS.
--
-- Seguro rodar mais de uma vez (IF NOT EXISTS / DROP IF EXISTS).
-- =============================================================

-- ---------------------------------------------------------------
-- 1. ig_config — token e dados da conta Instagram conectada
--    (linha única, criada/atualizada pelo fluxo de OAuth "Conectar
--    Instagram"; nunca há mais de uma linha nesta tabela)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ig_config (
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ig_user_id       TEXT NOT NULL,
    ig_username      TEXT,
    access_token     TEXT NOT NULL,
    token_expires_at TIMESTAMPTZ NOT NULL,
    connected_at     TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.ig_config ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- 2. ig_automations — regras: palavra-chave -> mensagem + link
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ig_automations (
    id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name               TEXT NOT NULL,
    is_active          BOOLEAN NOT NULL DEFAULT true,
    -- null = vale para qualquer post/reel da conta; preenchido = só aquele post
    post_id            TEXT,
    keywords           TEXT[] NOT NULL,
    match_mode         TEXT NOT NULL DEFAULT 'contains'
                           CHECK (match_mode IN ('contains', 'exact')),
    -- resposta pública deixada no comentário (opcional)
    comment_reply_text TEXT,
    -- corpo da DM enviada por "resposta privada" ao comentário
    dm_message_text    TEXT NOT NULL,
    dm_button_text     TEXT,
    dm_button_url      TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS ig_automations_active_idx
    ON public.ig_automations (is_active);

ALTER TABLE public.ig_automations ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- 3. ig_contacts — quem já interagiu (IGSID = id do usuário no IG)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ig_contacts (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    igsid         TEXT NOT NULL UNIQUE,
    username      TEXT,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.ig_contacts ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- 4. ig_message_queue — fila de envio, drenada por pg_cron
--    dedupe_key impede duplicar o mesmo disparo (ex.: Meta reenviando
--    o mesmo evento de webhook)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ig_message_queue (
    id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    automation_id  UUID REFERENCES public.ig_automations(id) ON DELETE SET NULL,
    igsid          TEXT NOT NULL,
    -- id do comentário de origem; obrigatório pra 1º toque via
    -- "resposta privada" (fura a janela de 24h)
    comment_id     TEXT,
    message_text   TEXT NOT NULL,
    button_text    TEXT,
    button_url     TEXT,
    status         TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
    attempts       INT NOT NULL DEFAULT 0,
    error          TEXT,
    dedupe_key     TEXT NOT NULL UNIQUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    sent_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ig_message_queue_status_idx
    ON public.ig_message_queue (status, created_at);

ALTER TABLE public.ig_message_queue ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- 5. ig_logs — log de eventos e erros (webhook, envio, oauth)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ig_logs (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    level      TEXT NOT NULL CHECK (level IN ('info', 'error')),
    event      TEXT NOT NULL,
    payload    JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS ig_logs_created_idx
    ON public.ig_logs (created_at DESC);

ALTER TABLE public.ig_logs ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
