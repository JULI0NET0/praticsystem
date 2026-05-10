"use client";

import Link from "next/link";
import { Search, Plus, MoreHorizontal, User, X, Building2, Mail, Phone, Shield, Loader2 } from "lucide-react";
import Spotlight from "@/components/Spotlight";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Client } from "@/types/database";

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClient, setNewClient] = useState({
    name: "",
    cnpj: "",
    contactName: "",
    email: "",
    phone: "",
    status: "prospect"
  });
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Mapear snake_case para camelCase se necessário, ou usar os nomes reais
      if (data) {
        const mappedClients = data.map(c => ({
          ...c,
          contactName: c.contact_name,
          nomeFantasia: c.nome_fantasia,
          tipoPessoa: c.tipo_pessoa
        }));
        setClients(mappedClients);
      }
    } catch (err) {
      console.error("Erro ao buscar clientes:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         client.cnpj.includes(searchTerm) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    // Aqui seria a chamada para a API
    console.log("Novo cliente:", newClient);
    setIsModalOpen(false);
    // Reset form
    setNewClient({ name: "", cnpj: "", contactName: "", email: "", phone: "", status: "prospect" });
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
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px' }}>Gestão de Clientes</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Visualize e gerencie toda a sua carteira de clientes.</p>
        </div>
        <Link href="/admin/clients/create">
          <Spotlight 
            as="div" 
            className="btn btn-accent"
          >
            <Plus size={18} /> Novo Cliente
          </Spotlight>
        </Link>
      </div>

      <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Buscar por nome, CNPJ ou email..." 
              className="input-dark"
              style={{ paddingLeft: '48px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="input-dark" 
            style={{ width: '200px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="prospect">Prospects</option>
            <option value="inactive">Inativos</option>
          </select>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
              <Loader2 size={32} color="var(--accent)" />
            </motion.div>
          </div>
        ) : (
          <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ paddingLeft: '24px' }}>Cliente</th>
                <th>Contato Principal</th>
                <th>CNPJ</th>
                <th>Status</th>
                <th style={{ textAlign: 'right', paddingRight: '24px' }}>Ações</th>
              </tr>
            </thead>
            <tbody style={{ position: 'relative' }}>
              <AnimatePresence mode="popLayout">
                {filteredClients.map((client, idx) => (
                  <motion.tr 
                    key={client.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => window.location.href = `/admin/clients/${client.id}`}
                    style={{ cursor: 'pointer', position: 'relative' }}
                  >
                    <td style={{ paddingLeft: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          width: '44px', height: '44px', borderRadius: '12px', 
                          backgroundColor: 'rgba(217, 72, 15, 0.1)', border: '1px solid rgba(217, 72, 15, 0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--accent)', fontWeight: 600, fontSize: '0.9rem'
                        }}>
                          {client.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>{client.name}</p>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ID: #{client.id}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <p style={{ fontWeight: 500, fontSize: '0.9rem' }}>{client.contactName}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{client.email}</p>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{client.cnpj}</td>
                    <td>
                      <span className={`badge ${
                        client.status === 'active' ? 'badge-success' : 
                        client.status === 'prospect' ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {client.status === 'active' ? 'Ativo' : client.status === 'prospect' ? 'Prospect' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <Link href={`/admin/clients/${client.id}`} onClick={(e) => e.stopPropagation()}>
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
                            <MoreHorizontal size={16} />
                          </motion.button>
                        </Link>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* O modal de criação foi substituído pela página /admin/clients/create */}
    </motion.div>
  );
}
