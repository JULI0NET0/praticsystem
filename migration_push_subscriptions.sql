-- =============================================================
-- BLOCO 18: WEB PUSH NOTIFICATIONS (PWA)
-- Armazena as inscrições Push de cada dispositivo/navegador dos usuários.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint     TEXT NOT NULL UNIQUE,
    p256dh       TEXT NOT NULL,
    auth         TEXT NOT NULL,
    user_agent   TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
    ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subscriptions_user_all" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_user_all" ON public.push_subscriptions
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
