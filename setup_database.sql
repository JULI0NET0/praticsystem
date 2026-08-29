-- =============================================================
-- PRATIC SYSTEM — Setup do Banco de Dados Supabase
-- Execute este script no Supabase → SQL Editor → Run
-- É seguro rodar múltiplas vezes (IF NOT EXISTS / DROP IF EXISTS)
-- =============================================================


-- =============================================================
-- BLOCO 1: TABELA CLIENTS
-- =============================================================

CREATE TABLE IF NOT EXISTS public.clients (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sequential_id   SERIAL,
    name            TEXT NOT NULL,
    nome_fantasia   TEXT,
    cnpj            TEXT NOT NULL DEFAULT '',
    tipo_pessoa     TEXT CHECK (tipo_pessoa IN ('PF', 'PJ')) DEFAULT 'PJ',
    contact_name    TEXT NOT NULL DEFAULT '',
    email           TEXT NOT NULL DEFAULT '',
    email_financeiro TEXT,
    phone           TEXT NOT NULL DEFAULT '',
    whatsapp_financeiro TEXT,
    telefone_fixo   TEXT,
    setor           TEXT,
    website         TEXT,
    sistema_proprio TEXT,
    address         JSONB,
    status          TEXT CHECK (status IN ('active', 'inactive', 'prospect')) DEFAULT 'prospect',
    social_access   JSONB,
    portal_email    TEXT,
    portal_password TEXT,
    briefing        TEXT,
    servico_interesse TEXT,
    onboarding_date DATE,
    google_drive_url TEXT,
    essential_links JSONB DEFAULT '[]'::jsonb,
    drive_settings  JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Garante colunas em instâncias antigas
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS sequential_id      SERIAL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS nome_fantasia      TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS email_financeiro   TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS whatsapp_financeiro TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS telefone_fixo      TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS setor              TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS website            TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS sistema_proprio    TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS portal_email       TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS portal_password    TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS briefing           TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS servico_interesse  TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS onboarding_date    DATE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS google_drive_url     TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS essential_links      JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS drive_settings       JSONB;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS brand_drive_url      TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS brand_canva_url      TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS brand_pinterest_url  TEXT;


-- =============================================================
-- BLOCO 2: SERVIÇOS
-- =============================================================

CREATE TABLE IF NOT EXISTS public.services (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name          TEXT NOT NULL,
    description   TEXT,
    price         NUMERIC NOT NULL DEFAULT 0,
    is_recurring  BOOLEAN NOT NULL DEFAULT true,
    category      TEXT NOT NULL DEFAULT 'outros',
    billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly', 'one_time')),
    minimum_term  INT,
    observations  TEXT,
    descriptive   TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================================
-- BLOCO 3: CONTRATOS
-- =============================================================

CREATE TABLE IF NOT EXISTS public.contracts (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id           UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    service_id          UUID REFERENCES public.services(id) ON DELETE SET NULL,
    status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expiring', 'expired')),
    start_date          DATE NOT NULL,
    end_date            DATE NOT NULL,
    value               NUMERIC NOT NULL DEFAULT 0,
    auto_renew          BOOLEAN NOT NULL DEFAULT false,
    billing_cycle       TEXT CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly', 'one_time')),
    minimum_term        INT,
    posts_per_week      INT,
    content_capture     BOOLEAN DEFAULT false,
    capture_frequency   TEXT,
    document_content    TEXT,
    document_status     TEXT DEFAULT 'pending' CHECK (document_status IN ('pending', 'generated', 'sent', 'signed')),
    signed_document_url TEXT,
    contract_number     INT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS document_content    TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS document_status     TEXT DEFAULT 'pending';
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS signed_document_url TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS contract_number     INT;


-- =============================================================
-- BLOCO 4: FATURAS (invoices)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.invoices (
    id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id         UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    contract_id       UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    amount            NUMERIC NOT NULL DEFAULT 0,
    due_date          DATE NOT NULL,
    status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
    description       TEXT NOT NULL DEFAULT '',
    asaas_payment_id  TEXT,
    paid_at           TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS paid_at          TIMESTAMPTZ;


-- =============================================================
-- BLOCO 5: TABELAS FINANCEIRAS (despesas)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.expenses (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    description     TEXT NOT NULL,
    category        TEXT NOT NULL CHECK (category IN ('pro_labore', 'funcionario_pj', 'sistema', 'internet', 'outros')),
    amount          NUMERIC NOT NULL,
    due_day         INT,
    recurrence      TEXT NOT NULL CHECK (recurrence IN ('monthly', 'quarterly', 'yearly', 'one_time')),
    status          TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    related_user_id UUID,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.expense_entries (
    id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    expense_id            UUID REFERENCES public.expenses(id),
    description           TEXT NOT NULL,
    amount                NUMERIC NOT NULL,
    date                  DATE NOT NULL,
    status                TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    asaas_transaction_id  TEXT UNIQUE,
    category              TEXT,
    notes                 TEXT,
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Cache de transações do Asaas (depende de invoices e expense_entries)
CREATE TABLE IF NOT EXISTS public.asaas_transactions (
    id               TEXT PRIMARY KEY,
    description      TEXT,
    value            NUMERIC,
    type             TEXT CHECK (type IN ('CREDIT', 'DEBIT')),
    date             DATE,
    status           TEXT,
    expense_entry_id UUID REFERENCES public.expense_entries(id) ON DELETE SET NULL,
    invoice_id       UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    client_id        UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    transfer_id      TEXT,
    payment_id       TEXT,
    synced_at        TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================================
-- BLOCO 6: AGENDA EVENTS
-- =============================================================

CREATE TABLE IF NOT EXISTS public.agenda_events (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title       TEXT NOT NULL,
    type        TEXT NOT NULL CHECK (type IN ('meeting', 'prospecting', 'task', 'social_media', 'ads', 'launch', 'payment')),
    date        TIMESTAMPTZ NOT NULL,
    client_id   UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    visibility  TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
    status      TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed')),
    description TEXT,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Garante colunas em instâncias antigas (sem NOT NULL para não falhar em tabelas com dados)
ALTER TABLE public.agenda_events ADD COLUMN IF NOT EXISTS type        TEXT;
ALTER TABLE public.agenda_events ADD COLUMN IF NOT EXISTS client_id   UUID REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.agenda_events ADD COLUMN IF NOT EXISTS visibility  TEXT DEFAULT 'public';
ALTER TABLE public.agenda_events ADD COLUMN IF NOT EXISTS status      TEXT DEFAULT 'scheduled';
ALTER TABLE public.agenda_events ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.agenda_events ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agenda_select" ON public.agenda_events;
CREATE POLICY "agenda_select" ON public.agenda_events
    FOR SELECT USING (
        visibility = 'public'
        OR (auth.uid())::text = (assigned_to)::text
    );

DROP POLICY IF EXISTS "agenda_insert" ON public.agenda_events;
CREATE POLICY "agenda_insert" ON public.agenda_events
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "agenda_update" ON public.agenda_events;
CREATE POLICY "agenda_update" ON public.agenda_events
    FOR UPDATE USING ((auth.uid())::text = (assigned_to)::text);

DROP POLICY IF EXISTS "agenda_delete" ON public.agenda_events;
CREATE POLICY "agenda_delete" ON public.agenda_events
    FOR DELETE USING ((auth.uid())::text = (assigned_to)::text);


-- =============================================================
-- BLOCO 7: NOTAS INTERNAS (notes)
-- Colunas usadas pelo código:
--   id, user_id, title, content (JSONB TipTap), date, subjects (TEXT[]),
--   client_id, shared_with (UUID[]), share_all, pin_to_client,
--   created_at, updated_at
-- =============================================================

CREATE TABLE IF NOT EXISTS public.notes (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title         TEXT NOT NULL DEFAULT '',
    content       JSONB DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
    date          DATE NOT NULL DEFAULT CURRENT_DATE,
    subjects      TEXT[] DEFAULT '{}',
    client_id     UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    shared_with   UUID[] DEFAULT '{}',
    share_all     BOOLEAN NOT NULL DEFAULT false,
    pin_to_client BOOLEAN NOT NULL DEFAULT false,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Garante colunas em instâncias antigas
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS subjects      TEXT[] DEFAULT '{}';
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS shared_with   UUID[] DEFAULT '{}';
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS share_all     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS pin_to_client BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS client_id     UUID REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS plan_id       UUID REFERENCES public.content_plans(id) ON DELETE SET NULL;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS is_script     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS demand_id     UUID REFERENCES public.demands(id) ON DELETE SET NULL;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ DEFAULT NOW();

-- Trigger: atualiza updated_at automaticamente a cada UPDATE
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notes_set_updated_at ON public.notes;
CREATE TRIGGER notes_set_updated_at
    BEFORE UPDATE ON public.notes
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Usuário vê: próprias notas + share_all + notas onde está em shared_with
DROP POLICY IF EXISTS "notes_select" ON public.notes;
CREATE POLICY "notes_select" ON public.notes
    FOR SELECT USING (
        (auth.uid())::text = (user_id)::text
        OR share_all = true
        OR (auth.uid())::text = ANY(shared_with::text[])
    );

DROP POLICY IF EXISTS "notes_insert" ON public.notes;
CREATE POLICY "notes_insert" ON public.notes
    FOR INSERT WITH CHECK ((auth.uid())::text = (user_id)::text);

DROP POLICY IF EXISTS "notes_update" ON public.notes;
CREATE POLICY "notes_update" ON public.notes
    FOR UPDATE USING ((auth.uid())::text = (user_id)::text);

DROP POLICY IF EXISTS "notes_delete" ON public.notes;
CREATE POLICY "notes_delete" ON public.notes
    FOR DELETE USING ((auth.uid())::text = (user_id)::text);


-- =============================================================
-- BLOCO 8: CLIENTES DE AMOSTRA (REMOVIDO PARA EVITAR DUPLICATAS)
-- Clientes devem ser gerenciados pelo painel ou integração Asaas
-- =============================================================


-- =============================================================
-- BLOCO 9: USUÁRIOS INTERNOS (users)
-- Espelha auth.users com dados de perfil da equipe
-- =============================================================

CREATE TABLE IF NOT EXISTS public.users (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL DEFAULT '',
    email           TEXT NOT NULL DEFAULT '',
    username        TEXT UNIQUE,
    role            TEXT,
    status_message  TEXT,
    avatar_url      TEXT,
    phone           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status_message TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url     TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone          TEXT;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select" ON public.users;
CREATE POLICY "users_select" ON public.users
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "users_insert" ON public.users;
CREATE POLICY "users_insert" ON public.users
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "users_update" ON public.users;
CREATE POLICY "users_update" ON public.users
    FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "users_delete" ON public.users;
CREATE POLICY "users_delete" ON public.users
    FOR DELETE USING (auth.uid() IS NOT NULL);


-- =============================================================
-- BLOCO 10: CARGOS E PERMISSÕES (roles)
-- id é slug TEXT (ex: 'admin', 'social_media')
-- permissions é TEXT[] para corresponder ao tipo TypeScript
-- =============================================================

CREATE TABLE IF NOT EXISTS public.roles (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    permissions TEXT[] NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Cargos são públicos para leitura (necessário no formulário de criação de usuário)
DROP POLICY IF EXISTS "roles_select" ON public.roles;
CREATE POLICY "roles_select" ON public.roles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "roles_insert" ON public.roles;
CREATE POLICY "roles_insert" ON public.roles
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "roles_update" ON public.roles;
CREATE POLICY "roles_update" ON public.roles
    FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "roles_delete" ON public.roles;
CREATE POLICY "roles_delete" ON public.roles
    FOR DELETE USING (auth.uid() IS NOT NULL);


-- =============================================================
-- BLOCO 11: DEMANDAS DA AGÊNCIA
-- Área /admin/demandas — demandas de cliente e internas/operacionais.
-- A tabela `demands` já existia em produção (somente leitura em
-- workspace / dashboard / clients / users / portal do cliente);
-- aqui ela ganha as colunas novas SEM perder os dados existentes.
-- =============================================================

-- -------------------------------------------------------------
-- 11.1 Status personalizáveis (globais da área)
-- id é slug TEXT, mesmo padrão da tabela roles
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.demand_statuses (
    id         TEXT PRIMARY KEY,
    label      TEXT NOT NULL,
    color      TEXT NOT NULL DEFAULT '#8a8a83',
    category   TEXT NOT NULL DEFAULT 'ativo'
               CHECK (category IN ('nao_iniciado', 'ativo', 'fechado')),
    position   INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed: estes 5 slugs são exatamente os valores que o código legado
-- já consulta em demands.status — não renomear.
INSERT INTO public.demand_statuses (id, label, color, category, position) VALUES
    ('pending',       'A fazer',      '#8a8a83', 'nao_iniciado', 0),
    ('in_production', 'Em produção',  '#d97757', 'ativo',        1),
    ('review',        'Em revisão',   '#c2833a', 'ativo',        2),
    ('approved',      'Aprovado',     '#5b7f5b', 'ativo',        3),
    ('completed',     'Concluído',    '#6a7f8f', 'fechado',      4)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.demand_statuses ENABLE ROW LEVEL SECURITY;

-- Leitura pública: o portal do cliente precisa resolver o rótulo do status
DROP POLICY IF EXISTS "demand_statuses_select" ON public.demand_statuses;
CREATE POLICY "demand_statuses_select" ON public.demand_statuses
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "demand_statuses_insert" ON public.demand_statuses;
CREATE POLICY "demand_statuses_insert" ON public.demand_statuses
    FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid()));

DROP POLICY IF EXISTS "demand_statuses_update" ON public.demand_statuses;
CREATE POLICY "demand_statuses_update" ON public.demand_statuses
    FOR UPDATE USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid()));

DROP POLICY IF EXISTS "demand_statuses_delete" ON public.demand_statuses;
CREATE POLICY "demand_statuses_delete" ON public.demand_statuses
    FOR DELETE USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid()));


-- -------------------------------------------------------------
-- 11.2 Demandas
-- client_id NULL = demanda interna/operacional
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.demands (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title           TEXT NOT NULL DEFAULT '',
    description     JSONB,
    client_id       UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    scope           TEXT NOT NULL DEFAULT 'internal' CHECK (scope IN ('client', 'internal')),
    status          TEXT NOT NULL DEFAULT 'pending',
    status_category TEXT NOT NULL DEFAULT 'nao_iniciado',
    priority        TEXT NOT NULL DEFAULT 'none'
                    CHECK (priority IN ('none', 'low', 'medium', 'high', 'urgent')),
    assignee_ids    UUID[] NOT NULL DEFAULT '{}',
    assigned_to     UUID,
    assign_all_team BOOLEAN NOT NULL DEFAULT false,
    created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    start_date      DATE,
    due_date        DATE,
    due_time        TIME,
    position        DOUBLE PRECISION NOT NULL DEFAULT 0,
    completed_at    TIMESTAMPTZ,
    type            TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Remove TODA constraint CHECK antiga de `demands` antes de mexer nos dados.
-- A instância de produção tem CHECKs herdados em status e priority; se eles
-- ficarem, criar um status personalizado ou usar priority='none' quebra.
-- As CHECKs que queremos manter são recriadas mais abaixo.
DO $$
DECLARE con RECORD;
BEGIN
    FOR con IN
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'public.demands'::regclass AND contype = 'c'
    LOOP
        EXECUTE format('ALTER TABLE public.demands DROP CONSTRAINT %I', con.conname);
    END LOOP;
END $$;

-- Garante colunas em instâncias antigas (a tabela já existe em produção)
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS description     JSONB;

-- Em produção `description` nasceu TEXT. Converte para JSONB preservando o
-- conteúdo: o texto vira um parágrafo no formato TipTap que o editor entende.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'demands'
          AND column_name = 'description' AND data_type <> 'jsonb'
    ) THEN
        ALTER TABLE public.demands
            ALTER COLUMN description TYPE JSONB
            USING CASE
                WHEN description IS NULL OR btrim(description::text) = '' THEN NULL
                ELSE jsonb_build_object(
                    'type', 'doc',
                    'content', jsonb_build_array(jsonb_build_object(
                        'type', 'paragraph',
                        'content', jsonb_build_array(jsonb_build_object(
                            'type', 'text', 'text', description::text))))
                )
            END;
    END IF;
END $$;
-- Colunas do modelo legado: existem em produção, mas não numa base zerada
-- que já tivesse a tabela por outro caminho. Todas idempotentes.
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS title           TEXT NOT NULL DEFAULT '';
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS client_id       UUID REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS status          TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS priority        TEXT NOT NULL DEFAULT 'none';
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS due_date        DATE;
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS type            TEXT;
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS created_at      TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS scope           TEXT NOT NULL DEFAULT 'internal';
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS status_category TEXT NOT NULL DEFAULT 'nao_iniciado';
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS assignee_ids    UUID[] NOT NULL DEFAULT '{}';
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS assigned_to     UUID;
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS assign_all_team BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS start_date      DATE;
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS due_time        TIME;
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS position        DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS completed_at    TIMESTAMPTZ;
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ DEFAULT NOW();

-- Ajusta as colunas herdadas do modelo legado, que foram criadas com tipos e
-- obrigatoriedades incompatíveis com a área de Demandas:
--   client_id NOT NULL  -> demanda interna (sem cliente) seria rejeitada
--   type      NOT NULL  -> criar demanda sem tipo falharia
--   due_date  TIMESTAMPTZ -> a UI grava e lê 'YYYY-MM-DD'
ALTER TABLE public.demands ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE public.demands ALTER COLUMN type      DROP NOT NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'demands'
          AND column_name = 'due_date' AND data_type <> 'date'
    ) THEN
        ALTER TABLE public.demands
            ALTER COLUMN due_date TYPE DATE USING due_date::date;
    END IF;
END $$;

-- Defaults nas colunas legadas NOT NULL: sem isto, um INSERT que omita
-- title/status/priority (ou os mande nulos) é recusado.
ALTER TABLE public.demands ALTER COLUMN title    SET DEFAULT '';
ALTER TABLE public.demands ALTER COLUMN status   SET DEFAULT 'pending';
ALTER TABLE public.demands ALTER COLUMN priority SET DEFAULT 'none';


-- Normaliza linhas legadas antes de aplicar as constraints
UPDATE public.demands SET status = 'pending' WHERE status IS NULL OR status = '';
UPDATE public.demands SET priority = 'none'  WHERE priority IS NULL OR priority = '';
-- Preserva status legados que não estão no seed (ex.: 'in_progress', 'done',
-- 'cancelled'), senão a FK abaixo rejeitaria essas linhas. A categoria é
-- inferida pelo slug; qualquer coisa desconhecida entra como 'ativo'.
INSERT INTO public.demand_statuses (id, label, color, category, position)
SELECT
    s.status,
    initcap(replace(s.status, '_', ' ')),
    '#8a8a83',
    CASE
        WHEN s.status IN ('done', 'completed', 'cancelled', 'archived') THEN 'fechado'
        WHEN s.status IN ('pending', 'backlog', 'todo')                 THEN 'nao_iniciado'
        ELSE 'ativo'
    END,
    90 + row_number() OVER (ORDER BY s.status)
FROM (SELECT DISTINCT status FROM public.demands WHERE status IS NOT NULL AND status <> '') s
ON CONFLICT (id) DO NOTHING;

-- Migra o responsável legado (coluna singular) para o array
UPDATE public.demands
SET assignee_ids = ARRAY[assigned_to]
WHERE assigned_to IS NOT NULL AND assignee_ids = '{}';

-- Recria só as constraints que queremos (as antigas foram removidas acima).
-- ON UPDATE CASCADE: renomear o slug de um status leva as demandas junto.
ALTER TABLE public.demands DROP CONSTRAINT IF EXISTS demands_status_fkey;
ALTER TABLE public.demands
    ADD CONSTRAINT demands_status_fkey
    FOREIGN KEY (status) REFERENCES public.demand_statuses(id) ON UPDATE CASCADE;

ALTER TABLE public.demands
    ADD CONSTRAINT demands_priority_check
    CHECK (priority IN ('none', 'low', 'medium', 'high', 'urgent'));

ALTER TABLE public.demands
    ADD CONSTRAINT demands_scope_check CHECK (scope IN ('client', 'internal'));

ALTER TABLE public.demands
    ADD CONSTRAINT demands_status_category_check
    CHECK (status_category IN ('nao_iniciado', 'ativo', 'fechado'));

CREATE INDEX IF NOT EXISTS demands_client_id_idx  ON public.demands (client_id);
CREATE INDEX IF NOT EXISTS demands_status_idx     ON public.demands (status);
CREATE INDEX IF NOT EXISTS demands_due_date_idx   ON public.demands (due_date);
CREATE INDEX IF NOT EXISTS demands_assignees_idx  ON public.demands USING GIN (assignee_ids);


-- -------------------------------------------------------------
-- 11.3 Trigger: mantém as colunas derivadas em sincronia
-- É isto que preserva os 6 pontos de leitura legados
-- (status/assigned_to) sem que a UI precise saber deles.
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.demands_sync_derived()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    cat TEXT;
BEGIN
    SELECT s.category INTO cat FROM public.demand_statuses s WHERE s.id = NEW.status;
    NEW.status_category := COALESCE(cat, 'ativo');

    IF NEW.status_category = 'fechado' THEN
        NEW.completed_at := COALESCE(NEW.completed_at, NOW());
    ELSE
        NEW.completed_at := NULL;
    END IF;

    NEW.assigned_to := NEW.assignee_ids[1];
    NEW.scope := CASE WHEN NEW.client_id IS NULL THEN 'internal' ELSE 'client' END;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS demands_sync_derived ON public.demands;
CREATE TRIGGER demands_sync_derived
    BEFORE INSERT OR UPDATE ON public.demands
    FOR EACH ROW EXECUTE FUNCTION public.demands_sync_derived();

-- Reprocessa as linhas existentes uma vez (dispara a trigger)
UPDATE public.demands SET title = title;


-- -------------------------------------------------------------
-- 11.4 Comentários
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.demand_comments (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    demand_id  UUID NOT NULL REFERENCES public.demands(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    body       TEXT NOT NULL DEFAULT '',
    edited     BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS demand_comments_demand_idx ON public.demand_comments (demand_id, created_at);

DROP TRIGGER IF EXISTS demand_comments_set_updated_at ON public.demand_comments;
CREATE TRIGGER demand_comments_set_updated_at
    BEFORE UPDATE ON public.demand_comments
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- -------------------------------------------------------------
-- 11.5 Anexos (da demanda ou de um comentário)
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.demand_attachments (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    demand_id  UUID NOT NULL REFERENCES public.demands(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.demand_comments(id) ON DELETE CASCADE,
    user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name       TEXT NOT NULL DEFAULT '',
    file_path  TEXT NOT NULL,
    file_type  TEXT,
    size       BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS demand_attachments_demand_idx  ON public.demand_attachments (demand_id);
CREATE INDEX IF NOT EXISTS demand_attachments_comment_idx ON public.demand_attachments (comment_id);


-- -------------------------------------------------------------
-- 11.6 RLS
-- ATENÇÃO: `demands` é lida pelo portal do cliente com o MESMO
-- client anon da equipe. Uma policy `auth.uid() IS NOT NULL`
-- vazaria demandas internas e de outros clientes.
-- -------------------------------------------------------------

-- Membro da equipe = existe linha correspondente em public.users
CREATE OR REPLACE FUNCTION public.is_team_member()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid());
$$;

-- Demandas visíveis para o usuário logado (equipe: todas; cliente: as suas)
CREATE OR REPLACE FUNCTION public.can_see_demand(d_client_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT public.is_team_member()
        OR (d_client_id IS NOT NULL AND d_client_id IN (
                SELECT c.id FROM public.clients c
                WHERE c.id = auth.uid() OR c.portal_email = (auth.jwt() ->> 'email')
           ));
$$;

ALTER TABLE public.demands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "demands_select" ON public.demands;
CREATE POLICY "demands_select" ON public.demands
    FOR SELECT USING (public.can_see_demand(client_id));

DROP POLICY IF EXISTS "demands_insert" ON public.demands;
CREATE POLICY "demands_insert" ON public.demands
    FOR INSERT WITH CHECK (public.is_team_member());

DROP POLICY IF EXISTS "demands_update" ON public.demands;
CREATE POLICY "demands_update" ON public.demands
    FOR UPDATE USING (public.is_team_member());

DROP POLICY IF EXISTS "demands_delete" ON public.demands;
CREATE POLICY "demands_delete" ON public.demands
    FOR DELETE USING (public.is_team_member());

ALTER TABLE public.demand_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "demand_comments_select" ON public.demand_comments;
CREATE POLICY "demand_comments_select" ON public.demand_comments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.demands d
                WHERE d.id = demand_id AND public.can_see_demand(d.client_id))
    );

DROP POLICY IF EXISTS "demand_comments_insert" ON public.demand_comments;
CREATE POLICY "demand_comments_insert" ON public.demand_comments
    FOR INSERT WITH CHECK (user_id = auth.uid() AND public.is_team_member());

DROP POLICY IF EXISTS "demand_comments_update" ON public.demand_comments;
CREATE POLICY "demand_comments_update" ON public.demand_comments
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "demand_comments_delete" ON public.demand_comments;
CREATE POLICY "demand_comments_delete" ON public.demand_comments
    FOR DELETE USING (user_id = auth.uid());

ALTER TABLE public.demand_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "demand_attachments_select" ON public.demand_attachments;
CREATE POLICY "demand_attachments_select" ON public.demand_attachments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.demands d
                WHERE d.id = demand_id AND public.can_see_demand(d.client_id))
    );

DROP POLICY IF EXISTS "demand_attachments_insert" ON public.demand_attachments;
CREATE POLICY "demand_attachments_insert" ON public.demand_attachments
    FOR INSERT WITH CHECK (public.is_team_member());

DROP POLICY IF EXISTS "demand_attachments_delete" ON public.demand_attachments;
CREATE POLICY "demand_attachments_delete" ON public.demand_attachments
    FOR DELETE USING (public.is_team_member());


-- -------------------------------------------------------------
-- 11.7 Bucket de anexos
-- -------------------------------------------------------------

-- storage.objects pertence a supabase_storage_admin: em alguns projetos o
-- papel do SQL Editor não consegue criar policies nela. Se isso acontecer o
-- bloco avisa e segue — o bucket e as policies podem ser criados na mão em
-- Storage → New bucket ("demand-attachments", público) → Policies.
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('demand-attachments', 'demand-attachments', true)
    ON CONFLICT (id) DO NOTHING;

    DROP POLICY IF EXISTS "demand_attachments_storage_select" ON storage.objects;
    CREATE POLICY "demand_attachments_storage_select" ON storage.objects
        FOR SELECT USING (bucket_id = 'demand-attachments');

    DROP POLICY IF EXISTS "demand_attachments_storage_insert" ON storage.objects;
    CREATE POLICY "demand_attachments_storage_insert" ON storage.objects
        FOR INSERT WITH CHECK (bucket_id = 'demand-attachments' AND auth.uid() IS NOT NULL);

    DROP POLICY IF EXISTS "demand_attachments_storage_delete" ON storage.objects;
    CREATE POLICY "demand_attachments_storage_delete" ON storage.objects
        FOR DELETE USING (bucket_id = 'demand-attachments' AND auth.uid() IS NOT NULL);
EXCEPTION WHEN insufficient_privilege THEN
    RAISE WARNING 'Sem permissão para configurar o bucket demand-attachments. Crie-o pelo Dashboard (Storage → New bucket, público) e libere INSERT/SELECT/DELETE para usuários autenticados.';
END $$;


-- Atualiza o cache do schema no Supabase
NOTIFY pgrst, 'reload schema';


-- =============================================================
-- BLOCO 12: NOTAS A PARTIR DE ÁUDIO (transcrição + organização IA)
-- Extensão da tabela `notes` (BLOCO 7) — não cria tabela nova.
-- raw_transcript é o texto bruto devolvido pelo Whisper (Groq); é
-- persistido separado de `content` para permitir reprocessar a
-- organização (IA) sem re-transcrever o áudio (etapa cara/lenta).
-- =============================================================

ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS raw_transcript    TEXT;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS audio_path        TEXT;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS transcribed_at    TIMESTAMPTZ;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS last_organized_at TIMESTAMPTZ;

-- -------------------------------------------------------------
-- 12.1 Bucket de áudio de reuniões
-- Privado (diferente de notes-attachments): o áudio pode conter
-- conversas sensíveis de cliente. O acesso da Groq à URL usa uma
-- signed URL de curta duração gerada no momento da transcrição
-- (ver src/lib/notesAudio.ts), não uma URL pública.
-- -------------------------------------------------------------

DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('notes-audio', 'notes-audio', false)
    ON CONFLICT (id) DO NOTHING;

    DROP POLICY IF EXISTS "notes_audio_storage_select" ON storage.objects;
    CREATE POLICY "notes_audio_storage_select" ON storage.objects
        FOR SELECT USING (bucket_id = 'notes-audio' AND auth.uid() IS NOT NULL);

    DROP POLICY IF EXISTS "notes_audio_storage_insert" ON storage.objects;
    CREATE POLICY "notes_audio_storage_insert" ON storage.objects
        FOR INSERT WITH CHECK (bucket_id = 'notes-audio' AND auth.uid() IS NOT NULL);

    DROP POLICY IF EXISTS "notes_audio_storage_delete" ON storage.objects;
    CREATE POLICY "notes_audio_storage_delete" ON storage.objects
        FOR DELETE USING (bucket_id = 'notes-audio' AND auth.uid() IS NOT NULL);
EXCEPTION WHEN insufficient_privilege THEN
    RAISE WARNING 'Sem permissão para configurar o bucket notes-audio. Crie-o pelo Dashboard (Storage → New bucket, privado) e libere INSERT/SELECT/DELETE para usuários autenticados.';
END $$;


-- =============================================================
-- BLOCO 13: CHECKLIST DA DEMANDA
-- Etapas e ações dentro de uma demanda. Uma tabela só para dois
-- níveis de exibição: `group_name` é a etapa, `label` é a ação.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.demand_checklist (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    demand_id  UUID NOT NULL REFERENCES public.demands(id) ON DELETE CASCADE,
    group_name TEXT NOT NULL DEFAULT '',
    label      TEXT NOT NULL DEFAULT '',
    done       BOOLEAN NOT NULL DEFAULT false,
    position   INTEGER NOT NULL DEFAULT 0,
    done_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS demand_checklist_demand_idx
    ON public.demand_checklist (demand_id, position);

-- Carimba done_at junto com o done, para relatórios futuros
CREATE OR REPLACE FUNCTION public.demand_checklist_sync_done_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.done AND (OLD IS NULL OR NOT OLD.done) THEN
        NEW.done_at := NOW();
    ELSIF NOT NEW.done THEN
        NEW.done_at := NULL;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS demand_checklist_done_at ON public.demand_checklist;
CREATE TRIGGER demand_checklist_done_at
    BEFORE INSERT OR UPDATE ON public.demand_checklist
    FOR EACH ROW EXECUTE FUNCTION public.demand_checklist_sync_done_at();

ALTER TABLE public.demand_checklist ENABLE ROW LEVEL SECURITY;

-- Somente equipe: o checklist é processo interno ("fazer backup no Drive",
-- "avisar o planejamento"), não deve vazar para o portal do cliente — ao
-- contrário da demanda em si, que o cliente enxerga.
DROP POLICY IF EXISTS "demand_checklist_select" ON public.demand_checklist;
CREATE POLICY "demand_checklist_select" ON public.demand_checklist
    FOR SELECT USING (public.is_team_member());

DROP POLICY IF EXISTS "demand_checklist_insert" ON public.demand_checklist;
CREATE POLICY "demand_checklist_insert" ON public.demand_checklist
    FOR INSERT WITH CHECK (public.is_team_member());

DROP POLICY IF EXISTS "demand_checklist_update" ON public.demand_checklist;
CREATE POLICY "demand_checklist_update" ON public.demand_checklist
    FOR UPDATE USING (public.is_team_member());

DROP POLICY IF EXISTS "demand_checklist_delete" ON public.demand_checklist;
CREATE POLICY "demand_checklist_delete" ON public.demand_checklist
    FOR DELETE USING (public.is_team_member());


-- =============================================================
-- BLOCO 14: TEMPLATES DE DEMANDA
-- Os textos das etapas viram DADOS, para mudar um passo não exigir
-- deploy. Semeados a partir de src/mocks/operacao/templates.ts.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.demand_templates (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    kind        TEXT NOT NULL DEFAULT 'avulso'
                CHECK (kind IN ('conteudo', 'captacao', 'onboarding', 'avulso')),
    description TEXT,
    position    INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.demand_template_items (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id TEXT NOT NULL REFERENCES public.demand_templates(id) ON DELETE CASCADE,
    group_name  TEXT NOT NULL DEFAULT '',
    label       TEXT NOT NULL DEFAULT '',
    position    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS demand_template_items_template_idx
    ON public.demand_template_items (template_id, position);

ALTER TABLE public.demand_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_template_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "demand_templates_select" ON public.demand_templates;
CREATE POLICY "demand_templates_select" ON public.demand_templates
    FOR SELECT USING (public.is_team_member());
DROP POLICY IF EXISTS "demand_templates_write" ON public.demand_templates;
CREATE POLICY "demand_templates_write" ON public.demand_templates
    FOR ALL USING (public.is_team_member()) WITH CHECK (public.is_team_member());

DROP POLICY IF EXISTS "demand_template_items_select" ON public.demand_template_items;
CREATE POLICY "demand_template_items_select" ON public.demand_template_items
    FOR SELECT USING (public.is_team_member());
DROP POLICY IF EXISTS "demand_template_items_write" ON public.demand_template_items;
CREATE POLICY "demand_template_items_write" ON public.demand_template_items
    FOR ALL USING (public.is_team_member()) WITH CHECK (public.is_team_member());

-- ---- Seed ---------------------------------------------------
-- Idempotente: os templates usam slug como PK e os itens só entram
-- se aquele template ainda não tiver item nenhum, para não duplicar
-- nem sobrescrever edições feitas depois pela equipe.

INSERT INTO public.demand_templates (id, name, kind, description, position) VALUES
    ('conteudo_padrao', 'Conteúdo — padrão', 'conteudo',
     'Etapas de produção de um post: roteiro, revisão e agendamento.', 0),
    ('captacao_padrao', 'Captação audiovisual', 'captacao',
     'Planejamento, edição de vídeos e edição de fotos.', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.demand_template_items (template_id, group_name, label, position)
SELECT 'conteudo_padrao', g, l, p FROM (VALUES
    ('Roteiro',              'Definir tema e etapa do funil',                       0),
    ('Roteiro',              'Escrever o roteiro / copy do conteúdo',               1),
    ('Roteiro',              'Levantar referências visuais e montar o moodboard',   2),
    ('Roteiro',              'Definir a chamada para ação (CTA)',                   3),
    ('Revisão de conteúdo',  'Revisar texto e ortografia',                          4),
    ('Revisão de conteúdo',  'Revisar arte e identidade visual do cliente',         5),
    ('Revisão de conteúdo',  'Enviar para aprovação do cliente',                    6),
    ('Revisão de conteúdo',  'Aplicar os ajustes pedidos',                          7),
    ('Agenda',               'Subir o conteúdo na plataforma de agendamento',       8),
    ('Agenda',               'Conferir data, horário e legenda',                    9),
    ('Agenda',               'Confirmar publicação e arquivar no Drive',           10)
) AS t(g, l, p)
WHERE NOT EXISTS (
    SELECT 1 FROM public.demand_template_items WHERE template_id = 'conteudo_padrao'
);

INSERT INTO public.demand_template_items (template_id, group_name, label, position)
SELECT 'captacao_padrao', g, l, p FROM (VALUES
    ('Planejamento',      'Confirme a data e coloque na descrição da tarefa macro',                       0),
    ('Planejamento',      'Defina o local da captação e coloque na descrição da tarefa macro',            1),
    ('Planejamento',      'Defina o local da captação e coloque no calendário do Google da agência',      2),
    ('Planejamento',      'Defina a quantidade mínima de Reels e preencha na descrição da tarefa macro',  3),
    ('Planejamento',      'Busque referências de Reels e preencha na descrição da tarefa macro com links', 4),
    ('Planejamento',      'Escreva os roteiros dos vídeos',                                               5),
    ('Planejamento',      'Crie um moodboard para a captação',                                            6),
    ('Planejamento',      'Envie o moodboard e as ideias de reels para revisão',                          7),
    ('Edição de vídeos',  'Fazer backup do material na pasta do Drive do cliente',                        8),
    ('Edição de vídeos',  'Editar vídeos da captação e enviar para aprovação na tarefa macro',            9),
    ('Edição de vídeos',  'Fazer frame dos vídeos e colocar no Drive',                                   10),
    ('Edição de vídeos',  'Avisar o planejamento responsável que as edições estão prontas',              11),
    ('Edição de vídeos',  'Passar vídeos aprovados para a pasta pública do cliente',                     12),
    ('Edição de fotos',   'Fazer backup do material na pasta do Drive do cliente',                       13),
    ('Edição de fotos',   'Editar fotos da captação e enviar para aprovação na tarefa macro',            14),
    ('Edição de fotos',   'Avisar o planejamento responsável que as edições estão prontas',              15),
    ('Edição de fotos',   'Passar fotos aprovadas para a pasta pública do cliente',                      16)
) AS t(g, l, p)
WHERE NOT EXISTS (
    SELECT 1 FROM public.demand_template_items WHERE template_id = 'captacao_padrao'
);


-- =============================================================
-- BLOCO 15: CRONOGRAMAS DE CONTEÚDO
-- Conteúdo não é demanda avulsa: o cronograma é entidade própria,
-- sobrevive à geração e recebe anexos e resultados.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.content_plans (
    id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id      UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    contract_id    UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    title          TEXT NOT NULL DEFAULT '',
    month_ref      TEXT NOT NULL DEFAULT '',
    period_kind    TEXT NOT NULL DEFAULT 'month' CHECK (period_kind IN ('month', 'weeks')),
    weeks          INTEGER NOT NULL DEFAULT 4,
    start_date     DATE,
    posts_per_week INTEGER NOT NULL DEFAULT 3,
    weekdays       INTEGER[] NOT NULL DEFAULT '{1,3,5}',
    channels       TEXT[] NOT NULL DEFAULT '{FEED}',
    description    JSONB,
    results        JSONB,
    status         TEXT NOT NULL DEFAULT 'ativo'
                   CHECK (status IN ('rascunho', 'ativo', 'concluido')),
    created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS content_plans_client_idx ON public.content_plans (client_id, month_ref);

DROP TRIGGER IF EXISTS content_plans_set_updated_at ON public.content_plans;
CREATE TRIGGER content_plans_set_updated_at
    BEFORE UPDATE ON public.content_plans
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.content_plans ENABLE ROW LEVEL SECURITY;

-- Planejamento é interno; o cliente vê as demandas geradas, não o plano.
DROP POLICY IF EXISTS "content_plans_select" ON public.content_plans;
CREATE POLICY "content_plans_select" ON public.content_plans
    FOR SELECT USING (public.is_team_member());
DROP POLICY IF EXISTS "content_plans_write" ON public.content_plans;
CREATE POLICY "content_plans_write" ON public.content_plans
    FOR ALL USING (public.is_team_member()) WITH CHECK (public.is_team_member());

-- ---- Vínculo das demandas com o cronograma ------------------
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS plan_id   UUID REFERENCES public.content_plans(id) ON DELETE SET NULL;
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS plan_role TEXT;

ALTER TABLE public.demands DROP CONSTRAINT IF EXISTS demands_plan_role_check;
ALTER TABLE public.demands
    ADD CONSTRAINT demands_plan_role_check
    CHECK (plan_role IS NULL OR plan_role IN ('post', 'captacao'));

CREATE INDEX IF NOT EXISTS demands_plan_idx ON public.demands (plan_id, due_date);

-- ---- Anexos do cronograma -----------------------------------
-- Reaproveita demand_attachments: a linha aponta para a demanda OU
-- para o plano, nunca para os dois.
ALTER TABLE public.demand_attachments ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.content_plans(id) ON DELETE CASCADE;
ALTER TABLE public.demand_attachments ALTER COLUMN demand_id DROP NOT NULL;

ALTER TABLE public.demand_attachments DROP CONSTRAINT IF EXISTS demand_attachments_owner_check;
ALTER TABLE public.demand_attachments
    ADD CONSTRAINT demand_attachments_owner_check
    CHECK (num_nonnulls(demand_id, plan_id) = 1);

CREATE INDEX IF NOT EXISTS demand_attachments_plan_idx ON public.demand_attachments (plan_id);

-- As policies existentes olham só demand_id; refaz para cobrir os dois donos.
DROP POLICY IF EXISTS "demand_attachments_select" ON public.demand_attachments;
CREATE POLICY "demand_attachments_select" ON public.demand_attachments
    FOR SELECT USING (
        (plan_id IS NOT NULL AND public.is_team_member())
        OR EXISTS (SELECT 1 FROM public.demands d
                   WHERE d.id = demand_id AND public.can_see_demand(d.client_id))
    );


-- =============================================================
-- BLOCO 16: AJUSTES DO CRONOGRAMA
-- Tipo de conteúdo, trilha de roteiro, início do ciclo e os
-- templates de nome das demandas geradas.
-- =============================================================

-- Formato do conteúdo. Independente do CANAL, que continua em
-- demands.type (FEED/STORIES): um Reels sai no Feed E no TikTok.
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS content_type TEXT;

ALTER TABLE public.demands DROP CONSTRAINT IF EXISTS demands_content_type_check;
ALTER TABLE public.demands
    ADD CONSTRAINT demands_content_type_check
    CHECK (content_type IS NULL OR content_type IN ('video', 'reels', 'carrossel', 'imagem_frase', 'frase', 'criativo', 'extra'));

CREATE INDEX IF NOT EXISTS demands_content_type_idx ON public.demands (content_type);

-- A trilha de roteiro entra junto das outras duas
ALTER TABLE public.demands DROP CONSTRAINT IF EXISTS demands_plan_role_check;
ALTER TABLE public.demands
    ADD CONSTRAINT demands_plan_role_check
    CHECK (plan_role IS NULL OR plan_role IN ('post', 'captacao', 'roteiro'));

-- Configuração do cronograma
ALTER TABLE public.content_plans ADD COLUMN IF NOT EXISTS first_date       DATE;
ALTER TABLE public.content_plans ADD COLUMN IF NOT EXISTS content_types    TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.content_plans ADD COLUMN IF NOT EXISTS script_lead_days INTEGER NOT NULL DEFAULT 3;

ALTER TABLE public.content_plans ADD COLUMN IF NOT EXISTS post_title_template    TEXT NOT NULL DEFAULT 'Post {tipo} {n} — {cliente}';
ALTER TABLE public.content_plans ADD COLUMN IF NOT EXISTS capture_title_template TEXT NOT NULL DEFAULT 'Captação {n} — {cliente}';
ALTER TABLE public.content_plans ADD COLUMN IF NOT EXISTS script_title_template  TEXT NOT NULL DEFAULT 'Roteiro {n} — {cliente}';

-- =============================================================
-- BLOCO 17: GAMIFICAÇÃO — PONTOS E RANKING
-- Log de eventos de pontuação (não um contador): permite agregar
-- por dia/semana/mês/total e por usuário sem perder histórico.
-- Só gravável pelas triggers SECURITY DEFINER abaixo — nunca direto
-- pelo cliente (ao contrário do padrão workspace_settings do Pomodoro,
-- que qualquer usuário autenticado pode editar via RLS de `users`).
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

-- =============================================================
-- BLOCO 18: WEB PUSH NOTIFICATIONS (PWA)
-- Armazena as inscrições Push de cada dispositivo/navegador dos usuários.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint     TEXT NOT NULL UNIQUE,
    p256dh       TEXT NOT NULL,
    auth         TEXT NOT NULL,
    user_agent   TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
    ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subscriptions_user_all" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_user_all" ON public.push_subscriptions
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Atualiza o cache do schema no Supabase
NOTIFY pgrst, 'reload schema';
