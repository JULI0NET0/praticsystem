"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import { Contract, Client, Service } from "@/types/database";

export default function ContractDocumentPage() {
  const { id } = useParams();
  const router = useRouter();

  const [contract, setContract] = useState<Contract | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        setLoading(true);
        const { data: contractData } = await supabase.from('contracts').select('*').eq('id', id).single();
        if (contractData) {
          setContract(contractData);

          const [clientRes, serviceRes] = await Promise.all([
            supabase.from('clients').select('*').eq('id', contractData.client_id).single(),
            supabase.from('services').select('*').eq('id', contractData.service_id).single()
          ]);

          if (clientRes.data) setClient(clientRes.data);
          if (serviceRes.data) setService(serviceRes.data);
        }
      } catch (error) {
        console.error("Erro ao carregar documento:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f5f5f5' }}>
        <Loader2 size={48} color="#000" className="animate-spin" />
      </div>
    );
  }

  if (!contract || !client || !service) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px' }}>
        <h2>Contrato não encontrado.</h2>
        <button className="btn btn-secondary" onClick={() => router.back()}>Voltar</button>
      </div>
    );
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatDate = (dateStr: string) => new Date(`${dateStr}T12:00:00`).toLocaleDateString('pt-BR');

  const today = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="document-wrapper">
      <div className="print-actions hide-on-print">
        <button onClick={() => router.back()} className="btn" style={{ background: '#333', color: '#fff', border: 'none', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <ArrowLeft size={16} /> Voltar
        </button>
        <button onClick={() => window.print()} className="btn btn-accent" style={{ background: '#000', color: '#fff', border: 'none', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Printer size={16} /> Imprimir / Salvar PDF
        </button>
      </div>

      <div className="a4-page">
        {/* CABEÇALHO */}
        <header style={{ textAlign: 'center', marginBottom: '40px', borderBottom: '2px solid #000', paddingBottom: '20px' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px', color: '#000' }}>
            Contrato de Prestação de Serviços de Marketing e Social Media
          </h1>
        </header>

        {/* 1. IDENTIFICAÇÃO DAS PARTES */}
        <section className="clause">
          <h2>1. IDENTIFICAÇÃO DAS PARTES</h2>
          <p>
            <strong>CONTRATANTE:</strong> {client.name}, pessoa {client.tipo_pessoa === 'PF' ? 'física' : 'jurídica'} de direito privado, inscrita no {client.tipo_pessoa === 'PF' ? 'CPF' : 'CNPJ'} sob o nº {client.cnpj}, com sede à {client.address?.logradouro || ''}, {client.address?.numero || 's/n'}, {client.address?.complemento ? `${client.address.complemento}, ` : ''}{client.address?.bairro || ''}, na cidade de {client.address?.cidade || ''}, Estado de {client.address?.uf || ''}, neste ato representada por {client.contact_name}, doravante denominada “CONTRATANTE”, com e-mail de contato {client.email} e WhatsApp {client.phone}.
          </p>
          <p>
            <strong>CONTRATADA:</strong> Agência Pratic, pessoa jurídica inscrita no CNPJ sob o nº 57.200.006/0001-20, com sede online, neste ato representada por Isabela Brito Macedo Mendonça, publicitária independente, inscrita no CPF sob o nº 120.894.339-14, doravante denominada “CONTRATADA”.
          </p>
        </section>

        {/* CLÁUSULA PRIMEIRA */}
        <section className="clause">
          <h2>CLÁUSULA PRIMEIRA – DO OBJETO</h2>
          <p>
            Constitui objeto do presente contrato a prestação contínua de serviços de {service.name} pela CONTRATADA, compreendendo o desenvolvimento e a execução de ações estratégicas de comunicação digital com o objetivo de fortalecer o posicionamento da CONTRATANTE nas plataformas sociais e ampliar o relacionamento com seu público-alvo.
          </p>
          <p>Para tanto, integram o escopo da prestação de serviços:</p>
          <ul>
            <li>a) Planejamento editorial e estratégico, considerando as metas e valores da marca, o perfil do público-alvo e o calendário de ações mensais;</li>
            <li>b) Criação de conteúdo visual e textual para as redes sociais da CONTRATANTE (como Instagram, Facebook), com número de postagens e formatos previamente acordados entre as partes;</li>
            <li>c) Agendamento e publicação dos conteúdos, com organização do feed, legendas, hashtags e outras otimizações aplicáveis;</li>
            <li>d) Monitoramento de desempenho e engajamento do público, com base em dados extraídos das próprias plataformas;</li>
            <li>e) Entrega de relatório mensal de desempenho com os principais indicadores, aprendizados e sugestões de melhoria;</li>
            <li>f) Acompanhamento e suporte consultivo sobre boas práticas e tendências nas redes sociais.</li>
          </ul>
          <p><strong>Parágrafo único:</strong> Todos os serviços ora descritos serão prestados conforme cronograma, formatos e diretrizes previamente definidos entre as partes, respeitando as particularidades da marca e a estratégia de comunicação estabelecida.</p>
        </section>

        {/* CLÁUSULA SEGUNDA */}
        <section className="clause">
          <h2>CLÁUSULA SEGUNDA – DAS OBRIGAÇÕES DA CONTRATADA</h2>
          <p>São obrigações da CONTRATADA:</p>
          <ul>
            <li>a) Elaborar planejamento estratégico mensal de conteúdo com base nas diretrizes da marca, datas relevantes e objetivos da CONTRATANTE;</li>
            <li>b) Criar, editar e desenvolver os conteúdos visuais e textuais acordados (como postagens, vídeos, carrosséis, stories, etc.), respeitando o número de publicações previstas no plano contratado;</li>
            <li>c) Publicar os conteúdos nas redes sociais da CONTRATANTE nos dias e horários definidos previamente, de acordo com o planejamento validado;</li>
            <li>d) Realizar o monitoramento dos resultados das publicações, acompanhando métricas como alcance, engajamento e crescimento do perfil;</li>
            <li>e) Disponibilizar relatório de desempenho mensal, com os principais dados, análises e recomendações de ajustes;</li>
            <li>f) Manter comunicação clara e periódica com a CONTRATANTE, informando sobre o andamento das demandas, solicitando aprovações e repassando orientações estratégicas sempre que necessário;</li>
            <li>g) Manter confidencialidade sobre todas as informações, dados, senhas e estratégias compartilhadas pela CONTRATANTE;</li>
            <li>h) Cumprir com os prazos estabelecidos em comum acordo e zelar pela boa imagem da marca CONTRATANTE em todos os conteúdos publicados.</li>
          </ul>
        </section>

        {/* CLÁUSULA TERCEIRA */}
        <section className="clause">
          <h2>CLÁUSULA TERCEIRA – DAS OBRIGAÇÕES DA CONTRATANTE</h2>
          <p>São obrigações da CONTRATANTE:</p>
          <ul>
            <li>a) Fornecer, de forma clara e tempestiva, as informações, materiais e aprovações necessários à execução do planejamento e criação dos conteúdos;</li>
            <li>b) Autorizar, com antecedência, as peças e postagens criadas pela CONTRATADA, ou indicar eventuais ajustes necessários no prazo acordado entre as partes;</li>
            <li>c) Conceder acesso às redes sociais e ferramentas utilizadas para publicação e análise de dados, sempre que solicitado pela CONTRATADA;</li>
            <li>d) Informar previamente sobre eventos, campanhas, promoções, inaugurações ou qualquer informação relevante que impacte na criação de conteúdo;</li>
            <li>e) Cumprir com os pagamentos nas datas acordadas, conforme valores e condições descritas na cláusula específica deste contrato;</li>
            <li>f) Respeitar os prazos acordados para feedbacks e aprovações, ciente de que atrasos podem comprometer o cronograma de publicações;</li>
            <li>g) Não realizar edições, alterações ou exclusões nos conteúdos criados pela CONTRATADA sem comunicação prévia ou autorização expressa.</li>
          </ul>
        </section>

        {/* CLÁUSULA 4 */}
        <section className="clause">
          <h2>4 – DOS PRAZOS E ENTREGAS</h2>
          <p>
            <strong>4.1.</strong> A CONTRATADA se compromete a entregar à CONTRATANTE o total de {contract.posts_per_week ? contract.posts_per_week * 4 : 12} conteúdos mensais, organizados em {contract.posts_per_week || 3} postagens semanais, contemplando formatos diversos como carrossel, imagem, vídeo ou reels, conforme alinhamento estratégico previamente estabelecido entre as partes.
          </p>
          <p><strong>4.2.</strong> As entregas serão organizadas em um calendário de conteúdo mensal, com sugestão de datas, temas e formatos, apresentado com antecedência para validação da CONTRATANTE, conforme a rotina de planejamento vigente da CONTRATADA.</p>
          <p>
            <strong>4.3.</strong> Está inclusa neste contrato {contract.content_capture ? (contract.capture_frequency || '1 (uma) captação mensal') : '0 (nenhuma) captação'} de conteúdo para produção dos materiais que compõem o planejamento. Em caso de necessidade de captações adicionais, estas deverão ser previamente orçadas e aprovadas pela CONTRATANTE.
          </p>
          <p><strong>4.4.</strong> Os conteúdos serão entregues organizados e prontos para publicação, podendo a CONTRATADA, mediante alinhamento prévio, realizar a publicação nos perfis oficiais da CONTRATANTE.</p>
          <p><strong>4.5.</strong> Demandas extras, urgentes ou fora do escopo deverão ser solicitadas com antecedência e serão avaliadas pela CONTRATADA, podendo ser objeto de orçamento complementar.</p>
        </section>

        {/* CLÁUSULA 5 */}
        <section className="clause">
          <h2>5 – DO PAGAMENTO</h2>
          <p><strong>5.1.</strong> Pela prestação dos serviços descritos neste contrato, a CONTRATANTE pagará à CONTRATADA o valor mensal de <strong>{formatCurrency(contract.value)}</strong>, mediante emissão de nota fiscal.</p>
          <p><strong>5.2.</strong> O pagamento deverá ser realizado até a data de vencimento estabelecida de cada mês, por meio de PIX, transferência bancária, boleto ou outro meio acordado, conforme instruções fornecidas pela CONTRATADA.</p>
          <p><strong>5.3.</strong> Em caso de inadimplência superior a 5 (cinco) dias úteis, a CONTRATADA poderá suspender a execução dos serviços até a regularização do pagamento, sem prejuízo da cobrança de juros legais, multa de 2% (dois por cento) e correção monetária.</p>
          <p><strong>5.4.</strong> O não pagamento por período superior a 30 (trinta) dias poderá ser considerado motivo para rescisão contratual por parte da CONTRATADA, com a devida comunicação formal à CONTRATANTE.</p>
          <p><strong>5.5.</strong> Eventuais serviços ou demandas extras não inclusos neste contrato serão orçados separadamente e cobrados mediante aprovação da CONTRATANTE.</p>
          <p><strong>5.6 – DO PROCESSO DE COBRANÇA</strong></p>
          <ul>
            <li><strong>5.6.1.</strong> Os pagamentos serão gerados e cobrados por meio da plataforma ASAAS, que enviará automaticamente os boletos ou links de pagamento para o e-mail e/ou WhatsApp da CONTRATANTE, conforme dados fornecidos.</li>
            <li><strong>5.6.2.</strong> A CONTRATANTE se compromete a manter seus dados de contato atualizados junto à CONTRATADA para garantir o recebimento adequado das notificações de cobrança.</li>
            <li><strong>5.6.3.</strong> Caso não receba o boleto ou link para pagamento, a CONTRATANTE deverá comunicar a CONTRATADA imediatamente para reenvio.</li>
          </ul>
        </section>

        {/* CLÁUSULA 6 */}
        <section className="clause">
          <h2>6 – DA VIGÊNCIA DO CONTRATO</h2>
          <p>
            <strong>6.1.</strong> O presente contrato terá vigência com início em <strong>{formatDate(contract.start_date)}</strong> e término previsto para <strong>{formatDate(contract.end_date)}</strong>, {contract.auto_renew ? 'podendo ser renovado automaticamente por iguais períodos, salvo manifestação contrária de qualquer das partes com antecedência mínima de 30 (trinta) dias.' : 'sem renovação automática estipulada.'}
          </p>
          <p><strong>6.2.</strong> Caso as partes optem por não estipular prazo determinado, este contrato será considerado por prazo indeterminado, podendo ser rescindido a qualquer tempo mediante aviso prévio, conforme cláusula de rescisão.</p>
        </section>

        {/* CLÁUSULA 7 */}
        <section className="clause">
          <h2>7 – DA RESCISÃO</h2>
          <p><strong>7.1.</strong> O contrato poderá ser rescindido por qualquer das partes a qualquer tempo, mediante aviso prévio de 30 (trinta) dias corridos, por escrito.</p>
          <p><strong>7.2.</strong> Em caso de rescisão antes do término da vigência mínima acordada, por iniciativa da CONTRATANTE, sem justa causa, será devida multa rescisória equivalente a 30% (trinta por cento) do valor restante do contrato até o final do período vigente.</p>
          <p><strong>7.3.</strong> A rescisão imediata poderá ser aplicada, sem aviso prévio, em caso de descumprimento contratual grave por qualquer das partes, sem prejuízo de eventuais perdas e danos.</p>
          <p><strong>7.4.</strong> Havendo pagamentos em aberto até a data da rescisão, a CONTRATANTE se compromete a quitar integralmente os valores devidos à CONTRATADA, inclusive os proporcionais ao período de aviso prévio ou multa, conforme o caso.</p>
        </section>

        {/* DISPOSIÇÕES GERAIS */}
        <section className="clause">
          <h2>DISPOSIÇÕES GERAIS</h2>
          <p>As partes concordam em manter em sigilo todas as informações trocadas no âmbito deste contrato, especialmente aquelas relacionadas a estratégias de marketing e dados da empresa.</p>
          <p><strong>CLÁUSULA OITAVA</strong> – A CONTRATADA ficará isenta de qualquer responsabilidade:</p>
          <ul>
            <li>I. Caso a demora na execução do serviço decorrer de omissão de informação, não cumprimento dos prazos estabelecidos ou qualquer erro exclusivo causado ou aprovado pelo CONTRATANTE, incluindo erro ortográfico e/ou gramatical.</li>
            <li>II. Por projeto confiscado ou destruído por autoridade competente;</li>
            <li>III. Em caso fortuito ou de força maior;</li>
            <li>IV. Por omissão de informações por parte da CONTRATADA, devendo a mesma zelar pelo material e prazo.</li>
          </ul>
          <p><strong>CLÁUSULA NONA</strong> – A CONTRATADA se reserva o direito de expor ou não o projeto desenvolvido, a título de modelo, em seu portfólio. Os critérios de decisão são de inteira responsabilidade da CONTRATADA.</p>
        </section>

        {/* FORO */}
        <section className="clause">
          <h2>DO FORO</h2>
          <p><strong>CLÁUSULA DÉCIMA</strong> – Para dirimir quaisquer controvérsias oriundas do presente instrumento, as partes adotam o foro da plataforma autentique realizando as coletas das assinaturas digitais da CONTRATANTE e CONTRATADO(A).</p>
          <p style={{ marginTop: '20px' }}>Por estarem assim justas e contratadas, firmam o presente instrumento, em duas vias de igual teor e forma.</p>
          <p style={{ textAlign: 'right', marginTop: '30px' }}>
            Local, {today}.
          </p>
        </section>

        {/* ASSINATURAS */}
        <div className="signatures" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '80px', paddingBottom: '40px' }}>
          <div style={{ textAlign: 'center', width: '45%' }}>
            <div style={{ borderBottom: '1px solid #000', marginBottom: '8px' }}></div>
            <p style={{ fontWeight: 'bold' }}>AGÊNCIA PRÁTIC</p>
            <p style={{ fontSize: '0.8rem' }}>CONTRATADA</p>
          </div>
          <div style={{ textAlign: 'center', width: '45%' }}>
            <div style={{ borderBottom: '1px solid #000', marginBottom: '8px' }}></div>
            <p style={{ fontWeight: 'bold' }}>{client.name.toUpperCase()}</p>
            <p style={{ fontSize: '0.8rem' }}>CONTRATANTE</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        /* Reset para a página do documento */
        body {
          background-color: #e5e7eb !important;
          margin: 0;
          padding: 0;
        }

        .document-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 40px 20px;
          min-height: 100vh;
        }

        .print-actions {
          display: flex;
          gap: 16px;
          margin-bottom: 30px;
          width: 100%;
          max-width: 800px;
          justify-content: flex-end;
        }

        .a4-page {
          background-color: white;
          color: black;
          width: 210mm;
          min-height: 297mm;
          padding: 20mm;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          border-radius: 4px;
          box-sizing: border-box;
          font-family: "Times New Roman", Times, serif;
          line-height: 1.6;
        }

        .clause {
          margin-bottom: 24px;
          text-align: justify;
        }

        .clause h2 {
          font-size: 1.1rem;
          font-weight: bold;
          margin-bottom: 12px;
          color: #000;
        }

        .clause p {
          margin-bottom: 10px;
          font-size: 1rem;
          color: #111;
        }

        .clause ul {
          margin-top: 8px;
          margin-bottom: 16px;
          padding-left: 24px;
        }

        .clause li {
          margin-bottom: 6px;
          font-size: 1rem;
        }

        @media print {
          body {
            background-color: white !important;
          }
          
          .document-wrapper {
            padding: 0;
            display: block;
          }

          .a4-page {
            box-shadow: none;
            width: 100%;
            height: auto;
            padding: 15mm;
            border-radius: 0;
            margin: 0;
          }

          .hide-on-print {
            display: none !important;
          }
          
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
