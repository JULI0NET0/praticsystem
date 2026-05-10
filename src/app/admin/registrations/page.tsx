"use client";

import { Users, UserPlus, Briefcase, FileText, ArrowRight, ShieldCheck } from "lucide-react";
import Spotlight from "@/components/Spotlight";
import { motion } from "framer-motion";
import Link from "next/link";

const REGISTRATION_CARDS = [
  {
    title: "Membros da Equipe",
    description: "Convide novos membros e gerencie os acessos atuais.",
    icon: UserPlus,
    href: "/admin/users/create",
    stats: "4 Membros ativos",
    color: "var(--accent)"
  },
  {
    title: "Gestão de Cargos",
    description: "Crie e edite permissões para diferentes funções.",
    icon: ShieldCheck,
    href: "/admin/users/roles",
    stats: "3 Cargos definidos",
    color: "#8B5CF6"
  },
  {
    title: "Clientes",
    description: "Cadastre novas empresas e contatos comerciais.",
    icon: Users,
    href: "/admin/clients",
    stats: "24 Clientes cadastrados",
    color: "#3B82F6"
  },
  {
    title: "Serviços",
    description: "Configure os pacotes de serviços e preços.",
    icon: Briefcase,
    href: "/admin/services",
    stats: "8 Serviços ativos",
    color: "#10B981"
  },
  {
    title: "Contratos",
    description: "Gere e gerencie contratos de prestação de serviço.",
    icon: FileText,
    href: "/admin/contracts",
    stats: "15 Contratos vigentes",
    color: "#F59E0B"
  }
];

export default function RegistrationsPage() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}
    >
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px' }}>Central de Cadastros</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Gerencie todos os registros e configurações estruturais do sistema.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
        {REGISTRATION_CARDS.map((card, idx) => (
          <Link key={card.title} href={card.href} style={{ textDecoration: 'none', color: 'inherit' }}>
            <motion.div 
              whileHover={{ y: -8, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="glass-card"
              style={{ padding: '32px', height: '100%', display: 'flex', flexDirection: 'column', gap: '20px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
            >
              <div style={{ 
                width: '56px', height: '56px', borderRadius: '16px', 
                background: `rgba(${card.color === 'var(--accent)' ? '217, 72, 15' : '100, 100, 100'}, 0.1)`, 
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color,
                border: `1px solid rgba(${card.color === 'var(--accent)' ? '217, 72, 15' : '100, 100, 100'}, 0.2)`
              }}>
                <card.icon size={28} />
              </div>
              
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>{card.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>{card.description}</p>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{card.stats}</span>
                <ArrowRight size={18} color="var(--text-secondary)" />
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
