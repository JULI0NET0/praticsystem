-- =============================================================
-- MIGRAÇÃO: DRENAGEM AUTOMÁTICA DA FILA DE DMs (pg_cron + pg_net)
--
-- Roda a cada 1 minuto dentro do próprio Supabase: chama a rota
-- /api/instagram/queue/drain do site publicado, que envia as DMs
-- pendentes respeitando o teto de envios por hora (IG_HOURLY_SEND_CAP).
--
-- ⚠️ ANTES DE RODAR: troque o texto COLE_AQUI_O_IG_CRON_SECRET abaixo
-- pelo valor real da variável IG_CRON_SECRET (está no seu .env.local
-- e também precisa estar cadastrada na Vercel). Cole o valor real
-- só na caixa do SQL Editor na hora de rodar — não deixe o valor
-- real neste arquivo se ele for versionado no Git.
--
-- Seguro rodar mais de uma vez (substitui o agendamento anterior).
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ig-drain-queue') THEN
    PERFORM cron.unschedule('ig-drain-queue');
  END IF;
END $$;

SELECT cron.schedule(
  'ig-drain-queue',
  '* * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://praticsystem.vercel.app/api/instagram/queue/drain',
    headers := jsonb_build_object(
      'Authorization', 'Bearer COLE_AQUI_O_IG_CRON_SECRET',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $cron$
);
