-- =============================================================
-- BLOCO 17: GAMIFICAÇÃO — PONTOS E RANKING
-- Log de eventos de pontuação (não um contador): permite agregar
-- por dia/semana/mês/total e por usuário sem perder histórico.
-- Só gravável pelas triggers SECURITY DEFINER abaixo — nunca direto
-- pelo cliente (ao contrário do padrão workspace_settings do Pomodoro,
-- que qualquer usuário autenticado pode editar via RLS de `users`).
--
-- Já incorporado ao setup_database.sql (BLOCO 17). Este arquivo é
-- só uma cópia avulsa para aplicar direto no SQL Editor do Supabase,
-- seguindo o mesmo padrão dos outros migration_*.sql deste repo.
-- Idempotente: pode rodar mais de uma vez sem problema.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.points_events (
    id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type   TEXT NOT NULL CHECK (event_type IN (
                     'demand_completed', 'checklist_item_completed', 'on_time_bonus'
                 )),
    source_table TEXT NOT NULL CHECK (source_table IN ('demands', 'demand_checklist')),
    source_id    UUID NOT NULL,
    points       INTEGER NOT NULL CHECK (points > 0),
    occurred_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Dedup: alternar done->undone->done (ou fechado->reaberto->fechado) não
    -- gera pontos duplicados. Mesma demanda pode ter DUAS linhas legítimas
    -- (event_type='demand_completed' + event_type='on_time_bonus'), por isso
    -- a chave é composta, não só source_id.
    UNIQUE (source_id, event_type)
);

CREATE INDEX IF NOT EXISTS points_events_user_occurred_idx
    ON public.points_events (user_id, occurred_at);
CREATE INDEX IF NOT EXISTS points_events_occurred_idx
    ON public.points_events (occurred_at);

ALTER TABLE public.points_events ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer membro da equipe vê todos os eventos (necessário para
-- o ranking mostrar os pontos de todo mundo, não só os próprios).
DROP POLICY IF EXISTS "points_events_select" ON public.points_events;
CREATE POLICY "points_events_select" ON public.points_events
    FOR SELECT USING (public.is_team_member());

-- Propositalmente SEM policies de INSERT/UPDATE/DELETE: RLS nega tudo que
-- não tem policy correspondente. A única forma de gravar é através das
-- funções SECURITY DEFINER abaixo, que rodam como DONO da tabela (owner
-- por padrão não é restringido por RLS). Isso fecha a brecha que existe
-- hoje em `users_update` (qualquer autenticado grava em workspace_settings).

-- -------------------------------------------------------------
-- 17.1 Valores de pontuação por tipo de ação. Postgres não tem
-- constantes de verdade fora de função — os valores ficam hardcoded
-- nas duas funções abaixo E espelhados em src/lib/points.ts no
-- frontend. Se mudar aqui, mudar lá também.
--   demand_completed          = 10
--   checklist_item_completed  = 2
--   on_time_bonus             = 5
-- -------------------------------------------------------------

-- -------------------------------------------------------------
-- 17.2 Trigger: demanda concluída
-- Roda AFTER UPDATE (depois de demands_sync_derived, BEFORE, já ter
-- calculado status_category/completed_at) — só quando a categoria
-- MUDA para 'fechado'.
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.demands_award_points()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    actor UUID := auth.uid();
BEGIN
    -- Sem usuário autenticado (ex.: import/service role) -> não atribui a ninguém
    IF actor IS NULL THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.points_events (user_id, event_type, source_table, source_id, points, occurred_at)
    VALUES (actor, 'demand_completed', 'demands', NEW.id, 10, NEW.completed_at)
    ON CONFLICT (source_id, event_type) DO NOTHING;

    -- No prazo = concluída no dia calendário de SP em que due_date cai, ou antes.
    -- due_date é DATE (sem hora); completed_at é convertido para o fuso de SP
    -- antes de virar data, para não julgar "atrasado" por causa do UTC.
    IF NEW.due_date IS NOT NULL
       AND (NEW.completed_at AT TIME ZONE 'America/Sao_Paulo')::date <= NEW.due_date THEN
        INSERT INTO public.points_events (user_id, event_type, source_table, source_id, points, occurred_at)
        VALUES (actor, 'on_time_bonus', 'demands', NEW.id, 5, NEW.completed_at)
        ON CONFLICT (source_id, event_type) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS demands_award_points ON public.demands;
