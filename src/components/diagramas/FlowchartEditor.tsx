"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  Panel,
  MarkerType,
  ConnectionMode,
  ReactFlowProvider,
  useReactFlow,
  OnConnectStartParams,
  FinalConnectionState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { nodeTypes, CustomNodeData } from "./CustomNodes";
import { 
  Play, 
  Layers, 
  GitBranch, 
  Zap, 
  CheckCircle2, 
  StickyNote, 
  Plus, 
  X,
  Trash2,
  Copy,
  Sliders,
  Type,
  CornerDownRight,
  RotateCcw,
  RotateCw,
  Focus,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Keyboard,
  MessageCircle,
  Camera,
  Mail,
  Video,
  CreditCard,
  Clock,
  CheckCheck,
  FileCheck,
  FileText,
  Sparkles,
} from "lucide-react";
import { MarkdownViewModal } from "./MarkdownViewModal";

export type FlowNodeType =
  | "startEnd"
  | "process"
  | "decision"
  | "automation"
  | "whatsapp"
  | "social"
  | "email"
  | "meeting"
  | "payment"
  | "delay"
  | "approval"
  | "document"
  | "note";
import { useTheme } from "next-themes";

interface FlowchartEditorProps {
  initialData?: {
    nodes?: Node[];
    edges?: Edge[];
  };
  onChange?: (data: { nodes: Node[]; edges: Edge[] }) => void;
}

const DEFAULT_NODES: Node[] = [
  {
    id: "1",
    type: "startEnd",
    position: { x: 250, y: 50 },
    data: { label: "Início do Funil", category: "start" },
  },
  {
    id: "2",
    type: "process",
    position: { x: 230, y: 160 },
    data: { label: "Captação de Lead", description: "Anúncio Meta / Direct Instagram" },
  },
  {
    id: "3",
    type: "automation",
    position: { x: 230, y: 280 },
    data: { label: "Disparo Boas-vindas", description: "Automação Pratic Chat no WhatsApp" },
  },
  {
    id: "4",
    type: "decision",
    position: { x: 235, y: 400 },
    data: { label: "Respondeu nas primeiras 2h?" },
  },
  {
    id: "5",
    type: "process",
    position: { x: 420, y: 530 },
    data: { label: "Agendamento de Call", description: "Equipe Comercial assume o contato" },
  },
  {
    id: "6",
    type: "process",
    position: { x: 60, y: 530 },
    data: { label: "Follow-up Automático", description: "Mensagem de reforço no WhatsApp" },
  },
  {
    id: "7",
    type: "startEnd",
    position: { x: 440, y: 650 },
    data: { label: "Conversão em Venda", category: "end" },
  },
];

const DEFAULT_EDGES: Edge[] = [
  {
    id: "e1-2",
    source: "1",
    target: "2",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, color: "var(--color-terracotta, #e05d38)" },
    style: { stroke: "var(--color-terracotta, #e05d38)", strokeWidth: 2 },
  },
  {
    id: "e2-3",
    source: "2",
    target: "3",
    markerEnd: { type: MarkerType.ArrowClosed, color: "#64748b" },
    style: { stroke: "#94a3b8", strokeWidth: 2 },
  },
  {
    id: "e3-4",
    source: "3",
    target: "4",
    markerEnd: { type: MarkerType.ArrowClosed, color: "#64748b" },
    style: { stroke: "#94a3b8", strokeWidth: 2 },
  },
  {
    id: "e4-5",
    source: "4",
    sourceHandle: "yes",
    target: "5",
    label: "Sim",
    markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981" },
    style: { stroke: "#10b981", strokeWidth: 2 },
  },
  {
    id: "e4-6",
    source: "4",
    sourceHandle: "no",
    target: "6",
    label: "Não",
    markerEnd: { type: MarkerType.ArrowClosed, color: "#ef4444" },
    style: { stroke: "#ef4444", strokeWidth: 2 },
  },
  {
    id: "e5-7",
    source: "5",
    target: "7",
    markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981" },
    style: { stroke: "#10b981", strokeWidth: 2 },
  },
];

