"use client";

import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Mail,
  AtSign,
  Shield,
  Clock,
  ClipboardList,
  MoreVertical,
  Activity,
  DollarSign,
  ChevronDown,
  ChevronRight,
  FileText,
  TrendingUp,
  X,
  Maximize2,
} from "lucide-react";
import Spotlight from "@/components/Spotlight";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/CustomToast";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/format";
import { tint } from "@/lib/tint";

const DEMAND_STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em Andamento",
  in_production: "Em Produção",
  in_review: "Em Revisão",
  done: "Concluída",
  completed: "Concluída",
  cancelled: "Cancelada",
};

const DEMAND_STATUS_COLOR: Record<string, string> = {
  pending: "var(--color-warning)",
  in_progress: "var(--color-info)",
  in_production: "#3B82F6",
  in_review: "#A78BFA",
  done: "var(--color-success)",
  completed: "var(--color-success)",
  cancelled: "var(--text-tertiary)",
};

// Os status são personalizáveis em /admin/demandas: a categoria
// (status_category) é o que classifica aberto x concluído. Os mapas acima
// ficam só como fallback para linhas antigas sem status cadastrado.
const isDone = (demand: { status_category?: string; status?: string }) =>
  demand.status_category === "fechado" || ["done", "completed"].includes(demand.status ?? "");

