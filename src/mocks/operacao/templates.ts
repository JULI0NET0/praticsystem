import {
  FieldDef,
  MediaType,
} from "@/types/operacao";

// ============================================================================
// TEMPLATES MESTRE — transcritos UMA vez do CRM_Operacao_OFICIAL_Estrutura.md
// Servem de réplica canônica: toda tarefa/lista produzida nasce clonada daqui.
// ============================================================================

// ---------------------------------------------------------------------------
// Campos personalizados globais (doc §3)
// ---------------------------------------------------------------------------

export const FIELD_MES: FieldDef = {
  id: "f_mes",
  key: "mes_referente",
  label: "Mês referente",
  type: "month",
};

export const FIELD_MIDIA: FieldDef = {
  id: "f_midia",
  key: "midia",
  label: "Mídia",
  type: "label",
  options: [
    { value: "FEED", label: "Feed", color: "#D9480F" },
    { value: "STORIES", label: "Stories", color: "#8B5CF6" },
    { value: "FACEBOOK", label: "Facebook", color: "#3B82F6" },
    { value: "TIKTOK", label: "TikTok", color: "#EC4899" },
    { value: "LINKEDIN", label: "Linkedin", color: "#0A66C2" },
    { value: "TWITTER", label: "Twitter", color: "#38BDF8" },
    { value: "EMAIL_MARKETING", label: "E-mail", color: "#EAB308" },
    { value: "PINTEREST", label: "Pinterest", color: "#EF4444" },
    { value: "DEMANDA_EXTRA", label: "Demanda extra", color: "#71717A" },
  ],
};

export const FIELD_FUNIL: FieldDef = {
  id: "f_funil",
  key: "funil",
  label: "Funil",
  type: "dropdown",
  options: [
    { value: "TOPO", label: "Topo", color: "#22C55E" },
    { value: "MEIO", label: "Meio", color: "#EAB308" },
    { value: "FUNDO", label: "Fundo", color: "#EF4444" },
  ],
};

export const FIELD_DATA: FieldDef = {
  id: "f_data",
  key: "data",
  label: "Data",
  type: "date",
};

export const FIELD_PACK: FieldDef = {
  id: "f_pack",
  key: "pack_entrega",
  label: "Pack de entrega",
  type: "label",
};

// Campos específicos de captação audiovisual (doc §10.5 Nova Captação)
export const FIELD_ENDERECO: FieldDef = {
  id: "f_endereco",
  key: "endereco",
  label: "Endereço / Local",
  type: "text",
};

export const FIELD_REELS: FieldDef = {
  id: "f_reels",
  key: "qtd_reels",
  label: "Qtd. mínima de Reels",
  type: "text",
};

export const FIELD_MOODBOARD: FieldDef = {
  id: "f_moodboard",
  key: "moodboard",
  label: "Link do moodboard",
  type: "text",
};

export const ONBOARDING_FIELDS: FieldDef[] = [FIELD_MES];
export const CANCELAMENTO_FIELDS: FieldDef[] = [FIELD_MES];
export const CRIACAO_FIELDS: FieldDef[] = [
  FIELD_MES,
  FIELD_MIDIA,
  FIELD_FUNIL,
  FIELD_DATA,
  FIELD_PACK,
];
export const AUDIOVISUAL_FIELDS: FieldDef[] = [
  FIELD_MES,
  FIELD_ENDERECO,
  FIELD_REELS,
  FIELD_MOODBOARD,
];

// ---------------------------------------------------------------------------
// Estrutura crua de um template de tarefa: etapas (subtarefas) com suas ações
// ---------------------------------------------------------------------------

export interface TemplateSubtask {
  name: string;
  actions: string[];
}

export interface TaskTemplate {
  title: string;
  taskType:
    | "onboarding"
    | "offboarding"
    | "pack_entrega"
    | "captacao"
    | "default";
  subtasks: TemplateSubtask[];
}

// ---------------------------------------------------------------------------
// ONBOARDING — 7 etapas (doc §4.1)
// ---------------------------------------------------------------------------

