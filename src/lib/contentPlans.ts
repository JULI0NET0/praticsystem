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
  shiftISODate,
  type SchedulePeriod,
} from '@/lib/contentSchedule';
import { renderTitleTemplate } from '@/lib/titleTemplate';
import { contentTypeLabel } from '@/lib/contentTypes';
import { channelLabel } from '@/types/cronogramas';
import type {
  ContentPlan,
  ContentPlanDraft,
  ContentPlanItemDraft,
  ContractHint,
} from '@/types/cronogramas';
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
  scriptDates: string[];
}

/** Prévia do que será criado — roda no wizard antes de confirmar nada. */
export function previewPlan(draft: ContentPlanDraft): PlanPreview {
  const period = draftPeriod(draft);
  const notBefore = draft.firstDate || null;

  const captureDates = draft.includeCapture
    ? selectCaptureDates(period, draft.captureFrequency, notBefore)
    : [];

  // Um roteiro por captação, alguns dias antes. Se cair antes do início do
  // ciclo, encosta no primeiro dia disponível — roteiro com prazo no
  // passado nasceria atrasado.
  const scriptDates = captureDates.map((date) => {
    const shifted = shiftISODate(date, -Math.max(0, draft.scriptLeadDays));
    return notBefore && shifted < notBefore ? notBefore : shifted;
  });

  return {
    postDates: selectScheduleDates({
      period,
      postsPerWeek: draft.postsPerWeek,
      weekdays: draft.weekdays,
      notBefore,
    }),
    captureDates,
    scriptDates,
  };
}

/**
 * Monta a lista final de itens do cronograma, com nome já renderizado.
 *
 * `typeOverrides` é indexado pela data e vale só para posts: é o que o wizard
 * grava quando você troca o formato de um item específico. Data que sai do
 * período perde o override sozinho, sem estado obsoleto para limpar.
 *
 * Ordem: roteiro e captação primeiro (o processo começa neles), posts depois.
 */
export function resolvePlanItems(
  draft: ContentPlanDraft,
  clientName: string,
  typeOverrides: Record<string, string> = {},
): ContentPlanItemDraft[] {
  const preview = previewPlan(draft);
  const channels = draft.channels.length ? draft.channels : ['FEED'];
  const types = draft.contentTypes;
  const baseVars = { cliente: clientName, mes: draft.monthRef };

  const items: ContentPlanItemDraft[] = [];

  preview.scriptDates.forEach((date, index) => {
    items.push({
      n: index + 1,
      date,
      role: 'roteiro',
      contentType: null,
      channel: null,
      title: renderTitleTemplate(draft.scriptTitleTemplate, {
        ...baseVars,
        n: index + 1,
        data: date,
      }),
    });
  });

  preview.captureDates.forEach((date, index) => {
    items.push({
      n: index + 1,
      date,
      role: 'captacao',
      contentType: null,
      channel: null,
      title: renderTitleTemplate(draft.captureTitleTemplate, {
        ...baseVars,
        n: index + 1,
        data: date,
      }),
    });
  });

  preview.postDates.forEach((date, index) => {
    // Canal e formato giram independentes: são duas dimensões, não uma
    const channel = channels[index % channels.length];
    const rotated = types.length ? types[index % types.length] : null;
    const contentType = typeOverrides[date] ?? rotated;

    items.push({
      n: index + 1,
      date,
      role: 'post',
      contentType,
      channel,
      title: renderTitleTemplate(draft.postTitleTemplate, {
        ...baseVars,
        n: index + 1,
        data: date,
        tipo: contentTypeLabel(contentType),
        canal: channelLabel(channel),
      }),
    });
  });

  return items;
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
  items: ContentPlanItemDraft[],
): Promise<CreateResult> {
  if (!draft.clientId) throw new Error('Selecione um cliente para o cronograma.');
  if (items.length === 0) {
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
      first_date: draft.firstDate || null,
      posts_per_week: draft.postsPerWeek,
      weekdays: draft.weekdays,
      channels: draft.channels,
      content_types: draft.contentTypes,
      script_lead_days: draft.scriptLeadDays,
      post_title_template: draft.postTitleTemplate,
      capture_title_template: draft.captureTitleTemplate,
      script_title_template: draft.scriptTitleTemplate,
      created_by: currentUserId,
    })
    .select('*')
    .single();

  if (planError || !planRow) throw planError ?? new Error('Falha ao criar o cronograma.');
  const plan = planRow as ContentPlan;

  // `items` vem pronto da prévia: o que foi criado é exatamente o que a tela
  // mostrou, sem um segundo cálculo que pudesse divergir dela.
  const rows = items.map((item, index) => ({
    title: item.title,
    client_id: draft.clientId,
    status: initialStatusId,
    due_date: item.date,
    plan_id: plan.id,
    plan_role: item.role,
    content_type: item.contentType,
    type: item.role === 'captacao' ? 'CAPTACAO' : item.channel,
    created_by: currentUserId,
    assignee_ids: [] as string[],
    position: index,
  }));

  const { data: demandRows, error: demandsError } = await supabase
    .from('demands')
    .insert(rows)
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
    roteiro: draft.scriptTemplateId,
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

/** Quantas demandas o cronograma tem — alimenta o texto do diálogo. */
export async function countPlanDemands(planId: string): Promise<number> {
  const { count, error } = await supabase
    .from('demands')
    .select('id', { count: 'exact', head: true })
    .eq('plan_id', planId);

  if (error) return 0;
  return count ?? 0;
}

/**
 * Apaga o cronograma.
 *
 * Com `deleteDemands`, as demandas vão junto — e o CASCADE leva checklist,
 * comentários e anexos de cada uma. Sem ele, o `ON DELETE SET NULL` do
 * vínculo apenas as solta, e elas seguem em /admin/demandas como avulsas.
 */
export async function deleteContentPlan(
  id: string,
  options: { deleteDemands: boolean } = { deleteDemands: false },
): Promise<void> {
  if (options.deleteDemands) {
    const { error: demandsError } = await supabase.from('demands').delete().eq('plan_id', id);
    if (demandsError) throw demandsError;
  }

  const { error } = await supabase.from('content_plans').delete().eq('id', id);
  if (error) throw error;
}
