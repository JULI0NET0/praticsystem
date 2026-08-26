// ============================================================================
// Acesso a dados dos cronogramas de conteúdo (BLOCO 15).
//
// Fica fora do DemandasProvider de propósito: as páginas de cronograma
// carregam o próprio estado, e o provider de demandas não precisa engordar
// para atender uma rota que ele não renderiza.
// ============================================================================

import { supabase } from '@/lib/supabase';
import {
  selectCaptureDates,
  selectScheduleDates,
  type SchedulePeriod,
} from '@/lib/contentSchedule';
import type { ContentPlan, ContentPlanDraft, ContractHint } from '@/types/cronogramas';
import type { Demand } from '@/types/demandas';

/** Contrato ativo do cliente, para pré-preencher o wizard. */
export async function fetchContractHint(clientId: string): Promise<ContractHint | null> {
  const { data, error } = await supabase
    .from('contracts')
    .select('id, posts_per_week, content_capture, capture_frequency, services(name)')
    .eq('client_id', clientId)
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  // O embed de services vem como objeto ou array dependendo da cardinalidade
  const services = data.services as unknown;
  const serviceName = Array.isArray(services)
    ? ((services[0] as { name?: string })?.name ?? null)
    : ((services as { name?: string } | null)?.name ?? null);

  return {
    contractId: data.id as string,
    serviceName,
    postsPerWeek: (data.posts_per_week as number | null) ?? null,
    contentCapture: Boolean(data.content_capture),
    captureFrequency: (data.capture_frequency as string | null) ?? null,
  };
}

