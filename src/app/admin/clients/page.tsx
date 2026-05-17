"use client";

import Link from "next/link";
import { Search, Plus, MoreHorizontal, User, X, Building2, Mail, Phone, Shield, Loader2, Briefcase, Copy } from "lucide-react";
import Spotlight from "@/components/Spotlight";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Client } from "@/types/database";
import SearchInput from "@/components/ui/SearchInput";
import SortFilterMenu, { SortOption } from "@/components/ui/SortFilterMenu";
import { useToast } from "@/components/CustomToast";

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClient, setNewClient] = useState({
    name: "",
    cnpj: "",
    contact_name: "",
    email: "",
    phone: "",
    status: "prospect"
  });
  const [clients, setClients] = useState<any[]>([]);
  const [demandsCount, setDemandsCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

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

      if (data) {
        setClients(data);

        // Buscar contagem de demandas ativas para cada cliente
        const { data: demandsData } = await supabase
          .from('demands')
          .select('client_id, status')
          .neq('status', 'completed');

        if (demandsData) {
          const counts: Record<string, number> = {};
          demandsData.forEach(d => {
            counts[d.client_id] = (counts[d.client_id] || 0) + 1;
          });
          setDemandsCount(counts);
        }
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
    console.log("Novo cliente:", newClient);
    setIsModalOpen(false);
    setNewClient({ name: "", cnpj: "", contact_name: "", email: "", phone: "", status: "prospect" });
  };

  const statusOptions: SortOption[] = [
    { label: "Todos os status", value: "all" },
    { label: "Ativos", value: "active" },
    { label: "Prospects", value: "prospect" },
    { label: "Inativos", value: "inactive" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 700, marginBottom: '8px' }}>Gestão de Clientes</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.8rem, 2vw, 1rem)' }}>Visualize e gerencie toda a sua carteira de clientes.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              const url = `${window.location.origin}/onboarding`;
              navigator.clipboard.writeText(url);
              showToast("Link de onboarding copiado!", "success");
            }}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Copy size={18} /> Onboarding
          </button>
          <Link href="/admin/clients/create">
            <Spotlight
              as="div"
              className="btn btn-accent"
            >
              <Plus size={18} /> <span className="hide-mobile">Novo</span> Cliente
            </Spotlight>
          </Link>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="mobile-stack" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por nome, CNPJ ou email..."
          />
          <SortFilterMenu
            label="Filtrar"
            options={statusOptions}
            selectedValue={statusFilter}
            onSelect={setStatusFilter}
          />
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
              <Loader2 size={32} color="var(--accent)" />
            </motion.div>
          </div>
        ) : (
          <>
            {/* Desktop: Table */}
            <div className="table-container hide-mobile">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: '24px' }}>Empresa</th>
                    <th>Responsável</th>
                    <th>WhatsApp</th>
                    <th>Serviço</th>
                    <th>Demandas</th>
                    <th>Status</th>
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
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'white' }}>
                              {client.nome_fantasia || client.name}
                            </p>
                            <span style={{
                              fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)',
                              opacity: 0.8
                            }}>
                              ID: #{String(client.sequential_id || idx + 1).padStart(3, '0')}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <p style={{ fontWeight: 500, fontSize: '0.875rem' }}>{client.contact_name}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{client.email}</p>
                          </div>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{client.phone}</p>
                        </td>
                        <td>
                          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            {client.servico_interesse || '-'}
                          </p>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{
                              width: '24px', height: '24px', borderRadius: '50%',
                              background: (demandsCount[client.id] || 0) > 0 ? 'rgba(217, 72, 15, 0.2)' : 'rgba(255,255,255,0.05)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.75rem', fontWeight: 600, color: (demandsCount[client.id] || 0) > 0 ? 'var(--accent)' : 'var(--text-secondary)'
                            }}>
                              {demandsCount[client.id] || 0}
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ativas</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${client.status === 'active' ? 'badge-success' :
                            client.status === 'prospect' ? 'badge-warning' : 'badge-danger'
                            }`}>
                            {client.status === 'active' ? 'Ativo' : client.status === 'prospect' ? 'Prospect' : 'Inativo'}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Mobile: Card List */}
            <div className="show-mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <AnimatePresence mode="popLayout">
                {filteredClients.map((client, idx) => (
                  <motion.div
                    key={client.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => window.location.href = `/admin/clients/${client.id}`}
                    style={{
                      padding: '16px',
                      borderRadius: '16px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      WebkitTapHighlightColor: 'transparent'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {client.nome_fantasia || client.name}
                        </p>
                        <span style={{
                          fontFamily: 'monospace', fontSize: '0.7rem', fontWeight: 600, color: 'var(--accent)', opacity: 0.8
                        }}>
                          #{String(client.sequential_id || idx + 1).padStart(3, '0')}
                        </span>
                      </div>
                      <span className={`badge ${client.status === 'active' ? 'badge-success' :
                        client.status === 'prospect' ? 'badge-warning' : 'badge-danger'
                        }`} style={{ fontSize: '0.75rem', flexShrink: 0 }}>
                        {client.status === 'active' ? 'Ativo' : client.status === 'prospect' ? 'Prospect' : 'Inativo'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <span>{client.contact_name}</span>
                      {(demandsCount[client.id] || 0) > 0 && (
                        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                          {demandsCount[client.id]} demandas
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {/* O modal de criação foi substituído pela página /admin/clients/create */}
    </motion.div>
  );
}
