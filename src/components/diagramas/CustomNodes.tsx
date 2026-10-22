"use client";

import React, { createContext, memo, useContext, useState } from "react";
import { Handle, Position, NodeProps, Node, useReactFlow, NodeToolbar } from "@xyflow/react";
import { 
  Play, 
  CheckCircle2, 
  GitBranch, 
  Zap, 
  FileText, 
  Layers,
  Edit3,
  Trash2,
  Copy,
  MessageCircle,
  Camera,
  Mail,
  Video,
  CreditCard,
  Clock,
  CheckCheck,
  FileCheck,
  Plus,
  Focus,
  LucideIcon
} from "lucide-react";

export interface CustomNodeData extends Record<string, unknown> {
  label: string;
  description?: string;
  category?: string;
  status?: string;
  icon?: string;
}

export type CustomNodeType = Node<CustomNodeData>;

export type FlowDirection = "top" | "right" | "bottom" | "left";

// Identidade Pratic nos blocos: cartões pretos, laranja como cor de ação/realce.
// O tipo de bloco continua visível pelo ícone colorido + rótulo.
const BRAND = {
  orange: "#d97757",
  orangeDeep: "#c96442",
  ink: "#1b1c1a",
  inkBorder: "#3a3833",
  cream: "#faf9f5",
  muted: "#b5b2a8",
};

// Ações do editor que os nós precisam disparar (criar bloco conectado, centralizar).
// Fornecido pelo FlowchartEditor; fora dele os botões simplesmente não aparecem.
export const FlowActionsContext = createContext<{
  addConnected: (fromId: string, direction: FlowDirection) => void;
  centerOn: (id: string) => void;
} | null>(null);

// Pede ao nó para abrir a edição inline do título (usado ao criar e pelo botão Editar).
// O nonce vira a `key` do texto: muda → remonta já em modo de edição.
function useEditNonce(id: string, data: CustomNodeData) {
  const { updateNodeData } = useReactFlow();
  const nonce = typeof data?.editNonce === "number" ? data.editNonce : undefined;
  return {
    key: nonce ?? 0,
    autoEdit: nonce !== undefined,
    onExitEdit: () => {
      if (nonce !== undefined) updateNodeData(id, { editNonce: undefined });
    },
  };
}

// Componente auxiliar de texto editável inline
function InlineEditableText({
  value,
  onChange,
  placeholder,
  style,
  inputStyle,
  multiline = false,
  autoEdit = false,
  onExitEdit,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  multiline?: boolean;
  autoEdit?: boolean;
  onExitEdit?: () => void;
}) {
  const [isEditing, setIsEditing] = useState(autoEdit);
  const [text, setText] = useState(value);

  const startEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setText(value);
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (text.trim() !== value) {
      onChange(text.trim() || placeholder || "");
    }
    onExitEdit?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (!multiline || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === "Escape") {
      setIsEditing(false);
      onExitEdit?.();
    }
  };

  if (isEditing) {
    if (multiline) {
      return (
        <textarea
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          className="nodrag nopan"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{
            width: "100%",
            backgroundColor: "var(--color-surface-sunken, #f1f5f9)",
            border: "1px solid var(--color-terracotta, #e05d38)",
            borderRadius: "6px",
            padding: "4px 6px",
            fontSize: "11px",
            color: "var(--color-text-primary, #0f172a)",
            outline: "none",
            resize: "none",
            minHeight: "44px",
            ...inputStyle,
          }}
        />
      );
    }

    return (
      <input
        type="text"
        autoFocus
        onFocus={(e) => e.currentTarget.select()}
        className="nodrag nopan"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        style={{
          width: "100%",
          backgroundColor: "rgba(255,255,255,0.25)",
          border: "1px solid var(--color-terracotta, #e05d38)",
          borderRadius: "4px",
          padding: "2px 4px",
          fontSize: "inherit",
          fontWeight: "inherit",
          color: "inherit",
          outline: "none",
          ...inputStyle,
        }}
      />
    );
  }

  return (
    <div
      onDoubleClick={startEditing}
      title="Clique duas vezes para editar"
      style={{
        cursor: "text",
        ...style,
      }}
    >
      {value || <span style={{ opacity: 0.6, fontStyle: "italic" }}>{placeholder}</span>}
    </div>
  );
}

