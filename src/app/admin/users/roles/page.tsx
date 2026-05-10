"use client";

import { roles } from "@/mocks/db";
import { Plus, Shield, ShieldCheck, Trash2, X } from "lucide-react";
import Spotlight from "@/components/Spotlight";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const AVAILABLE_PERMISSIONS = [
  { id: 'all', name: 'Acesso Total', description: 'Permite acesso a todas as áreas do sistema' },
  { id: 'clients.view', name: 'Visualizar Clientes', description: 'Permite ver a lista de clientes' },
  { id: 'clients.edit', name: 'Editar Clientes', description: 'Permite criar e editar clientes' },
  { id: 'contracts.view', name: 'Visualizar Contratos', description: 'Permite ver contratos e faturas' },
  { id: 'team.manage', name: 'Gerir Equipe', description: 'Permite gerenciar membros e cargos' },
  { id: 'agenda.view', name: 'Visualizar Agenda', description: 'Permite ver compromissos' },
];

export default function RolesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const togglePermission = (id: string) => {
    if (id === 'all') {
      setSelectedPermissions(prev => prev.includes('all') ? [] : ['all']);
      return;
    }
    
    setSelectedPermissions(prev => {
      if (prev.includes('all')) return [id]; // Remove all if specific is selected
      if (prev.includes(id)) return prev.filter(p => p !== id);
      return [...prev, id];
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px' }}>Gestão de Cargos</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Defina as permissões e níveis de acesso da sua equipe.</p>
        </div>
        <Spotlight as="button" onClick={() => setIsModalOpen(true)} className="btn btn-accent">
          <Plus size={18} /> Novo Cargo
        </Spotlight>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
        {roles.map((role) => (
          <motion.div 
            key={role.id}
            className="glass-card"
            whileHover={{ y: -5 }}
            style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '40px', height: '40px', borderRadius: '10px', 
                  background: 'rgba(217, 72, 15, 0.1)', display: 'flex', 
                  alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' 
                }}>
                  <Shield size={20} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{role.name}</h3>
              </div>
              <button style={{ background: 'none', border: 'none', color: 'rgba(239, 68, 68, 0.6)', cursor: 'pointer' }}>
                <Trash2 size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {role.permissions.includes('all') ? (
                <span style={{ 
                  fontSize: '0.75rem', background: 'rgba(34, 197, 94, 0.1)', 
                  color: '#22C55E', padding: '4px 10px', borderRadius: '6px',
                  border: '1px solid rgba(34, 197, 94, 0.2)', fontWeight: 500
                }}>
                  Acesso Total
                </span>
              ) : (
                role.permissions.map(pId => {
                  const p = AVAILABLE_PERMISSIONS.find(ap => ap.id === pId);
                  return (
                    <span key={pId} style={{ 
                      fontSize: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', 
                      color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: '6px',
                      border: '1px solid var(--border)'
                    }}>
                      {p?.name || pId}
                    </span>
                  );
                })
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal Novo Cargo */}
      <AnimatePresence>
        {isModalOpen && (
          <div style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            padding: '20px'
          }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card"
              style={{ 
                width: '100%', 
                maxWidth: '550px', 
                padding: '40px', 
                position: 'relative',
                background: 'rgba(15, 15, 15, 0.98)', // Fundo mais sólido para evitar transparência
                boxShadow: '0 0 50px rgba(0,0,0,0.5), 0 0 1px rgba(255,255,255,0.1)',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{ position: 'absolute', right: '24px', top: '24px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '24px' }}>Novo Cargo</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Nome do Cargo</label>
                  <input 
                    type="text" 
                    className="input-dark" 
                    placeholder="Ex: Designer Senior"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Permissões</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {AVAILABLE_PERMISSIONS.map(p => (
                      <div 
                        key={p.id}
                        onClick={() => togglePermission(p.id)}
                        style={{ 
                          padding: '12px', borderRadius: '10px', border: '1px solid var(--border)',
                          background: selectedPermissions.includes(p.id) ? 'rgba(217, 72, 15, 0.05)' : 'rgba(255,255,255,0.02)',
                          borderColor: selectedPermissions.includes(p.id) ? 'var(--accent)' : 'var(--border)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ 
                          width: '18px', height: '18px', borderRadius: '4px', border: '1px solid var(--border)',
                          background: selectedPermissions.includes(p.id) ? 'var(--accent)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {selectedPermissions.includes(p.id) && <ShieldCheck size={12} color="white" />}
                        </div>
                        <div>
                          <p style={{ fontSize: '0.9rem', fontWeight: 500, color: selectedPermissions.includes(p.id) ? 'white' : 'var(--text-primary)' }}>{p.name}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  className="btn btn-accent" 
                  style={{ marginTop: '8px' }}
                  onClick={() => setIsModalOpen(false)}
                >
                  Criar Cargo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
