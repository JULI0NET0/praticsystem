-- =============================================================
-- Prospecção v6: rotina de limpeza no próprio banco (pg_cron).
-- Substitui o cron da Vercel: marca agendadas vencidas como falha
-- e encerra campanhas concluídas, de hora em hora. Idempotente.
-- Rodar DEPOIS da v5.
-- =============================================================

CREATE OR REPLACE FUNCTION public.prospeccao_housekeeping() RETURNS void
LANGUAGE sql AS $$
    -- Agendadas que passaram 1h do horário sem o webhook confirmar o envio
    UPDATE public.scheduled_messages
       SET status = 'failed', error = 'Sem confirmação de envio', updated_at = NOW()
     WHERE status = 'pending' AND run_at < NOW() - INTERVAL '1 hour';

    -- Campanhas cujos envios todos já foram resolvidos
    UPDATE public.campaigns c
       SET status = 'done', updated_at = NOW()
     WHERE c.status IN ('scheduled', 'running')
       AND EXISTS (SELECT 1 FROM public.scheduled_messages s WHERE s.campaign_id = c.id)
       AND NOT EXISTS (SELECT 1 FROM public.scheduled_messages s WHERE s.campaign_id = c.id AND s.status = 'pending');
$$;

-- Agenda de hora em hora. Se a extensão não puder ser ativada por aqui,
-- ative em Database > Extensions > pg_cron e rode este arquivo de novo.
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    PERFORM cron.schedule('prospeccao-housekeeping', '0 * * * *', 'SELECT public.prospeccao_housekeeping()');
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron indisponível (%). A função public.prospeccao_housekeeping() foi criada; ative a extensão e rode de novo.', SQLERRM;
END $$;

NOTIFY pgrst, 'reload schema';