function FlowchartCanvas({ initialData, onChange }: FlowchartEditorProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { fitView, zoomIn, zoomOut, setCenter, screenToFlowPosition } = useReactFlow();

  const initialNodes = initialData?.nodes && initialData.nodes.length > 0 ? initialData.nodes : DEFAULT_NODES;
  const initialEdges = initialData?.edges && initialData.edges.length > 0 ? initialData.edges : DEFAULT_EDGES;

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Referência para captura do nó e ponta de onde o fio começou a ser puxado
  const connectingNodeRef = useRef<{
    nodeId: string | null;
    handleId: string | null;
    handleType: string | null;
  }>({ nodeId: null, handleId: null, handleType: null });

  // Estado do popup flutuante de criação rápida ao soltar o fio no canvas vazio
  const [quickConnectDrop, setQuickConnectDrop] = useState<{
    sourceNodeId: string;
    sourceHandleId: string | null;
    sourceHandleType: string | null;
    flowPosition: { x: number; y: number };
    screenPosition: { x: number; y: number };
  } | null>(null);

  // Pilha de histórico para Desfazer / Refazer
  const historyRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([
    { nodes: initialNodes, edges: initialEdges },
  ]);
  const historyIndexRef = useRef<number>(0);
  const isPerformingHistoryActionRef = useRef<boolean>(false);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Modal de Visão de Texto / Markdown
  const [isMarkdownModalOpen, setIsMarkdownModalOpen] = useState(false);

  const handleApplyMarkdown = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    setNodes(newNodes);
    setEdges(newEdges);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);

    setTimeout(() => {
      fitView({ duration: 400 });
    }, 100);
  }, [setNodes, setEdges, fitView]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const isFirstRender = useRef(true);

  // Emite alterações após o ciclo de renderização e salva histórico
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!isPerformingHistoryActionRef.current) {
      const currentHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
      currentHistory.push({ nodes, edges });
      // Limita pilha a 40 estados
      if (currentHistory.length > 40) currentHistory.shift();
      historyRef.current = currentHistory;
      historyIndexRef.current = currentHistory.length - 1;
    } else {
      isPerformingHistoryActionRef.current = false;
    }

    onChangeRef.current?.({ nodes, edges });
  }, [nodes, edges]);

  // Desfazer
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const targetState = historyRef.current[historyIndexRef.current];
      if (targetState) {
        isPerformingHistoryActionRef.current = true;
        setNodes(targetState.nodes);
        setEdges(targetState.edges);
      }
    }
  }, [setNodes, setEdges]);

  // Refazer
  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const targetState = historyRef.current[historyIndexRef.current];
      if (targetState) {
        isPerformingHistoryActionRef.current = true;
        setNodes(targetState.nodes);
        setEdges(targetState.edges);
      }
    }
  }, [setNodes, setEdges]);

  // Centralizar na tela
  const handleToCenter = useCallback(() => {
    if (selectedNode) {
      setCenter(selectedNode.position.x + 100, selectedNode.position.y + 40, { duration: 300 });
    } else {
      fitView({ duration: 300 });
    }
  }, [selectedNode, setCenter, fitView]);

  // Ajustar à tela
  const handleFit = useCallback(() => {
    fitView({ duration: 300 });
  }, [fitView]);

  // Zoom In / Out
  const handleZoomIn = useCallback(() => {
    zoomIn({ duration: 200 });
  }, [zoomIn]);

  const handleZoomOut = useCallback(() => {
    zoomOut({ duration: 200 });
  }, [zoomOut]);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: Edge = {
        ...params,
        id: `e-${Date.now()}`,
        markerEnd: { type: MarkerType.ArrowClosed, color: "var(--color-terracotta, #e05d38)" },
        style: { stroke: "var(--color-terracotta, #e05d38)", strokeWidth: 2 },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  // Início do arrasto de fio a partir de um handle
  const onConnectStart = useCallback(
    (_: MouseEvent | TouchEvent, params: OnConnectStartParams) => {
      connectingNodeRef.current = {
        nodeId: params.nodeId,
        handleId: params.handleId ?? null,
        handleType: params.handleType ?? null,
      };
    },
    []
  );

  // Fim do arrasto de fio: se soltar no vazio, abre menu para criar nó conectado
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, connectionState?: FinalConnectionState) => {
      const sourceNodeId = connectingNodeRef.current.nodeId;
      const sourceHandleId = connectingNodeRef.current.handleId;
      const sourceHandleType = connectingNodeRef.current.handleType;

      // Se soltou o fio no espaço vazio (não conectou em outro nó existente)
      if (!connectionState?.isValid && sourceNodeId) {
        let clientX: number | undefined;
        let clientY: number | undefined;

        if ("clientX" in event) {
          clientX = event.clientX;
          clientY = event.clientY;
        } else if ("touches" in event && event.touches && event.touches.length > 0) {
          clientX = event.touches[0].clientX;
          clientY = event.touches[0].clientY;
        } else if ("changedTouches" in event && event.changedTouches && event.changedTouches.length > 0) {
          clientX = event.changedTouches[0].clientX;
          clientY = event.changedTouches[0].clientY;
        }

        if (clientX !== undefined && clientY !== undefined) {
          const flowPosition = screenToFlowPosition({ x: clientX, y: clientY });

          setQuickConnectDrop({
            sourceNodeId,
            sourceHandleId,
            sourceHandleType,
            flowPosition: { x: flowPosition.x, y: flowPosition.y },
            screenPosition: { x: clientX, y: clientY },
          });
        }
      }

      connectingNodeRef.current = { nodeId: null, handleId: null, handleType: null };
    },
    [screenToFlowPosition]
  );

  // Criação e conexão automática ao escolher o bloco no menu do fio
  const handleCreateNodeFromDrop = useCallback(
    (type: FlowNodeType, category?: string) => {
      if (!quickConnectDrop) return;

      const { sourceNodeId, sourceHandleId, flowPosition } = quickConnectDrop;
      const newId = `node-${Date.now()}`;
      const sourceNode = nodes.find((n) => n.id === sourceNodeId);

      // Determina a direção exata de acordo com o lado puxado:
      // - Puxou da DIREITA -> entra pela lateral ESQUERDA do novo bloco
      // - Puxou para BAIXO -> entra por CIMA do novo bloco
      // - Puxou da ESQUERDA -> entra pela lateral DIREITA do novo bloco
      // - Puxou para CIMA -> entra por BAIXO do novo bloco
      let direction: "right" | "bottom" | "left" | "top" = "bottom";

      if (sourceHandleId === "right" || sourceHandleId === "yes") {
        direction = "right";
      } else if (sourceHandleId === "bottom" || sourceHandleId === "default") {
        direction = "bottom";
      } else if (sourceHandleId === "left" || sourceHandleId === "no") {
        direction = "left";
      } else if (sourceHandleId === "top") {
        direction = "top";
      } else if (sourceNode) {
        const dx = flowPosition.x - sourceNode.position.x;
        const dy = flowPosition.y - sourceNode.position.y;
        if (Math.abs(dx) >= Math.abs(dy)) {
          direction = dx >= 0 ? "right" : "left";
        } else {
          direction = dy >= 0 ? "bottom" : "top";
        }
      }

      let sourceHandle: string = direction;
      let targetHandle: string = "top";
      let nodePos = { x: flowPosition.x, y: flowPosition.y };

      switch (direction) {
        case "right":
          sourceHandle = "right";
          targetHandle = "left";
          nodePos = { x: flowPosition.x + 10, y: flowPosition.y - 35 };
          break;
        case "bottom":
          sourceHandle = "bottom";
          targetHandle = "top";
          nodePos = { x: flowPosition.x - 90, y: flowPosition.y + 10 };
          break;
        case "left":
          sourceHandle = "left";
          targetHandle = "right";
          nodePos = { x: flowPosition.x - 210, y: flowPosition.y - 35 };
          break;
        case "top":
          sourceHandle = "top";
          targetHandle = "bottom";
          nodePos = { x: flowPosition.x - 90, y: flowPosition.y - 80 };
          break;
      }

      let defaultLabel = "Nova Etapa";
      let defaultDesc: string | undefined = undefined;

      switch (type) {
        case "startEnd":
          defaultLabel = category === "end" ? "Fim do Processo" : "Início";
          break;
        case "process":
          defaultLabel = "Etapa do Processo";
          defaultDesc = "Descrição do procedimento";
          break;
        case "decision":
          defaultLabel = "Condição / Decisão?";
          break;
        case "automation":
          defaultLabel = "Disparo Automático";
          defaultDesc = "Disparo de evento / webhook";
          break;
        case "whatsapp":
          defaultLabel = "Mensagem WhatsApp";
          defaultDesc = "Disparo de template";
          break;
        case "social":
          defaultLabel = "Instagram / Social";
          defaultDesc = "Direct ou interação";
          break;
        case "email":
          defaultLabel = "Envio de E-mail";
          defaultDesc = "E-mail de follow-up";
          break;
        case "meeting":
          defaultLabel = "Reunião / Call";
          defaultDesc = "Call de apresentação";
          break;
        case "payment":
          defaultLabel = "Cobrança / Pagamento";
          defaultDesc = "Link de pagamento";
          break;
        case "delay":
          defaultLabel = "Aguardar / Delay";
          defaultDesc = "Aguardar 24 horas";
          break;
        case "approval":
          defaultLabel = "Aprovação do Cliente";
          defaultDesc = "Validação da entrega";
          break;
        case "document":
          defaultLabel = "Contrato / Briefing";
          defaultDesc = "Assinatura ou documento";
          break;
        case "note":
          defaultLabel = "Nota explicativa...";
          break;
      }

      const newNode: Node = {
        id: newId,
        type,
        position: nodePos,
        data: {
          label: defaultLabel,
          description: defaultDesc,
          category: category || (type === "startEnd" ? (category || "start") : undefined),
        },
        selected: true,
      };

      const newEdge: Edge = {
        id: `e-${sourceNodeId}-${newId}-${Date.now()}`,
        source: sourceNodeId,
        target: newId,
        sourceHandle: sourceHandle,
        targetHandle: targetHandle,
        markerEnd: { type: MarkerType.ArrowClosed, color: "var(--color-terracotta, #e05d38)" },
        style: { stroke: "var(--color-terracotta, #e05d38)", strokeWidth: 2 },
      };

      setNodes((prev) => [...prev.map((n) => ({ ...n, selected: false })), newNode]);
      setEdges((prev) => [...prev, newEdge]);
      setSelectedNodeId(newId);
      setSelectedEdgeId(null);
      setQuickConnectDrop(null);
    },
    [quickConnectDrop, nodes, setNodes, setEdges]
  );

  // Adicionar novo nó genérico
  const addNode = useCallback((type: FlowNodeType, category?: string) => {
    const id = `node-${Date.now()}`;
    const offset = (nodes.length % 5) * 30;

    let defaultLabel = "Nova Etapa";
    let defaultDesc: string | undefined = undefined;

    switch (type) {
      case "startEnd":
        defaultLabel = category === "end" ? "Fim do Processo" : "Início";
        break;
      case "process":
        defaultLabel = "Etapa do Processo";
        defaultDesc = "Descrição do procedimento";
        break;
      case "decision":
        defaultLabel = "Condição / Decisão?";
        break;
      case "automation":
        defaultLabel = "Disparo Automático";
        defaultDesc = "Disparo de evento / webhook";
        break;
      case "whatsapp":
        defaultLabel = "Mensagem WhatsApp";
        defaultDesc = "Mensagem de texto ou template";
        break;
      case "social":
        defaultLabel = "Instagram / Social";
        defaultDesc = "Direct, post ou interação";
        break;
      case "email":
        defaultLabel = "Envio de E-mail";
        defaultDesc = "E-mail com proposta ou boas-vindas";
        break;
      case "meeting":
        defaultLabel = "Reunião / Call";
        defaultDesc = "Call de alinhamento ou demonstração";
        break;
      case "payment":
        defaultLabel = "Cobrança / Pagamento";
        defaultDesc = "Link de pagamento, Pix ou boleto";
        break;
      case "delay":
        defaultLabel = "Aguardar / Delay";
        defaultDesc = "Aguardar 24h ou resposta";
        break;
      case "approval":
        defaultLabel = "Aprovação do Cliente";
        defaultDesc = "Validação de entrega ou etapa";
        break;
      case "document":
        defaultLabel = "Contrato / Briefing";
        defaultDesc = "Documento ou assinatura digital";
        break;
      case "note":
        defaultLabel = "Nota explicativa...";
        break;
    }

    const newNode: Node = {
      id,
      type,
      position: { x: 280 + offset, y: 220 + offset },
      data: {
        label: defaultLabel,
        description: defaultDesc,
        category: category || (type === "startEnd" ? (category || "start") : undefined),
      },
      selected: true,
    };

    setNodes((prev) => [...prev.map((n) => ({ ...n, selected: false })), newNode]);
    setSelectedNodeId(id);
    setSelectedEdgeId(null);
  }, [nodes.length, setNodes]);

  // Atalho 1: Criar Próxima Etapa / Filho (Tab) conectado automaticamente
  const handleAddNextStep = useCallback(() => {
    const parentNode = nodes.find((n) => n.id === selectedNodeId) || nodes[nodes.length - 1];
    if (!parentNode) {
      addNode("process");
      return;
    }

    const newId = `node-${Date.now()}`;
    const newPosition = {
      x: parentNode.position.x,
      y: parentNode.position.y + 130,
    };

    const newNode: Node = {
      id: newId,
      type: "process",
      position: newPosition,
      data: {
        label: "Nova Etapa",
        description: "",
      },
      selected: true,
    };

    const newEdge: Edge = {
      id: `e-${parentNode.id}-${newId}`,
      source: parentNode.id,
      target: newId,
      markerEnd: { type: MarkerType.ArrowClosed, color: "var(--color-terracotta, #e05d38)" },
      style: { stroke: "var(--color-terracotta, #e05d38)", strokeWidth: 2 },
    };

    setNodes((prev) => [...prev.map((n) => ({ ...n, selected: false })), newNode]);
    setEdges((prev) => [...prev, newEdge]);
    setSelectedNodeId(newId);
    setSelectedEdgeId(null);
  }, [nodes, selectedNodeId, addNode, setNodes, setEdges]);

  // Atalho 2: Criar Etapa Paralela / Irmão (Enter)
  const handleAddSibling = useCallback(() => {
    const parentNode = nodes.find((n) => n.id === selectedNodeId) || nodes[nodes.length - 1];
    if (!parentNode) {
      addNode("process");
      return;
    }

    const newId = `node-${Date.now()}`;
    const newPosition = {
      x: parentNode.position.x + 220,
      y: parentNode.position.y,
    };

    const newNode: Node = {
      id: newId,
      type: parentNode.type || "process",
      position: newPosition,
      data: {
        label: "Nova Etapa",
        description: "",
        category: (parentNode.data as CustomNodeData)?.category,
      },
      selected: true,
    };

    setNodes((prev) => [...prev.map((n) => ({ ...n, selected: false })), newNode]);
    setSelectedNodeId(newId);
    setSelectedEdgeId(null);
  }, [nodes, selectedNodeId, addNode, setNodes]);

  // Atalhos de teclado (Tab = Filho, Enter = Irmão, Cmd+Z = Undo, Cmd+Shift+Z = Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const tag = activeEl?.tagName?.toLowerCase();
      const isInput = tag === "input" || tag === "textarea" || (activeEl as HTMLElement)?.isContentEditable;

      if (isInput) return;

      if (e.key === "Escape") {
        setQuickConnectDrop(null);
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        handleAddNextStep();
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleAddSibling();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleAddNextStep, handleAddSibling, handleUndo, handleRedo]);

  // Atualizar dados do nó selecionado
  const updateSelectedNode = (patch: Partial<CustomNodeData>) => {
    if (!selectedNodeId) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNodeId) {
          return {
            ...n,
            data: {
              ...n.data,
              ...patch,
            },
          };
        }
        return n;
      })
    );
  };

  // Alterar categoria do nó selecionado
  const changeSelectedNodeCategory = (type: FlowNodeType, category?: string) => {
    if (!selectedNodeId) return;

    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNodeId) {
          return {
            ...n,
            type,
            data: {
              ...n.data,
              category: category || (type === "startEnd" ? (category || "start") : undefined),
            },
          };
        }
        return n;
      })
    );
  };

  // Excluir nó selecionado
  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  };

  // Duplicar nó selecionado
  const duplicateSelectedNode = () => {
    if (!selectedNode) return;
    const newId = `node-${Date.now()}`;
    const duplicatedNode: Node = {
      ...selectedNode,
      id: newId,
      position: { x: selectedNode.position.x + 40, y: selectedNode.position.y + 40 },
      selected: true,
    };
    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), duplicatedNode]);
    setSelectedNodeId(newId);
  };

  // Atualizar rótulo da linha (edge) selecionada
  const updateSelectedEdgeLabel = (label: string) => {
    if (!selectedEdgeId) return;
    setEdges((eds) =>
      eds.map((e) => (e.id === selectedEdgeId ? { ...e, label } : e))
    );
  };

  // Excluir linha (edge) selecionada
  const deleteSelectedEdge = () => {
    if (!selectedEdgeId) return;
    setEdges((eds) => eds.filter((e) => e.id !== selectedEdgeId));
    setSelectedEdgeId(null);
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: isDark ? "#0f172a" : "#f8fafc",
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeClick={(_, node) => {
          setSelectedNodeId(node.id);
          setSelectedEdgeId(null);
        }}
        onEdgeClick={(_, edge) => {
          setSelectedEdgeId(edge.id);
          setSelectedNodeId(null);
        }}
        onPaneClick={() => {
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
        }}
        connectionMode={ConnectionMode.Loose}
        deleteKeyCode={["Backspace", "Delete"]}
        fitView
        colorMode={isDark ? "dark" : "light"}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={18}
          size={1.5}
          color={isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"}
        />
        <Controls
          style={{
            borderRadius: "10px",
            overflow: "hidden",
            boxShadow: "var(--shadow-md, 0 4px 14px rgba(0,0,0,0.08))",
            border: "1px solid var(--color-border-subtle, #e2e8f0)",
          }}
        />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          style={{
            borderRadius: "10px",
            border: "1px solid var(--color-border-subtle, #e2e8f0)",
            background: isDark ? "#1e293b" : "#ffffff",
          }}
        />

        {/* Barra de Ferramentas Superior Esquerda (Idêntica ao Mapa Mental) */}
        <Panel position="top-left" style={{ margin: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* Linha 1: Ações de Atalho principais */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "12px",
              backgroundColor: "var(--color-surface-raised, #ffffff)",
              border: "1px solid var(--color-border-subtle, #e2e8f0)",
              boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
              backdropFilter: "blur(12px)",
            }}
          >
            <button
              onClick={handleAddNextStep}
              title="Próxima Etapa / Conectar Filho (Tab)"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 10px",
                borderRadius: "8px",
                border: "none",
                background: "var(--color-terracotta-100, #fbeee9)",
                color: "var(--color-terracotta-ink, #c2410c)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <CornerDownRight size={13} />
              Filho (Tab)
            </button>

            <button
              onClick={handleAddSibling}
              title="Adicionar Etapa Paralela / Irmão (Enter)"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 10px",
                borderRadius: "8px",
                border: "none",
                background: "var(--color-surface-sunken, #f1f5f9)",
                color: "var(--color-text-primary, #0f172a)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Plus size={13} />
              Irmão (Enter)
            </button>

            <div style={{ width: "1px", height: "18px", background: "var(--color-border-subtle, #e2e8f0)", margin: "0 4px" }} />

            <button
              onClick={handleUndo}
              title="Desfazer (Cmd+Z)"
              style={{
                padding: "6px 8px",
                borderRadius: "6px",
                border: "none",
                background: "transparent",
                color: "var(--color-text-secondary, #64748b)",
                cursor: "pointer",
              }}
            >
              <RotateCcw size={14} />
            </button>

            <button
              onClick={handleRedo}
              title="Refazer (Cmd+Shift+Z)"
              style={{
                padding: "6px 8px",
                borderRadius: "6px",
                border: "none",
                background: "transparent",
                color: "var(--color-text-secondary, #64748b)",
                cursor: "pointer",
              }}
            >
              <RotateCw size={14} />
            </button>

            <div style={{ width: "1px", height: "18px", background: "var(--color-border-subtle, #e2e8f0)", margin: "0 4px" }} />

            <button
              onClick={handleToCenter}
              title="Centralizar no Nó Selecionado"
              style={{
                padding: "6px 8px",
                borderRadius: "6px",
                border: "none",
                background: "transparent",
                color: "var(--color-text-secondary, #64748b)",
                cursor: "pointer",
              }}
            >
              <Focus size={14} />
            </button>

            <button
              onClick={handleFit}
              title="Ajustar à Tela"
              style={{
                padding: "6px 8px",
                borderRadius: "6px",
                border: "none",
                background: "transparent",
                color: "var(--color-text-secondary, #64748b)",
                cursor: "pointer",
              }}
            >
              <Maximize2 size={14} />
            </button>

            <button
              onClick={handleZoomIn}
              title="Zoom +"
              style={{
                padding: "6px 8px",
                borderRadius: "6px",
                border: "none",
                background: "transparent",
                color: "var(--color-text-secondary, #64748b)",
                cursor: "pointer",
              }}
            >
              <ZoomIn size={14} />
            </button>

            <button
              onClick={handleZoomOut}
              title="Zoom -"
              style={{
                padding: "6px 8px",
                borderRadius: "6px",
                border: "none",
                background: "transparent",
                color: "var(--color-text-secondary, #64748b)",
                cursor: "pointer",
              }}
            >
              <ZoomOut size={14} />
            </button>

            <div style={{ width: "1px", height: "16px", backgroundColor: "var(--color-border-subtle, #e2e8f0)", margin: "0 2px" }} />

            <button
              onClick={() => setIsMarkdownModalOpen(true)}
              title="Ver e Editar como Markdown / Texto (com IA)"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 10px",
                borderRadius: "6px",
                border: "1px solid rgba(224, 93, 56, 0.3)",
                background: "rgba(224, 93, 56, 0.08)",
                color: "var(--color-terracotta, #e05d38)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <FileText size={13} />
              <span>Texto / Markdown</span>
            </button>
          </div>

          {/* Linha 2: Paleta de Blocos Organizada */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 10px",
              borderRadius: "12px",
              backgroundColor: "var(--color-surface-raised, #ffffff)",
              border: "1px solid var(--color-border-subtle, #e2e8f0)",
              boxShadow: "0 6px 20px rgba(0,0,0,0.1)",
              backdropFilter: "blur(12px)",
              maxWidth: "calc(100vw - 120px)",
              overflowX: "auto",
              whiteSpace: "nowrap",
            }}
          >
            {/* Seção Fluxo Base */}
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
                color: "var(--color-text-tertiary, #94a3b8)",
                paddingRight: "2px",
              }}
            >
              Fluxo
            </span>

            <button
              onClick={() => addNode("startEnd", "start")}
              title="Adicionar Início"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
                borderRadius: "6px",
                border: "none",
                background: "rgba(16, 185, 129, 0.12)",
                color: "#10b981",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Play size={11} fill="#10b981" />
              Início
            </button>

            <button
              onClick={() => addNode("process")}
              title="Adicionar Etapa de Processo"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
                borderRadius: "6px",
                border: "none",
                background: "var(--color-terracotta-100, #fbeee9)",
                color: "var(--color-terracotta-ink, #c2410c)",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Layers size={11} />
              Etapa
            </button>

            <button
              onClick={() => addNode("decision")}
              title="Adicionar Decisão / Condição"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
                borderRadius: "6px",
                border: "none",
                background: "rgba(245, 158, 11, 0.12)",
                color: "#d97706",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <GitBranch size={11} />
              Decisão
            </button>

            <button
              onClick={() => addNode("automation")}
              title="Adicionar Automação"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
                borderRadius: "6px",
                border: "none",
                background: "rgba(59, 130, 246, 0.12)",
                color: "#2563eb",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Zap size={11} />
              Automação
            </button>

            <button
              onClick={() => addNode("startEnd", "end")}
              title="Adicionar Fim"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
                borderRadius: "6px",
                border: "none",
                background: "rgba(239, 68, 68, 0.12)",
                color: "#ef4444",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <CheckCircle2 size={11} />
              Fim
            </button>

            <div style={{ width: "1px", height: "16px", background: "var(--color-border-subtle, #e2e8f0)", margin: "0 3px", flexShrink: 0 }} />

            {/* Seção Canais */}
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
                color: "var(--color-text-tertiary, #94a3b8)",
                paddingRight: "2px",
              }}
            >
              Canais
            </span>

            <button
              onClick={() => addNode("whatsapp")}
              title="Adicionar Mensagem WhatsApp"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
                borderRadius: "6px",
                border: "none",
                background: "rgba(22, 163, 74, 0.12)",
                color: "#16a34a",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <MessageCircle size={11} />
              WhatsApp
            </button>

            <button
              onClick={() => addNode("social")}
              title="Adicionar Instagram / Redes Sociais"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
                borderRadius: "6px",
                border: "none",
                background: "rgba(225, 48, 108, 0.12)",
                color: "#e1306c",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Camera size={11} />
              Instagram
            </button>

            <button
              onClick={() => addNode("email")}
              title="Adicionar Disparo de E-mail"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
                borderRadius: "6px",
                border: "none",
                background: "rgba(99, 102, 241, 0.12)",
                color: "#6366f1",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Mail size={11} />
              E-mail
            </button>

            <button
              onClick={() => addNode("meeting")}
              title="Adicionar Reunião / Call"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
                borderRadius: "6px",
                border: "none",
                background: "rgba(139, 92, 246, 0.12)",
                color: "#8b5cf6",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Video size={11} />
              Reunião
            </button>

            <div style={{ width: "1px", height: "16px", background: "var(--color-border-subtle, #e2e8f0)", margin: "0 3px", flexShrink: 0 }} />

            {/* Seção Operações & Ações */}
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
                color: "var(--color-text-tertiary, #94a3b8)",
                paddingRight: "2px",
              }}
            >
              Ações
            </span>

            <button
              onClick={() => addNode("payment")}
              title="Adicionar Pagamento / Venda"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
                borderRadius: "6px",
                border: "none",
                background: "rgba(5, 150, 105, 0.12)",
                color: "#059669",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <CreditCard size={11} />
              Pagamento
            </button>

            <button
              onClick={() => addNode("delay")}
              title="Adicionar Espera / Delay"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
                borderRadius: "6px",
                border: "none",
                background: "rgba(245, 158, 11, 0.12)",
                color: "#f59e0b",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Clock size={11} />
              Espera
            </button>

            <button
              onClick={() => addNode("approval")}
              title="Adicionar Aprovação do Cliente"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
                borderRadius: "6px",
                border: "none",
                background: "rgba(6, 182, 212, 0.12)",
                color: "#06b6d4",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <CheckCheck size={11} />
              Aprovação
            </button>

            <button
              onClick={() => addNode("document")}
              title="Adicionar Documento / Contrato"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
                borderRadius: "6px",
                border: "none",
                background: "rgba(71, 85, 105, 0.12)",
                color: "#475569",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <FileCheck size={11} />
              Contrato
            </button>

            <div style={{ width: "1px", height: "16px", background: "var(--color-border-subtle, #e2e8f0)", margin: "0 3px", flexShrink: 0 }} />

            {/* Nota */}
            <button
              onClick={() => addNode("note")}
              title="Adicionar Nota Adesiva"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
                borderRadius: "6px",
                border: "none",
                background: "#fef3c7",
                color: "#92400e",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <StickyNote size={11} />
              Nota
            </button>
          </div>
        </Panel>

        {/* Dica de Atalhos Flutuante no Rodapé Esquerdo */}
        <Panel position="bottom-left" style={{ margin: "14px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 12px",
              borderRadius: "8px",
              backgroundColor: "var(--color-surface-raised, #ffffff)",
              border: "1px solid var(--color-border-subtle, #e2e8f0)",
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
              fontSize: "11px",
              color: "var(--color-text-secondary, #64748b)",
              pointerEvents: "none",
            }}
          >
            <Keyboard size={13} />
            <span>💡 <b>Puxe o fio para o vazio</b> para criar e conectar &bull; <b>Tab</b> próximo &bull; <b>Enter</b> paralelo &bull; <b>Del</b> exclui</span>
          </div>
        </Panel>
      </ReactFlow>

      {/* Menu Flutuante ao Puxar o Fio e Soltar no Espaço Vazio */}
      {quickConnectDrop && (
        <>
          {/* Backdrop para fechar ao clicar fora */}
          <div
            onClick={() => setQuickConnectDrop(null)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 998,
              background: "transparent",
            }}
          />

          <div
            style={{
              position: "fixed",
              left: `${Math.min(typeof window !== "undefined" ? window.innerWidth - 270 : 600, Math.max(16, quickConnectDrop.screenPosition.x - 120))}px`,
              top: `${Math.min(typeof window !== "undefined" ? window.innerHeight - 380 : 400, Math.max(16, quickConnectDrop.screenPosition.y - 40))}px`,
              width: "250px",
              backgroundColor: "var(--color-surface-raised, #ffffff)",
              borderRadius: "14px",
              border: "1px solid var(--color-border-subtle, #e2e8f0)",
              boxShadow: "0 14px 36px rgba(0,0,0,0.22)",
              padding: "12px",
              zIndex: 999,
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              animation: "fadeIn 0.12s ease-out",
            }}
          >
            {/* Cabeçalho do menu */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: "8px",
                borderBottom: "1px solid var(--color-border-subtle, #e2e8f0)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "var(--color-text-primary, #0f172a)" }}>
                <CornerDownRight size={14} color="var(--color-terracotta, #e05d38)" />
                <span>Conectar Novo Bloco</span>
              </div>
              <button
                onClick={() => setQuickConnectDrop(null)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary, #94a3b8)", padding: "2px" }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Grid de opções com hover animado */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px", maxHeight: "240px", overflowY: "auto", paddingRight: "2px" }}>
              {[
                { type: "process" as FlowNodeType, label: "Etapa", icon: Layers, color: "#e05d38" },
                { type: "decision" as FlowNodeType, label: "Decisão", icon: GitBranch, color: "#f59e0b" },
                { type: "automation" as FlowNodeType, label: "Automação", icon: Zap, color: "#3b82f6" },
                { type: "whatsapp" as FlowNodeType, label: "WhatsApp", icon: MessageCircle, color: "#16a34a" },
                { type: "social" as FlowNodeType, label: "Instagram", icon: Camera, color: "#e1306c" },
                { type: "email" as FlowNodeType, label: "E-mail", icon: Mail, color: "#6366f1" },
                { type: "meeting" as FlowNodeType, label: "Reunião", icon: Video, color: "#8b5cf6" },
                { type: "payment" as FlowNodeType, label: "Pagamento", icon: CreditCard, color: "#059669" },
                { type: "delay" as FlowNodeType, label: "Espera", icon: Clock, color: "#f59e0b" },
                { type: "approval" as FlowNodeType, label: "Aprovação", icon: CheckCheck, color: "#06b6d4" },
                { type: "document" as FlowNodeType, label: "Contrato", icon: FileCheck, color: "#475569" },
                { type: "startEnd" as FlowNodeType, category: "end", label: "Fim", icon: CheckCircle2, color: "#ef4444" },
                { type: "note" as FlowNodeType, label: "Nota", icon: StickyNote, color: "#d97706" },
              ].map((item) => {
                const IconComp = item.icon;
                return (
                  <button
                    key={`${item.type}-${item.category || "default"}`}
                    onClick={() => handleCreateNodeFromDrop(item.type, item.category)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 8px",
                      borderRadius: "6px",
                      border: "1px solid var(--color-border-subtle, #e2e8f0)",
                      backgroundColor: "var(--color-surface-sunken, #f8fafc)",
                      color: "var(--color-text-primary, #0f172a)",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.12s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = item.color;
                      e.currentTarget.style.backgroundColor = `${item.color}15`;
                      e.currentTarget.style.color = item.color;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--color-border-subtle, #e2e8f0)";
                      e.currentTarget.style.backgroundColor = "var(--color-surface-sunken, #f8fafc)";
                      e.currentTarget.style.color = "var(--color-text-primary, #0f172a)";
                    }}
                  >
                    <IconComp size={13} color={item.color} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ fontSize: "10px", color: "var(--color-text-tertiary, #94a3b8)", textAlign: "center", paddingTop: "4px" }}>
              Escolha o bloco ou pressione <b>Esc</b>
            </div>
          </div>
        </>
      )}

      {/* Painel Lateral Direito de Propriedades do Nó Selecionado */}
      {selectedNode && (
        <div
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            width: "300px",
            maxHeight: "calc(100vh - 120px)",
            overflowY: "auto",
            backgroundColor: "var(--color-surface-raised, #ffffff)",
            borderRadius: "14px",
            border: "1px solid var(--color-border-subtle, #e2e8f0)",
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.15)",
            padding: "16px",
            zIndex: 30,
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--color-border-subtle, #e2e8f0)", paddingBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "13px" }}>
              <Sliders size={15} color="var(--color-terracotta, #e05d38)" />
              Propriedades do Nó
            </div>
            <button
              onClick={() => setSelectedNodeId(null)}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary, #94a3b8)", padding: "2px" }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Título do Nó */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", color: "var(--color-text-secondary, #64748b)", marginBottom: "4px" }}>
              Título / Nome da Etapa
            </label>
            <input
              type="text"
              value={((selectedNode.data as CustomNodeData)?.label as string) || ""}
              onChange={(e) => updateSelectedNode({ label: e.target.value })}
              placeholder="Digite o título..."
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid var(--color-border-subtle, #e2e8f0)",
                backgroundColor: "var(--color-surface-canvas, #ffffff)",
                fontSize: "13px",
                color: "var(--color-text-primary, #0f172a)",
                outline: "none",
              }}
            />
          </div>

          {/* Descrição do Nó (se não for start/end) */}
          {selectedNode.type !== "startEnd" && (
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", color: "var(--color-text-secondary, #64748b)", marginBottom: "4px" }}>
                Descrição / Instruções
              </label>
              <textarea
                rows={3}
                value={((selectedNode.data as CustomNodeData)?.description as string) || ""}
                onChange={(e) => updateSelectedNode({ description: e.target.value })}
                placeholder="Detalhes ou orientações da etapa..."
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid var(--color-border-subtle, #e2e8f0)",
                  backgroundColor: "var(--color-surface-canvas, #ffffff)",
                  fontSize: "12px",
                  color: "var(--color-text-primary, #0f172a)",
                  outline: "none",
                  resize: "vertical",
                }}
              />
            </div>
          )}

          {/* Tipo do Nó */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", color: "var(--color-text-secondary, #64748b)", marginBottom: "6px" }}>
              Tipo de Elemento
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              {[
                { type: "startEnd" as FlowNodeType, category: "start", label: "Início", icon: Play, color: "#10b981" },
                { type: "process" as FlowNodeType, label: "Etapa", icon: Layers, color: "#e05d38" },
                { type: "decision" as FlowNodeType, label: "Decisão", icon: GitBranch, color: "#f59e0b" },
                { type: "automation" as FlowNodeType, label: "Automação", icon: Zap, color: "#3b82f6" },
                { type: "whatsapp" as FlowNodeType, label: "WhatsApp", icon: MessageCircle, color: "#16a34a" },
                { type: "social" as FlowNodeType, label: "Instagram", icon: Camera, color: "#e1306c" },
                { type: "email" as FlowNodeType, label: "E-mail", icon: Mail, color: "#6366f1" },
                { type: "meeting" as FlowNodeType, label: "Reunião", icon: Video, color: "#8b5cf6" },
                { type: "payment" as FlowNodeType, label: "Pagamento", icon: CreditCard, color: "#059669" },
                { type: "delay" as FlowNodeType, label: "Espera", icon: Clock, color: "#f59e0b" },
                { type: "approval" as FlowNodeType, label: "Aprovação", icon: CheckCheck, color: "#06b6d4" },
                { type: "document" as FlowNodeType, label: "Contrato", icon: FileCheck, color: "#475569" },
                { type: "startEnd" as FlowNodeType, category: "end", label: "Fim", icon: CheckCircle2, color: "#ef4444" },
                { type: "note" as FlowNodeType, label: "Nota", icon: StickyNote, color: "#d97706" },
              ].map((item) => {
                const isCurrent =
                  selectedNode.type === item.type &&
                  (item.category
                    ? (selectedNode.data as CustomNodeData)?.category === item.category
                    : selectedNode.type === "startEnd"
                    ? (selectedNode.data as CustomNodeData)?.category === "start"
                    : true);
                const IconComp = item.icon;

                return (
                  <button
                    key={`${item.type}-${item.category || "default"}`}
                    type="button"
                    onClick={() => changeSelectedNodeCategory(item.type, item.category)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 8px",
                      borderRadius: "6px",
                      border: isCurrent ? `1.5px solid ${item.color}` : "1px solid var(--color-border-subtle, #e2e8f0)",
                      backgroundColor: isCurrent ? `${item.color}15` : "transparent",
                      color: isCurrent ? item.color : "var(--color-text-primary, #0f172a)",
                      fontSize: "11px",
                      fontWeight: isCurrent ? 700 : 500,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <IconComp size={12} color={item.color} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ações Rápidas */}
          <div style={{ display: "flex", gap: "8px", paddingTop: "8px", borderTop: "1px solid var(--color-border-subtle, #e2e8f0)" }}>
            <button
              type="button"
              onClick={duplicateSelectedNode}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                padding: "8px",
                borderRadius: "8px",
                border: "1px solid var(--color-border-subtle, #e2e8f0)",
                background: "transparent",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Copy size={13} />
              Duplicar
            </button>
            <button
              type="button"
              onClick={deleteSelectedNode}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "none",
                background: "rgba(239, 68, 68, 0.1)",
                color: "#ef4444",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Trash2 size={13} />
              Excluir
            </button>
          </div>
        </div>
      )}

      {/* Painel de Linha/Edge Selecionada */}
      {selectedEdge && (
        <div
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            width: "280px",
            backgroundColor: "var(--color-surface-raised, #ffffff)",
            borderRadius: "14px",
            border: "1px solid var(--color-border-subtle, #e2e8f0)",
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.15)",
            padding: "16px",
            zIndex: 30,
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--color-border-subtle, #e2e8f0)", paddingBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "13px" }}>
              <Type size={15} color="var(--color-terracotta, #e05d38)" />
              Conexão / Linha
            </div>
            <button
              onClick={() => setSelectedEdgeId(null)}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary, #94a3b8)" }}
            >
              <X size={16} />
            </button>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", color: "var(--color-text-secondary, #64748b)", marginBottom: "4px" }}>
              Rótulo da Linha (ex: Sim, Não, Etapa 1)
            </label>
            <input
              type="text"
              value={typeof selectedEdge.label === "string" ? selectedEdge.label : ""}
              onChange={(e) => updateSelectedEdgeLabel(e.target.value)}
              placeholder="Sem rótulo"
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid var(--color-border-subtle, #e2e8f0)",
                backgroundColor: "var(--color-surface-canvas, #ffffff)",
                fontSize: "13px",
                color: "var(--color-text-primary, #0f172a)",
                outline: "none",
              }}
            />
          </div>

          <button
            type="button"
            onClick={deleteSelectedEdge}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "8px",
              borderRadius: "8px",
              border: "none",
              background: "rgba(239, 68, 68, 0.1)",
              color: "#ef4444",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Trash2 size={13} />
            Excluir Conexão
          </button>
        </div>
      )}

      {/* Modal de Visão Markdown & Gerador */}
      <MarkdownViewModal
        isOpen={isMarkdownModalOpen}
        nodes={nodes}
        edges={edges}
        onClose={() => setIsMarkdownModalOpen(false)}
        onApplyMarkdown={handleApplyMarkdown}
      />
    </div>
  );
}

export default function FlowchartEditor(props: FlowchartEditorProps) {
  return (
    <ReactFlowProvider>
      <FlowchartCanvas {...props} />
    </ReactFlowProvider>
  );
}