export async function fetchContentPlans(): Promise<ContentPlan[]> {
  const { data, error } = await supabase
    .from('content_plans')
    .select('*')
    .order('month_ref', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as ContentPlan[];
}

export async function fetchContentPlan(id: string): Promise<ContentPlan | null> {
  const { data, error } = await supabase
    .from('content_plans')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return (data as ContentPlan) ?? null;
}

export async function updateContentPlan(
  id: string,
  patch: Partial<ContentPlan>,
): Promise<ContentPlan | null> {
  const { data, error } = await supabase
    .from('content_plans')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return (data as ContentPlan) ?? null;
}

/** Demandas de um cronograma, nas duas trilhas. */
export async function fetchPlanDemands(planId: string): Promise<Demand[]> {
  const { data, error } = await supabase
    .from('demands')
    .select('*')
    .eq('plan_id', planId)
    .order('due_date', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Demand[];
}

/** O período no formato que o gerador de datas entende. */
export function draftPeriod(draft: ContentPlanDraft): SchedulePeriod {
  return draft.periodKind === 'month'
    ? { kind: 'month', monthRef: draft.monthRef }
    : { kind: 'weeks', startDate: draft.startDate, weeks: draft.weeks };
}

export interface PlanPreview {
  postDates: string[];
  captureDates: string[];
}

/** Prévia do que será criado — roda no wizard antes de confirmar nada. */
export function previewPlan(draft: ContentPlanDraft): PlanPreview {
  const period = draftPeriod(draft);
  return {
    postDates: selectScheduleDates({
      period,
      postsPerWeek: draft.postsPerWeek,
      weekdays: draft.weekdays,
    }),
    captureDates: draft.includeCapture
      ? selectCaptureDates(period, draft.captureFrequency)
      : [],
  };
}

interface CreateResult {
  plan: ContentPlan;
  created: number;
}

/**
 * Cria o cronograma e gera as demandas das duas trilhas.
 *
 * Os checklists entram num único INSERT em massa: aplicar template demanda a
 * demanda seria uma ida ao banco por post, e um mês de 3 posts/semana já são
 * ~13 idas só para isso.
 */
export async function createContentPlan(
  draft: ContentPlanDraft,
  currentUserId: string,
  initialStatusId: string,
): Promise<CreateResult> {
  if (!draft.clientId) throw new Error('Selecione um cliente para o cronograma.');

  const preview = previewPlan(draft);
  if (preview.postDates.length === 0 && preview.captureDates.length === 0) {
    throw new Error('O período escolhido não gerou nenhuma data. Revise os dias da semana.');
  }

  const { data: planRow, error: planError } = await supabase
    .from('content_plans')
    .insert({
      client_id: draft.clientId,
      contract_id: draft.contractId,
      title: draft.title.trim() || 'Cronograma de conteúdo',
      month_ref: draft.monthRef,
      period_kind: draft.periodKind,
      weeks: draft.weeks,
      start_date: draft.periodKind === 'weeks' ? draft.startDate : null,
      posts_per_week: draft.postsPerWeek,
      weekdays: draft.weekdays,
      channels: draft.channels,
      created_by: currentUserId,
    })
    .select('*')
    .single();

  if (planError || !planRow) throw planError ?? new Error('Falha ao criar o cronograma.');
  const plan = planRow as ContentPlan;

  const channels = draft.channels.length ? draft.channels : ['FEED'];

  const postRows = preview.postDates.map((date, index) => ({
    title: `POST ${String(index + 1).padStart(2, '0')}`,
    client_id: draft.clientId,
    status: initialStatusId,
    due_date: date,
    plan_id: plan.id,
    plan_role: 'post',
    created_by: currentUserId,
    assignee_ids: [] as string[],
    // Round-robin entre os canais, para o mês não sair todo no mesmo lugar
    type: channels[index % channels.length],
    position: index,
  }));

  const captureRows = preview.captureDates.map((date, index) => ({
    title: `Captação ${String(index + 1).padStart(2, '0')}`,
    client_id: draft.clientId,
    status: initialStatusId,
    due_date: date,
    plan_id: plan.id,
    plan_role: 'captacao',
    created_by: currentUserId,
    assignee_ids: [] as string[],
    type: 'CAPTACAO',
    position: postRows.length + index,
  }));

  const { data: demandRows, error: demandsError } = await supabase
    .from('demands')
    .insert([...postRows, ...captureRows])
    .select('id, plan_role');

  if (demandsError || !demandRows) {
    // Sem as demandas o cronograma não serve para nada — desfaz para não
    // deixar um plano vazio órfão na listagem.
    await supabase.from('content_plans').delete().eq('id', plan.id);
    throw demandsError ?? new Error('Falha ao gerar as demandas do cronograma.');
  }

  await applyTemplatesToDemands(demandRows as { id: string; plan_role: string }[], {
    post: draft.contentTemplateId,
    captacao: draft.captureTemplateId,
  });

  return { plan, created: demandRows.length };
}

/** Copia os itens dos templates para o checklist de cada demanda, de uma vez. */
async function applyTemplatesToDemands(
  demands: { id: string; plan_role: string }[],
  templateByRole: Record<string, string | null>,
): Promise<void> {
  const templateIds = [...new Set(Object.values(templateByRole).filter(Boolean))] as string[];
  if (templateIds.length === 0) return;

  const { data: items, error } = await supabase
    .from('demand_template_items')
    .select('template_id, group_name, label, position')
    .in('template_id', templateIds)
    .order('position', { ascending: true });

  if (error || !items?.length) return;

  const byTemplate = new Map<string, typeof items>();
  for (const item of items) {
    const list = byTemplate.get(item.template_id as string) ?? [];
    list.push(item);
    byTemplate.set(item.template_id as string, list);
  }

  const rows: Record<string, unknown>[] = [];
  for (const demand of demands) {
    const templateId = templateByRole[demand.plan_role];
    if (!templateId) continue;
    const templateItems = byTemplate.get(templateId) ?? [];
    templateItems.forEach((item, index) => {
      rows.push({
        demand_id: demand.id,
        group_name: item.group_name,
        label: item.label,
        position: index,
      });
    });
  }

  if (rows.length === 0) return;
  await supabase.from('demand_checklist').insert(rows);
}

/** Apaga o cronograma. As demandas ficam (plan_id vira null pelo ON DELETE SET NULL). */
export async function deleteContentPlan(id: string): Promise<void> {
  const { error } = await supabase.from('content_plans').delete().eq('id', id);
  if (error) throw error;
}
