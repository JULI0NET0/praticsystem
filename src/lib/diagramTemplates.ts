import { DiagramType } from "@/types/database";

export function getInitialDiagramData(type: DiagramType, template: string = "blank", title: string = "Novo Diagrama") {
  if (type === "flowchart") {
    if (template === "funnel") {
      return {
        nodes: [
          { id: "1", type: "startEnd", position: { x: 300, y: 40 }, data: { label: "Topo de Funil (Tráfego)", category: "start" } },
          { id: "2", type: "process", position: { x: 280, y: 140 }, data: { label: "Landing Page / Direct", description: "Captura de Lead qualificado" } },
          { id: "3", type: "automation", position: { x: 280, y: 260 }, data: { label: "Disparo WhatsApp", description: "Mensagem imediata de boas-vindas" } },
          { id: "4", type: "decision", position: { x: 285, y: 380 }, data: { label: "Lead Respondeu?" } },
          { id: "5", type: "process", position: { x: 480, y: 500 }, data: { label: "Reunião de Diagnóstico", description: "Closer conduz a negociação" } },
          { id: "6", type: "automation", position: { x: 90, y: 500 }, data: { label: "Régua de Reengajamento", description: "E-mail / WhatsApp D+1 e D+3" } },
          { id: "7", type: "startEnd", position: { x: 500, y: 620 }, data: { label: "Fechamento / Contrato", category: "end" } },
        ],
        edges: [
          { id: "e1-2", source: "1", target: "2", animated: true, markerEnd: { type: "arrowclosed", color: "#e05d38" }, style: { stroke: "#e05d38", strokeWidth: 2 } },
          { id: "e2-3", source: "2", target: "3", markerEnd: { type: "arrowclosed", color: "#64748b" }, style: { stroke: "#94a3b8", strokeWidth: 2 } },
          { id: "e3-4", source: "3", target: "4", markerEnd: { type: "arrowclosed", color: "#64748b" }, style: { stroke: "#94a3b8", strokeWidth: 2 } },
          { id: "e4-5", source: "4", sourceHandle: "yes", target: "5", label: "Sim", markerEnd: { type: "arrowclosed", color: "#10b981" }, style: { stroke: "#10b981", strokeWidth: 2 } },
          { id: "e4-6", source: "4", sourceHandle: "no", target: "6", label: "Não", markerEnd: { type: "arrowclosed", color: "#ef4444" }, style: { stroke: "#ef4444", strokeWidth: 2 } },
          { id: "e5-7", source: "5", target: "7", markerEnd: { type: "arrowclosed", color: "#10b981" }, style: { stroke: "#10b981", strokeWidth: 2 } },
        ],
      };
    }

    if (template === "onboarding") {
      return {
        nodes: [
          { id: "1", type: "startEnd", position: { x: 300, y: 40 }, data: { label: "Contrato Assinado", category: "start" } },
          { id: "2", type: "process", position: { x: 280, y: 140 }, data: { label: "Envio do Formulário de Briefing", description: "Coleta de acessos e identidade visual" } },
          { id: "3", type: "process", position: { x: 280, y: 260 }, data: { label: "Reunião de Alinhamento (Kickoff)", description: "Definição de metas, tom de voz e personas" } },
          { id: "4", type: "automation", position: { x: 280, y: 380 }, data: { label: "Criação do Grupo no WhatsApp", description: "Boas-vindas e introdução do gestor de conta" } },
          { id: "5", type: "process", position: { x: 280, y: 500 }, data: { label: "Primeiro Cronograma de Conteúdo", description: "Envio para aprovação em até 7 dias" } },
          { id: "6", type: "startEnd", position: { x: 320, y: 620 }, data: { label: "Operação Ativa", category: "end" } },
        ],
        edges: [
          { id: "e1-2", source: "1", target: "2", animated: true, markerEnd: { type: "arrowclosed", color: "#e05d38" }, style: { stroke: "#e05d38", strokeWidth: 2 } },
          { id: "e2-3", source: "2", target: "3", markerEnd: { type: "arrowclosed", color: "#64748b" }, style: { stroke: "#94a3b8", strokeWidth: 2 } },
          { id: "e3-4", source: "3", target: "4", markerEnd: { type: "arrowclosed", color: "#64748b" }, style: { stroke: "#94a3b8", strokeWidth: 2 } },
          { id: "e4-5", source: "4", target: "5", markerEnd: { type: "arrowclosed", color: "#64748b" }, style: { stroke: "#94a3b8", strokeWidth: 2 } },
          { id: "e5-6", source: "5", target: "6", markerEnd: { type: "arrowclosed", color: "#10b981" }, style: { stroke: "#10b981", strokeWidth: 2 } },
        ],
      };
    }

    if (template === "approval") {
      return {
        nodes: [
          { id: "1", type: "startEnd", position: { x: 300, y: 40 }, data: { label: "Roteiro / Criação Concluída", category: "start" } },
          { id: "2", type: "process", position: { x: 280, y: 140 }, data: { label: "Revisão Interna (Líder / Copy)", description: "Checagem ortográfica e estratégia" } },
          { id: "3", type: "process", position: { x: 280, y: 260 }, data: { label: "Envio ao Cliente para Aprovação", description: "Notificação via Portal do Cliente ou WhatsApp" } },
          { id: "4", type: "decision", position: { x: 285, y: 380 }, data: { label: "Cliente Aprovou de Primeira?" } },
          { id: "5", type: "process", position: { x: 80, y: 500 }, data: { label: "Ajuste e Refação", description: "Design/Copy aplica alterações solicitadas" } },
          { id: "6", type: "automation", position: { x: 480, y: 500 }, data: { label: "Agendamento da Postagem", description: "Programação automática no Meta Suite" } },
          { id: "7", type: "startEnd", position: { x: 500, y: 620 }, data: { label: "Publicado com Sucesso", category: "end" } },
        ],
        edges: [
          { id: "e1-2", source: "1", target: "2", animated: true, markerEnd: { type: "arrowclosed", color: "#e05d38" }, style: { stroke: "#e05d38", strokeWidth: 2 } },
          { id: "e2-3", source: "2", target: "3", markerEnd: { type: "arrowclosed", color: "#64748b" }, style: { stroke: "#94a3b8", strokeWidth: 2 } },
          { id: "e3-4", source: "3", target: "4", markerEnd: { type: "arrowclosed", color: "#64748b" }, style: { stroke: "#94a3b8", strokeWidth: 2 } },
          { id: "e4-5", source: "4", sourceHandle: "no", target: "5", label: "Alterações", markerEnd: { type: "arrowclosed", color: "#ef4444" }, style: { stroke: "#ef4444", strokeWidth: 2 } },
          { id: "e5-3", source: "5", target: "3", markerEnd: { type: "arrowclosed", color: "#f59e0b" }, style: { stroke: "#f59e0b", strokeWidth: 2 } },
          { id: "e4-6", source: "4", sourceHandle: "yes", target: "6", label: "Aprovado", markerEnd: { type: "arrowclosed", color: "#10b981" }, style: { stroke: "#10b981", strokeWidth: 2 } },
          { id: "e6-7", source: "6", target: "7", markerEnd: { type: "arrowclosed", color: "#10b981" }, style: { stroke: "#10b981", strokeWidth: 2 } },
        ],
      };
    }

    // Default blank flowchart
    return {
      nodes: [
        { id: "1", type: "startEnd", position: { x: 250, y: 60 }, data: { label: "Início", category: "start" } },
        { id: "2", type: "process", position: { x: 230, y: 180 }, data: { label: "Primeira Etapa", description: "Clique duas vezes para renomear" } },
      ],
      edges: [
        { id: "e1-2", source: "1", target: "2", markerEnd: { type: "arrowclosed", color: "#e05d38" }, style: { stroke: "#e05d38", strokeWidth: 2 } },
      ],
    };
  }

  // Mind map
  if (template === "content_strategy") {
    return {
      nodeData: {
        id: "root",
        topic: title || "Estratégia de Conteúdo",
        children: [
          {
            id: "sub-1",
            topic: "Pilar 1: Autoridade & Resultados",
            children: [
              { id: "sub-1-1", topic: "Estudo de Caso de Cliente" },
              { id: "sub-1-2", topic: "Bastidores da Agência / Produção" },
              { id: "sub-1-3", topic: "Entrevista com Especialista" },
            ],
          },
          {
            id: "sub-2",
            topic: "Pilar 2: Educação & Dores",
            children: [
              { id: "sub-2-1", topic: "Carrossel: Os 3 Erros Mais Comuns" },
              { id: "sub-2-2", topic: "Reels: Dica Rápida em 30s" },
              { id: "sub-2-3", topic: "Tutorial Passo a Passo" },
            ],
          },
          {
            id: "sub-3",
            topic: "Pilar 3: Conexão & Humanização",
            children: [
              { id: "sub-3-1", topic: "História dos Fundadores" },
              { id: "sub-3-2", topic: "Perguntas & Respostas nos Stories" },
              { id: "sub-3-3", topic: "Cultura e Valores da Marca" },
            ],
          },
          {
            id: "sub-4",
            topic: "Pilar 4: Conversão & Oferta",
            children: [
              { id: "sub-4-1", topic: "Chamada para Direct / Diagnóstico" },
              { id: "sub-4-2", topic: "Depoimentos em Vídeo" },
              { id: "sub-4-3", topic: "Oferta Exclusiva com Vagas Limitadas" },
            ],
          },
        ],
      },
    };
  }

  if (template === "brand_identity") {
    return {
      nodeData: {
        id: "root",
        topic: title || "Identidade de Marca",
        children: [
          {
            id: "sub-1",
            topic: "Propósito & Visão",
            children: [
              { id: "sub-1-1", topic: "Missão Principal" },
              { id: "sub-1-2", topic: "Valores Inegociáveis" },
            ],
          },
          {
            id: "sub-2",
            topic: "Tom de Voz & Personalidade",
            children: [
              { id: "sub-2-1", topic: "Arquétipo Dominante" },
              { id: "sub-2-2", topic: "Vocabulário Recomendado" },
              { id: "sub-2-3", topic: "O que NUNCA Dizer" },
            ],
          },
          {
            id: "sub-3",
            topic: "Público-Alvo & ICP",
            children: [
              { id: "sub-3-1", topic: "Dores Mais Críticas" },
              { id: "sub-3-2", topic: "Desejos e Aspirações" },
            ],
          },
        ],
      },
    };
  }

  // Default blank mind map
  return {
    nodeData: {
      id: "root",
      topic: title || "Meu Mapa Mental",
      children: [
        { id: "sub-1", topic: "Tópico 1" },
        { id: "sub-2", topic: "Tópico 2" },
        { id: "sub-3", topic: "Tópico 3" },
      ],
    },
  };
}
