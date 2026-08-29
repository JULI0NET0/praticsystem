-- =============================================================
-- MIGRAÇÃO RETROATIVA: NOTIFICAÇÕES IN-APP (notifications)
-- Esta tabela já existe em produção (confirmado via introspecção do
-- PostgREST: GET /rest/v1/ com Accept: application/openapi+json),
-- mas nunca tinha sido versionada — nenhum CREATE TABLE dela existia
-- no repo, apesar de `NotificationContext.tsx` assinar Realtime nela
-- e `LiveChat.tsx`/`admin/chat/page.tsx` inserirem linhas nela.
--
-- O CREATE TABLE abaixo reproduz o schema real (7 colunas, confirmado
-- via introspecção). As policies de RLS NÃO puderam ser lidas
-- diretamente (PostgREST não expõe pg_policies) — foram inferidas
-- por comportamento observado (leitura anônima retorna 0 linhas sem
-- erro = RLS ativo) e reconstruídas seguindo o mesmo padrão já usado
-- em outras tabelas do projeto (`notes`, `chat_messages`): dono lê/
-- atualiza as próprias linhas, qualquer membro da equipe pode inserir
-- notificação para outro usuário (é assim que uma menção no chat cria
-- uma notificação para a pessoa mencionada).
--
-- Este script é seguro rodar múltiplas vezes (IF NOT EXISTS / DROP
-- IF EXISTS), mas ainda NÃO foi executado contra a instância real —
-- rode manualmente no SQL Editor do Supabase quando revisar as
-- policies reconstruídas abaixo (compare com o que já está em
-- produção antes de aplicar as policies, para não substituir uma
-- regra mais específica que já exista).
-- =============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    message    TEXT NOT NULL,
    type       TEXT NOT NULL,
    read       BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
    ON public.notifications (user_id, created_at);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Cada usuário só vê as próprias notificações
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Qualquer membro da equipe pode gerar notificação para outro usuário
-- (ex.: menção no chat, novo comentário) — mesmo padrão de
-- `chat_messages_insert` em setup_database.sql
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert" ON public.notifications
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid())
    );

-- Marcar como lida / limpar: só o dono
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
CREATE POLICY "notifications_update" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;
CREATE POLICY "notifications_delete" ON public.notifications
    FOR DELETE USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
