-- =============================================================
-- MIGRAÇÃO: CONTAGEM ATÔMICA DE VISUALIZAÇÕES DOS MATERIAIS
--
-- A página pública lia view_count e gravava +1 em seguida: dois acessos
-- ao mesmo tempo contavam só um. Esta função faz o incremento direto no
-- banco, numa única instrução.
--
-- Sem rodar esta migração tudo continua funcionando (o app cai no
-- incremento antigo); só a contagem sob acessos simultâneos fica imprecisa.
--
-- Seguro rodar mais de uma vez.
-- =============================================================

CREATE OR REPLACE FUNCTION public.increment_ig_material_views(p_slug TEXT)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE public.ig_materials
       SET view_count = view_count + 1
     WHERE slug = p_slug
       AND is_active = TRUE
    RETURNING view_count;
$$;

-- Só o servidor (service_role) chama; navegador anônimo não.
REVOKE ALL ON FUNCTION public.increment_ig_material_views(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_ig_material_views(TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
