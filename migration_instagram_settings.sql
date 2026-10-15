-- =============================================================
-- MIGRAÇÃO: CONFIGURAÇÕES DO PRATICCHAT (boas-vindas)
--
-- Tabela de uma linha só, separada de ig_config: reconectar a conta apaga e
-- recria ig_config, e as preferências não podem se perder junto.
--
-- Seguro rodar mais de uma vez.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.ig_settings (
    id                   INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    welcome_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
    welcome_text         TEXT,
    welcome_button_text  TEXT,
    welcome_button_url   TEXT,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.ig_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.ig_settings ENABLE ROW LEVEL SECURITY;
