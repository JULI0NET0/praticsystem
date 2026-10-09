-- =============================================================
-- Prospecção v7: rotina de limpeza menos agressiva.
-- Agendadas só são marcadas como falha após 24h sem confirmação
-- (a sincronização com o WhatsApp é quem confirma envios reais).
-- Idempotente. Rodar DEPOIS da v6.
-- =============================================================

CREATE OR REPLACE FUNCTION public.prospeccao_housekeeping() RETURNS void
LANGUAGE sql AS $$
    UPDATE public.scheduled_messages
       SET status = 'failed', error = 'Sem confirmação de envio (verifique o WhatsApp)', updated_at = NOW()
     WHERE status = 'pending' AND run_at < NOW() - INTERVAL '24 hours';

    UPDATE public.campaigns c
       SET status = 'done', updated_at = NOW()
     WHERE c.status IN ('scheduled', 'running')
       AND EXISTS (SELECT 1 FROM public.scheduled_messages s WHERE s.campaign_id = c.id)
       AND NOT EXISTS (SELECT 1 FROM public.scheduled_messages s WHERE s.campaign_id = c.id AND s.status = 'pending');
$$;

NOTIFY pgrst, 'reload schema';
