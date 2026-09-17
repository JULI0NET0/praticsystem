-- =============================================================
-- MIGRAÇÃO: QR CODES DINÂMICOS
--
-- Cada registro é um link curto e estável (/q/[slug]) que
-- redireciona para `destination_url`. O destino pode ser trocado
-- a qualquer momento sem precisar gerar um novo QR Code, porque
-- a imagem gerada em /api/qrcodes/[id]/image sempre encoda a URL
-- curta (o slug), nunca o destino em si.
--
-- `client_id` nulo = QR de uso próprio (Prátic Labs); preenchido
-- = QR cadastrado para uso de um cliente específico. Gestão é
-- feita só pelo admin (ver src/app/admin/qrcodes) — não há tela
-- equivalente no portal do cliente na v1.
--
-- Seguro rodar mais de uma vez.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.qr_links (
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug             TEXT NOT NULL UNIQUE,
    title            TEXT NOT NULL,
    destination_url  TEXT NOT NULL,
    client_id        UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    is_active        BOOLEAN NOT NULL DEFAULT true,
    click_count      INT NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS qr_links_slug_idx ON public.qr_links (slug);
CREATE INDEX IF NOT EXISTS qr_links_active_idx ON public.qr_links (is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS qr_links_client_idx ON public.qr_links (client_id);

ALTER TABLE public.qr_links ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
