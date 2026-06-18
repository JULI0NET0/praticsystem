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
} from "lucide-react";
import Spotlight from "@/components/Spotlight";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/CustomToast";
import { formatCurrency } from "@/lib/format";

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
  pending: "#F59E0B",
  in_progress: "#60A5FA",
  in_production: "#3B82F6",
  in_review: "#A78BFA",
  done: "#22C55E",
  completed: "#22C55E",
  cancelled: "var(--text-tertiary)",
};

const DONE_STATUSES = ["done", "completed"];
const ACTIVE_STATUSES = ["pending", "in_progress", "in_production", "in_review"];

export default function UserDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const [user, setUser] = useState<any>(null);
  const [userDemands, setUserDemands] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

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
          fetchUserFinancials(data.id),
          fetchRecentNotes(data.id),
        ]);
      }
    } catch (err) {
      console.error("Erro ao buscar usuário:", err);
    }
  };

  const fetchDemands = async (userId: string) => {
    const { data } = await supabase
      .from("demands")
      .select("*")
      .eq("assigned_to", userId)
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
        showToast("Erro ao enviar email de redefinição.", "error");
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
          <div style={{ width: "40px", height: "40px", border: "3px solid rgba(217,72,15,0.3)", borderTopColor: "var(--accent)", borderRadius: "50%" }} />
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
  const activeDemands = userDemands.filter((d) => ACTIVE_STATUSES.includes(d.status));
  const doneDemands = userDemands.filter((d) => DONE_STATUSES.includes(d.status));
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
            <div style={{
              width: "120px", height: "120px", borderRadius: "50%", background: "var(--accent)",
              margin: "0 auto 20px", fontSize: "3rem", fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
              boxShadow: "0 0 30px rgba(217,72,15,0.3)", position: "relative",
            }}>
              {user.name.substring(0, 2).toUpperCase()}
              <div style={{
                position: "absolute", bottom: "5px", right: "5px",
                width: "24px", height: "24px", borderRadius: "50%",
                backgroundColor: "#22C55E", border: "4px solid var(--bg-secondary)",
              }} />
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            <Spotlight className="glass-card" style={{ padding: "24px" }}>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                Total Demandas
              </p>
              <h4 style={{ fontSize: "1.8rem", fontWeight: 800 }}>{userDemands.length}</h4>
              {doneDemands.length > 0 && (
                <p style={{ fontSize: "0.72rem", color: "#22C55E", marginTop: "4px" }}>{doneDemands.length} concluída{doneDemands.length !== 1 ? "s" : ""}</p>
              )}
            </Spotlight>
            <Spotlight className="glass-card" style={{ padding: "24px" }}>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                Em Andamento
              </p>
              <h4 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#60A5FA" }}>{activeDemands.length}</h4>
              {userDemands.length > 0 && (
                <p style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", marginTop: "4px" }}>
                  {Math.round((doneDemands.length / userDemands.length) * 100)}% taxa de conclusão
                </p>
              )}
            </Spotlight>
            <Spotlight className="glass-card" style={{ padding: "24px" }}>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                Custo Mensal
              </p>
              <h4 style={{ fontSize: custoMensal > 0 ? "1.4rem" : "1.8rem", fontWeight: 800, color: custoMensal > 0 ? "#EF4444" : "var(--text-tertiary)" }}>
                {custoMensal > 0 ? formatCurrency(custoMensal) : "—"}
              </h4>
              {custoMensal === 0 && (
                <p style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", marginTop: "4px" }}>Sem despesas vinculadas</p>
              )}
            </Spotlight>
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
                  const color = DEMAND_STATUS_COLOR[demand.status] || "var(--text-secondary)";
                  const label = DEMAND_STATUS_LABEL[demand.status] || demand.status;
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
                        color, background: `${color}18`, border: `1px solid ${color}30`,
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
                    { label: "Custo mensal", value: formatCurrency(custoMensal), color: "#EF4444" },
                    { label: "Total pago", value: formatCurrency(totalPago), color: "#22C55E" },
                    { label: "Total pendente", value: formatCurrency(totalPendente), color: "#F59E0B" },
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
                          <span style={{ fontWeight: 800, color: "#EF4444", fontSize: "0.9rem", flexShrink: 0 }}>
                            {formatCurrency(Number(expense.amount))}
                          </span>
                          {entries.length > 0 && (
                            <span style={{ fontSize: "0.68rem", color: "var(--text-tertiary)", flexShrink: 0, minWidth: "60px", textAlign: "right" }}>
                              {entries.length} fat.
                              {paid > 0 && <span style={{ color: "#22C55E" }}> {paid}✓</span>}
                              {pending > 0 && <span style={{ color: "#F59E0B" }}> {pending}⏳</span>}
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
                                  const sc = entry.status === "paid" ? "#22C55E" : entry.status === "cancelled" ? "var(--text-tertiary)" : "#F59E0B";
                                  const sl = entry.status === "paid" ? "Pago" : entry.status === "cancelled" ? "Cancelado" : "Pendente";
                                  return (
                                    <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 10px", borderRadius: "8px", background: "rgba(255,255,255,0.02)", marginTop: "6px" }}>
                                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", minWidth: "52px" }}>
                                        {d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })}
                                      </span>
                                      <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", flex: 1 }}>
                                        vcto {d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                                      </span>
                                      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#EF4444" }}>{formatCurrency(Number(entry.amount))}</span>
                                      <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 7px", borderRadius: "5px", color: sc, background: `${sc}18`, border: `1px solid ${sc}30` }}>{sl}</span>
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
        </div>
      </div>

      {/* Modal redefinir senha */}
      <AnimatePresence>
        {showResetConfirm && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 110,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "24px", backgroundColor: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card"
              style={{ width: "100%", maxWidth: "450px", padding: "32px", textAlign: "center" }}
            >
              <div style={{
                width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "rgba(217,72,15,0.1)",
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
    </motion.div>
  );
}
