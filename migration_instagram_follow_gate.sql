-- =============================================================
-- MIGRAÇÃO: CONTEÚDO EXCLUSIVO PARA SEGUIDORES (FOLLOW GATE)
--
-- Adiciona opções na automação para exigir que o lead siga o perfil
-- antes de liberar o material / link final.
--
-- - `require_follow`: ativa/desativa a trava de seguidor
-- - `follow_gate_message`: mensagem enviada pedindo para seguir
-- - `follow_gate_button_text`: texto do botão de confirmação
--
-- Seguro rodar mais de uma vez (IF NOT EXISTS).
-- =============================================================

ALTER TABLE public.ig_automations
    ADD COLUMN IF NOT EXISTS require_follow BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS follow_gate_message TEXT,
    ADD COLUMN IF NOT EXISTS follow_gate_button_text TEXT;

NOTIFY pgrst, 'reload schema';
