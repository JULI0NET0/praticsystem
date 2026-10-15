-- =============================================================
-- MIGRAÇÃO: CAIXA DE ENTRADA DO INSTAGRAM (PraticChat)
--
-- Guarda tudo que entra e sai na DM: mensagens recebidas (webhook),
-- enviadas pelo app do Instagram (echo), pelas automações e pelo painel,
-- e o histórico importado da API de conversas. O `mid` (id da mensagem
-- na Meta) evita duplicar a mesma mensagem vinda por caminhos diferentes.
--
-- Seguro rodar mais de uma vez.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.ig_messages (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mid            TEXT UNIQUE,
    igsid          TEXT NOT NULL,
    direction      TEXT NOT NULL CHECK (direction IN ('in', 'out')),
    kind           TEXT NOT NULL DEFAULT 'text',
    text           TEXT,
    attachments    JSONB,
    source         TEXT NOT NULL DEFAULT 'instagram' CHECK (source IN ('instagram', 'automation', 'panel', 'import')),
    automation_id  UUID REFERENCES public.ig_automations(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ig_messages_igsid_created_idx ON public.ig_messages (igsid, created_at DESC);
CREATE INDEX IF NOT EXISTS ig_messages_created_idx       ON public.ig_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS ig_messages_unread_idx        ON public.ig_messages (igsid) WHERE direction = 'in' AND read_at IS NULL;

-- Igual às outras tabelas ig_*: RLS ligado, acesso só pelo servidor (service_role).
ALTER TABLE public.ig_messages ENABLE ROW LEVEL SECURITY;