export default function UserDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { canViewFinancials } = useAuth();

  const [user, setUser] = useState<any>(null);
  const [userDemands, setUserDemands] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isImageFullscreen, setIsImageFullscreen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsImageFullscreen(false);
      }
    };
    if (isImageFullscreen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isImageFullscreen]);

  const [userExpenses, setUserExpenses] = useState<any[]>([]);
  const [userExpenseEntries, setUserExpenseEntries] = useState<any[]>([]);
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);

  const [recentNotes, setRecentNotes] = useState<any[]>([]);

  useEffect(() => {
    if (id) fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    setLoading(true);
    await Promise.all([fetchRoles(), fetchUserDetails()]);
    setLoading(false);
  };

  const fetchRoles = async () => {
    const { data } = await supabase.from("roles").select("*");
    if (data) setRoles(data);
  };

  const fetchUserDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;

      if (data) {
        setUser({ ...data, avatarUrl: data.avatar_url, statusMessage: data.status_message });
        await Promise.all([
          fetchDemands(data.id),
          canViewFinancials ? fetchUserFinancials(data.id) : Promise.resolve(),
          fetchRecentNotes(data.id),
        ]);
      }
    } catch (err) {
      console.error("Erro ao buscar usuário:", err);
    }
  };

  const fetchDemands = async (userId: string) => {
    // assignee_ids é array — uma demanda pode ter vários responsáveis
    const { data } = await supabase
      .from("demands")
      .select("*, demand_statuses(label, color)")
      .contains("assignee_ids", [userId])
      .order("created_at", { ascending: false });
    if (data) setUserDemands(data);
  };

  const fetchUserFinancials = async (userId: string) => {
    const { data: expensesData } = await supabase
      .from("expenses")
      .select("*")
      .eq("related_user_id", userId)
      .order("created_at", { ascending: false });

    if (expensesData && expensesData.length > 0) {
      setUserExpenses(expensesData);
      const { data: entriesData } = await supabase
        .from("expense_entries")
        .select("*")
        .in("expense_id", expensesData.map((e: any) => e.id))
        .order("date", { ascending: false });
      if (entriesData) setUserExpenseEntries(entriesData);
    } else {
      setUserExpenses([]);
      setUserExpenseEntries([]);
    }
  };

  const fetchRecentNotes = async (userId: string) => {
    const { data } = await supabase
      .from("notes")
      .select("id, title, date, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);
    if (data) setRecentNotes(data);
  };

  const handleResetPassword = async () => {
    setIsResetting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      if (res.ok) {
        showToast("Email de redefinição enviado para " + user.email, "success");
      } else {
        const errorData = await res.json().catch(() => ({}));
        showToast(errorData.error || "Erro ao enviar email de redefinição.", "error");
      }
      setShowResetConfirm(false);
    } catch {
      showToast("Erro ao redefinir senha.", "error");
    } finally {
      setIsResetting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "100px" }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <div style={{ width: "40px", height: "40px", border: "3px solid color-mix(in oklab, var(--accent) 30%, transparent)", borderTopColor: "var(--accent)", borderRadius: "50%" }} />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <h2>Membro não encontrado</h2>
        <button onClick={() => router.back()} className="btn btn-secondary" style={{ marginTop: "20px" }}>Voltar</button>
      </div>
    );
  }

  const userRole = roles.find((r) => r.id === user.role);
  const activeDemands = userDemands.filter((d) => !isDone(d));
  const doneDemands = userDemands.filter((d) => isDone(d));
  const custoMensal = userExpenses
    .filter((e: any) => e.status === "active" && e.recurrence === "monthly")
    .reduce((s: number, e: any) => s + Number(e.amount), 0);
  const totalPago = userExpenseEntries.filter((e: any) => e.status === "paid").reduce((s: number, e: any) => s + Number(e.amount), 0);
  const totalPendente = userExpenseEntries.filter((e: any) => e.status === "pending").reduce((s: number, e: any) => s + Number(e.amount), 0);

  const RECURRENCE_LABEL: Record<string, string> = { monthly: "Mensal", quarterly: "Trimestral", yearly: "Anual", one_time: "Pontual" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ display: "flex", flexDirection: "column", gap: "32px" }}
    >
      {/* Header */}
      <div className="mobile-stack" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <motion.button
          whileHover={{ x: -4 }}
          onClick={() => router.back()}
          style={{
            width: "40px", height: "40px", borderRadius: "12px",
            backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--text-secondary)", cursor: "pointer",
          }}
        >
          <ArrowLeft size={20} />
        </motion.button>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>Perfil do Membro</h1>
          <p style={{ color: "var(--text-secondary)" }}>Detalhes e produtividade de {user.name}</p>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <button className="btn btn-secondary"><MoreVertical size={18} /></button>
        </div>
      </div>

      <div className="mobile-grid-1" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "32px" }}>
        {/* Coluna esquerda */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Card de perfil */}
          <Spotlight className="glass-card" style={{ padding: "32px", textAlign: "center" }}>
            {/* Avatar do Membro */}
            <div style={{ position: "relative", width: "120px", height: "120px", margin: "0 auto 20px" }}>
              <motion.div
                whileHover={user.avatarUrl || user.avatar_url ? { scale: 1.05 } : {}}
                whileTap={user.avatarUrl || user.avatar_url ? { scale: 0.96 } : {}}
                onClick={() => {
                  if (user.avatarUrl || user.avatar_url) {
                    setIsImageFullscreen(true);
                  }
                }}
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  background: "var(--accent)",
                  fontSize: "3rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--color-text-on-accent)",
                  boxShadow: "0 0 30px color-mix(in oklab, var(--accent) 30%, transparent)",
                  position: "relative",
                  overflow: "hidden",
                  cursor: (user.avatarUrl || user.avatar_url) ? "pointer" : "default",
                  border: "3px solid color-mix(in oklab, var(--accent) 30%, transparent)",
                }}
              >
                {user.avatarUrl || user.avatar_url ? (
                  <>
                    <img
                      src={user.avatarUrl || user.avatar_url}
                      alt={user.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        imageRendering: "-webkit-optimize-contrast",
                      }}
                    />
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        position: "absolute",
                        inset: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.45)",
                        backdropFilter: "blur(2px)",
                        WebkitBackdropFilter: "blur(2px)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                        color: "#fff",
                      }}
                    >
                      <Maximize2 size={24} />
                      <span style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Ver foto
                      </span>
                    </motion.div>
                  </>
                ) : (
                  user.name.substring(0, 2).toUpperCase()
                )}
              </motion.div>

              <div
                style={{
                  position: "absolute",
                  bottom: "4px",
                  right: "4px",
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  backgroundColor: "var(--color-success)",
                  border: "3px solid var(--bg-secondary)",
                  zIndex: 2,
                }}
              />
            </div>

            <h3 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "4px" }}>{user.name}</h3>
            <p style={{ color: "var(--accent)", fontWeight: 600, fontSize: "0.9rem", marginBottom: "16px" }}>
              {userRole?.name || user.role}
            </p>

            {user.statusMessage && (
              <div style={{
                padding: "12px", borderRadius: "12px", background: "var(--card-inner-bg)",
                fontStyle: "italic", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "24px",
              }}>
                "{user.statusMessage}"
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.9rem" }}>
                <AtSign size={16} color="var(--text-secondary)" />
                <span>@{user.username}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.9rem" }}>
                <Mail size={16} color="var(--text-secondary)" />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</span>
              </div>
              {user.phone && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.9rem" }}>
                  <Shield size={16} color="var(--text-secondary)" />
                  <span>{user.phone}</span>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                <Shield size={16} />
                <span>Nível: {userRole?.name || user.role}</span>
              </div>
            </div>

            <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid var(--border)" }}>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="btn btn-secondary"
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", minHeight: "44px" }}
              >
                <Shield size={16} /> Redefinir Senha
              </button>
            </div>
          </Spotlight>

          {/* Notas recentes */}
          <Spotlight className="glass-card" style={{ padding: "24px" }}>
            <h4 style={{ fontWeight: 700, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Activity size={18} color="var(--accent)" /> Notas Recentes
            </h4>
            {recentNotes.length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "var(--text-tertiary)", textAlign: "center", padding: "16px 0" }}>
                Nenhuma nota registrada.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {recentNotes.map((note, i) => (
                  <div key={note.id} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <div style={{ width: "2px", background: i === 0 ? "var(--accent)" : "var(--border)", margin: "4px 0", flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: "0.85rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {note.title || "Sem título"}
                      </p>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                        {new Date(note.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Spotlight>
        </div>

        {/* Coluna direita */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Stats reais */}
          <div style={{ display: "grid", gridTemplateColumns: canViewFinancials ? "repeat(3, 1fr)" : "repeat(2, 1fr)", gap: "16px" }}>
            <Spotlight className="glass-card" style={{ padding: "24px" }}>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                Total Demandas
              </p>
              <h4 style={{ fontSize: "1.8rem", fontWeight: 800 }}>{userDemands.length}</h4>
              {doneDemands.length > 0 && (
                <p style={{ fontSize: "0.72rem", color: "var(--color-success)", marginTop: "4px" }}>{doneDemands.length} concluída{doneDemands.length !== 1 ? "s" : ""}</p>
              )}
            </Spotlight>
            <Spotlight className="glass-card" style={{ padding: "24px" }}>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                Em Andamento
              </p>
              <h4 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--color-info)" }}>{activeDemands.length}</h4>
              {userDemands.length > 0 && (
                <p style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", marginTop: "4px" }}>
                  {Math.round((doneDemands.length / userDemands.length) * 100)}% taxa de conclusão
                </p>
              )}
            </Spotlight>
            {canViewFinancials && (
              <Spotlight className="glass-card" style={{ padding: "24px" }}>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                  Custo Mensal
                </p>
                <h4 style={{ fontSize: custoMensal > 0 ? "1.4rem" : "1.8rem", fontWeight: 800, color: custoMensal > 0 ? "var(--color-danger)" : "var(--text-tertiary)" }}>
                  {custoMensal > 0 ? formatCurrency(custoMensal) : "—"}
                </h4>
                {custoMensal === 0 && (
                  <p style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", marginTop: "4px" }}>Sem despesas vinculadas</p>
                )}
              </Spotlight>
            )}
          </div>

          {/* Demandas */}
          <Spotlight className="glass-card" style={{ padding: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px" }}>
                <ClipboardList size={20} color="var(--accent)" /> Demandas
              </h3>
              {userDemands.length > 0 && (
                <span style={{ fontSize: "0.78rem", color: "var(--text-tertiary)", fontWeight: 600 }}>
                  {userDemands.length} total
                </span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {userDemands.length === 0 ? (
                <p style={{ textAlign: "center", padding: "32px", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  Nenhuma demanda atribuída.
                </p>
              ) : (
                userDemands.slice(0, 8).map((demand) => {
                  // Rótulo/cor vêm de demand_statuses; os mapas antigos só
                  // atendem linhas anteriores à área de Demandas.
                  const color =
                    demand.demand_statuses?.color ||
                    DEMAND_STATUS_COLOR[demand.status] ||
                    "var(--text-secondary)";
                  const label =
                    demand.demand_statuses?.label ||
                    DEMAND_STATUS_LABEL[demand.status] ||
                    demand.status;
                  return (
                    <div key={demand.id} style={{
                      padding: "14px 16px", borderRadius: "14px", border: "1px solid var(--border)",
                      background: "var(--card-inner-bg)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px",
                    }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ fontWeight: 600, fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {demand.title}
                        </p>
                        <div style={{ display: "flex", gap: "10px", fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px", flexWrap: "wrap" }}>
                          {demand.due_date && (
                            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <Clock size={11} />
                              {new Date(demand.due_date).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                          {demand.type && (
                            <span style={{ textTransform: "capitalize" }}>{demand.type}</span>
                          )}
                        </div>
                      </div>
                      <span style={{
                        fontSize: "0.68rem", fontWeight: 700, padding: "3px 8px", borderRadius: "6px", flexShrink: 0,
                        color, background: `${tint(color, 9)}`, border: `1px solid ${tint(color, 19)}`,
                      }}>
                        {label}
                      </span>
                    </div>
                  );
                })
              )}
              {userDemands.length > 8 && (
                <p style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--text-tertiary)", paddingTop: "4px" }}>
                  + {userDemands.length - 8} demanda{userDemands.length - 8 !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </Spotlight>

          {/* Custos Financeiros */}
          {canViewFinancials && (
            <Spotlight className="glass-card" style={{ padding: "28px" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
                <DollarSign size={20} color="var(--accent)" /> Custos Financeiros
              </h3>

              {userExpenses.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-tertiary)", fontSize: "0.875rem" }}>
                  <TrendingUp size={28} style={{ opacity: 0.2, display: "block", margin: "0 auto 10px" }} />
                  Nenhuma despesa vinculada a este membro.<br />
                  <span style={{ fontSize: "0.8rem" }}>Vincule em Financeiro → Despesas Fixas → editar uma despesa PJ/Pro-labore.</span>
                </div>
              ) : (
                <>
                  {/* Cards resumo */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "16px" }}>
                    {[
                      { label: "Custo mensal", value: formatCurrency(custoMensal), color: "var(--color-danger)" },
                      { label: "Total pago", value: formatCurrency(totalPago), color: "var(--color-success)" },
                      { label: "Total pendente", value: formatCurrency(totalPendente), color: "var(--color-warning)" },
                    ].map((item) => (
                      <div key={item.label} style={{ padding: "12px 14px", background: "var(--card-inner-bg)", border: "1px solid var(--border)", borderRadius: "12px" }}>
                        <p style={{ fontSize: "0.68rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "4px" }}>{item.label}</p>
                        <p style={{ fontSize: "0.95rem", fontWeight: 800, color: item.color }}>{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Lista despesas com acordeão */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {userExpenses.map((expense: any) => {
                      const entries = userExpenseEntries.filter((e: any) => e.expense_id === expense.id);
                      const isExpanded = expandedExpenseId === expense.id;
                      const paid = entries.filter((e: any) => e.status === "paid").length;
                      const pending = entries.filter((e: any) => e.status === "pending").length;
                      return (
                        <div key={expense.id} style={{ border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
                          <button
                            onClick={() => setExpandedExpenseId(isExpanded ? null : expense.id)}
                            style={{
                              width: "100%", display: "flex", alignItems: "center", gap: "10px",
                              padding: "12px 14px", background: "none", border: "none", cursor: "pointer",
                              color: "var(--text-primary)", textAlign: "left",
                            }}
                          >
                            {isExpanded ? <ChevronDown size={14} color="var(--text-secondary)" /> : <ChevronRight size={14} color="var(--text-secondary)" />}
                            <span style={{ fontWeight: 600, flex: 1, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {expense.description}
                            </span>
                            <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", flexShrink: 0 }}>
                              {RECURRENCE_LABEL[expense.recurrence]}
                            </span>
                            <span style={{ fontWeight: 800, color: "var(--color-danger)", fontSize: "0.9rem", flexShrink: 0 }}>
                              {formatCurrency(Number(expense.amount))}
                            </span>
                            {entries.length > 0 && (
                              <span style={{ fontSize: "0.68rem", color: "var(--text-tertiary)", flexShrink: 0, minWidth: "60px", textAlign: "right" }}>
                                {entries.length} fat.
                                {paid > 0 && <span style={{ color: "var(--color-success)" }}> {paid}✓</span>}
                                {pending > 0 && <span style={{ color: "var(--color-warning)" }}> {pending}⏳</span>}
                              </span>
                            )}
                          </button>

                          {isExpanded && (
                            <div style={{ padding: "0 14px 12px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "6px" }}>
                              {entries.length === 0 ? (
                                <p style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", padding: "10px 0" }}>Nenhuma fatura gerada ainda.</p>
                              ) : (
                                entries
                                  .slice()
                                  .sort((a: any, b: any) => a.date.localeCompare(b.date))
                                  .map((entry: any) => {
                                    const d = new Date(`${entry.date}T12:00:00`);
                                    const sc = entry.status === "paid" ? "var(--color-success)" : entry.status === "cancelled" ? "var(--text-tertiary)" : "var(--color-warning)";
                                    const sl = entry.status === "paid" ? "Pago" : entry.status === "cancelled" ? "Cancelado" : "Pendente";
                                    return (
                                      <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 10px", borderRadius: "8px", background: "var(--color-surface-sunken)", marginTop: "6px" }}>
                                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", minWidth: "52px" }}>
                                          {d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })}
                                        </span>
                                        <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", flex: 1 }}>
                                          vcto {d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                                        </span>
                                        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-danger)" }}>{formatCurrency(Number(entry.amount))}</span>
                                        <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 7px", borderRadius: "5px", color: sc, background: `${tint(sc, 9)}`, border: `1px solid ${tint(sc, 19)}` }}>{sl}</span>
                                      </div>
                                    );
                                  })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </Spotlight>
          )}
        </div>
      </div>

      {/* Modal redefinir senha */}
      <AnimatePresence>
        {showResetConfirm && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 110,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "24px", backgroundColor: "rgba(0,0,0,0.8)", }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card"
              style={{ width: "100%", maxWidth: "450px", padding: "32px", textAlign: "center" }}
            >
              <div style={{
                width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "color-mix(in oklab, var(--accent) 10%, transparent)",
                display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", margin: "0 auto 24px",
              }}>
                <Shield size={32} />
              </div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "12px" }}>Redefinir Senha?</h2>
              <p style={{ color: "var(--text-secondary)", marginBottom: "32px", lineHeight: "1.6" }}>
                Um link de redefinição será enviado para <strong>{user.email}</strong>.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <button className="btn btn-accent" style={{ width: "100%" }} onClick={handleResetPassword} disabled={isResetting}>
                  {isResetting ? "Enviando..." : "Enviar Email de Redefinição"}
                </button>
                <button className="btn btn-secondary" style={{ width: "100%" }} onClick={() => setShowResetConfirm(false)} disabled={isResetting}>
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Foto em Tela Cheia */}
      <AnimatePresence>
        {isImageFullscreen && (user.avatarUrl || user.avatar_url) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsImageFullscreen(false)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999,
              backgroundColor: "rgba(0, 0, 0, 0.88)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
              cursor: "zoom-out",
            }}
          >
            {/* Botão Fechar */}
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                setIsImageFullscreen(false);
              }}
              style={{
                position: "absolute",
                top: "24px",
                right: "24px",
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                backgroundColor: "rgba(255, 255, 255, 0.12)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "background-color 0.2s",
                boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
              }}
              title="Fechar (Esc)"
            >
              <X size={22} />
            </motion.button>

            {/* Container da Imagem com Animação */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "16px",
                maxWidth: "90vw",
                maxHeight: "85vh",
                cursor: "default",
              }}
            >
              <div
                style={{
                  position: "relative",
                  borderRadius: "28px",
                  overflow: "hidden",
                  boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.15)",
                  background: "var(--bg-secondary)",
                  maxWidth: "520px",
                  maxHeight: "520px",
                  width: "85vw",
                  height: "85vw",
                }}
              >
                <img
                  src={user.avatarUrl || user.avatar_url}
                  alt={user.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    imageRendering: "-webkit-optimize-contrast",
                    display: "block",
                  }}
                />
              </div>

              {/* Informações do Membro */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  padding: "8px 20px",
                  borderRadius: "999px",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
              >
                <span style={{ fontWeight: 700, fontSize: "1rem", color: "#fff" }}>
                  {user.name}
                </span>
                <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "rgba(255,255,255,0.4)" }} />
                <span style={{ fontSize: "0.85rem", color: "var(--accent)", fontWeight: 600 }}>
                  {userRole?.name || user.role}
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
