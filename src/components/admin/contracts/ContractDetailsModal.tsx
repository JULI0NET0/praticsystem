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

  const handleDownloadPDF = () => {
    if (!contract || !client) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast("Por favor, permita pop-ups para exportar o PDF.", "error");
      return;
    }

    const docNum = contract.contract_number ? `Nº ${contract.contract_number}` : `#${contract.id.substring(0, 8).toUpperCase()}`;

    // Processamento do texto simples para formatar títulos e tópicos em negrito
    let processedBody = docContent;

    // Aplica formatação de cabeçalhos separadamente do negrito inline para evitar quebras estranhas
    processedBody = processedBody
      .replace(/(1\.\s+IDENTIFICAÇÃO\s+DAS\s+PARTES)/g, '<div class="clause-header">$1</div>')
      .replace(/(CLÁUSULA\s+[A-ZÀ-Ú]+(?:\s+–\s+[A-ZÀ-Ú ]+)?)/g, '<div class="clause-header">$1</div>')
      .replace(/(^[0-9]+\s+[–\-\.]\s+[A-ZÀ-Ú ]+)/gm, '<div class="clause-header">$1</div>')
      .replace(/(DISPOSIÇÕES\s+GERAIS)/g, '<div class="clause-header">$1</div>')
      .replace(/(DO\s+FORO)/g, '<div class="clause-header">$1</div>')
      .replace(/(CONTRATANTE:)/g, '<strong>$1</strong>')
      .replace(/(CONTRATADA:)/g, '<strong>$1</strong>');

    // Remove as linhas de assinatura cruas do final para substituirmos pelo bloco estruturado
    const signatureStartIndex = processedBody.indexOf("_________________________________________");
    let mainBody = processedBody;
    if (signatureStartIndex !== -1) {
      mainBody = processedBody.substring(0, signatureStartIndex);
    }

    const headerHtml = `
      <div class="header-container">
        <div class="logo-box">
          <img class="logo" src="/SIMBOLO_PRATIC.jpeg" alt="P" onerror="this.style.display='none'">
        </div>
        <h1 class="contract-title">Contrato de Prestação de Serviços</h1>
      </div>
      <div class="contract-subtitle">
        Contrato ${docNum} &nbsp;|&nbsp; Londrina, ${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>Contrato Agência Prátic - ${client.name} - ${docNum}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
          <style>
            @media print {
              body {
                background: white;
                color: #111;
                padding: 10px;
              }
              .no-print {
                display: none;
              }
              thead {
                display: table-header-group;
              }
            }
            body {
              font-family: 'Outfit', 'Inter', sans-serif;
              line-height: 1.25;
              color: #222;
              padding: 30px;
              max-width: 800px;
              margin: 0 auto;
              background-color: #fff;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              border: none;
            }
            thead {
              display: table-header-group;
            }
            .header-container {
              position: relative;
              border-bottom: 2px solid #D9480F;
              padding-bottom: 12px;
              margin-bottom: 10px;
              text-align: center;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 45px;
            }
            .logo-box {
              position: absolute;
              left: 0;
              top: 50%;
              transform: translateY(-50%);
            }
            .logo {
              height: 38px;
            }
            .contract-title {
              font-size: 18px;
              font-weight: 800;
              text-transform: uppercase;
              color: #111;
              margin: 0;
              letter-spacing: 0.5px;
              text-align: center;
              width: 100%;
            }
            .contract-subtitle {
              font-family: 'Playfair Display', 'Georgia', serif;
              font-size: 12px;
              color: #555;
              font-style: italic;
              margin-top: 6px;
              margin-bottom: 20px;
              text-align: center;
            }
            .content {
              font-size: 12px;
              text-align: justify;
              white-space: pre-line;
              color: #333;
            }
            .clause-header {
              color: #111;
              font-weight: 700;
              font-size: 12.5px;
              margin-top: 12px;
              margin-bottom: 4px;
              text-transform: uppercase;
            }
            .content strong {
              color: #111;
              font-weight: 700;
            }
            .signatures-container {
              margin-top: 40px;
              display: flex;
              justify-content: space-between;
              text-align: center;
              page-break-inside: avoid;
            }
            .signature-box {
              width: 45%;
            }
            .signature-line {
              border-top: 1px solid #333;
              margin-top: 30px;
              padding-top: 6px;
            }
            .signature-name {
              margin: 0;
              font-weight: 600;
              font-size: 12px;
              color: #111;
            }
            .signature-role {
              margin: 2px 0 0 0;
              font-size: 10.5px;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .print-btn {
              position: fixed;
              top: 20px;
              right: 20px;
              background-color: #D9480F;
              color: white;
              border: none;
              padding: 12px 24px;
              font-size: 14px;
              font-weight: 600;
              border-radius: 8px;
              cursor: pointer;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              transition: background-color 0.2s;
              font-family: inherit;
              z-index: 9999;
            }
            .print-btn:hover {
              background-color: #BF360C;
            }
          </style>
        </head>
        <body>
          <button class="print-btn no-print" onclick="window.print()">Imprimir / Salvar PDF</button>
          
          <table>
            <thead>
              <tr>
                <td style="padding: 0; border: none;">
                  ${headerHtml}
                </td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 0; border: none;">
                  <div class="content">${mainBody}</div>
                  
                  <div class="signatures-container">
                    <div class="signature-box">
                      <div class="signature-line">
                        <p class="signature-name">${client.name}</p>
                        <p class="signature-role">CONTRATANTE</p>
                      </div>
                    </div>
                    <div class="signature-box">
                      <div class="signature-line">
                        <p class="signature-name">Agência Pratic</p>
                        <p class="signature-role">CONTRATADA</p>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();

    if (documentStatus === 'generated') {
      handleUpdateStatus('sent');
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
                                disabled={documentStatus === 'pending'}
                                style={{ opacity: documentStatus === 'pending' ? 0.5 : 1 }}
                              >
                                <Download size={16} /> Baixar PDF
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
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
