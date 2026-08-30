-- =============================================================
-- MIGRAÇÃO: BOTÃO FIXO vs SUGESTÃO DE RESPOSTA (quick reply)
--
-- Cada automação escolhe como a DM chega: botão fixo (postback,
-- fica dentro do balão) ou sugestão de resposta (quick_reply, some
-- se ignorada). `ig_message_queue.use_button` guarda uma cópia da
-- escolha no momento do envio, pra não mudar retroativamente itens
-- já enfileirados se a automação for editada depois.
--
-- Seguro rodar mais de uma vez (IF NOT EXISTS / coluna já existente).
-- =============================================================

ALTER TABLE public.ig_automations
    ADD COLUMN IF NOT EXISTS use_button BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.ig_message_queue
    ADD COLUMN IF NOT EXISTS use_button BOOLEAN NOT NULL DEFAULT true;

NOTIFY pgrst, 'reload schema';
