"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Building2,
  MapPin,
  Phone,
  Briefcase,
  Share2,
  Loader2,
  Lock,
  Mail,
  User,
  Plus,
  Zap,
  Eye,
  EyeOff
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCPFOrCNPJ, formatCEP, formatPhone } from "@/utils/masks";
import ThemeLogo from "@/components/ThemeLogo";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/CustomToast";
import { 
  InstagramIcon, 
  FacebookIcon, 
  LinkedInIcon, 
  TikTokIcon, 
  GoogleIcon 
} from "@/components/SocialIcons";


export default function CreateClientPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // Pula a Splash Screen
  const [isLoadingCnpj, setIsLoadingCnpj] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState({ email: "", password: "" });
  const [showPortalPassword, setShowPortalPassword] = useState(false);
  const [showSocialPasswords, setShowSocialPasswords] = useState<Record<string, boolean>>({});
  const { showToast } = useToast();

  // Form Data
  const [formData, setFormData] = useState({
    tipo_pessoa: "PJ",
    status: "active",
    cnpj: "",
    name: "",
    nome_fantasia: "",
    setor: "",
    address: {
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      uf: ""
    },
    contact_name: "",
    email: "",
    phone: "",
    telefone_fixo: "",
    email_financeiro: "",
    whatsapp_financeiro: "",
    servico_interesse: "",
    website: "",
    sistema_proprio: "",
    briefing: "",
    social_access: {
      instagram: { ativo: false, usuario: '', senha: '', email: '' },
      facebook: { ativo: false, usuario: '', senha: '', email: '' },
      google: { ativo: false, usuario: '', senha: '', email: '' },
      linkedin: { ativo: false, usuario: '', senha: '', email: '' },
      tiktok: { ativo: false, usuario: '', senha: '', email: '' },
    },
    portal_password: ""
  });

  const updateForm = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleRedeSocial = (rede: keyof typeof formData.social_access) => {
    setFormData(prev => ({
      ...prev,
      social_access: {
        ...prev.social_access,
        [rede]: {
          ...prev.social_access[rede],
          ativo: !prev.social_access[rede].ativo
        }
      }
    }));
  };

  const updateRedeSocial = (rede: keyof typeof formData.social_access, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      social_access: {
        ...prev.social_access,
        [rede]: {
          ...prev.social_access[rede],
          [field]: value
        }
      }
    }));
  };

  const handleDocumentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatCPFOrCNPJ(rawValue);
    updateForm("cnpj", formatted);

    const digitsOnly = formatted.replace(/\D/g, "");
    if (formData.tipo_pessoa === "PJ" && digitsOnly.length === 14) {
      setIsLoadingCnpj(true);
      try {
        const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digitsOnly}`);
        if (res.ok) {
          const data = await res.json();
          setFormData((prev) => ({
            ...prev,
            name: data.razao_social || prev.name,
            nome_fantasia: data.nome_fantasia || prev.nome_fantasia,
            telefone_fixo: formatPhone(data.ddd_telefone_1 || prev.telefone_fixo),
            address: {
              ...prev.address,
              cep: formatCEP(data.cep?.toString() || prev.address.cep),
              logradouro: data.logradouro || prev.address.logradouro,
              numero: data.numero || prev.address.numero,
              complemento: data.complemento || prev.address.complemento,
              bairro: data.bairro || prev.address.bairro,
              cidade: data.municipio || prev.address.cidade,
              uf: data.uf || prev.address.uf,
            }
          }));
        }
      } catch (error) {
        console.error("Erro ao buscar CNPJ", error);
      } finally {
        setIsLoadingCnpj(false);
      }
    }
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCEP(e.target.value);
    setFormData(prev => ({ ...prev, address: { ...prev.address, cep: formatted } }));

    const digitsOnly = formatted.replace(/\D/g, "");
    if (digitsOnly.length === 8) {
      setIsLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digitsOnly}/json/`);
        if (res.ok) {
          const data = await res.json();
          if (!data.erro) {
            setFormData((prev) => ({
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

  const playClick = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Criar 15 milissegundos de ruído (white noise) para simular o atrito mecânico
      const bufferSize = audioCtx.sampleRate * 0.015;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;

      const gain = audioCtx.createGain();

      // Filtro passa-alta para tirar graves e soar como um clique de plástico/switch de mouse
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 2500;

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      // O decaimento deve ser violento (percussivo)
      gain.gain.setValueAtTime(1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.015);

      noise.start(audioCtx.currentTime);
    } catch (e) {
      console.warn("Áudio não suportado ou bloqueado no navegador.");
    }
  };

  const handleStart = () => {
    playClick();
    setStep(1);
  };

  const updateAddress = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
  };

  const nextStep = async () => {
    if (step === 5) {
      // Submeter ao Supabase no último passo (Redes Sociais agora é o último - Step 5)
      const success = await handleSubmit();
      if (success) setStep(6);
    } else {
      setStep((p) => Math.min(p + 1, 6));
    }
  };

  const handleSubmit = async () => {
    setIsLoadingCnpj(true);
    try {
      // Define a senha final (preferencialmente a do usuário)
      const finalPassword = formData.portal_password || `Pratic@${Math.floor(1000 + Math.random() * 9000)}`;
      
      // Remove campos que não devem ir no spread principal ou que precisam de tratamento
      const { portal_password, ...dataToInsert } = formData;

      // 1. Criar usuário no Supabase Auth via API
      const authResponse = await fetch('/api/auth/create-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: finalPassword })
      });

      if (!authResponse.ok) {
        const errorData = await authResponse.json();
        throw new Error(errorData.error || 'Falha ao registrar cliente no Auth.');
      }

      const authData = await authResponse.json();

      // 2. Salvar na tabela clients com o auth_id
      const { error } = await supabase.from('clients').insert([{
        ...dataToInsert,
        id: authData.user?.id, // Vincula o id do auth ao client
        portal_email: formData.email,
        portal_password: finalPassword,
        status: formData.status,
        onboarding_date: new Date().toISOString()
      }]);

      if (error) {
        throw new Error(`Erro ao salvar na tabela clients: ${error.message}. Verifique se as colunas adicionais existem.`);
      }
      
      setGeneratedCredentials({ email: formData.email, password: finalPassword });
      return true;
    } catch (err: any) {
      console.error("Erro ao salvar onboarding:", err);
      showToast(err.message || "Houve um erro ao salvar seus dados. Por favor, tente novamente.", "error");
      return false;
    } finally {
      setIsLoadingCnpj(false);
    }
  };

  const prevStep = () => setStep((p) => Math.max(p - 1, 1));

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 }
  };



  const RedesSociaisList = [
    { id: 'instagram', label: 'Instagram', color: '#E1306C', icon: InstagramIcon },
    { id: 'facebook', label: 'Facebook', color: '#1877F2', icon: FacebookIcon },
    { id: 'google', label: 'Google Meu Negócio', color: '#EA4335', icon: GoogleIcon },
    { id: 'linkedin', label: 'LinkedIn', color: '#0A66C2', icon: LinkedInIcon },
    { id: 'tiktok', label: 'TikTok', color: '#000000', icon: TikTokIcon }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      zIndex: 10
    }}>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(10, 10, 10, 0.4)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              zIndex: 100,
              overflow: 'hidden'
            }}
          >
            {/* Grid animado ao fundo */}
            <div style={{
              position: 'absolute',
              inset: '-50%',
              backgroundImage: 'linear-gradient(rgba(217, 72, 15, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(217, 72, 15, 0.1) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
              animation: 'gridMove 10s linear infinite',
              opacity: 0.6,
              perspective: '1000px',
              transform: 'rotateX(60deg) scale(2)'
            }} />

            {/* Sombra Radial para focar no centro e dar um clima escuro nas bordas */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle, transparent 0%, rgba(10,10,10,0.85) 80%)',
              pointerEvents: 'none'
            }} />

            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              <div style={{ marginBottom: '50px', filter: 'drop-shadow(0 0 20px rgba(217, 72, 15, 0.5))' }}>
                <ThemeLogo width={320} height={80} />
              </div>

              <motion.h1
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 1 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.08, delayChildren: 0.8 }
                  }
                }}
                style={{
                  fontSize: 'clamp(1.75rem, 8vw, 2.5rem)',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  marginBottom: '40px',
                  textAlign: 'center',
                  letterSpacing: '-0.5px',
                  minHeight: '80px',
                  padding: '0 20px'
                }}
              >
                {"Pronto para ativar \no modo Prátic?".split('').map((char, index) => (
                  char === '\n' ? (
                    <br key={index} className="br-mobile" />
                  ) : (
                    <motion.span
                      key={index}
                      variants={{
                        hidden: { opacity: 0, y: 10, filter: 'blur(5px)' },
                        visible: { opacity: 1, y: 0, filter: 'blur(0px)' }
                      }}
                      style={{ display: 'inline-block', whiteSpace: char === ' ' ? 'pre' : 'normal' }}
                    >
                      {char}
                    </motion.span>
                  )
                ))}
              </motion.h1>

              <motion.button
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 3.5, duration: 0.8, type: "spring" }}
                onClick={handleStart}
                className="btn btn-accent"
                style={{
                  padding: '16px 48px',
                  fontSize: '1.25rem',
                  borderRadius: '100px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: '0 0 40px rgba(249, 115, 22, 0.4)'
                }}
              >
                Ativar <Zap size={24} fill="currentColor" />
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Formulário Principal - Só renderiza se não for step 0 */}
      <AnimatePresence>
        {step > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: '700px',
              minHeight: '550px',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Mac OS Window Controls & Title */}
            <div style={{
              padding: '16px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border)'
            }}>
              {/* Bolinhas Mac */}
              <div style={{ display: 'flex', gap: '8px', width: '80px' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#FF5F56' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#FFBD2E' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#27C93F' }} />
              </div>

              {/* Título da Janela */}
              <div style={{
                color: 'var(--text-secondary)',
                fontSize: '0.875rem',
                fontWeight: 500,
                letterSpacing: '0.5px'
              }}>
                Onboarding Pratic
              </div>

              {/* Spacer para centralizar o título */}
              <div style={{ width: '80px' }} />
            </div>

            <div style={{ padding: 'clamp(20px, 4vw, 32px) clamp(16px, 4vw, 40px)', flex: 1, display: 'flex', flexDirection: 'column' }}>

              {/* Progress Bar */}
              {step < 6 && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: 'clamp(24px, 5vw, 40px)' }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <div key={s} style={{
                      flex: 1,
                      height: '4px',
                      borderRadius: '2px',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      {s <= step && (
                        <motion.div
                          layoutId={`progress-${s}`}
                          initial={{ width: 0 }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 0.4 }}
                          style={{
                            position: 'absolute',
                            top: 0, left: 0, bottom: 0, right: 0,
                            backgroundColor: 'var(--accent)',
                            borderRadius: '2px'
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ flex: 1, position: 'relative' }}>
                <AnimatePresence mode="wait">

                  {/* STEP 1: Identificação */}
                  {step === 1 && (
                    <motion.div key="step1" variants={pageVariants} initial="initial" animate="in" exit="out" transition={{ type: "tween", ease: "anticipate", duration: 0.4 }} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                        <div style={{ padding: '12px', background: 'rgba(217, 72, 15, 0.1)', color: 'var(--accent)', borderRadius: '16px' }}>
                          <Building2 size={24} />
                        </div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Identificação</h2>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Vamos começar entendendo o seu negócio.</p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
                        <div style={{ display: 'flex', padding: '4px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', width: 'fit-content' }}>
                          <button
                            onClick={() => updateForm("tipo_pessoa", "PJ")}
                            style={{
                              padding: '8px 24px',
                              borderRadius: '8px',
                              fontSize: '0.875rem',
                              fontWeight: 500,
                              background: formData.tipo_pessoa === "PJ" ? 'rgba(255,255,255,0.1)' : 'transparent',
                              color: formData.tipo_pessoa === "PJ" ? 'var(--text-primary)' : 'var(--text-secondary)',
                              transition: 'all 0.2s'
                            }}
                          >Pessoa Jurídica</button>
                          <button
                            onClick={() => updateForm("tipo_pessoa", "PF")}
                            style={{
                              padding: '8px 24px',
                              borderRadius: '8px',
                              fontSize: '0.875rem',
                              fontWeight: 500,
                              background: formData.tipo_pessoa === "PF" ? 'rgba(255,255,255,0.1)' : 'transparent',
                              color: formData.tipo_pessoa === "PF" ? 'var(--text-primary)' : 'var(--text-secondary)',
                              transition: 'all 0.2s'
                            }}
                          >Pessoa Física</button>
                        </div>

                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                            {formData.tipo_pessoa === "PJ" ? "CNPJ" : "CPF"}
                          </label>
                          <div style={{ position: 'relative' }}>
                            <input
                              type="text"
                              className="input-dark"
                              value={formData.cnpj}
                              onChange={handleDocumentChange}
                              placeholder={formData.tipo_pessoa === "PJ" ? "00.000.000/0000-00" : "000.000.000-00"}
                            />
                            {isLoadingCnpj && (
                              <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                                <Loader2 size={20} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                              </div>
                            )}
                          </div>
                        </div>

                        {formData.tipo_pessoa === "PJ" && (
                          <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Nome Fantasia (Referência Principal)</label>
                            <input
                              type="text"
                              className="input-dark"
                              value={formData.nome_fantasia}
                              onChange={(e) => updateForm("nome_fantasia", e.target.value)}
                              placeholder="Como você quer ser chamado?"
                            />
                          </div>
                        )}

                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                            {formData.tipo_pessoa === "PJ" ? "Razão Social" : "Nome Completo"}
                          </label>
                          <input
                            type="text"
                            className="input-dark"
                            value={formData.name}
                            onChange={(e) => updateForm("name", e.target.value)}
                            placeholder={formData.tipo_pessoa === "PJ" ? "Ex: Prátic Agency LTDA" : "Seu nome completo"}
                          />
                        </div>

                        <div className="onboarding-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Setor / Nicho</label>
                            <input
                              type="text"
                              className="input-dark"
                              value={formData.setor}
                              onChange={(e) => updateForm("setor", e.target.value)}
                              placeholder="Ex: Varejo, Saúde"
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Serviço de Interesse</label>
                            <select
                              className="input-dark"
                              value={formData.servico_interesse}
                              onChange={(e) => updateForm("servico_interesse", e.target.value)}
                              style={{ appearance: 'none' }}
                            >
                              <option value="" disabled>Selecione</option>
                              <option value="Gestão de Redes Sociais">Gestão de Redes Sociais</option>
                              <option value="Tráfego Pago (Ads)">Tráfego Pago (Ads)</option>
                              <option value="Identidade Visual">Identidade Visual</option>
                              <option value="Desenvolvimento de Site">Desenvolvimento de Site</option>
                              <option value="Assessoria de Imprensa">Assessoria de Imprensa</option>
                              <option value="Consultoria">Consultoria</option>
                              <option value="Pacote Completo">Pacote Completo</option>
                            </select>
                          </div>
                        </div>

                        <div className="onboarding-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Possui Site? (Opcional)</label>
                            <input
                              type="text"
                              className="input-dark"
                              value={formData.website}
                              onChange={(e) => updateForm("website", e.target.value)}
                              placeholder="Ex: www.meusite.com.br"
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Possui Sistema Próprio? (Opcional)</label>
                            <input
                              type="text"
                              className="input-dark"
                              value={formData.sistema_proprio}
                              onChange={(e) => updateForm("sistema_proprio", e.target.value)}
                              placeholder="Ex: Sim, usamos o sistema X"
                            />
                          </div>
                        </div>

                        <div className="onboarding-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginTop: '16px' }}>
                          <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Status Inicial</label>
                            <select
                              className="input-dark"
                              value={formData.status}
                              onChange={(e) => updateForm("status", e.target.value)}
                              style={{ appearance: 'none' }}
                            >
                              <option value="active">Ativo (Com contrato)</option>
                              <option value="prospect">Prospect (Em negociação)</option>
                              <option value="inactive">Inativo</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={nextStep} className="btn btn-accent">
                          Próximo Passo <ArrowRight size={18} />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 2: Endereço */}
                  {step === 2 && (
                    <motion.div key="step2" variants={pageVariants} initial="initial" animate="in" exit="out" transition={{ type: "tween", ease: "anticipate", duration: 0.4 }} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                        <div style={{ padding: '12px', background: 'rgba(217, 72, 15, 0.1)', color: 'var(--accent)', borderRadius: '16px' }}>
                          <MapPin size={24} />
                        </div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Endereço</h2>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Informações de localização da sua sede.</p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>CEP</label>
                          <div style={{ position: 'relative' }}>
                            <input
                              type="text"
                              className="input-dark"
                              value={formData.address.cep}
                              onChange={handleCepChange}
                              placeholder="00000-000"
                            />
                            {isLoadingCep && (
                              <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="onboarding-form-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                          <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Logradouro</label>
                            <input type="text" className="input-dark" value={formData.address.logradouro} onChange={(e) => updateAddress("logradouro", e.target.value)} placeholder="Rua / Avenida" />
                          </div>
                          <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Número</label>
                            <input type="text" className="input-dark" value={formData.address.numero} onChange={(e) => updateAddress("numero", e.target.value)} placeholder="123" />
                          </div>
                        </div>

                        <div className="onboarding-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Complemento</label>
                            <input type="text" className="input-dark" value={formData.address.complemento} onChange={(e) => updateAddress("complemento", e.target.value)} placeholder="Sala, Andar..." />
                          </div>
                          <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Bairro</label>
                            <input type="text" className="input-dark" value={formData.address.bairro} onChange={(e) => updateAddress("bairro", e.target.value)} placeholder="Centro" />
                          </div>
                        </div>

                        <div className="onboarding-form-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                          <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Cidade</label>
                            <input type="text" className="input-dark" value={formData.address.cidade} onChange={(e) => updateAddress("cidade", e.target.value)} placeholder="Sua Cidade" />
                          </div>
                          <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>UF</label>
                            <input type="text" className="input-dark" value={formData.address.uf} onChange={(e) => updateAddress("uf", e.target.value)} placeholder="SP" maxLength={2} style={{ textTransform: 'uppercase' }} />
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'space-between' }}>
                        <button onClick={prevStep} className="btn btn-secondary" style={{ border: 'none', background: 'transparent' }}>
                          <ArrowLeft size={18} /> Voltar
                        </button>
                        <button onClick={nextStep} className="btn btn-accent">
                          Próximo <ArrowRight size={18} />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 3: Contatos */}
                  {step === 3 && (
                    <motion.div key="step3" variants={pageVariants} initial="initial" animate="in" exit="out" transition={{ type: "tween", ease: "anticipate", duration: 0.4 }} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                        <div style={{ padding: '12px', background: 'rgba(217, 72, 15, 0.1)', color: 'var(--accent)', borderRadius: '16px' }}>
                          <Phone size={24} />
                        </div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Contatos Principais</h2>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Quem serão as pontes com a nossa equipe.</p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Nome do Contato</label>
                          <input type="text" className="input-dark" value={formData.contact_name} onChange={(e) => updateForm("contact_name", e.target.value)} placeholder="Ex: João da Silva" />
                        </div>

                        <div className="onboarding-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>WhatsApp</label>
                            <input type="text" className="input-dark" value={formData.phone} onChange={(e) => updateForm("phone", formatPhone(e.target.value))} placeholder="(00) 00000-0000" />
                          </div>
                          <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Telefone Fixo</label>
                            <input type="text" className="input-dark" value={formData.telefone_fixo} onChange={(e) => updateForm("telefone_fixo", formatPhone(e.target.value))} placeholder="(00) 0000-0000" />
                          </div>
                        </div>

                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>E-mail de Contato Principal</label>
                          <input type="email" className="input-dark" value={formData.email} onChange={(e) => updateForm("email", e.target.value)} placeholder="contato@empresa.com.br" />
                        </div>

                        <div className="onboarding-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>E-mail do Financeiro</label>
                              <button
                                type="button"
                                onClick={() => updateForm("email_financeiro", formData.email)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
                              >
                                Usar o principal
                              </button>
                            </div>
                            <input type="email" className="input-dark" value={formData.email_financeiro} onChange={(e) => updateForm("email_financeiro", e.target.value)} placeholder="financeiro@empresa.com.br" />
                          </div>

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>WhatsApp do Financeiro</label>
                              <button
                                type="button"
                                onClick={() => updateForm("whatsapp_financeiro", formData.phone)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
                              >
                                Usar o principal
                              </button>
                            </div>
                            <input type="text" className="input-dark" value={formData.whatsapp_financeiro} onChange={(e) => updateForm("whatsapp_financeiro", formatPhone(e.target.value))} placeholder="(00) 00000-0000" />
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'space-between' }}>
                        <button onClick={prevStep} className="btn btn-secondary" style={{ border: 'none', background: 'transparent' }}>
                          <ArrowLeft size={18} /> Voltar
                        </button>
                        <button onClick={nextStep} className="btn btn-accent">
                          Próximo <ArrowRight size={18} />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 4: Acesso ao Portal */}
                  {step === 4 && (
                    <motion.div key="step4" variants={pageVariants} initial="initial" animate="in" exit="out" transition={{ type: "tween", ease: "anticipate", duration: 0.4 }} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                        <div style={{ padding: '12px', background: 'rgba(217, 72, 15, 0.1)', color: 'var(--accent)', borderRadius: '16px' }}>
                          <Lock size={24} />
                        </div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Acesso ao Portal</h2>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Crie sua senha para acessar o Portal do Cliente.</p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>E-mail de Acesso</label>
                          <input type="email" className="input-dark" value={formData.email} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '8px' }}>Usaremos o e-mail principal informado anteriormente.</p>
                        </div>

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Defina sua Senha</label>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Mínimo 6 caracteres</span>
                          </div>
                          <div style={{ position: 'relative' }}>
                            <input
                              type={showPortalPassword ? "text" : "password"}
                              className="input-dark"
                              value={formData.portal_password}
                              onChange={(e) => updateForm("portal_password", e.target.value)}
                              placeholder="••••••••"
                              style={{ letterSpacing: (!showPortalPassword && formData.portal_password) ? '4px' : 'normal', paddingRight: '48px' }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPortalPassword(!showPortalPassword)}
                              style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 0 }}
                            >
                              {showPortalPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>

                        <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(217, 72, 15, 0.05)', border: '1px solid rgba(217, 72, 15, 0.1)' }}>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                            Com esse acesso, você poderá acompanhar o status dos seus projetos, aprovar briefings e visualizar faturas.
                          </p>
                        </div>
                      </div>

                      <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'space-between' }}>
                        <button onClick={prevStep} className="btn btn-secondary" style={{ border: 'none', background: 'transparent' }}>
                          <ArrowLeft size={18} /> Voltar
                        </button>
                        <button onClick={nextStep} className="btn btn-accent" disabled={!formData.portal_password || formData.portal_password.length < 6}>
                          Próximo <ArrowRight size={18} />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 5: Redes Sociais */}
                  {step === 5 && (
                    <motion.div key="step5" variants={pageVariants} initial="initial" animate="in" exit="out" transition={{ type: "tween", ease: "anticipate", duration: 0.4 }} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                        <div style={{ padding: '12px', background: 'rgba(249, 115, 22, 0.1)', color: 'var(--accent)', borderRadius: '16px' }}>
                          <Share2 size={24} />
                        </div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Acessos (Opcional)</h2>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
                        Se souber os acessos das redes sociais, preencha abaixo. Caso contrário, pode pular.
                      </p>

                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        flex: 1,
                        overflowY: 'auto',
                        paddingRight: '8px',
                        marginRight: '-8px' // Para o scrollbar ficar bonitinho
                      }}>
                        {RedesSociaisList.map((rede) => {
                          const redeKey = rede.id as keyof typeof formData.social_access;
                          const isActive = formData.social_access[redeKey].ativo;

                          return (
                            <div key={rede.id} style={{
                              background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                              border: isActive ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.05)',
                              borderRadius: '16px',
                              overflow: 'hidden',
                              transition: 'all 0.3s'
                            }}>
                              <button
                                onClick={() => toggleRedeSocial(redeKey)}
                                style={{
                                  width: '100%',
                                  padding: '16px 20px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--text-primary)',
                                  cursor: 'pointer'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div style={{
                                    width: '32px', height: '32px', borderRadius: '10px',
                                    backgroundColor: isActive ? rede.color : 'rgba(255,255,255,0.05)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: isActive ? '#FFF' : 'rgba(255,255,255,0.3)',
                                    transition: 'all 0.3s'
                                  }}>
                                    <rede.icon size={18} />
                                  </div>
                                  <span style={{ fontWeight: 500 }}>{rede.label}</span>
                                </div>
                                <div style={{
                                  width: '24px', height: '24px',
                                  borderRadius: '50%',
                                  background: isActive ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transform: isActive ? 'rotate(45deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.3s'
                                }}>
                                  <Plus size={16} color={isActive ? '#FFF' : '#A8A8A8'} />
                                </div>
                              </button>

                              <AnimatePresence>
                                {isActive && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                  >
                                    <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                      <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.05)', marginBottom: '4px' }} />

                                      <div className="onboarding-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div style={{ position: 'relative' }}>
                                          <div style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }}><User size={18} /></div>
                                          <input
                                            type="text" className="input-dark" placeholder="Usuário / Login"
                                            style={{ paddingLeft: '40px', fontSize: '0.875rem' }}
                                            value={formData.social_access[redeKey].usuario}
                                            onChange={(e) => updateRedeSocial(redeKey, 'usuario', e.target.value)}
                                          />
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                          <div style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }}><Lock size={18} /></div>
                                          <input
                                            type={showSocialPasswords[redeKey] ? "text" : "password"} className="input-dark" placeholder="Senha"
                                            style={{ paddingLeft: '40px', paddingRight: '40px', fontSize: '0.875rem' }}
                                            value={formData.social_access[redeKey].senha}
                                            onChange={(e) => updateRedeSocial(redeKey, 'senha', e.target.value)}
                                          />
                                          <button
                                            type="button"
                                            onClick={() => setShowSocialPasswords(prev => ({ ...prev, [redeKey]: !prev[redeKey] }))}
                                            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 0 }}
                                          >
                                            {showSocialPasswords[redeKey] ? <EyeOff size={18} /> : <Eye size={18} />}
                                          </button>
                                        </div>
                                      </div>

                                      <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                          <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}></label>
                                          <button
                                            type="button"
                                            onClick={() => updateRedeSocial(redeKey, 'email', formData.email)}
                                            style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
                                          >
                                            Usar o principal
                                          </button>
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                          <div style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }}><Mail size={18} /></div>
                                          <input
                                            type="email" className="input-dark" placeholder="E-mail vinculado (Opcional)"
                                            style={{ paddingLeft: '40px', fontSize: '0.875rem' }}
                                            value={formData.social_access[redeKey].email}
                                            onChange={(e) => updateRedeSocial(redeKey, 'email', e.target.value)}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', paddingTop: '8px' }}>
                        <button onClick={prevStep} className="btn btn-secondary" style={{ border: 'none', background: 'transparent' }}>
                          <ArrowLeft size={18} /> Voltar
                        </button>
                        <button onClick={nextStep} className="btn btn-accent">
                          Próximo <ArrowRight size={18} />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 6: Sucesso */}
                  {step === 6 && (
                    <motion.div key="step6" variants={pageVariants} initial="initial" animate="in" exit="out" transition={{ type: "tween", ease: "anticipate", duration: 0.4 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                        style={{
                          width: '80px', height: '80px', borderRadius: '50%',
                          backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22C55E',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          marginBottom: '32px'
                        }}
                      >
                        <CheckCircle2 size={40} />
                      </motion.div>
                      <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '16px' }}>Cliente Cadastrado!</h2>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '300px' }}>
                        Os dados do cliente foram salvos com sucesso e o status atual é {formData.status === 'active' ? 'Ativo' : 'Prospecção'}.
                      </p>

                      <div className="glass-card" style={{ padding: '20px', marginBottom: '32px', textAlign: 'left', border: '1px solid var(--accent)' }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Lock size={16} /> Acesso ao Portal (Para repassar ao cliente)
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <p style={{ fontSize: '0.85rem' }}><span style={{ color: 'var(--text-secondary)' }}>Usuário:</span> {generatedCredentials.email}</p>
                          <p style={{ fontSize: '0.85rem' }}><span style={{ color: 'var(--text-secondary)' }}>Senha:</span> <code style={{ color: 'var(--accent)' }}>{generatedCredentials.password}</code></p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '16px' }}>
                        <Link href={`/admin/clients`} className="btn btn-accent" style={{ border: 'none' }}>
                          Ir para Clientes
                        </Link>
                        <button onClick={() => window.location.reload()} className="btn btn-secondary" style={{ background: 'var(--text-primary)', color: 'var(--bg-secondary)', border: 'none' }}>
                          Cadastrar Outro
                        </button>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Helper animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes gridMove {
          0% { background-position: 0 0; }
          100% { background-position: 40px 40px; }
        }
      `}} />
    </div>
  );
}
