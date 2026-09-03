-- =============================================================
-- MIGRAÇÃO: VARIAÇÕES DE RESPOSTA AO COMENTÁRIO
--
-- Evita repetição robótica: em vez de 1 texto fixo, a automação
-- guarda várias variações em `comment_reply_texts` e o motor
-- escolhe uma aleatoriamente a cada resposta pública no
-- comentário (o envio da DM com o material não muda).
--
-- `comment_reply_text` (singular) é mantido só como legado/fallback
-- de leitura para automações antigas — o app para de gravar nele.
--
-- Seguro rodar mais de uma vez.
-- =============================================================

ALTER TABLE public.ig_automations
    ADD COLUMN IF NOT EXISTS comment_reply_texts TEXT[] NOT NULL DEFAULT '{}';

-- Backfill: automações antigas com 1 texto único viram array de 1 item
UPDATE public.ig_automations
   SET comment_reply_texts = ARRAY[comment_reply_text]
 WHERE comment_reply_text IS NOT NULL
   AND comment_reply_text <> ''
   AND comment_reply_texts = '{}';

NOTIFY pgrst, 'reload schema';
