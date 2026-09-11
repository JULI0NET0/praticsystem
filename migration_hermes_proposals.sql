-- =============================================================
-- API do HERMES: Propostas comerciais
-- O conteúdo/design (.docx) é gerado fora do sistema (agente HERMES
-- rodando a skill pratic-brand-identity no Claude) — aqui só guardamos
-- o arquivo final e o vínculo com o cliente/status comercial.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.proposals (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id           UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    title               TEXT NOT NULL,
    value               NUMERIC,
    status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
    document_url        TEXT NOT NULL,
    document_file_name  TEXT,
    source              TEXT NOT NULL DEFAULT 'hermes',
    created_by_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proposals_select" ON public.proposals;
CREATE POLICY "proposals_select" ON public.proposals
    FOR SELECT USING (public.is_team_member());

DROP POLICY IF EXISTS "proposals_insert" ON public.proposals;
CREATE POLICY "proposals_insert" ON public.proposals
    FOR INSERT WITH CHECK (public.is_team_member());

DROP POLICY IF EXISTS "proposals_update" ON public.proposals;
CREATE POLICY "proposals_update" ON public.proposals
    FOR UPDATE USING (public.is_team_member());

DROP POLICY IF EXISTS "proposals_delete" ON public.proposals;
CREATE POLICY "proposals_delete" ON public.proposals
    FOR DELETE USING (public.is_team_member());

-- -------------------------------------------------------------
-- Bucket de documentos de proposta (.docx gerados pelo HERMES)
-- Público: o link precisa poder ser compartilhado com o cliente.
-- A rota /api/hermes/proposals usa o service role (bypassa RLS) para
-- subir o arquivo; as policies abaixo cobrem o acesso vindo do app.
-- -------------------------------------------------------------
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('proposals', 'proposals', true)
    ON CONFLICT (id) DO NOTHING;

    DROP POLICY IF EXISTS "proposals_storage_select" ON storage.objects;
    CREATE POLICY "proposals_storage_select" ON storage.objects
        FOR SELECT USING (bucket_id = 'proposals');

    DROP POLICY IF EXISTS "proposals_storage_insert" ON storage.objects;
    CREATE POLICY "proposals_storage_insert" ON storage.objects
        FOR INSERT WITH CHECK (bucket_id = 'proposals' AND auth.uid() IS NOT NULL);

    DROP POLICY IF EXISTS "proposals_storage_delete" ON storage.objects;
    CREATE POLICY "proposals_storage_delete" ON storage.objects
        FOR DELETE USING (bucket_id = 'proposals' AND auth.uid() IS NOT NULL);
EXCEPTION WHEN insufficient_privilege THEN
    RAISE WARNING 'Sem permissão para configurar o bucket proposals. Crie-o pelo Dashboard (Storage → New bucket, público) e libere INSERT/SELECT/DELETE para usuários autenticados.';
END $$;

NOTIFY pgrst, 'reload schema';
