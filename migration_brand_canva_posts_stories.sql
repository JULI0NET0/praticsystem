-- Migration para suporte direto a Canva Posts e Canva Stories na tabela clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS brand_canva_posts_url TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS brand_canva_stories_url TEXT;

-- Atualizar cache do schema no Supabase PostgREST
NOTIFY pgrst, 'reload schema';
