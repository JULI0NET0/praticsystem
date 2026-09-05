"use client";

import React, { memo, useState } from "react";
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

// Componente auxiliar de texto editável inline
function InlineEditableText({
  value,
  onChange,
  placeholder,
  style,
  inputStyle,
  multiline = false,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  multiline?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
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
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      handleBlur();
    }
    if (e.key === "Escape") {
      setIsEditing(false);
    }
  };

  if (isEditing) {
    if (multiline) {
      return (
        <textarea
          autoFocus
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

// Barra de ferramentas flutuante ao selecionar nó
function QuickNodeToolbar({ id, onEdit }: { id: string; onEdit?: () => void }) {
  const { deleteElements, getNode, addNodes } = useReactFlow();

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
    <NodeToolbar position={Position.Top} style={{ display: "flex", gap: "4px", padding: "4px", background: "var(--color-surface-raised, #ffffff)", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", border: "1px solid var(--color-border-subtle, #e2e8f0)" }}>
      {onEdit && (
        <button
          onClick={onEdit}
          title="Editar Texto"
          style={{ border: "none", background: "transparent", cursor: "pointer", padding: "4px", borderRadius: "4px", color: "var(--color-text-secondary, #64748b)" }}
        >
          <Edit3 size={13} />
        </button>
      )}
      <button
        onClick={handleDuplicate}
        title="Duplicar Nó"
        style={{ border: "none", background: "transparent", cursor: "pointer", padding: "4px", borderRadius: "4px", color: "var(--color-text-secondary, #64748b)" }}
      >
        <Copy size={13} />
      </button>
      <button
        onClick={handleDelete}
        title="Excluir Nó"
        style={{ border: "none", background: "transparent", cursor: "pointer", padding: "4px", borderRadius: "4px", color: "#ef4444" }}
      >
        <Trash2 size={13} />
      </button>
    </NodeToolbar>
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

  return (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: "12px",
        backgroundColor: "var(--color-surface-raised, #ffffff)",
        border: selected ? `2px solid ${accentColor}` : "1px solid var(--color-border-subtle, #e2e8f0)",
        boxShadow: selected
          ? `0 0 0 3px ${accentColor}26, 0 4px 14px rgba(0,0,0,0.1)`
          : "var(--shadow-sm, 0 2px 8px rgba(0,0,0,0.06))",
        color: "var(--color-text-primary, #0f172a)",
        minWidth: "190px",
        maxWidth: "260px",
        transition: "all 0.15s ease",
      }}
    >
      <QuickNodeToolbar id={id} />

      {/* Handles nos 4 lados - Suporte bidirecional total (puxar e receber) */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        isConnectable={isConnectable}
        style={{ background: accentColor, width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        isConnectable={isConnectable}
        style={{ background: accentColor, width: 8, height: 8, opacity: 0 }}
      />

      <Handle
        type="target"
        position={Position.Left}
        id="left"
        isConnectable={isConnectable}
        style={{ background: accentColor, width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        isConnectable={isConnectable}
        style={{ background: accentColor, width: 8, height: 8, opacity: 0 }}
      />

      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom"
        isConnectable={isConnectable}
        style={{ background: accentColor, width: 8, height: 8, opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        isConnectable={isConnectable}
        style={{ background: accentColor, width: 8, height: 8 }}
      />

      <Handle
        type="target"
        position={Position.Right}
        id="right"
        isConnectable={isConnectable}
        style={{ background: accentColor, width: 8, height: 8, opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        isConnectable={isConnectable}
        style={{ background: accentColor, width: 8, height: 8 }}
      />
    </div>
  );
}

// 1. Nó de Início / Fim (Pill Shape)
export const StartEndNode = memo(({ id, data, isConnectable, selected }: NodeProps<CustomNodeType>) => {
  const isStart = data?.category !== "end";
  const { updateNodeData } = useReactFlow();

  return (
    <div
      style={{
        padding: "10px 18px",
        borderRadius: "9999px",
        background: isStart
          ? "linear-gradient(135deg, #10b981, #059669)"
          : "linear-gradient(135deg, #ef4444, #dc2626)",
        color: "#ffffff",
        boxShadow: selected ? "0 0 0 3px #e05d38, 0 4px 14px rgba(0,0,0,0.25)" : "0 4px 12px rgba(0,0,0,0.15)",
        border: "2px solid rgba(255,255,255,0.2)",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "13px",
        fontWeight: 600,
        minWidth: "130px",
        justifyContent: "center",
        transition: "box-shadow 0.15s ease",
      }}
    >
      <QuickNodeToolbar id={id} />

      {isStart ? <Play size={14} fill="#fff" /> : <CheckCircle2 size={14} />}
      
      <InlineEditableText
        value={data?.label || (isStart ? "Início" : "Fim")}
        onChange={(newLabel) => updateNodeData(id, { label: newLabel })}
        placeholder={isStart ? "Início" : "Fim"}
        inputStyle={{ color: "#ffffff", textAlign: "center" }}
      />

      {/* Handles nos 4 lados - Suporte bidirecional (puxar e receber) */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        isConnectable={isConnectable}
        style={{ background: isStart ? "#10b981" : "#ef4444", width: 9, height: 9, border: "2px solid #fff" }}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        isConnectable={isConnectable}
        style={{ background: isStart ? "#10b981" : "#ef4444", width: 9, height: 9, border: "2px solid #fff", opacity: 0 }}
      />

      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom"
        isConnectable={isConnectable}
        style={{ background: isStart ? "#10b981" : "#ef4444", width: 9, height: 9, border: "2px solid #fff", opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        isConnectable={isConnectable}
        style={{ background: isStart ? "#10b981" : "#ef4444", width: 9, height: 9, border: "2px solid #fff" }}
      />

      <Handle
        type="target"
        position={Position.Left}
        id="left"
        isConnectable={isConnectable}
        style={{ background: isStart ? "#10b981" : "#ef4444", width: 9, height: 9, border: "2px solid #fff" }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        isConnectable={isConnectable}
        style={{ background: isStart ? "#10b981" : "#ef4444", width: 9, height: 9, border: "2px solid #fff", opacity: 0 }}
      />

      <Handle
        type="target"
        position={Position.Right}
        id="right"
        isConnectable={isConnectable}
        style={{ background: isStart ? "#10b981" : "#ef4444", width: 9, height: 9, border: "2px solid #fff", opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        isConnectable={isConnectable}
        style={{ background: isStart ? "#10b981" : "#ef4444", width: 9, height: 9, border: "2px solid #fff" }}
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

  return (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: "14px",
        backgroundColor: "var(--color-surface-raised, #ffffff)",
        border: selected ? "2px solid #f59e0b" : "1.5px solid #f59e0b",
        boxShadow: selected ? "0 0 0 3px rgba(245, 158, 11, 0.2), 0 4px 14px rgba(245, 158, 11, 0.15)" : "0 4px 12px rgba(245, 158, 11, 0.12)",
        color: "var(--color-text-primary, #0f172a)",
        minWidth: "180px",
        maxWidth: "240px",
      }}
    >
      <QuickNodeToolbar id={id} />

      {/* Top Handles */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        isConnectable={isConnectable}
        style={{ background: "#f59e0b", width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        isConnectable={isConnectable}
        style={{ background: "#f59e0b", width: 8, height: 8, opacity: 0 }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
        <div
          style={{
            padding: "4px",
            borderRadius: "6px",
            backgroundColor: "rgba(245, 158, 11, 0.15)",
            color: "#d97706",
            display: "flex",
          }}
        >
          <GitBranch size={13} />
        </div>
        <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#d97706", letterSpacing: "0.05em" }}>
          Condição / Decisão
        </span>
      </div>

      <div style={{ marginTop: "4px" }}>
        <InlineEditableText
          value={data?.label || "Condição?"}
          onChange={(newLabel) => updateNodeData(id, { label: newLabel })}
          placeholder="Ex: Cliente respondeu?"
          style={{ fontSize: "13px", fontWeight: 600 }}
        />
      </div>

      {/* Left Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        isConnectable={isConnectable}
        style={{ background: "#ef4444", width: 8, height: 8, opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        isConnectable={isConnectable}
        style={{ background: "#ef4444", width: 8, height: 8 }}
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
        style={{ background: "#10b981", width: 8, height: 8, opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        isConnectable={isConnectable}
        style={{ background: "#10b981", width: 8, height: 8 }}
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
        style={{ background: "#f59e0b", width: 8, height: 8, opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        isConnectable={isConnectable}
        style={{ background: "#f59e0b", width: 8, height: 8 }}
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

  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: "10px",
        backgroundColor: "#fef3c7",
        color: "#78350f",
        border: selected ? "2px solid #d97706" : "1px solid #fde68a",
        boxShadow: selected ? "0 0 0 2px rgba(217, 119, 6, 0.2), 0 4px 12px rgba(245, 158, 11, 0.2)" : "0 2px 8px rgba(245, 158, 11, 0.15)",
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
        value={data?.label || "Nota..."}
        onChange={(newLabel) => updateNodeData(id, { label: newLabel })}
        placeholder="Digite sua nota aqui..."
        multiline
        inputStyle={{ backgroundColor: "#fef9c3", color: "#78350f" }}
      />

      <Handle type="target" position={Position.Top} id="top" isConnectable style={{ background: "#d97706", width: 7, height: 7 }} />
      <Handle type="source" position={Position.Top} id="top" isConnectable style={{ background: "#d97706", width: 7, height: 7, opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} id="bottom" isConnectable style={{ background: "#d97706", width: 7, height: 7, opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} id="bottom" isConnectable style={{ background: "#d97706", width: 7, height: 7 }} />
      <Handle type="target" position={Position.Right} id="right" isConnectable style={{ background: "#d97706", width: 7, height: 7, opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="right" isConnectable style={{ background: "#d97706", width: 7, height: 7 }} />
      <Handle type="target" position={Position.Left} id="left" isConnectable style={{ background: "#d97706", width: 7, height: 7 }} />
      <Handle type="source" position={Position.Left} id="left" isConnectable style={{ background: "#d97706", width: 7, height: 7, opacity: 0 }} />
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