CREATE TRIGGER demands_award_points
    AFTER UPDATE ON public.demands
    FOR EACH ROW
    WHEN (NEW.status_category = 'fechado' AND OLD.status_category IS DISTINCT FROM 'fechado')
    EXECUTE FUNCTION public.demands_award_points();

-- -------------------------------------------------------------
-- 17.3 Trigger: item de checklist concluído
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.demand_checklist_award_points()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    actor UUID := auth.uid();
BEGIN
    IF actor IS NULL THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.points_events (user_id, event_type, source_table, source_id, points, occurred_at)
    VALUES (actor, 'checklist_item_completed', 'demand_checklist', NEW.id, 2, NEW.done_at)
    ON CONFLICT (source_id, event_type) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS demand_checklist_award_points ON public.demand_checklist;
CREATE TRIGGER demand_checklist_award_points
    AFTER UPDATE ON public.demand_checklist
    FOR EACH ROW
    WHEN (NEW.done = true AND OLD.done = false)
    EXECUTE FUNCTION public.demand_checklist_award_points();

-- -------------------------------------------------------------
-- 17.4 RPC de ranking agregado
-- SECURITY INVOKER (padrão) de propósito: a policy de SELECT em
-- points_events já resolve quem pode ver o quê — não precisa reforçar
-- com SECURITY DEFINER + checagem manual.
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_points_ranking(p_period TEXT)
RETURNS TABLE (
    user_id          UUID,
    name             TEXT,
    username         TEXT,
    avatar_url       TEXT,
    role             TEXT,
    demand_points    BIGINT,
    checklist_points BIGINT,
    bonus_points     BIGINT,
    total_points     BIGINT,
    rank             BIGINT
)
LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
    sp_today_start TIMESTAMPTZ;
    period_start   TIMESTAMPTZ;
BEGIN
    -- Mesma fórmula de getDateRange() em src/app/admin/management/page.tsx:
    -- meia-noite de HOJE no fuso de SP, com offset fixo -03:00 (Brasil não
    -- observa horário de verão desde 2019).
    sp_today_start := (to_char(NOW() AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') || 'T00:00:00-03:00')::timestamptz;

    period_start := CASE p_period
        WHEN 'today' THEN sp_today_start
        WHEN 'week'  THEN sp_today_start - INTERVAL '7 days'
        WHEN 'month' THEN sp_today_start - INTERVAL '30 days'
        ELSE NULL  -- 'all'
    END;

    RETURN QUERY
    SELECT
        u.id,
        u.name,
        u.username,
        u.avatar_url,
        u.role,
        COALESCE(SUM(pe.points) FILTER (WHERE pe.event_type = 'demand_completed'), 0)::BIGINT,
        COALESCE(SUM(pe.points) FILTER (WHERE pe.event_type = 'checklist_item_completed'), 0)::BIGINT,
        COALESCE(SUM(pe.points) FILTER (WHERE pe.event_type = 'on_time_bonus'), 0)::BIGINT,
        COALESCE(SUM(pe.points), 0)::BIGINT AS total_points,
        RANK() OVER (ORDER BY COALESCE(SUM(pe.points), 0) DESC) AS rank
    FROM public.users u
    LEFT JOIN public.points_events pe
        ON pe.user_id = u.id
       AND (period_start IS NULL OR pe.occurred_at >= period_start)
    WHERE u.role IN ('admin', 'board', 'social_media', 'filmmaker')
    GROUP BY u.id, u.name, u.username, u.avatar_url, u.role
    ORDER BY total_points DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_points_ranking(TEXT) TO authenticated;

-- Atualiza o cache do schema no Supabase
NOTIFY pgrst, 'reload schema';
