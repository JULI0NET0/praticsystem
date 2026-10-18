-- Coloca as demandas na publicação do Realtime para o app do Mac (e qualquer
-- outro cliente) receber as mudanças na hora, em vez de recarregar a cada 30 s.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'demands') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.demands;
    END IF;
END $$;
