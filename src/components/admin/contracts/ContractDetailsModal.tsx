"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, DollarSign, FileText, CheckCircle2, AlertCircle, Clock, ArrowRight, Copy, Hash, Edit3, Save, Download, Upload, FileCheck } from "lucide-react";
import { Contract, Client, Service, Invoice } from "@/types/database";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/CustomToast";
import { CONTRACT_TEMPLATE, CONTRACT_TEMPLATE_DEVELOPMENT, CONTRACT_TEMPLATE_IA } from "@/lib/contractTemplate";

interface ContractDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  client: Client | undefined;
  service: Service | undefined;
  invoices: Invoice[];
}

function escreverValorPorExtenso(valor: number): string {
  const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
  const dezenas = ["", "dez", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const especiais = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  const centenas = ["", "cem", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

  if (valor === 0) return "zero reais";

  const centavos = Math.round((valor % 1) * 100);
  const valorInteiro = Math.floor(valor);

  const obterParteInteira = (num: number): string => {
    if (num === 100) return "cem";
    if (num < 10) return unidades[num];
    if (num >= 10 && num < 20) return especiais[num - 10];
    if (num >= 20 && num < 100) {
      const u = num % 10;
      const d = Math.floor(num / 10);
      return dezenas[d] + (u > 0 ? " e " + unidades[u] : "");
    }
    if (num >= 100 && num < 1000) {
      const rest = num % 100;
      const c = Math.floor(num / 100);
      let cent = centenas[c];
      if (c === 1 && rest > 0) cent = "cento";
      return cent + (rest > 0 ? " e " + obterParteInteira(rest) : "");
    }
    if (num >= 1000 && num < 1000000) {
      const rest = num % 1000;
      const mil = Math.floor(num / 1000);
      const milStr = mil === 1 ? "mil" : obterParteInteira(mil) + " mil";
      return milStr + (rest > 0 ? " e " + obterParteInteira(rest) : "");
    }
    return String(num);
  };

  let resultado = obterParteInteira(valorInteiro);
  resultado += valorInteiro === 1 ? " real" : " reais";

  if (centavos > 0) {
    resultado += " e " + obterParteInteira(centavos) + (centavos === 1 ? " centavo" : " centavos");
  }

  return resultado;
}

export default function ContractDetailsModal({ isOpen, onClose, contract, client, service, invoices }: ContractDetailsModalProps) {
  const { showToast } = useToast();
  const [isEditingDoc, setIsEditingDoc] = useState(false);
  const [docContent, setDocContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [documentStatus, setDocumentStatus] = useState<'pending' | 'generated' | 'sent' | 'signed'>('pending');

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Sync internal state when contract changes
  useEffect(() => {
    if (contract) {
      if (contract.document_content) {
        setDocContent(contract.document_content);
      } else {
        setDocContent(generateInitialContent());
      }
      setDocumentStatus(contract.document_status || 'pending');
      setIsEditingDoc(false);
    }
  }, [contract]);

  const generateInitialContent = () => {
    if (!client || !service || !contract) return "";

    const postsSemana = contract.posts_per_week || 0;
    const postsTotal = postsSemana * 4;

    let vigenciaMeses = 12;
    if (contract.start_date && contract.end_date) {
      const d1 = new Date(contract.start_date + 'T12:00:00');
      const d2 = new Date(contract.end_date + 'T12:00:00');
      const diffMonths = (d2.getFullYear() - d1.getFullYear()) * 12 + d2.getMonth() - d1.getMonth();
      if (diffMonths > 0) vigenciaMeses = diffMonths;
    }

    const valorExtenso = escreverValorPorExtenso(contract.value);

    // Seleção dinâmica de template baseado no serviço
    let template = CONTRACT_TEMPLATE;
    const serviceName = (service.name || "").toLowerCase();

    if (serviceName.includes("site") || serviceName.includes("sistema") || serviceName.includes("landing")) {
      template = CONTRACT_TEMPLATE_DEVELOPMENT;
    } else if (serviceName.includes("imagem") || serviceName.includes("ia") || serviceName.includes("inteligência artificial")) {
      template = CONTRACT_TEMPLATE_IA;
    }

    return template
      .replace(/{{NOME_CLIENTE}}/g, client.name || "")
      .replace(/{{CNPJ}}/g, client.cnpj || "")
      .replace(/{{ENDERECO}}/g, client.address ? `${client.address.logradouro}, ${client.address.numero}` : "Endereço não informado")
      .replace(/{{CIDADE}}/g, client.address?.cidade || "Cidade")
      .replace(/{{UF}}/g, client.address?.uf || "UF")
      .replace(/{{CONTATO_NOME}}/g, client.contact_name || "")
      .replace(/{{EMAIL}}/g, client.email || "")
      .replace(/{{TELEFONE}}/g, client.phone || "")
      .replace(/{{SERVICO_NOME}}/g, service.name || "")
      .replace(/{{POSTS_SEMANA}}/g, String(postsSemana))
      .replace(/{{POSTS_TOTAL}}/g, String(postsTotal))
      .replace(/{{CAPTACAO}}/g, contract.capture_frequency || "Não aplicável")
      .replace(/{{VALOR}}/g, contract.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
      .replace(/{{VALOR_EXTENSO}}/g, valorExtenso)
      .replace(/{{VIGENCIA}}/g, String(vigenciaMeses))
      .replace(/{{DATA_INICIO}}/g, new Date(contract.start_date + 'T12:00:00').toLocaleDateString('pt-BR'))
      .replace(/{{DATA_TERMINO}}/g, contract.end_date ? new Date(contract.end_date + 'T12:00:00').toLocaleDateString('pt-BR') : 'Indeterminado')
      .replace(/{{DATA_ATUAL}}/g, new Date().toLocaleDateString('pt-BR'));
  };

  const handleSaveDocument = async () => {
    if (!contract) return;
    setIsSaving(true);
    try {
      const newStatus = documentStatus === 'pending' ? 'generated' : documentStatus;
      const { error } = await supabase
        .from('contracts')
        .update({ document_content: docContent, document_status: newStatus })
        .eq('id', contract.id);

      if (error) throw error;
      
      setDocumentStatus(newStatus);
      showToast("Documento do contrato salvo com sucesso!", "success");
      setIsEditingDoc(false);
    } catch (err) {
      console.error("Erro ao salvar documento:", err);
      showToast("Erro ao salvar documento", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (newStatus: 'pending' | 'generated' | 'sent' | 'signed') => {
    if (!contract) return;
    try {
      const { error } = await supabase
        .from('contracts')
        .update({ document_status: newStatus })
        .eq('id', contract.id);

      if (error) throw error;
      
      setDocumentStatus(newStatus);
      showToast("Status atualizado com sucesso!", "success");
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      showToast("Erro ao atualizar status", "error");
    }
  };

  const handleUploadSignedFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!contract) return;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsSaving(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${contract.id}_signed_${Date.now()}.${fileExt}`;
      const filePath = `signed/${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(filePath, file);

      if (uploadError) {
        console.warn("Storage bucket 'contracts' não encontrado ou sem acesso. Convertendo PDF para Base64 e salvando diretamente no banco.");
        
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          try {
            const { error: dbError } = await supabase
              .from('contracts')
              .update({ 
                signed_document_url: base64data,
                document_status: 'signed' 
              })
              .eq('id', contract.id);

            if (dbError) throw dbError;
            
            setDocumentStatus('signed');
            contract.signed_document_url = base64data;
            showToast("Contrato assinado anexado e salvo diretamente no banco de dados!", "success");
          } catch (dbErr) {
            console.error("Erro ao salvar Base64 no banco:", dbErr);
            showToast("Erro ao gravar documento no banco de dados.", "error");
          }
        };
        reader.readAsDataURL(file);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('contracts')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('contracts')
        .update({ 
          signed_document_url: publicUrl,
          document_status: 'signed' 
        })
        .eq('id', contract.id);

      if (dbError) throw dbError;

      setDocumentStatus('signed');
      contract.signed_document_url = publicUrl;
      showToast("Contrato assinado anexado com sucesso!", "success");
    } catch (err) {
      console.error("Erro ao anexar arquivo assinado:", err);
      showToast("Erro ao anexar arquivo assinado", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const [exporting, setExporting] = useState(false);

  const handleDownloadPDF = async () => {
    if (!contract || !client) return;

    const overlay = document.getElementById('contract-print-overlay') as HTMLElement | null;
    if (!overlay) return;

    setExporting(true);

    const prevCss = overlay.style.cssText;
    overlay.style.cssText = [
      'display:block',
      'position:fixed',
      'left:-99999px',
      'top:0',
      'width:794px',
      'background:#ffffff',
      'z-index:-1',
    ].join(';');

    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(overlay, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794,
        windowWidth: 794,
      });

      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      const pdfWidth = 210;
      const pdfHeight = 297;
      const marginX = 5;  // Margem lateral menor no PDF para o texto respirar
      const marginY = 8;  // Margem vertical menor para aproveitar melhor a página
      
      const contentWidth = pdfWidth - (marginX * 2);
      const contentHeight = pdfHeight - (marginY * 2);

      // Proporções do Canvas correspondentes à área útil do PDF
      const canvasPageHeight = (contentHeight / contentWidth) * canvas.width;
      
      let heightLeft = canvas.height;
      let yOffset = 0;
      let isFirstPage = true;

      while (heightLeft > 0) {
        // Criar um canvas temporário para cada pedaço (página) para evitar que o jspdf faça clipping seco na borda
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = Math.min(canvasPageHeight, heightLeft);

        const ctx = pageCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(
            canvas,
            0, yOffset, canvas.width, pageCanvas.height, // origem
            0, 0, pageCanvas.width, pageCanvas.height // destino
          );
        }

        if (!isFirstPage) {
          pdf.addPage();
        }
        isFirstPage = false;

        const pageImgData = pageCanvas.toDataURL('image/png');
        const renderHeight = (pageCanvas.height / pageCanvas.width) * contentWidth;

        // Adiciona a imagem respeitando a margem superior (marginY) e lateral (marginX)
        pdf.addImage(pageImgData, 'PNG', marginX, marginY, contentWidth, renderHeight);

        yOffset += pageCanvas.height;
        heightLeft -= pageCanvas.height;
      }

      const safeName = (client.name || 'contrato').replace(/[/\\?%*:|"<>]/g, '-').trim();
      const docNum = contract.contract_number ? `Nº ${contract.contract_number}` : `#${contract.id.substring(0, 8).toUpperCase()}`;
      pdf.save(`Contrato · ${safeName} · ${docNum}.pdf`);

      if (documentStatus === 'generated') {
        handleUpdateStatus('sent');
      }

    } catch (err) {
      console.error('PDF export error:', err);
      showToast('Erro ao exportar PDF.', 'error');
    } finally {
      overlay.style.cssText = prevCss;
      setExporting(false);
    }
  };

  if (!contract || !mounted) return null;

  const docNum = contract.contract_number ? `Nº ${contract.contract_number}` : `#${contract.id.substring(0, 8).toUpperCase()}`;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(8px)',
              zIndex: 100,
              cursor: 'pointer'
            }}
          />

          {/* Wrapper */}
          <div style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: isMobile ? 'flex-end' : 'center',
            justifyContent: 'center',
            zIndex: 101,
            padding: isMobile ? '0' : '20px',
            pointerEvents: 'none'
          }}>
            {/* Modal */}
            <motion.div
              initial={isMobile ? { opacity: 0, y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
              animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, scale: 1, y: 0 }}
              exit={isMobile ? { opacity: 0, y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
              style={{
                width: '100%',
                maxWidth: isMobile ? '100%' : '900px',
                backgroundColor: '#111111',
                borderRadius: isMobile ? '24px 24px 0 0' : '24px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                overflow: 'hidden',
                maxHeight: isMobile ? '92dvh' : '90vh',
                display: 'flex',
                flexDirection: 'column',
                pointerEvents: 'auto'
              }}
            >
              {/* Header */}
              <div style={{ padding: '24px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(217, 72, 15, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent)'
                  }}>
                    <FileText size={24} />
                  </div>
                  <div style={{ maxWidth: isMobile ? 'calc(100vw - 120px)' : '60vw', overflow: 'hidden' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      Contrato {docNum}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                      <div
                        onClick={() => {
                          navigator.clipboard.writeText(contract.id);
                          showToast("ID copiado!", "success");
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '4px',
                          padding: '2px 8px', borderRadius: '6px',
                          backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                          cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 0.2s'
                        }}
                        title="Clique para copiar ID"
                      >
                        <Hash size={10} color="var(--accent)" />
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, fontFamily: 'monospace' }}>
                          {contract.id.substring(0, 8)}
                        </span>
                        <Copy size={10} />
                      </div>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '200px' }}>
                        • {client?.name}
                      </span>
                    </div>
                  </div>
                </div>
                <button onClick={onClose} style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div style={{ padding: isMobile ? '16px' : '32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: isMobile ? '20px' : '32px' }}>
                
                {!isEditingDoc ? (
                  <>
                    {/* Top Info Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                      <div className="glass-card" style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Status do Contrato</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {contract.status === 'active' ? <CheckCircle2 size={16} color="#22C55E" /> : <AlertCircle size={16} color="#F59E0B" />}
                          <span style={{ fontWeight: 600, color: 'white' }}>
                            {contract.status === 'active' ? 'Ativo' : contract.status === 'expiring' ? 'A Vencer' : 'Expirado'}
                          </span>
                        </div>
                      </div>
                      <div className="glass-card" style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Valor Mensal</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <DollarSign size={16} color="var(--accent)" />
                          <span style={{ fontWeight: 700, color: 'white', fontSize: '1.1rem' }}>
                            R$ {contract.value.toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      <div className="glass-card" style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Data de Encerramento</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Clock size={16} color="var(--text-secondary)" />
                          <span style={{ fontWeight: 600, color: 'white' }}>
                            {contract.end_date ? new Date(contract.end_date + 'T12:00:00').toLocaleDateString('pt-BR') : 'Indeterminado'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Service & Document Details */}
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: isMobile ? '16px' : '32px' }}>
                      <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CheckCircle2 size={18} color="var(--accent)" /> Escopo do Serviço
                        </h3>
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <p style={{ fontWeight: 600, color: 'white', marginBottom: '4px' }}>{service?.name}</p>
                          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            {service?.description}
                          </p>
                          <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(217, 72, 15, 0.1)', color: 'var(--accent)', padding: '4px 10px', borderRadius: '100px', fontWeight: 500 }}>
                              Recorrente
                            </span>
                            <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: '100px', fontWeight: 500 }}>
                              {service?.category}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FileText size={18} color="var(--accent)" /> Documento e Assinatura
                        </h3>
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                          
                          {/* Status Pipeline */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '50%', left: '10%', right: '10%', height: '2px', backgroundColor: 'rgba(255,255,255,0.1)', zIndex: 0 }} />
                            
                            {(['pending', 'generated', 'sent', 'signed'] as const).map((step, idx) => {
                              const labels = { pending: 'Pendente', generated: 'Emitido', sent: 'Enviado', signed: 'Assinado' };
                              const isActive = documentStatus === step;
                              const isPast = ['pending', 'generated', 'sent', 'signed'].indexOf(documentStatus) >= idx;
                              return (
                                <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 1 }}>
                                  <div style={{ 
                                    width: '24px', height: '24px', borderRadius: '50%', 
                                    backgroundColor: isPast ? 'var(--accent)' : '#111', 
                                    border: `2px solid ${isPast ? 'var(--accent)' : 'rgba(255,255,255,0.2)'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                  }}>
                                    {isPast && <CheckCircle2 size={14} color="white" />}
                                  </div>
                                  <span style={{ fontSize: '0.75rem', color: isActive ? 'white' : 'var(--text-secondary)', fontWeight: isActive ? 600 : 400 }}>
                                    {labels[step]}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)' }} />

                          {/* Ações */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <p style={{ fontWeight: 600, color: 'white', fontSize: '0.9rem' }}>1. Emitir Contrato</p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  {contract.document_content ? 'Editado e salvo' : 'Modelo Padrão'}
                                </p>
                              </div>
                              <button className="btn btn-secondary btn-sm" onClick={() => setIsEditingDoc(true)}>
                                {documentStatus === 'pending' ? <><Edit3 size={16} /> Emitir Agora</> : <><Edit3 size={16} /> Revisar</>}
                              </button>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                               <div>
                                 <p style={{ fontWeight: 600, color: 'white', fontSize: '0.9rem' }}>2. Exportar</p>
                                 <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Para enviar via Autentique</p>
                               </div>
                               <button 
                                 className="btn btn-secondary btn-sm" 
                                 onClick={handleDownloadPDF}
                                 disabled={documentStatus === 'pending' || exporting}
                                 style={{ opacity: (documentStatus === 'pending' || exporting) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}
                               >
                                 {exporting ? (
                                   <>
                                     <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                     Exportando...
                                   </>
                                 ) : (
                                   <>
                                     <Download size={16} /> Baixar PDF
                                   </>
                                 )}
                               </button>
                             </div>

                             <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />

                             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                               <div>
                                 <p style={{ fontWeight: 600, color: 'white', fontSize: '0.9rem' }}>3. Assinatura Digital</p>
                                 <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                   {contract.signed_document_url ? 'Contrato assinado em arquivo' : 'Recebeu assinado? Marque ou anexe a cópia'}
                                 </p>
                               </div>
                               
                               <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                                 <label
                                   className={`btn btn-sm ${documentStatus === 'signed' ? 'btn-secondary' : 'btn-accent'}`}
                                   style={{ 
                                     cursor: documentStatus === 'pending' ? 'not-allowed' : 'pointer',
                                     opacity: documentStatus === 'pending' ? 0.5 : 1,
                                     display: 'inline-flex',
                                     alignItems: 'center',
                                     gap: '6px',
                                     padding: '8px 14px'
                                   }}
                                 >
                                   <Upload size={16} /> {documentStatus === 'signed' ? 'Substituir PDF' : 'Anexar PDF Assinado'}
                                   <input 
                                     type="file" 
                                     accept=".pdf" 
                                     onChange={handleUploadSignedFile} 
                                     disabled={documentStatus === 'pending'}
                                     style={{ display: 'none' }} 
                                   />
                                 </label>

                                 {documentStatus !== 'signed' && (
                                   <button
                                     className="btn btn-secondary btn-sm"
                                     onClick={() => handleUpdateStatus('signed')}
                                     disabled={documentStatus === 'pending'}
                                     style={{ opacity: documentStatus === 'pending' ? 0.5 : 1 }}
                                   >
                                     Marcar como Assinado
                                   </button>
                                 )}
                               </div>

                               {contract.signed_document_url && (
                                 <div style={{ marginTop: '8px' }}>
                                   <a 
                                     href={contract.signed_document_url}
                                     target="_blank"
                                     rel="noreferrer"
                                     style={{ fontSize: '0.8rem', color: '#22C55E', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'underline' }}
                                   >
                                     <FileCheck size={14} /> Ver PDF Assinado Anexado
                                   </a>
                                 </div>
                               )}
                             </div>
                           </div>
                         </div>
                       </div>
                    </div>

                    {/* Financial History */}
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <DollarSign size={18} color="var(--accent)" /> Histórico Financeiro
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {invoices.length > 0 ? (
                          invoices.map(invoice => (
                            <div key={invoice.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                              <div>
                                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'white' }}>Venc. {new Date(invoice.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{invoice.status === 'paid' ? 'Pago' : 'Pendente'}</p>
                              </div>
                              <p style={{ fontWeight: 600, color: invoice.status === 'paid' ? '#22C55E' : 'var(--accent)' }}>
                                R$ {invoice.amount.toLocaleString('pt-BR')}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Nenhuma fatura encontrada.</p>
                        )}
                      </div>
                    </div>

                  </>
                ) : (
                  /* Edit Document Mode */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Edit3 size={18} color="var(--accent)" /> Ajustar Documento do Contrato
                      </h3>
                      <button className="btn btn-secondary btn-sm" onClick={() => setIsEditingDoc(false)}>
                        Cancelar
                      </button>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      O texto abaixo foi gerado automaticamente a partir do modelo base e dos dados do cliente. 
                      Você pode alterar o que for necessário. Ao salvar, as alterações ficarão guardadas para este cliente.
                    </p>
                    
                    <textarea
                      value={docContent}
                      onChange={(e) => setDocContent(e.target.value)}
                      style={{
                        flex: 1,
                        minHeight: isMobile ? '160px' : '40vh',
                        width: '100%',
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        padding: '20px',
                        color: 'var(--text-primary)',
                        fontFamily: 'monospace',
                        fontSize: '0.9rem',
                        lineHeight: '1.6',
                        resize: 'vertical'
                      }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                      <button
                        className="btn btn-accent"
                        onClick={handleSaveDocument}
                        disabled={isSaving}
                      >
                        {isSaving ? 'Salvando...' : <><Save size={18} /> Salvar Texto</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
          
          {/* Overlay invisível para renderização do html2canvas */}
          <PrintOverlay contract={contract} client={client} docContent={docContent} />
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}

interface PrintOverlayProps {
  contract: Contract;
  client: Client;
  docContent: string;
}

function PrintOverlay({ contract, client, docContent }: PrintOverlayProps) {
  const docNum = contract.contract_number ? `Nº ${contract.contract_number}` : `#${contract.id.substring(0, 8).toUpperCase()}`;
  const exportedAt = new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  // Processamento do texto do contrato para formatação HTML básica com parágrafos estruturados
  let processedBody = docContent;
  
  // Tratamento dos cabeçalhos das cláusulas
  processedBody = processedBody
    .replace(/(1\.\s+IDENTIFICAÇÃO\s+DAS\s+PARTES)/g, '<div class="clause-header">$1</div>')
    .replace(/(CLÁUSULA\s+[A-ZÀ-Ú]+(?:\s+–\s+[A-ZÀ-Ú ]+)?)/g, '<div class="clause-header">$1</div>')
    .replace(/(^[0-9]+\s+[–\-\.]\s+[A-ZÀ-Ú ]+)/gm, '<div class="clause-header">$1</div>')
    .replace(/(DISPOSIÇÕES\s+GERAIS)/g, '<div class="clause-header">$1</div>')
    .replace(/(DO\s+FORO)/g, '<div class="clause-header">$1</div>')
    .replace(/(CONTRATANTE:)/g, '<strong>$1</strong>')
    .replace(/(CONTRATADA:)/g, '<strong>$1</strong>');

  // Remover linhas de assinatura manuais do texto cru
  const signatureStartIndex = processedBody.indexOf("_________________________________________");
  let mainBody = processedBody;
  if (signatureStartIndex !== -1) {
    mainBody = processedBody.substring(0, signatureStartIndex);
  }

  // Dividir o conteúdo do contrato pelas cláusulas principais para evitar que sejam cortadas no meio
  // O divisor lógico é a quebra de linha (simples ou dupla) antes de um título de Cláusula ou numeração
  const sections = mainBody.split(/\n+(?=(?:CLÁUSULA|\d+[\.\-\s]\s*(?:IDENTIFICAÇÃO|DO|DOS|DAS)|DISPOSIÇÕES|DO\s+FORO))/i);

  mainBody = sections
    .map(sectionStr => {
      const trimmedSection = sectionStr.trim();
      if (!trimmedSection) return '';

      // Processa o conteúdo interno da seção
      const paragraphs = trimmedSection
        .split(/\n/)
        .map(line => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return '';

          // Se for uma linha de cabeçalho
          if (trimmedLine.includes('class="clause-header"')) {
            return trimmedLine;
          }

          // Se a linha começar com letras de tópicos (ex: a), b), I., II.)
          const isTopic = /^(?:[a-z]\)|[IVXLCDM]+\.)\s+/i.test(trimmedLine);
          if (isTopic) {
            return `<div class="topic-line">${trimmedLine}</div>`;
          }

          return `<p>${trimmedLine}</p>`;
        })
        .filter(Boolean)
        .join('');

      return `<section class="clause-section">${paragraphs}</section>`;
    })
    .filter(Boolean)
    .join('');

  return (
    <>
      <style>{`
        #contract-print-overlay .clause-section {
          page-break-inside: avoid;
          break-inside: avoid;
          margin-bottom: 16px;
        }
        #contract-print-overlay .clause-header {
          color: #111;
          font-weight: 800;
          font-size: 13px;
          margin-top: 12px;
          margin-bottom: 6px;
          text-transform: uppercase;
          font-family: "Helvetica Neue", Arial, sans-serif;
        }
        #contract-print-overlay .content-body {
          color: #1a1a1a;
          font-size: 11.5px;
          line-height: 1.45;
          text-align: justify;
          font-family: "Helvetica Neue", Arial, sans-serif;
        }
        #contract-print-overlay .content-body p {
          margin: 0 0 4px 0;
        }
        #contract-print-overlay .topic-line {
          margin: 2px 0 2px 14px;
          text-align: justify;
        }
        #contract-print-overlay .content-body strong {
          color: #000;
          font-weight: 700;
        }
        #contract-print-overlay .content-body ul,
        #contract-print-overlay .content-body ol {
          padding-left: 20px;
          margin: 4px 0;
        }
        #contract-print-overlay .content-body li {
          margin: 2px 0;
        }
        #contract-print-overlay .signatures-block {
          display: flex;
          justify-content: space-between;
          margin-top: 40px;
          padding-bottom: 20px;
          page-break-inside: avoid;
          break-inside: avoid;
        }
      `}</style>

      <div id="contract-print-overlay" style={{ display: 'none' }}>
        <div style={{ fontFamily: '"Helvetica Neue", Arial, sans-serif', color: '#1a1a1a', display: 'flex', flexDirection: 'column', width: '794px', background: '#fff' }}>

          {/* Cabeçalho */}
          <div style={{ padding: '16pt 12mm 14pt', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <img
              src="/logo-horizontal-preta.png"
              alt="Pratic System"
              style={{ height: '16pt', width: 'auto', objectFit: 'contain', flexShrink: 0 }}
            />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '6.5pt', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#d9480f' }}>
                Contrato
              </div>
              <div style={{ fontSize: '8.5pt', color: '#999', marginTop: '2pt' }}>
                {docNum}
              </div>
            </div>
          </div>

          {/* Linha Divisória Laranja */}
          <div style={{ padding: '0 12mm', flexShrink: 0 }}>
            <div style={{ height: '1.5px', background: 'linear-gradient(90deg, #d9480f 0%, #f76b35 60%, rgba(217,72,15,0) 100%)', borderRadius: '1px' }} />
          </div>

          {/* Corpo do Contrato */}
          <div style={{ padding: '10pt 12mm 0' }}>
            <div className="content-body" dangerouslySetInnerHTML={{ __html: mainBody }} />

            {/* Bloco de Assinaturas */}
            <div className="signatures-block">
              <div style={{ width: '45%', textAlign: 'center' }}>
                <div style={{ borderBottom: '1px solid #000', marginBottom: '8px' }}></div>
                <p style={{ fontWeight: 'bold', fontSize: '11px', margin: 0 }}>{client.name.toUpperCase()}</p>
                <p style={{ fontSize: '9.5px', color: '#555', margin: '2px 0 0' }}>CONTRATANTE</p>
              </div>
              <div style={{ width: '45%', textAlign: 'center' }}>
                <div style={{ borderBottom: '1px solid #000', marginBottom: '8px' }}></div>
                <p style={{ fontWeight: 'bold', fontSize: '11px', margin: 0 }}>AGÊNCIA PRATIC</p>
                <p style={{ fontSize: '9.5px', color: '#555', margin: '2px 0 0' }}>CONTRATADA</p>
              </div>
            </div>
          </div>

          {/* Rodapé */}
          <div style={{ margin: '24pt 12mm 18pt', padding: '10pt 0 0', borderTop: '0.5px solid #e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ fontSize: '7.5pt', color: '#c0c0c0' }}>Exportado em {exportedAt}</span>
            <img
              src="/logo-horizontal-preta.png"
              alt="Pratic System"
              style={{ height: '9pt', width: 'auto', objectFit: 'contain', opacity: 0.18 }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
