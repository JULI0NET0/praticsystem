"use client";

// import { roles } from "@/mocks/db"; // Removido mock
import { Plus, Search, Shield, User as UserIcon, ShieldAlert, MoreVertical, AtSign, Loader2, Trash2 } from "lucide-react";
import Spotlight from "@/components/Spotlight";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

import Link from "next/link";

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [roles, setRoles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleDeleteUser = async (user: any) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário ${user.name}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);

      if (error) throw error;

      setUsers(users.filter(u => u.id !== user.id));
      alert('Usuário excluído com sucesso!');
    } catch (err) {
      console.error("Erro ao excluir usuário:", err);
      alert('Erro ao excluir usuário. Verifique as permissões.');
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px' }}>Gestão de Equipe</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Gerencie os membros, cargos e frases de status da Prátic.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/admin/users/roles">
            <Spotlight as="button" className="btn" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>Gerenciar Cargos</Spotlight>
          </Link>
          <Link href="/admin/users/create">
            <Spotlight as="button" className="btn btn-accent"><Plus size={18} /> Criar Novo Usuário</Spotlight>
          </Link>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Buscar por nome, email ou @usuario..."
              className="input-dark"
              style={{ paddingLeft: '48px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="input-dark"
            style={{ width: '200px' }}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">Todos os cargos</option>
            {roles.map(role => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
        </div>

        <div className="table-container">
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
                              onClick={() => {
                                if (confirm(`Resetar senha de ${user.name}?`)) {
                                  alert('Senha resetada com sucesso.');
                                }
                              }}
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
                              onClick={() => handleDeleteUser(user)}
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
      </div>
    </motion.div>
  );
}
