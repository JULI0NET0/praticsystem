-- =============================================================
-- MIGRAÇÃO: PASTAS DE CAPTAÇÃO NO GOOGLE DRIVE
--
-- Cada registro é uma pasta "CAP. [CLIENTE] DD-MM-AA" criada pelo
-- sistema dentro da pasta do cliente no Drive, com as subpastas
-- (nome, id e link) guardadas em `subfolders`, para abrir direto
-- pela página do cliente sem navegar pelo Drive.
--
-- Leitura e escrita só via service role (rotas em
-- src/app/api/clients/[id]/drive/capture).
--
-- Seguro rodar mais de uma vez.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.client_capture_folders (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id     UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    capture_date  DATE,
    folder_id     TEXT NOT NULL,
    folder_url    TEXT NOT NULL,
    subfolders    JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS client_capture_folders_client_idx
    ON public.client_capture_folders (client_id, capture_date DESC);

ALTER TABLE public.client_capture_folders ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
