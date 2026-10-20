-- Briefing do cliente (página pública /briefing/[id]) e painel admin do cliente.
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS briefing_data JSONB;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS briefing_completed BOOLEAN DEFAULT FALSE;
