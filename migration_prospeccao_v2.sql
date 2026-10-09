-- =============================================================
-- Prospecção v2: cadastro enriquecido (CNPJ, segmentos, canal),
-- dados do contato WhatsApp e mensagens com mídia. Idempotente.
-- Rodar DEPOIS de migration_prospeccao.sql.
-- =============================================================

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS cnpj            TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS razao_social    TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS cidade          TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS uf              TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS cnae_descricao  TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS segmentos       TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS wa_name         TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS wa_avatar_url   TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_message_preview TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS wa_is_business  BOOLEAN NOT NULL DEFAULT FALSE;

-- Canal de origem: amplia a lista (busca -> prospeccao_ativa)
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_origem_check;
UPDATE public.leads SET origem = 'prospeccao_ativa' WHERE origem = 'busca';
ALTER TABLE public.leads ADD CONSTRAINT leads_origem_check
    CHECK (origem IN ('manual', 'csv', 'whatsapp', 'site', 'prospeccao_ativa', 'indicacao', 'instagram', 'outro'));

CREATE INDEX IF NOT EXISTS leads_cnpj_idx ON public.leads (cnpj) WHERE cnpj IS NOT NULL;

-- Mensagens com mídia
ALTER TABLE public.lead_messages ADD COLUMN IF NOT EXISTS message_type   TEXT NOT NULL DEFAULT 'text';
ALTER TABLE public.lead_messages ADD COLUMN IF NOT EXISTS media_url      TEXT;
ALTER TABLE public.lead_messages ADD COLUMN IF NOT EXISTS media_mimetype TEXT;
ALTER TABLE public.lead_messages ADD COLUMN IF NOT EXISTS media_name     TEXT;
ALTER TABLE public.lead_messages ADD COLUMN IF NOT EXISTS media_seconds  INTEGER;
ALTER TABLE public.lead_messages ALTER COLUMN body SET DEFAULT '';
ALTER TABLE public.lead_messages DROP CONSTRAINT IF EXISTS lead_messages_message_type_check;
ALTER TABLE public.lead_messages ADD CONSTRAINT lead_messages_message_type_check
    CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document', 'sticker'));
ALTER TABLE public.lead_messages ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.lead_messages ALTER COLUMN status SET DEFAULT 'sent';
ALTER TABLE public.lead_messages DROP CONSTRAINT IF EXISTS lead_messages_status_check;
ALTER TABLE public.lead_messages ADD CONSTRAINT lead_messages_status_check
    CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'played', 'failed'));
CREATE INDEX IF NOT EXISTS lead_messages_external_idx ON public.lead_messages (external_id) WHERE external_id IS NOT NULL;

-- UPDATE em lead_messages precisa chegar completo no Realtime (status ✓✓)
ALTER TABLE public.lead_messages REPLICA IDENTITY FULL;

-- Bucket de mídia (público: a UAZAPI e o navegador leem pela URL)
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('prospeccao-media', 'prospeccao-media', true)
    ON CONFLICT (id) DO NOTHING;

    DROP POLICY IF EXISTS "prospeccao_media_select" ON storage.objects;
    CREATE POLICY "prospeccao_media_select" ON storage.objects
        FOR SELECT USING (bucket_id = 'prospeccao-media');

    DROP POLICY IF EXISTS "prospeccao_media_insert" ON storage.objects;
    CREATE POLICY "prospeccao_media_insert" ON storage.objects
        FOR INSERT WITH CHECK (bucket_id = 'prospeccao-media' AND auth.uid() IS NOT NULL);

    DROP POLICY IF EXISTS "prospeccao_media_delete" ON storage.objects;
    CREATE POLICY "prospeccao_media_delete" ON storage.objects
        FOR DELETE USING (bucket_id = 'prospeccao-media' AND auth.uid() IS NOT NULL);
END $$;

NOTIFY pgrst, 'reload schema';
