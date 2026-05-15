"use client";

import { ArrowLeft, ArrowRight, Building2, Mail, Phone, User, Globe, MessageSquare, Save, X, MapPin, Briefcase, Loader2, CheckCircle2, Lock, HardDrive } from "lucide-react";
import Spotlight from "@/components/Spotlight";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCPFOrCNPJ, formatCEP, formatPhone } from "@/utils/masks";
import { useToast } from "@/components/CustomToast";
import CustomModal from "@/components/CustomModal";
import {
  InstagramIcon,
  FacebookIcon,
  LinkedInIcon,
  TikTokIcon,
  GoogleIcon
} from "@/components/SocialIcons";


export default function CreateClientPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    nome_fantasia: "",
    cnpj: "",
    tipo_pessoa: "PJ",
    contact_name: "",
    email: "",
    email_financeiro: "",
    phone: "",
    telefone_fixo: "",
    status: "prospect",
    setor: "",
    servico_interesse: "",
    briefing: "",
    address: {
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      uf: ""
    },
    social_access: {
      instagram: { usuario: "", senha: "", email: "" },
      facebook: { usuario: "", senha: "", email: "" },
      website: ""
    },
    portal_email: "",
    portal_password: "",
    drive_settings: {
      auto_create_folder: true,
      auto_backup: true
    }
  });

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [isLoadingCnpj, setIsLoadingCnpj] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const { showToast } = useToast();
  const [showModal, setShowModal] = useState(false);

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      // Auto-preencher portal_email se estiver vazio e o e-mail principal for alterado
      if (field === 'email' && !prev.portal_email) {
        newData.portal_email = value;
      }
      return newData;
    });
  };

  const updateAddress = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
  };

  const handleDocumentChange = async (val: string) => {
    const formatted = formatCPFOrCNPJ(val);
    updateFormData("cnpj", formatted);

    const digitsOnly = formatted.replace(/\D/g, "");
    if (formData.tipo_pessoa === "PJ" && digitsOnly.length === 14) {
      setIsLoadingCnpj(true);
      try {
        const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digitsOnly}`);
        if (res.ok) {
          const data = await res.json();
          setFormData(prev => ({
            ...prev,
            name: data.razao_social || prev.name,
            nome_fantasia: data.nome_fantasia || prev.nome_fantasia,
            address: {
              ...prev.address,
              cep: formatCEP(data.cep?.toString() || prev.address.cep),
              logradouro: data.logradouro || prev.address.logradouro,
              numero: data.numero || prev.address.numero,
              complemento: data.complemento || prev.address.complemento,
              bairro: data.bairro || prev.address.bairro,
              cidade: data.municipio || prev.address.cidade,
              uf: data.uf || prev.address.uf,
            },
            telefone_fixo: formatPhone(data.ddd_telefone_1 || prev.telefone_fixo)
          }));
          showToast("Dados da empresa carregados automaticamente!", "success");
        }
      } catch (error) {
        console.error("Erro ao buscar CNPJ", error);
      } finally {
        setIsLoadingCnpj(false);
      }
    }
  };

  const handleCepChange = async (val: string) => {
    const formatted = formatCEP(val);
    updateAddress("cep", formatted);

    const digitsOnly = formatted.replace(/\D/g, "");
    if (digitsOnly.length === 8) {
      setIsLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digitsOnly}/json/`);
        if (res.ok) {
          const data = await res.json();
          if (!data.erro) {
            setFormData(prev => ({
              ...prev,
              address: {
                ...prev.address,
                logradouro: data.logradouro || prev.address.logradouro,
                bairro: data.bairro || prev.address.bairro,
                cidade: data.localidade || prev.address.cidade,
                uf: data.uf || prev.address.uf,
              }
            }));
          }
        }
      } catch (error) {
        console.error("Erro ao buscar CEP", error);
      } finally {
        setIsLoadingCep(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.from('clients').insert([formData]);

      if (error) throw error;
      showToast("Cliente cadastrado com sucesso!", "success");
      router.push("/admin/clients");
    } catch (err) {
      console.error("Erro ao criar cliente:", err);
      showToast("Erro ao cadastrar cliente. Verifique os dados.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '900px', margin: '0 auto', paddingBottom: '40px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link href="/admin/clients" className="btn-icon" style={{ padding: '8px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={20} />
        </Link>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '4px' }}>Cadastrar Novo Cliente</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Etapa {step} de 4 — {step === 1 ? 'Identificação' : step === 2 ? 'Endereço' : step === 3 ? 'Contatos' : 'Presença Digital'}</p>
        </div>

        {/* Progress Bar */}
        <div style={{ width: '200px', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(step / 4) * 100}%` }}
            style={{ height: '100%', background: 'var(--accent)' }}
          />
        </div>
      </div>

      <div className="glass-card" style={{ position: 'relative', overflow: 'hidden' }}>
        <form onSubmit={handleSubmit} style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.section
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
              >
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--accent)' }}>
                  <Building2 size={20} /> Identificação da Empresa
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Tipo de Pessoa</label>
                    <div style={{ display: 'flex', padding: '4px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', width: 'fit-content' }}>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, tipo_pessoa: "PJ" })}
                        style={{
                          padding: '8px 24px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500,
                          background: formData.tipo_pessoa === "PJ" ? 'rgba(255,255,255,0.1)' : 'transparent',
                          color: formData.tipo_pessoa === "PJ" ? 'var(--text-primary)' : 'var(--text-secondary)',
                          border: 'none', cursor: 'pointer'
                        }}
                      >PJ</button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, tipo_pessoa: "PF" })}
                        style={{
                          padding: '8px 24px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500,
                          background: formData.tipo_pessoa === "PF" ? 'rgba(255,255,255,0.1)' : 'transparent',
                          color: formData.tipo_pessoa === "PF" ? 'var(--text-primary)' : 'var(--text-secondary)',
                          border: 'none', cursor: 'pointer'
                        }}
                      >PF</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Setor / Nicho</label>
                    <input
                      type="text" className="input-dark" placeholder="Ex: Varejo, Saúde..."
                      value={formData.setor} onChange={(e) => updateFormData("setor", e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{formData.tipo_pessoa === 'PJ' ? 'CNPJ' : 'CPF'}</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text" className="input-dark" placeholder={formData.tipo_pessoa === 'PJ' ? "00.000.000/0000-00" : "000.000.000-00"} required
                        value={formData.cnpj} onChange={(e) => handleDocumentChange(e.target.value)}
                      />
                      {isLoadingCnpj && <Loader2 size={16} className="animate-spin" style={{ position: 'absolute', right: '12px', top: '50%', marginTop: '-8px', color: 'var(--accent)' }} />}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Status Inicial</label>
                    <select
                      className="input-dark"
                      value={formData.status} onChange={(e) => updateFormData("status", e.target.value)}
                    >
                      <option value="prospect">Prospect (Em negociação)</option>
                      <option value="active">Ativo (Com contrato)</option>
                      <option value="inactive">Inativo</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Nome Fantasia (Principal)</label>
                    <input
                      type="text" className="input-dark" placeholder="Ex: Acme"
                      value={formData.nome_fantasia} onChange={(e) => updateFormData("nome_fantasia", e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Razão Social / Nome Completo</label>
                    <input
                      type="text" className="input-dark" placeholder="Ex: Acme Corporation Ltda" required
                      value={formData.name} onChange={(e) => updateFormData("name", e.target.value)}
                    />
                  </div>
                </div>
              </motion.section>
            )}

            {step === 2 && (
              <motion.section
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
              >
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--accent)' }}>
                  <MapPin size={20} /> Localização / Endereço
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>CEP</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text" className="input-dark" placeholder="00000-000"
                        value={formData.address.cep} onChange={(e) => handleCepChange(e.target.value)}
                      />
                      {isLoadingCep && <Loader2 size={16} className="animate-spin" style={{ position: 'absolute', right: '12px', top: '50%', marginTop: '-8px', color: 'var(--accent)' }} />}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Logradouro</label>
                    <input
                      type="text" className="input-dark" placeholder="Rua / Avenida"
                      value={formData.address.logradouro} onChange={(e) => updateAddress("logradouro", e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Número</label>
                    <input
                      type="text" className="input-dark" placeholder="123"
                      value={formData.address.numero} onChange={(e) => updateAddress("numero", e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Bairro</label>
                    <input
                      type="text" className="input-dark" placeholder="Centro"
                      value={formData.address.bairro} onChange={(e) => updateAddress("bairro", e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Cidade</label>
                    <input
                      type="text" className="input-dark" placeholder="Sua Cidade"
                      value={formData.address.cidade} onChange={(e) => updateAddress("cidade", e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>UF</label>
                    <input
                      type="text" className="input-dark" placeholder="SP" maxLength={2}
                      value={formData.address.uf} onChange={(e) => updateAddress("uf", e.target.value.toUpperCase())}
                    />
                  </div>
                </div>
              </motion.section>
            )}

            {step === 3 && (
              <motion.section
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
              >
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--accent)' }}>
                  <User size={20} /> Contatos Principais
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Nome do Responsável</label>
                    <input
                      type="text" className="input-dark" placeholder="Nome completo" required
                      value={formData.contact_name} onChange={(e) => updateFormData("contact_name", e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>WhatsApp</label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                      <input
                        type="text" className="input-dark" style={{ paddingLeft: '40px' }} placeholder="(00) 00000-0000" required
                        value={formData.phone} onChange={(e) => updateFormData("phone", formatPhone(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>E-mail Principal</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                      <input
                        type="email" className="input-dark" style={{ paddingLeft: '40px' }} placeholder="contato@empresa.com" required
                        value={formData.email} onChange={(e) => updateFormData("email", e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>E-mail Financeiro</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                      <input
                        type="email" className="input-dark" style={{ paddingLeft: '40px' }} placeholder="financeiro@empresa.com"
                        value={formData.email_financeiro} onChange={(e) => updateFormData("email_financeiro", e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Telefone Fixo</label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                      <input
                        type="text" className="input-dark" style={{ paddingLeft: '40px' }} placeholder="(00) 0000-0000"
                        value={formData.telefone_fixo} onChange={(e) => updateFormData("telefone_fixo", formatPhone(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              </motion.section>
            )}

            {step === 4 && (
              <motion.section
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
              >
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--accent)' }}>
                  <Briefcase size={20} /> Presença Digital
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Serviço de Interesse</label>
                    <select
                      className="input-dark"
                      value={formData.servico_interesse} onChange={(e) => updateFormData("servico_interesse", e.target.value)}
                    >
                      <option value="">Selecione um serviço</option>
                      <option value="Gestão de Redes Sociais">Gestão de Redes Sociais</option>
                      <option value="Tráfego Pago (Ads)">Tráfego Pago (Ads)</option>
                      <option value="Identidade Visual">Identidade Visual</option>
                      <option value="Desenvolvimento de Site">Desenvolvimento de Site</option>
                      <option value="Assessoria de Imprensa">Assessoria de Imprensa</option>
                      <option value="Consultoria">Consultoria de Marketing</option>
                      <option value="Pacote Completo">Pacote Completo (360)</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Website / Instagram</label>
                    <div style={{ position: 'relative' }}>
                      <Globe size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                      <input
                        type="text" className="input-dark" style={{ paddingLeft: '40px' }} placeholder="https://www.exemplo.com"
                        value={formData.social_access.website} onChange={(e) => setFormData({ ...formData, social_access: { ...formData.social_access, website: e.target.value } })}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <InstagramIcon size={14} style={{ color: '#E1306C' }} /> Instagram (@usuario)
                    </label>
                    <input
                      type="text" className="input-dark" placeholder="@agenciapratic"
                      value={formData.social_access.instagram.usuario} onChange={(e) => setFormData({ ...formData, social_access: { ...formData.social_access, instagram: { ...formData.social_access.instagram, usuario: e.target.value } } })}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Senha Instagram (Opcional)</label>
                    <input
                      type="text" className="input-dark" placeholder="Senha para gestão"
                      value={formData.social_access.instagram.senha} onChange={(e) => setFormData({ ...formData, social_access: { ...formData.social_access, instagram: { ...formData.social_access.instagram, senha: e.target.value } } })}
                    />
                  </div>
                </div>


                {/* Google Drive Automation */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '24px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <HardDrive size={18} style={{ color: '#4285F4' }} /> Integração Google Drive
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '16px',
                      background: 'rgba(66, 133, 244, 0.05)', borderRadius: '12px', border: '1px solid rgba(66, 133, 244, 0.1)',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={formData.drive_settings.auto_create_folder}
                        onChange={(e) => setFormData({ ...formData, drive_settings: { ...formData.drive_settings, auto_create_folder: e.target.checked } })}
                        style={{ width: '18px', height: '18px', accentColor: '#4285F4' }}
                      />
                      <div>
                        <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>Criar pasta automaticamente</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cria a pasta do cliente dentro de "Clientes PRÁTIC"</p>
                      </div>
                    </label>

                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '16px',
                      background: 'rgba(66, 133, 244, 0.05)', borderRadius: '12px', border: '1px solid rgba(66, 133, 244, 0.1)',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={formData.drive_settings.auto_backup}
                        onChange={(e) => setFormData({ ...formData, drive_settings: { ...formData.drive_settings, auto_backup: e.target.checked } })}
                        style={{ width: '18px', height: '18px', accentColor: '#4285F4' }}
                      />
                      <div>
                        <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>Sincronizar anexos</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Faz backup automático de novos documentos no Drive</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Portal Access Credentials */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '24px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Lock size={18} style={{ color: 'var(--accent)' }} /> Acesso ao Portal do Cliente
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>E-mail de Acesso</label>
                      <input
                        type="email" className="input-dark" placeholder="Email para login no portal"
                        value={formData.portal_email} onChange={(e) => updateFormData("portal_email", e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Senha de Acesso</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text" className="input-dark" placeholder="Senha inicial"
                          value={formData.portal_password} onChange={(e) => updateFormData("portal_password", e.target.value)}
                        />
                        <button
                          type="button"
                          className="btn"
                          onClick={() => updateFormData("portal_password", `Pratic@${Math.floor(1000 + Math.random() * 9000)}`)}
                          style={{ padding: '0 12px', fontSize: '0.75rem', whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.05)' }}
                        >
                          Gerar Senha
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Ações */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              {step > 1 && (
                <button type="button" onClick={() => setStep(s => s - 1)} className="btn" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  Voltar
                </button>
              )}
              <Link href="/admin/clients" className="btn" style={{ background: 'rgba(255,255,255,0.05)' }}>
                Cancelar
              </Link>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              {step < 4 ? (
                <button type="button" onClick={() => setStep(s => s + 1)} className="btn btn-accent" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Próximo Passo <ArrowRight size={18} />
                </button>
              ) : (
                <Spotlight as="button" type="submit" className="btn btn-accent" disabled={loading}>
                  {loading ? "Salvando..." : <><Save size={18} /> Salvar Cliente</>}
                </Spotlight>
              )}
            </div>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
