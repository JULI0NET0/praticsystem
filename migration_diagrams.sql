-- =============================================================
-- PRATIC SYSTEM — Migration Diagramas (Fluxogramas & Mind Maps)
-- Execute este script no Supabase → SQL Editor → Run
-- =============================================================

CREATE TABLE IF NOT EXISTS public.diagrams (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id    UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    title        TEXT NOT NULL DEFAULT 'Sem título',
    description  TEXT,
    type         TEXT NOT NULL CHECK (type IN ('flowchart', 'mindmap', 'whiteboard')) DEFAULT 'flowchart',
    data         JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_favorite  BOOLEAN NOT NULL DEFAULT false,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garante colunas em instâncias que já possam existir
ALTER TABLE public.diagrams ADD COLUMN IF NOT EXISTS user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.diagrams ADD COLUMN IF NOT EXISTS client_id   UUID REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.diagrams ADD COLUMN IF NOT EXISTS title       TEXT NOT NULL DEFAULT 'Sem título';
ALTER TABLE public.diagrams ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.diagrams ADD COLUMN IF NOT EXISTS type        TEXT NOT NULL DEFAULT 'flowchart';
ALTER TABLE public.diagrams ADD COLUMN IF NOT EXISTS data        JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.diagrams ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.diagrams ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.diagrams ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Índices de performance
CREATE INDEX IF NOT EXISTS diagrams_user_id_idx ON public.diagrams (user_id);
CREATE INDEX IF NOT EXISTS diagrams_client_id_idx ON public.diagrams (client_id);
CREATE INDEX IF NOT EXISTS diagrams_type_idx ON public.diagrams (type);
CREATE INDEX IF NOT EXISTS diagrams_updated_at_idx ON public.diagrams (updated_at DESC);

-- Trigger para manter updated_at atualizado
CREATE OR REPLACE FUNCTION set_updated_at_diagrams()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_diagrams_updated_at ON public.diagrams;
CREATE TRIGGER trigger_diagrams_updated_at
    BEFORE UPDATE ON public.diagrams
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_diagrams();

-- Row Level Security (RLS)
ALTER TABLE public.diagrams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "diagrams_select" ON public.diagrams;
CREATE POLICY "diagrams_select" ON public.diagrams
    FOR SELECT USING (
        auth.uid() IS NOT NULL
    );

DROP POLICY IF EXISTS "diagrams_insert" ON public.diagrams;
CREATE POLICY "diagrams_insert" ON public.diagrams
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
    );

DROP POLICY IF EXISTS "diagrams_update" ON public.diagrams;
CREATE POLICY "diagrams_update" ON public.diagrams
    FOR UPDATE USING (
        auth.uid() IS NOT NULL
    );

DROP POLICY IF EXISTS "diagrams_delete" ON public.diagrams;
CREATE POLICY "diagrams_delete" ON public.diagrams
    FOR DELETE USING (
        auth.uid() IS NOT NULL
    );

-- Habilita Realtime no Supabase para a tabela diagrams
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'diagrams'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.diagrams;
    END IF;
END $$;
