-- Adiciona suporte a vínculo de Cronograma e Roteiros na tabela notes
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.content_plans(id) ON DELETE SET NULL;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS is_script BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS demand_id UUID REFERENCES public.demands(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS notes_plan_idx ON public.notes(plan_id);
CREATE INDEX IF NOT EXISTS notes_is_script_idx ON public.notes(is_script);
