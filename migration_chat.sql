-- =============================================================
-- PRATIC SYSTEM — Migration Chat & Mensagens
-- Execute este script no Supabase → SQL Editor → Run
-- =============================================================

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content      TEXT NOT NULL,
    channel      TEXT NOT NULL DEFAULT 'general', -- 'general' ou 'dm'
    message_type TEXT NOT NULL DEFAULT 'text',    -- 'text' ou 'mention'
    timestamp    TIMESTAMPTZ DEFAULT NOW(),
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Garante colunas em instâncias existentes
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS sender_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS receiver_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS content      TEXT NOT NULL DEFAULT '';
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS channel      TEXT NOT NULL DEFAULT 'general';
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text';
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS timestamp    TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS created_at   TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS chat_messages_channel_idx ON public.chat_messages (channel, timestamp);
CREATE INDEX IF NOT EXISTS chat_messages_sender_receiver_idx ON public.chat_messages (sender_id, receiver_id, timestamp);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_messages_select" ON public.chat_messages;
CREATE POLICY "chat_messages_select" ON public.chat_messages
    FOR SELECT USING (
        channel = 'general'
        OR (auth.uid())::text = (sender_id)::text
        OR (auth.uid())::text = (receiver_id)::text
        OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid())
    );

DROP POLICY IF EXISTS "chat_messages_insert" ON public.chat_messages;
CREATE POLICY "chat_messages_insert" ON public.chat_messages
    FOR INSERT WITH CHECK (
        (auth.uid())::text = (sender_id)::text
        OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid())
    );

DROP POLICY IF EXISTS "chat_messages_delete" ON public.chat_messages;
CREATE POLICY "chat_messages_delete" ON public.chat_messages
    FOR DELETE USING (
        (auth.uid())::text = (sender_id)::text
        OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'board'))
    );

-- Habilita Realtime no Supabase para a tabela chat_messages
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Silently handle if publication does not exist or user lacks superuser
    NULL;
END $$;

NOTIFY pgrst, 'reload schema';
