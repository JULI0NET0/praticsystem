-- Integração Hermes Agent: auditoria + rastreio de origem dos lançamentos

-- Log de auditoria: toda leitura e escrita feita pelo Hermes fica registrada aqui.
CREATE TABLE IF NOT EXISTS public.hermes_agent_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action TEXT NOT NULL,
    payload JSONB,
    result TEXT CHECK (result IN ('success', 'error')) NOT NULL,
    detail JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Marca lançamentos criados pelo agente, para diferenciar de lançamentos manuais no painel.
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE public.expense_entries ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Atualiza o cache do schema no Supabase (essencial para evitar o erro PGRST205)
NOTIFY pgrst, 'reload schema';
