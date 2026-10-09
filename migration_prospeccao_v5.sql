-- =============================================================
-- Prospecção v5: classificação de contatos (lead/cliente/equipe/triagem…),
-- leitura de conversas, tamanho de mídia e mensagens agendadas.
-- Idempotente. Rodar DEPOIS da v4.
-- =============================================================

-- 1) Tipo de contato
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS tipo           TEXT NOT NULL DEFAULT 'lead';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS user_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS classificado_em TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_read_at   TIMESTAMPTZ;
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_tipo_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_tipo_check
    CHECK (tipo IN ('lead', 'cliente', 'equipe', 'fornecedor', 'pessoal', 'triagem', 'ignorado'));
CREATE INDEX IF NOT EXISTS leads_tipo_idx ON public.leads (tipo);

-- 2) Tamanho do arquivo nas mensagens com mídia
ALTER TABLE public.lead_messages ADD COLUMN IF NOT EXISTS media_size INTEGER;

-- 3) Deduplicação por external_id (webhook + envio direto podem gravar a mesma mensagem)
DELETE FROM public.lead_messages a
USING public.lead_messages b
WHERE a.external_id IS NOT NULL
  AND a.external_id = b.external_id
  AND a.created_at > b.created_at;
DROP INDEX IF EXISTS public.lead_messages_external_idx;
CREATE UNIQUE INDEX IF NOT EXISTS lead_messages_external_uidx
    ON public.lead_messages (external_id) WHERE external_id IS NOT NULL;

-- 4) Mensagens agendadas (follow-up, campanha, recorrentes)
CREATE TABLE IF NOT EXISTS public.scheduled_messages (
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id          UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    body             TEXT NOT NULL DEFAULT '',
    media            JSONB,
    run_at           TIMESTAMPTZ NOT NULL,
    status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'canceled')),
    kind             TEXT NOT NULL DEFAULT 'single' CHECK (kind IN ('single', 'followup', 'campaign')),
    cancel_on_reply  BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence       JSONB,
    series_id        UUID,
    campaign_id      UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    uazapi_folder_id TEXT,
    sent_message_id  UUID REFERENCES public.lead_messages(id) ON DELETE SET NULL,
    error            TEXT,
    created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS scheduled_messages_lead_idx   ON public.scheduled_messages (lead_id, run_at);
CREATE INDEX IF NOT EXISTS scheduled_messages_status_idx ON public.scheduled_messages (status, run_at);

ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "scheduled_messages_select" ON public.scheduled_messages;
CREATE POLICY "scheduled_messages_select" ON public.scheduled_messages FOR SELECT USING (public.is_team_member());
DROP POLICY IF EXISTS "scheduled_messages_insert" ON public.scheduled_messages;
CREATE POLICY "scheduled_messages_insert" ON public.scheduled_messages FOR INSERT WITH CHECK (public.is_team_member());
DROP POLICY IF EXISTS "scheduled_messages_update" ON public.scheduled_messages;
CREATE POLICY "scheduled_messages_update" ON public.scheduled_messages FOR UPDATE USING (public.is_team_member());
DROP POLICY IF EXISTS "scheduled_messages_delete" ON public.scheduled_messages;
CREATE POLICY "scheduled_messages_delete" ON public.scheduled_messages FOR DELETE USING (public.is_team_member());

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'scheduled_messages') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.scheduled_messages;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