const toolbarBtn: React.CSSProperties = {
  border: "none",
  background: "transparent",
  cursor: "pointer",
  padding: "4px",
  borderRadius: "4px",
  color: "var(--color-text-secondary, #64748b)",
  display: "flex",
};

// Barra de ferramentas flutuante ao selecionar nó
function QuickNodeToolbar({ id }: { id: string }) {
  const { deleteElements, getNode, addNodes, updateNodeData } = useReactFlow();
  const actions = useContext(FlowActionsContext);

  const handleDelete = () => {
    deleteElements({ nodes: [{ id }] });
  };

  const handleDuplicate = () => {
    const node = getNode(id);
    if (!node) return;
    const newNode = {
      ...node,
      id: `node-${Date.now()}`,
      position: { x: node.position.x + 40, y: node.position.y + 40 },
      selected: false,
    };
    addNodes(newNode);
  };

  return (
    <NodeToolbar position={Position.Top} offset={40} style={{ display: "flex", gap: "2px", padding: "4px", background: "var(--color-surface-raised, #ffffff)", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", border: "1px solid var(--color-border-subtle, #e2e8f0)" }}>
      <button onClick={() => updateNodeData(id, { editNonce: Date.now() })} title="Editar texto (duplo clique)" style={toolbarBtn}>
        <Edit3 size={13} />
      </button>
      {actions && (
        <>
          <button onClick={() => actions.addConnected(id, "bottom")} title="Novo bloco conectado (Tab)" style={toolbarBtn}>
            <Plus size={13} />
          </button>
          <button onClick={() => actions.centerOn(id)} title="Centralizar na tela" style={toolbarBtn}>
            <Focus size={13} />
          </button>
        </>
      )}
      <button onClick={handleDuplicate} title="Duplicar bloco" style={toolbarBtn}>
        <Copy size={13} />
      </button>
      <button onClick={handleDelete} title="Excluir bloco (Del)" style={{ ...toolbarBtn, color: "#ef4444" }}>
        <Trash2 size={13} />
      </button>
    </NodeToolbar>
  );
}

const ADD_BUTTONS: { dir: FlowDirection; label: string; style: React.CSSProperties }[] = [
  { dir: "top", label: "acima", style: { top: -32, left: "50%", transform: "translateX(-50%)" } },
  { dir: "right", label: "à direita", style: { right: -32, top: "50%", transform: "translateY(-50%)" } },
  { dir: "bottom", label: "abaixo", style: { bottom: -32, left: "50%", transform: "translateX(-50%)" } },
  { dir: "left", label: "à esquerda", style: { left: -32, top: "50%", transform: "translateY(-50%)" } },
];

// Botões "+" nos 4 lados: criam um bloco já conectado naquela direção (estilo Whimsical).
// Aparecem com o nó selecionado ou com o mouse em cima (CSS em FlowchartEditor).
function AddButtons({ id, visible }: { id: string; visible?: boolean }) {
  const actions = useContext(FlowActionsContext);
  if (!actions) return null;

  return (
    <>
      {ADD_BUTTONS.map((b) => (
        <button
          key={b.dir}
          type="button"
          className="nodrag nopan flow-add-btn"
          data-visible={visible ? "true" : "false"}
          title={`Novo bloco conectado ${b.label}`}
          onClick={(e) => {
            e.stopPropagation();
            actions.addConnected(id, b.dir);
          }}
          style={{
            position: "absolute",
            width: 22,
            height: 22,
            borderRadius: 9999,
            border: "1px solid var(--color-border-default, #c7c7bf)",
            background: "var(--color-surface-raised, #ffffff)",
            color: "var(--color-terracotta, #d97757)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            padding: 0,
            zIndex: 5,
            boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
            ...b.style,
          }}
        >
          <Plus size={13} />
        </button>
      ))}
    </>
  );
}

// Card Base Reutilizável para nós temáticos
function BaseCardNode({
  id,
  data,
  isConnectable,
  selected,
  accentColor,
  badgeText,
  icon: Icon,
  defaultTitle,
}: {
  id: string;
  data: CustomNodeData;
  isConnectable: boolean;
  selected?: boolean;
  accentColor: string;
  badgeText: string;
  icon: LucideIcon;
  defaultTitle: string;
}) {
  const { updateNodeData } = useReactFlow();
  const edit = useEditNonce(id, data);

  return (
    <div
      style={{
        position: "relative",
        padding: "10px 14px 12px",
        borderRadius: "12px",
        backgroundColor: BRAND.ink,
        // Sem misturar `border` e `borderTop` (o React avisa ao re-renderizar a seleção)
        borderStyle: "solid",
        borderWidth: selected ? "3px 2px 2px" : "3px 1px 1px",
        borderColor: selected
          ? BRAND.orange
          : `${BRAND.orange} ${BRAND.inkBorder} ${BRAND.inkBorder} ${BRAND.inkBorder}`,
        boxShadow: selected
          ? `0 0 0 3px rgba(217, 119, 87, 0.25), 0 6px 18px rgba(0,0,0,0.25)`
          : "0 4px 14px rgba(0,0,0,0.18)",
        color: BRAND.cream,
        width: "240px",
        transition: "box-shadow 0.15s ease, border-color 0.15s ease",
      }}
    >
      <QuickNodeToolbar id={id} />
      <AddButtons id={id} visible={selected} />

      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
        <span
          style={{
            display: "flex",
            padding: "3px",
            borderRadius: "6px",
            backgroundColor: `color-mix(in srgb, ${accentColor} 22%, transparent)`,
            color: `color-mix(in srgb, ${accentColor} 70%, white)`,
          }}
        >
          <Icon size={12} />
        </span>
        <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: BRAND.muted }}>
          {badgeText}
        </span>
      </div>

      <InlineEditableText
        key={edit.key}
        autoEdit={edit.autoEdit}
        onExitEdit={edit.onExitEdit}
        value={data?.label || ""}
        onChange={(label) => updateNodeData(id, { label })}
        placeholder={defaultTitle}
        style={{ fontSize: "13px", fontWeight: 600, lineHeight: 1.35, wordBreak: "break-word" }}
      />

      <InlineEditableText
        value={data?.description || ""}
        onChange={(description) => updateNodeData(id, { description })}
        placeholder="Duplo clique para descrever"
        multiline
        style={{
          marginTop: "4px",
          fontSize: "11.5px",
          lineHeight: 1.4,
          color: BRAND.muted,
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          wordBreak: "break-word",
        }}
      />

      {/* Handles nos 4 lados - Suporte bidirecional total (puxar e receber) */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        isConnectable={isConnectable}
        style={{ background: BRAND.orange, width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        isConnectable={isConnectable}
        style={{ background: BRAND.orange, width: 8, height: 8, opacity: 0 }}
      />

      <Handle
        type="target"
        position={Position.Left}
        id="left"
        isConnectable={isConnectable}
        style={{ background: BRAND.orange, width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        isConnectable={isConnectable}
        style={{ background: BRAND.orange, width: 8, height: 8, opacity: 0 }}
      />

      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom"
        isConnectable={isConnectable}
        style={{ background: BRAND.orange, width: 8, height: 8, opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        isConnectable={isConnectable}
        style={{ background: BRAND.orange, width: 8, height: 8 }}
      />

      <Handle
        type="target"
        position={Position.Right}
        id="right"
        isConnectable={isConnectable}
        style={{ background: BRAND.orange, width: 8, height: 8, opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        isConnectable={isConnectable}
        style={{ background: BRAND.orange, width: 8, height: 8 }}
      />
    </div>
  );
}

// 1. Nó de Início / Fim (Pill Shape)
export const StartEndNode = memo(({ id, data, isConnectable, selected }: NodeProps<CustomNodeType>) => {
  const isStart = data?.category !== "end";
  const { updateNodeData } = useReactFlow();
  const edit = useEditNonce(id, data);

  return (
    <div
      style={{
        padding: "10px 18px",
        borderRadius: "9999px",
        // Início: pílula laranja com texto preto. Fim: pílula preta com contorno laranja.
        background: isStart ? BRAND.orange : BRAND.ink,
        color: isStart ? BRAND.ink : BRAND.cream,
        boxShadow: selected ? `0 0 0 3px ${isStart ? BRAND.ink : BRAND.orange}, 0 4px 14px rgba(0,0,0,0.25)` : "0 4px 12px rgba(0,0,0,0.18)",
        border: `2px solid ${BRAND.orange}`,
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "13px",
        fontWeight: 600,
        minWidth: "130px",
        justifyContent: "center",
        transition: "box-shadow 0.15s ease",
        position: "relative",
      }}
    >
      <QuickNodeToolbar id={id} />
      <AddButtons id={id} visible={selected} />

      {isStart ? <Play size={14} fill={BRAND.ink} /> : <CheckCircle2 size={14} color={BRAND.orange} />}
      
      <InlineEditableText
        key={edit.key}
        autoEdit={edit.autoEdit}
        onExitEdit={edit.onExitEdit}
        value={data?.label || (isStart ? "Início" : "Fim")}
        onChange={(newLabel) => updateNodeData(id, { label: newLabel })}
        placeholder={isStart ? "Início" : "Fim"}
        inputStyle={{ color: "inherit", textAlign: "center" }}
      />

      {/* Handles nos 4 lados - Suporte bidirecional (puxar e receber) */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        isConnectable={isConnectable}
        style={{ background: isStart ? BRAND.ink : BRAND.orange, width: 9, height: 9, border: `2px solid ${BRAND.orange}` }}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        isConnectable={isConnectable}
        style={{ background: isStart ? BRAND.ink : BRAND.orange, width: 9, height: 9, border: `2px solid ${BRAND.orange}`, opacity: 0 }}
      />

      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom"
        isConnectable={isConnectable}
        style={{ background: isStart ? BRAND.ink : BRAND.orange, width: 9, height: 9, border: `2px solid ${BRAND.orange}`, opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        isConnectable={isConnectable}
        style={{ background: isStart ? BRAND.ink : BRAND.orange, width: 9, height: 9, border: `2px solid ${BRAND.orange}` }}
      />

      <Handle
        type="target"
        position={Position.Left}
        id="left"
        isConnectable={isConnectable}
        style={{ background: isStart ? BRAND.ink : BRAND.orange, width: 9, height: 9, border: `2px solid ${BRAND.orange}` }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        isConnectable={isConnectable}
        style={{ background: isStart ? BRAND.ink : BRAND.orange, width: 9, height: 9, border: `2px solid ${BRAND.orange}`, opacity: 0 }}
      />

      <Handle
        type="target"
        position={Position.Right}
        id="right"
        isConnectable={isConnectable}
        style={{ background: isStart ? BRAND.ink : BRAND.orange, width: 9, height: 9, border: `2px solid ${BRAND.orange}`, opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        isConnectable={isConnectable}
        style={{ background: isStart ? BRAND.ink : BRAND.orange, width: 9, height: 9, border: `2px solid ${BRAND.orange}` }}
      />
    </div>
  );
});
StartEndNode.displayName = "StartEndNode";

// 2. Nó de Processo / Etapa Operacional
export const ProcessNode = memo((props: NodeProps<CustomNodeType>) => (
  <BaseCardNode
    {...props}
    accentColor="var(--color-terracotta, #e05d38)"
    badgeText="Etapa"
    icon={Layers}
    defaultTitle="Etapa do Processo"
  />
));
ProcessNode.displayName = "ProcessNode";

// 3. Nó de Decisão / Condição
export const DecisionNode = memo(({ id, data, isConnectable, selected }: NodeProps<CustomNodeType>) => {
  const { updateNodeData } = useReactFlow();
  const edit = useEditNonce(id, data);

  return (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: "14px",
        // Decisão: cartão preto com contorno laranja tracejado (ponto de bifurcação)
        backgroundColor: BRAND.ink,
        border: selected ? `2px solid ${BRAND.orange}` : `1.5px dashed ${BRAND.orange}`,
        boxShadow: selected ? "0 0 0 3px rgba(217, 119, 87, 0.25), 0 6px 18px rgba(0,0,0,0.25)" : "0 4px 14px rgba(0,0,0,0.18)",
        color: BRAND.cream,
        width: "240px",
        position: "relative",
      }}
    >
      <QuickNodeToolbar id={id} />
      <AddButtons id={id} visible={selected} />

      {/* Top Handles */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        isConnectable={isConnectable}
        style={{ background: BRAND.orange, width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        isConnectable={isConnectable}
        style={{ background: BRAND.orange, width: 8, height: 8, opacity: 0 }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
        <div
          style={{
            padding: "4px",
            borderRadius: "6px",
            backgroundColor: "rgba(217, 119, 87, 0.2)",
            color: BRAND.orange,
            display: "flex",
          }}
        >
          <GitBranch size={13} />
        </div>
        <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: BRAND.orange, letterSpacing: "0.05em" }}>
          Condição / Decisão
        </span>
      </div>

      <div style={{ marginTop: "4px" }}>
        <InlineEditableText
          key={edit.key}
          autoEdit={edit.autoEdit}
          onExitEdit={edit.onExitEdit}
          value={data?.label || "Condição?"}
          onChange={(newLabel) => updateNodeData(id, { label: newLabel })}
          placeholder="Ex: Cliente respondeu?"
          style={{ fontSize: "13px", fontWeight: 600, wordBreak: "break-word" }}
        />
      </div>

      {/* Left Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        isConnectable={isConnectable}
        style={{ background: BRAND.orange, width: 8, height: 8, opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        isConnectable={isConnectable}
        style={{ background: BRAND.orange, width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="no"
        isConnectable={false}
        style={{ display: "none" }}
      />

      {/* Right Handles */}
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        isConnectable={isConnectable}
        style={{ background: BRAND.orange, width: 8, height: 8, opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        isConnectable={isConnectable}
        style={{ background: BRAND.orange, width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="yes"
        isConnectable={false}
        style={{ display: "none" }}
      />

      {/* Bottom Handles */}
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom"
        isConnectable={isConnectable}
        style={{ background: BRAND.orange, width: 8, height: 8, opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        isConnectable={isConnectable}
        style={{ background: BRAND.orange, width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="default"
        isConnectable={false}
        style={{ display: "none" }}
      />
    </div>
  );
});
DecisionNode.displayName = "DecisionNode";

// 4. Nó de Automação / Gatilho Geral
export const AutomationNode = memo((props: NodeProps<CustomNodeType>) => (
  <BaseCardNode
    {...props}
    accentColor="#3b82f6"
    badgeText="Automação"
    icon={Zap}
    defaultTitle="Disparo Automático"
  />
));
AutomationNode.displayName = "AutomationNode";

// 5. Nó de WhatsApp
export const WhatsAppNode = memo((props: NodeProps<CustomNodeType>) => (
  <BaseCardNode
    {...props}
    accentColor="#16a34a"
    badgeText="WhatsApp"
    icon={MessageCircle}
    defaultTitle="Mensagem WhatsApp"
  />
));
WhatsAppNode.displayName = "WhatsAppNode";

// 6. Nó de Instagram / Redes Sociais
export const SocialNode = memo((props: NodeProps<CustomNodeType>) => (
  <BaseCardNode
    {...props}
    accentColor="#e1306c"
    badgeText="Instagram / Social"
    icon={Camera}
    defaultTitle="Direct / Post Instagram"
  />
));
SocialNode.displayName = "SocialNode";

// 7. Nó de E-mail
export const EmailNode = memo((props: NodeProps<CustomNodeType>) => (
  <BaseCardNode
    {...props}
    accentColor="#6366f1"
    badgeText="E-mail"
    icon={Mail}
    defaultTitle="Envio de E-mail"
  />
));
EmailNode.displayName = "EmailNode";

// 8. Nó de Reunião / Call
export const MeetingNode = memo((props: NodeProps<CustomNodeType>) => (
  <BaseCardNode
    {...props}
    accentColor="#8b5cf6"
    badgeText="Reunião / Call"
    icon={Video}
    defaultTitle="Call de Alinhamento"
  />
));
MeetingNode.displayName = "MeetingNode";

// 9. Nó de Pagamento / Venda
export const PaymentNode = memo((props: NodeProps<CustomNodeType>) => (
  <BaseCardNode
    {...props}
    accentColor="#059669"
    badgeText="Pagamento"
    icon={CreditCard}
    defaultTitle="Cobrança / Pix Gerado"
  />
));
PaymentNode.displayName = "PaymentNode";

// 10. Nó de Espera / Timer / Delay
export const DelayNode = memo((props: NodeProps<CustomNodeType>) => (
  <BaseCardNode
    {...props}
    accentColor="#f59e0b"
    badgeText="Aguardar / Delay"
    icon={Clock}
    defaultTitle="Aguardar 24 Horas"
  />
));
DelayNode.displayName = "DelayNode";

// 11. Nó de Aprovação
export const ApprovalNode = memo((props: NodeProps<CustomNodeType>) => (
  <BaseCardNode
    {...props}
    accentColor="#06b6d4"
    badgeText="Aprovação"
    icon={CheckCheck}
    defaultTitle="Aprovação do Cliente"
  />
));
ApprovalNode.displayName = "ApprovalNode";

// 12. Nó de Documento / Contrato / Briefing
export const DocumentNode = memo((props: NodeProps<CustomNodeType>) => (
  <BaseCardNode
    {...props}
    accentColor="#475569"
    badgeText="Documento / Contrato"
    icon={FileCheck}
    defaultTitle="Contrato / Briefing"
  />
));
DocumentNode.displayName = "DocumentNode";

// 13. Nó de Nota / Comentário (Sticky Note)
export const NoteNode = memo(({ id, data, selected }: NodeProps<CustomNodeType>) => {
  const { updateNodeData } = useReactFlow();
  const edit = useEditNonce(id, data);

  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: "10px",
        // Nota: papel creme com tinta terracota (comentário, não etapa)
        backgroundColor: "#fff1ed",
        color: "#a54a29",
        border: selected ? `2px solid ${BRAND.orange}` : "1px solid #f3dfd3",
        boxShadow: selected ? "0 0 0 2px rgba(217, 119, 87, 0.2), 0 4px 12px rgba(0,0,0,0.12)" : "0 2px 8px rgba(0,0,0,0.08)",
        minWidth: "160px",
        maxWidth: "240px",
        fontSize: "12px",
        lineHeight: 1.4,
      }}
    >
      <QuickNodeToolbar id={id} />

      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px", fontWeight: 700 }}>
        <FileText size={12} />
        <span>Nota</span>
      </div>

      <InlineEditableText
        key={edit.key}
        autoEdit={edit.autoEdit}
        onExitEdit={edit.onExitEdit}
        value={data?.label || "Nota..."}
        onChange={(newLabel) => updateNodeData(id, { label: newLabel })}
        placeholder="Digite sua nota aqui..."
        multiline
        inputStyle={{ backgroundColor: "#ffffff", color: "#a54a29" }}
      />

      <Handle type="target" position={Position.Top} id="top" isConnectable style={{ background: BRAND.orange, width: 7, height: 7 }} />
      <Handle type="source" position={Position.Top} id="top" isConnectable style={{ background: BRAND.orange, width: 7, height: 7, opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} id="bottom" isConnectable style={{ background: BRAND.orange, width: 7, height: 7, opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} id="bottom" isConnectable style={{ background: BRAND.orange, width: 7, height: 7 }} />
      <Handle type="target" position={Position.Right} id="right" isConnectable style={{ background: BRAND.orange, width: 7, height: 7, opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="right" isConnectable style={{ background: BRAND.orange, width: 7, height: 7 }} />
      <Handle type="target" position={Position.Left} id="left" isConnectable style={{ background: BRAND.orange, width: 7, height: 7 }} />
      <Handle type="source" position={Position.Left} id="left" isConnectable style={{ background: BRAND.orange, width: 7, height: 7, opacity: 0 }} />
    </div>
  );
});
NoteNode.displayName = "NoteNode";

export const nodeTypes = {
  startEnd: StartEndNode,
  process: ProcessNode,
  decision: DecisionNode,
  automation: AutomationNode,
  note: NoteNode,
  whatsapp: WhatsAppNode,
  social: SocialNode,
  email: EmailNode,
  meeting: MeetingNode,
  payment: PaymentNode,
  delay: DelayNode,
  approval: ApprovalNode,
  document: DocumentNode,
};