export const ONBOARDING_TEMPLATE: TaskTemplate = {
  title: "[ONBOARDING] [TEMPLATE]",
  taskType: "onboarding",
  subtasks: [
    {
      name: "01. Administrativo",
      actions: [
        "Pegue o contrato assinado do cliente com o comercial",
        "Preencha os serviços prestados na descrição dessa tarefa",
        "Preencha os dados do responsável por tocar o ONBOARDING da parte do CLIENTE",
        "Faça upload da PROPOSTA na pasta do administrativo no Google Drive",
        "Faça upload do CONTRATO na pasta do administrativo no Google Drive",
        "Faça o cadastro do cliente em DADOS FISCAIS",
        "Insira o CONTRATO ASSINADO na aba do cliente em DADOS FISCAIS",
        "Confira se o valor mensal e data de pagamento foi corretamente para a planilha RECEITA E DESPESA",
        "Cadastre o cliente no Asaas",
        "Crie a cobrança de KICK OFF do cliente no Asaas",
        "Crie a mensalidade do cliente no Asaas",
        "Envie a cobrança de KICK OFF e alinhe os prazos no Whatsapp",
      ],
    },
    {
      name: "02. Kick Off",
      actions: [
        "Receba o comprovante de pagamento",
        "Atualize a planilha de LANÇAMENTOS conforme o pagamento do KICK OFF",
        "Formalize os prazos sobre as cobranças por e-mail",
        "Avise o cliente da passagem de bastão para o time de conteúdo",
        'Conclua a parte administrativa do onboarding e troque o status da tarefa macro para "Aguardando C1"',
      ],
    },
    {
      name: "03. 1º contato",
      actions: [
        "Fazer o 1º contato com o cliente e enviar o briefing",
        "Receber briefing respondido e colocar na pasta do Drive do cliente",
        "Agendar a 1ª reunião estratégica",
        "Criar reunião na agenda da Agência e enviar os invites",
        "Solicitar o contato de quem participará do grupo do WhatsApp",
      ],
    },
    {
      name: "04. Operacional",
      actions: [
        "Criar pasta do cliente no Drive conforme o template",
        "Criar a lista do cliente aqui no CRM",
        "Configurar os templates de criação de conteúdo",
        "Configurar os Docs do cliente",
        "Conectar o cliente na plataforma de agendamento de posts",
        "Colocar a data do início do contrato no Google Agenda da agência",
        "Criar a foto de perfil para o grupo no Whatsapp conforme o template",
        "Criar grupo do cliente no Whatsapp",
        "Colocar o link da pasta do Drive na descrição do grupo do Whatsapp",
        "Colocar foto de perfil no grupo conforme o template",
        "Adicionar envolvidos do cliente",
        "Apresentar o time no grupo do Whatsapp",
        "Reforçar os prazos no grupo",
        "Solicitar acessos das redes sociais e materiais de identidade visual",
        "Acrescentar o nome do cliente na planilha template do Geral",
        "Enviar presskit de boas-vindas",
      ],
    },
    {
      name: "05. Produção do Planejamento Macro",
      actions: [
        "Fase 1 — Caminho estratégico",
        "Fase 2 — Primeiras implementações",
        "Fase 3 — Análise da concorrência",
        "Fase 4 — Definição de conteúdo",
        "Fase 5 — Estratégias de performance",
        "Fase 6 — Estrutura de campanhas anuais",
        "Organizar próximos passos",
        "Revisar todo o planejamento macro",
        "Salvar PDF e arrastar tarefa macro para a coluna de Reunião Estratégica",
      ],
    },
    {
      name: "06. Reunião estratégica",
      actions: [
        "Criar ata da reunião no docs do cliente",
        "Apresentar o planejamento macro",
        "Gravar a tela de apresentação do planejamento macro",
        "Anotar os principais insights da reunião na ata de reunião no docs",
        "Explicar como funciona o processo de captação audiovisual (se houver)",
        "Agendar a 1ª captação audiovisual (se houver)",
      ],
    },
    {
      name: "07. Finalização",
      actions: [
        "Enviar mensagem de pós-reunião",
        "Colocar o PDF + gravação de tela do planejamento macro na pasta do Drive",
        "Criar tarefa para execução do diagnóstico do planejamento macro",
        "Criar tarefa para execução da primeira captação audiovisual do cliente (se houver)",
        "Criar tarefa para primeira produção de conteúdo",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// CANCELAMENTO — 3 etapas (doc §4.1 Cancelamento)
// ---------------------------------------------------------------------------

export const CANCELAMENTO_TEMPLATE: TaskTemplate = {
  title: "[CANCELAMENTO] [TEMPLATE]",
  taskType: "offboarding",
  subtasks: [
    {
      name: "01. Administrativo",
      actions: [
        "Alinhe a última entrega de conteúdo, data da última mensalidade e prazos com o cliente",
        "Remova a assinatura do cliente no Asaas",
        "Remova o cliente da planilha de Dados Fiscais",
        "Formalize o cancelamento por e-mail",
      ],
    },
    {
      name: "02. Operacional",
      actions: [
        'Mover pasta do cliente no Drive para aba de "Clientes inativos"',
        'Mover lista do cliente para pasta de "Ex-clientes"',
        "Remover data de início do contrato do Google Agenda",
      ],
    },
    {
      name: "03. Finalização",
      actions: [
        "Remover nome do cliente do template do Geral",
        "Compartilhar o novo link do Drive e alinhar o prazo de vencimento para o armazenamento",
        "Enviar mensagem de encerramento no grupo do Whatsapp",
        "Remover os envolvidos da agência e encerrar o grupo no Whatsapp",
        "Desconectar cliente da plataforma de agendamentos",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// CAPTAÇÃO AUDIOVISUAL — 3 grupos de subtarefas (doc §5.1)
// ---------------------------------------------------------------------------

const CAPTACAO_SUBTASKS: TemplateSubtask[] = [
  {
    name: "Planejamento",
    actions: [
      "Confirme a data e coloque na descrição da tarefa macro",
      "Defina o local da captação e coloque na descrição da tarefa macro",
      "Defina o local da captação e coloque no calendário do Google da agência",
      "Defina a quantidade mínima de Reels e preencha na descrição da tarefa macro",
      "Busque referências de Reels e preencha na descrição da tarefa macro com links",
      "Escreva os roteiros dos vídeos",
      "Crie um moodboard para a captação",
      "Envie o moodboard e as ideias de reels para revisão",
    ],
  },
  {
    name: "Edição de vídeos",
    actions: [
      "Fazer backup do material na pasta do Drive do cliente",
      "Editar vídeos da captação e enviar para aprovação na tarefa macro",
      "Fazer frame dos vídeos e colocar no Drive",
      "Avisar o planejamento responsável que as edições estão prontas",
      "Passar vídeos aprovados para a pasta pública do cliente",
    ],
  },
  {
    name: "Edição de fotos",
    actions: [
      "Fazer backup do material na pasta do Drive do cliente",
      "Editar fotos da captação e enviar para aprovação na tarefa macro",
      "Avisar o planejamento responsável que as edições estão prontas",
      "Passar fotos aprovadas para a pasta pública do cliente",
    ],
  },
];

export const CAPTACAO_TEMPLATES: TaskTemplate[] = [
  { title: "Captação - [TEMPLATE]", taskType: "captacao", subtasks: CAPTACAO_SUBTASKS },
  { title: "Captação + Ads - [TEMPLATE]", taskType: "captacao", subtasks: CAPTACAO_SUBTASKS },
  { title: "Editorial - [TEMPLATE]", taskType: "captacao", subtasks: CAPTACAO_SUBTASKS },
];

// ---------------------------------------------------------------------------
// CRIAÇÃO — 9 tarefas de mídia por lista de cliente (doc §6.1)
// Cada canal tem um número máximo de POSTs.
// ---------------------------------------------------------------------------

export interface MediaChannelTemplate {
  media: MediaType;
  label: string;
  /** número de POSTs do template (doc §6.1). 0 = sem subtarefas fixas */
  postCount: number;
}

export const CRIACAO_CHANNELS: MediaChannelTemplate[] = [
  { media: "FEED", label: "Feed", postCount: 32 },
  { media: "STORIES", label: "Stories", postCount: 29 },
  { media: "FACEBOOK", label: "Facebook", postCount: 31 },
  { media: "TIKTOK", label: "TikTok", postCount: 9 },
  { media: "LINKEDIN", label: "Linkedin", postCount: 9 },
  { media: "TWITTER", label: "Twitter", postCount: 9 },
  { media: "EMAIL_MARKETING", label: "E-mail marketing", postCount: 7 },
  { media: "PINTEREST", label: "Pinterest", postCount: 9 },
  { media: "DEMANDA_EXTRA", label: "Demanda extra", postCount: 0 },
];
