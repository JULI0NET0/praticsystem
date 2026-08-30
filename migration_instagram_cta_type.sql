-- =============================================================
-- MIGRAÇÃO: 3 FORMATOS DE CTA (link direto / botão fixo / sugestão)
--
-- Substitui a coluna booleana `use_button` por `cta_type`, que
-- comporta 3 formatos:
--   - 'link'        → botão web_url, abre o link na hora (mais rápido,
--                      rastreado via redirect próprio /api/instagram/click)
--   - 'button'      → botão fixo com postback (não some do balão)
--   - 'quick_reply' → sugestão de resposta (some se ignorada)
--
-- Migra os dados existentes (true→'button', false→'quick_reply') e
-- remove a coluna antiga.
--
-- Seguro rodar mais de uma vez.
-- =============================================================

ALTER TABLE public.ig_automations
    ADD COLUMN IF NOT EXISTS cta_type TEXT NOT NULL DEFAULT 'button'
        CHECK (cta_type IN ('link', 'button', 'quick_reply'));

ALTER TABLE public.ig_message_queue
    ADD COLUMN IF NOT EXISTS cta_type TEXT NOT NULL DEFAULT 'button'
        CHECK (cta_type IN ('link', 'button', 'quick_reply'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ig_automations' AND column_name = 'use_button'
  ) THEN
    UPDATE public.ig_automations SET cta_type = CASE WHEN use_button THEN 'button' ELSE 'quick_reply' END;
    ALTER TABLE public.ig_automations DROP COLUMN use_button;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ig_message_queue' AND column_name = 'use_button'
  ) THEN
    UPDATE public.ig_message_queue SET cta_type = CASE WHEN use_button THEN 'button' ELSE 'quick_reply' END;
    ALTER TABLE public.ig_message_queue DROP COLUMN use_button;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
