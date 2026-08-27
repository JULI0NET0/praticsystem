-- ============================================================================
-- Atualiza a restrição CHECK de content_type na tabela demands para incluir
-- todos os formatos suportados pelo sistema ('carrossel', 'imagem_frase', 'criativo')
-- ============================================================================

ALTER TABLE public.demands DROP CONSTRAINT IF EXISTS demands_content_type_check;
ALTER TABLE public.demands
    ADD CONSTRAINT demands_content_type_check
    CHECK (content_type IS NULL OR content_type IN ('video', 'reels', 'carrossel', 'imagem_frase', 'frase', 'criativo', 'extra'));

NOTIFY pgrst, 'reload schema';
