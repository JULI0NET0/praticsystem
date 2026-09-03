-- =============================================================
-- MIGRAÇÃO: GALERIA DE MATERIAIS (isca entregue via automação)
--
-- Cada material pode ser: texto/prompt pra copiar, arquivo pra
-- baixar, ou link externo. Servido por páginas públicas (sem
-- autenticação, fora do matcher de src/proxy.ts):
--   - /materiais            → vitrine geral (todos os ativos)
--   - /materiais/[slug]     → página individual (destino do link
--                              que a automação manda por DM)
--
-- `linked_material_id` em ig_automations é só um atalho de UX pro
-- editor lembrar qual material está selecionado — dm_button_url
-- continua sendo a fonte de verdade usada pelo motor de envio.
--
-- Seguro rodar mais de uma vez.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.ig_materials (
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug             TEXT NOT NULL UNIQUE,
    title            TEXT NOT NULL,
    description      TEXT,
    cover_image_path TEXT,
    material_type    TEXT NOT NULL CHECK (material_type IN ('text', 'file', 'link')),
    -- 'text': texto/prompt pra copiar
    copy_text        TEXT,
    -- 'file': upload no bucket ig-materials
    file_path        TEXT,
    file_name        TEXT,
    file_size_bytes  BIGINT,
    -- 'link': redireciona pra fora
    external_url     TEXT,
    is_active        BOOLEAN NOT NULL DEFAULT true,
    view_count       INT NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS ig_materials_slug_idx ON public.ig_materials (slug);
CREATE INDEX IF NOT EXISTS ig_materials_active_idx ON public.ig_materials (is_active, created_at DESC);

ALTER TABLE public.ig_materials ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ig_automations
    ADD COLUMN IF NOT EXISTS linked_material_id UUID REFERENCES public.ig_materials(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------
-- Bucket de materiais — público (leitura direta pela página
-- pública), mas todo INSERT/UPDATE/DELETE passa por service_role
-- no servidor (a área de Instagram não usa Supabase Auth — usa
-- cookie de sessão próprio validado só no backend — então uma
-- policy baseada em auth.uid() nunca seria satisfeita pelo
-- browser mesmo; por isso não criamos policies de escrita aqui).
-- ---------------------------------------------------------------
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('ig-materials', 'ig-materials', true)
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN insufficient_privilege THEN
    RAISE WARNING 'Sem permissão para configurar o bucket ig-materials. Crie-o manualmente no Dashboard (Storage → New bucket, marcado como público).';
END $$;

NOTIFY pgrst, 'reload schema';
