-- =============================================================
-- MIGRAÇÃO: RASTREAMENTO DE CLIQUES NO LINK DA DM
--
-- Guarda cada clique real no botão da DM (via link rastreável que
-- redireciona pro destino de verdade), pra alimentar o funil
-- comentário → DM enviada → clique.
--
-- Seguro rodar mais de uma vez (IF NOT EXISTS).
-- =============================================================

CREATE TABLE IF NOT EXISTS public.ig_link_clicks (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    queue_id      UUID REFERENCES public.ig_message_queue(id) ON DELETE CASCADE,
    automation_id UUID REFERENCES public.ig_automations(id) ON DELETE SET NULL,
    igsid         TEXT NOT NULL,
    clicked_at    TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS ig_link_clicks_automation_idx
    ON public.ig_link_clicks (automation_id);

ALTER TABLE public.ig_link_clicks ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
