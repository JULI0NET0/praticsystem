-- =============================================================
-- Prospecção (Gestão Comercial): leads, mensagens WhatsApp,
-- respostas rápidas e campanhas. Idempotente.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.leads (
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome             TEXT NOT NULL,
    empresa          TEXT,
    telefone         TEXT,
    email            TEXT,
    instagram        TEXT,
    origem           TEXT NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual', 'csv', 'whatsapp', 'site', 'busca')),
    estagio          TEXT NOT NULL DEFAULT 'novo' CHECK (estagio IN ('novo', 'contatado', 'conversando', 'proposta', 'ganho', 'perdido', 'stand_by')),
    valor_estimado   NUMERIC,
    servico_interesse TEXT,
    responsavel_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    tags             TEXT[] NOT NULL DEFAULT '{}',
    notas            TEXT,
    perdido_motivo   TEXT,
    last_message_at  TIMESTAMPTZ,
    unread_count     INTEGER NOT NULL DEFAULT 0,
    client_id        UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS leads_telefone_uidx ON public.leads (telefone) WHERE telefone IS NOT NULL;
CREATE INDEX IF NOT EXISTS leads_estagio_idx ON public.leads (estagio);
CREATE INDEX IF NOT EXISTS leads_last_message_idx ON public.leads (last_message_at DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS public.campaigns (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome          TEXT NOT NULL,
    template      TEXT NOT NULL DEFAULT '',
    filtro        JSONB NOT NULL DEFAULT '{}'::jsonb,
    status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'done')),
    agendada_para TIMESTAMPTZ,
    created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.campaign_recipients (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    lead_id     UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'replied', 'failed')),
    sent_at     TIMESTAMPTZ,
    UNIQUE (campaign_id, lead_id)
);

CREATE TABLE IF NOT EXISTS public.lead_messages (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id     UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    direction   TEXT NOT NULL CHECK (direction IN ('in', 'out')),
    body        TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed')),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    external_id TEXT,
    sender_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lead_messages_lead_idx ON public.lead_messages (lead_id, created_at);

CREATE TABLE IF NOT EXISTS public.lead_activities (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id    UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    tipo       TEXT NOT NULL CHECK (tipo IN ('estagio', 'nota', 'ligacao', 'conversao')),
    descricao  TEXT NOT NULL,
    user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lead_activities_lead_idx ON public.lead_activities (lead_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.quick_replies (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo     TEXT NOT NULL,
    corpo      TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: toda a equipe
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['leads', 'campaigns', 'campaign_recipients', 'lead_messages', 'lead_activities', 'quick_replies']
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "%s_select" ON public.%I FOR SELECT USING (public.is_team_member())', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "%s_insert" ON public.%I FOR INSERT WITH CHECK (public.is_team_member())', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "%s_update" ON public.%I FOR UPDATE USING (public.is_team_member())', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "%s_delete" ON public.%I FOR DELETE USING (public.is_team_member())', t, t);
    END LOOP;
END $$;

-- Realtime para o chat e a lista de leads
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'lead_messages') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_messages;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'leads') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
