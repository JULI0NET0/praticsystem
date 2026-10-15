-- =============================================================
-- MIGRAÇÃO: CONTATOS DO INSTAGRAM COM PERFIL (PraticChat)
--
-- Guarda nome, foto e origem de cada contato para o painel parar de
-- mostrar só o IGSID. Também prepara as boas-vindas (welcomed_at).
--
-- Seguro rodar mais de uma vez.
-- =============================================================

ALTER TABLE public.ig_contacts
  ADD COLUMN IF NOT EXISTS name             TEXT,
  ADD COLUMN IF NOT EXISTS profile_pic_url  TEXT,
  ADD COLUMN IF NOT EXISTS source           TEXT CHECK (source IN ('comment', 'dm', 'button')),
  ADD COLUMN IF NOT EXISTS interactions     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_follower      BOOLEAN,
  ADD COLUMN IF NOT EXISTS profile_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS welcomed_at      TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS ig_contacts_first_seen_idx ON public.ig_contacts (first_seen_at DESC);
CREATE INDEX IF NOT EXISTS ig_contacts_last_seen_idx  ON public.ig_contacts (last_seen_at DESC);
