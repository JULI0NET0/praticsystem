"use client";

// import { roles } from "@/mocks/db"; // Removido mock
import { Plus, Search, Shield, User as UserIcon, ShieldAlert, MoreVertical, AtSign, Loader2, Trash2, Pencil } from "lucide-react";
import Spotlight from "@/components/Spotlight";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import SearchInput from "@/components/ui/SearchInput";
import { useToast } from "@/components/CustomToast";
import DialogShell from "@/components/DialogShell";

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [roles, setRoles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [userToReset, setUserToReset] = useState<any | null>(null);
  const [userToEdit, setUserToEdit] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ name: '', username: '', role: '', status_message: '', resetPassword: false });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    await Promise.all([fetchRoles(), fetchUsers()]);
    setLoading(false);
  };

  const fetchRoles = async () => {
    const { data } = await supabase.from('roles').select('*');
    if (data) setRoles(data);
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name');

      if (error) throw error;

      if (data) {
        setUsers(data.map(u => ({
          ...u,
          avatarUrl: u.avatar_url,
          statusMessage: u.status_message
        })));
      }
    } catch (err) {
      console.error("Erro ao buscar usuários:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userToDelete.id);

      if (error) throw error;

      setUsers(users.filter(u => u.id !== userToDelete.id));
      showToast('Usuário excluído com sucesso!', 'success');
      setUserToDelete(null);
    } catch (err) {
      console.error("Erro ao excluir usuário:", err);
      showToast('Erro ao excluir usuário. Verifique as permissões.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenEdit = (user: any) => {
    setEditForm({
      name: user.name || '',
      username: user.username || '',
      role: user.role || '',
      status_message: user.statusMessage || user.status_message || '',
      resetPassword: false,
    });
    setUserToEdit(user);
  };

  const handleSaveEdit = async () => {
    if (!userToEdit) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: editForm.name,
          username: editForm.username,
          role: editForm.role,
          status_message: editForm.status_message,
        })
        .eq('id', userToEdit.id);

      if (error) throw error;

      // Dispara o e-mail de redefinição se a opção estiver marcada
      if (editForm.resetPassword) {
        try {
          await fetch("/api/auth/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: userToEdit.email }),
          });
          showToast(`E-mail de redefinição enviado para ${userToEdit.email}`, 'success');
        } catch (resetErr) {
          console.error("Erro ao enviar e-mail de redefinição:", resetErr);
        }
      }

      setUsers(users.map(u => u.id === userToEdit.id
        ? { ...u, name: editForm.name, username: editForm.username, role: editForm.role, statusMessage: editForm.status_message }
        : u
      ));
      showToast('Usuário atualizado com sucesso!', 'success');
      setUserToEdit(null);
    } catch (err) {
      console.error("Erro ao atualizar usuário:", err);
      showToast('Erro ao atualizar usuário.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!userToReset) return;
    setIsProcessing(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userToReset.email }),
      });
      if (res.ok) {
        showToast(`E-mail de redefinição enviado para ${userToReset.email}!`, 'success');
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao enviar e-mail de redefinição.');
      }
      setUserToReset(null);
    } catch (err: any) {
      console.error("Erro ao resetar senha:", err);
      showToast(err.message || 'Erro ao resetar senha.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}
    >
      <div className="mobile-stack" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 700, marginBottom: '8px' }}>Gestão de Equipe</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Gerencie os membros, cargos e frases de status da Prátic.</p>
        </div>
        <div className="mobile-stack" style={{ display: 'flex', gap: '12px' }}>
          <Link href="/admin/users/roles">
            <Spotlight as="button" className="btn" style={{ background: 'rgba(255, 255, 255, 0.05)', minHeight: '44px' }}>Gerenciar Cargos</Spotlight>
          </Link>
          <Link href="/admin/users/create">
            <Spotlight as="button" className="btn btn-accent" style={{ minHeight: '44px' }}><Plus size={18} /> Criar Novo Usuário</Spotlight>
          </Link>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="mobile-stack" style={{ display: 'flex', gap: '16px' }}>
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por nome, email ou @usuario..."
          />
          <select
            className="input-dark"
            style={{ width: '100%', maxWidth: '200px', minHeight: '44px' }}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">Todos os cargos</option>
            {roles.map(role => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
        </div>

        <div className="table-container hide-mobile">
          <table className="table">
            <thead>
              <tr>
                <th style={{ paddingLeft: '24px' }}>Membro</th>
                <th>Cargo / Status</th>
                <th style={{ textAlign: 'right', paddingRight: '24px' }}>Ações</th>
              </tr>
            </thead>
            <tbody style={{ position: 'relative' }}>
              {loading ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '40px' }}>
                    <Loader2 size={32} color="var(--accent)" className="animate-spin" style={{ margin: '0 auto', animation: 'spin 1s linear infinite' }} />
                  </td>
                </tr>
              ) : (
                <AnimatePresence mode="popLayout">
                  {filteredUsers.map((user, idx) => {
                    const roleObj = roles.find(r => r.id === user.role);
                    return (
                      <motion.tr
                        key={user.id}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ delay: idx * 0.05 }}
                        style={{ position: 'relative' }}
                      >
                        <td style={{ paddingLeft: '24px' }}>
                          <Link href={`/admin/users/${user.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}>
                              {user.avatarUrl ? (
                                <img
                                  src={user.avatarUrl}
                                  alt={user.name}
                                  style={{ width: '48px', height: '48px', borderRadius: '14px', objectFit: 'cover', border: '1px solid var(--border)' }}
                                />
                              ) : (
                                <div style={{
                                  width: '48px', height: '48px', borderRadius: '14px',
                                  backgroundColor: 'rgba(217, 72, 15, 0.1)', border: '1px solid rgba(217, 72, 15, 0.2)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: 'var(--accent)', fontWeight: 600, fontSize: '1rem'
                                }}>
                                  {user.name.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <p style={{ fontWeight: 600, fontSize: '1rem' }}>{user.name}</p>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--accent)', background: 'rgba(217, 72, 15, 0.1)', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                    <AtSign size={10} />{user.username}
                                  </span>
                                </div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user.email}</p>
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {user.role === 'admin' && <ShieldAlert size={14} color="#EF4444" />}
                              {user.role === 'board' && <Shield size={14} color="var(--accent)" />}
                              {user.role === 'social_media' && <Shield size={14} color="#22C55E" />}
                              {user.role === 'filmmaker' && <Shield size={14} color="#8B5CF6" />}
                              {user.role === 'client' && <UserIcon size={14} color="var(--text-secondary)" />}
                              <span style={{
                                fontWeight: 500,
                                fontSize: '0.875rem',
                                color: user.role === 'admin' ? '#EF4444' :
                                  user.role === 'board' ? 'var(--accent)' :
                                    user.role === 'social_media' ? '#22C55E' :
                                      user.role === 'filmmaker' ? '#8B5CF6' : 'var(--text-secondary)'
                              }}>
                                {roleObj?.name || user.role}
                              </span>
                            </div>
                            {user.statusMessage && (
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                "{user.statusMessage}"
                              </p>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setUserToReset(user)}
                              title="Redefinir Senha"
                              style={{
                                width: '32px', height: '32px', borderRadius: '8px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)',
                                border: '1px solid var(--border)'
                              }}
                            >
                              <Shield size={16} />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleOpenEdit(user)}
                              title="Editar Usuário"
                              style={{
                                width: '32px', height: '32px', borderRadius: '8px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)',
                                border: '1px solid var(--border)'
                              }}
                            >
                              <Pencil size={16} />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setUserToDelete(user)}
                              title="Excluir Usuário"
                              style={{
                                width: '32px', height: '32px', borderRadius: '8px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444',
                                border: '1px solid rgba(239, 68, 68, 0.2)'
                              }}
                            >
                              <Trash2 size={16} />
                            </motion.button>
                            <Link href={`/admin/users/${user.id}`}>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                style={{
                                  width: '32px', height: '32px', borderRadius: '8px',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)',
                                  border: '1px solid var(--border)'
                                }}
                              >
                                <MoreVertical size={16} />
                              </motion.button>
                            </Link>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile: Card List */}
        <div className="show-mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Loader2 size={32} color="var(--accent)" className="animate-spin" style={{ margin: '0 auto' }} />
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredUsers.map((user, idx) => {
                const roleObj = roles.find(r => r.id === user.role);
                return (
                  <motion.div
                    key={user.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => window.location.href = `/admin/users/${user.id}`}
                    style={{
                      padding: '16px',
                      borderRadius: '16px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      WebkitTapHighlightColor: 'transparent'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          style={{ width: '44px', height: '44px', borderRadius: '12px', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{
                          width: '44px', height: '44px', borderRadius: '12px',
                          backgroundColor: 'rgba(217, 72, 15, 0.1)', color: 'var(--accent)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700
                        }}>
                          {user.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontWeight: 500, fontSize: '0.75rem',
                            color: user.role === 'admin' ? '#EF4444' :
                              user.role === 'board' ? 'var(--accent)' :
                                user.role === 'social_media' ? '#22C55E' : '#8B5CF6'
                          }}>
                            {roleObj?.name || user.role}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>@{user.username}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenEdit(user); }}
                        style={{
                          width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)',
                          border: '1px solid var(--border)'
                        }}
                      >
                        <Pencil size={15} />
                      </button>
                    </div>
                    {user.statusMessage && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', background: 'var(--card-inner-bg)', padding: '8px 12px', borderRadius: '8px' }}>
                        "{user.statusMessage}"
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Delete User Modal */}
      <AnimatePresence>
        {userToDelete && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 110,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px', backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)'
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card"
              style={{ width: '100%', maxWidth: '450px', padding: '32px', textAlign: 'center' }}
            >
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444', margin: '0 auto 24px'
              }}>
                <Trash2 size={32} />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px' }}>Excluir Usuário?</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: '1.6' }}>
                Tem certeza que deseja excluir o usuário <strong>{userToDelete.name}</strong>? Esta ação não pode ser desfeita.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  className="btn"
                  style={{ backgroundColor: '#EF4444', color: 'white', width: '100%' }}
                  onClick={handleDeleteUser}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Excluindo..." : "Sim, Excluir"}
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%' }}
                  onClick={() => setUserToDelete(null)}
                  disabled={isProcessing}
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <DialogShell
        isOpen={!!userToEdit}
        onClose={() => setUserToEdit(null)}
        title="Editar Membro"
        maxWidth="520px"
        zIndex={110}
        footer={
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setUserToEdit(null)} disabled={isSaving}>
              Cancelar
            </button>
            <button className="btn btn-accent" onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Nome
            </label>
            <input
              className="input-dark"
              style={{ width: '100%' }}
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              placeholder="Nome completo"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                color: 'var(--accent)', fontSize: '0.9rem', pointerEvents: 'none'
              }}>@</span>
              <input
                className="input-dark"
                style={{ width: '100%', paddingLeft: '30px' }}
                value={editForm.username}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                placeholder="usuario"
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Cargo
            </label>
            <select
              className="input-dark"
              style={{ width: '100%' }}
              value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
            >
              <option value="">Selecionar cargo...</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Frase de Status
            </label>
            <input
              className="input-dark"
              style={{ width: '100%' }}
              value={editForm.status_message}
              onChange={(e) => setEditForm({ ...editForm, status_message: e.target.value })}
              placeholder="Ex: Trabalhando duro..."
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
            <input
              type="checkbox"
              id="editResetPassword"
              checked={editForm.resetPassword}
              onChange={(e) => setEditForm({ ...editForm, resetPassword: e.target.checked })}
              style={{
                width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent)',
                borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-secondary)'
              }}
            />
            <label htmlFor="editResetPassword" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
              Enviar e-mail para o usuário redefinir/criar nova senha
            </label>
          </div>
        </div>
      </DialogShell>

      {/* Reset Password Modal */}
      <AnimatePresence>
        {userToReset && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 110,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px', backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)'
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card"
              style={{ width: '100%', maxWidth: '450px', padding: '32px', textAlign: 'center' }}
            >
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(217, 72, 15, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', margin: '0 auto 24px'
              }}>
                <Shield size={32} />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px' }}>Redefinir Senha?</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: '1.6' }}>
                Tem certeza que deseja redefinir a senha do usuário <strong>{userToReset.name}</strong>?
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  className="btn btn-accent"
                  style={{ width: '100%' }}
                  onClick={handleResetPassword}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Processando..." : "Sim, Redefinir Senha"}
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%' }}
                  onClick={() => setUserToReset(null)}
                  disabled={isProcessing}
                >
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
