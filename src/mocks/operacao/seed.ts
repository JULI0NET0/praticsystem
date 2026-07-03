import { Area, Space, Task } from "@/types/operacao";
import { uid } from "./ids";
import {
  buildOnboardingList,
  buildCancelamentoList,
  buildPlanejamentoList,
  buildEdicaoList,
  buildCriacaoList,
  makeOnboardingTask,
  makeCancelamentoTask,
  makeCaptacaoTask,
} from "./factory";
import { generateEditorialPosts } from "./editorialCalendar";

// ============================================================================
// SEED — monta o Espaço "Operação OFICIAL" com dados fictícios (mock isolado)
// ============================================================================

const MONTH_REF = "2026-07";

const FAKE_CLIENTS = [
  "Balloarts",
  "Cavezzo",
  "Loom Iluminação",
  "Letícia Aguiar",
];

export function createSpace(): Space {
  const spaceId = uid("space");

  // --- ÁREA 1: Onboarding ---------------------------------------------------
  const areaOnboarding: Area = {
    id: uid("area"),
    spaceId,
    name: "Onboarding",
    icon: "UserPlus",
    order: 0,
    lists: [],
  };
  const onboardingList = buildOnboardingList(areaOnboarding.id);
  const cancelamentoList = buildCancelamentoList(areaOnboarding.id);

  onboardingList.tasks = [
    withMonth(makeOnboardingTask(onboardingList.id, FAKE_CLIENTS[0], "ob_admin")),
    withMonth(makeOnboardingTask(onboardingList.id, FAKE_CLIENTS[1], "ob_kickoff")),
    withMonth(makeOnboardingTask(onboardingList.id, FAKE_CLIENTS[2], "ob_operacional")),
    withMonth(makeOnboardingTask(onboardingList.id, FAKE_CLIENTS[3], "ob_reuniao")),
  ];
  cancelamentoList.tasks = [
    withMonth(makeCancelamentoTask(cancelamentoList.id, "Cliente Encerrado LTDA", "cx_admin")),
  ];
  areaOnboarding.lists = [onboardingList, cancelamentoList];

  // --- ÁREA 2: Audiovisual --------------------------------------------------
  const areaAudiovisual: Area = {
    id: uid("area"),
    spaceId,
    name: "Audiovisual",
    icon: "Clapperboard",
    order: 1,
    lists: [],
  };
  const planejamentoList = buildPlanejamentoList(areaAudiovisual.id);
  planejamentoList.tasks = [
    withMonth(makeCaptacaoTask(planejamentoList.id, FAKE_CLIENTS[0], 0)),
    withMonth(makeCaptacaoTask(planejamentoList.id, FAKE_CLIENTS[1], 1)),
  ];
  areaAudiovisual.lists = [
    planejamentoList,
    buildEdicaoList(areaAudiovisual.id, "videos"),
    buildEdicaoList(areaAudiovisual.id, "fotos"),
  ];

  // --- ÁREA 3: Criação ------------------------------------------------------
  const areaCriacao: Area = {
    id: uid("area"),
    spaceId,
    name: "Criação",
    icon: "PenTool",
    order: 2,
    lists: [],
  };
  const templateCliente = buildCriacaoList(areaCriacao.id, "", true);
  const cliente1 = buildCriacaoList(areaCriacao.id, FAKE_CLIENTS[0]);
  const cliente2 = buildCriacaoList(areaCriacao.id, FAKE_CLIENTS[1]);

  // Popular clientes ativos com um calendário editorial do mês (demandas geradas)
  cliente1.tasks = [
    ...cliente1.tasks,
    ...generateEditorialPosts({
      listId: cliente1.id,
      monthRef: MONTH_REF,
      ...cliente1.editorialConfig!,
    }),
  ];
  cliente2.tasks = [
    ...cliente2.tasks,
    ...generateEditorialPosts({
      listId: cliente2.id,
      monthRef: MONTH_REF,
      postsPerWeek: 2,
      weeks: 4,
      weekdays: [2, 4],
      channels: ["FEED"],
      startFunnel: "TOPO",
    }),
  ];
  areaCriacao.lists = [templateCliente, cliente1, cliente2];

  // --- ÁREA 4: Ex-clientes --------------------------------------------------
  const areaExClientes: Area = {
    id: uid("area"),
    spaceId,
    name: "Ex-clientes",
    icon: "Archive",
    order: 3,
    lists: [],
  };
  areaExClientes.lists = [buildCriacaoList(areaExClientes.id, "", true)];

  return {
    id: spaceId,
    name: "Operação OFICIAL",
    areas: [areaOnboarding, areaAudiovisual, areaCriacao, areaExClientes],
  };
}

/** Preenche o campo Mês referente com o mês corrente (mock). */
function withMonth(task: Task): Task {
  return { ...task, customValues: { ...task.customValues, mes_referente: MONTH_REF } };
}
