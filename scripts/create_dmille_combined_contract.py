"""
Cria o serviço "Pacote Completo D'Mille — Sistema Web + Identidade Visual" e o
contrato combinado (Sistema D'Mille + Identidade Visual D'Mille) da cliente
Cristiane Peres dos Santos (cliente já cadastrada, status prospect).

Contexto: as duas propostas (Sistema R$5.500 em 5x de R$1.100 e Identidade
Visual Fase 1 R$3.000 em 4x de R$750) foram unificadas em um único contrato,
com assinatura reorganizada para 24/08/2026 e a entrada dividida em duas
parcelas menores (R$600 na assinatura + R$1.250 na sexta-feira seguinte,
28/08/2026), substituindo apenas as duas primeiras parcelas originais — o
restante do cronograma das duas propostas segue nas datas/valores originais.
Valor total fechado: R$8.500,00 em 9 parcelas. A Gestão de Redes Sociais
mensal (R$1.500/mês, a partir do 4º mês) NÃO integra este contrato — fica
registrada no texto como serviço à parte, a contratar futuramente.

Uso:
  python3 scripts/create_dmille_combined_contract.py            # dry-run (não grava)
  python3 scripts/create_dmille_combined_contract.py --commit   # grava no banco

Idempotente: reaproveita o serviço se já existir pelo nome e não duplica o
contrato cliente+serviço se já houver um.
"""

import os
import argparse
from dotenv import load_dotenv
from supabase import create_client, Client

env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env.local')
load_dotenv(env_path)

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas no .env.local")

sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ---------------------------------------------------------------------------
# Parâmetros do serviço/contrato
# ---------------------------------------------------------------------------
CLIENT_ID = "b7c77024-4ae7-4529-b96d-90e02ff84f4f"  # Cristiane Peres dos Santos (D'Mille)

SERVICE_NAME = "Pacote Completo D'Mille — Sistema Web + Identidade Visual"
SERVICE_DESCRIPTION = (
    "Pacote combinado: (I) desenvolvimento de sistema web personalizado para a "
    "marca D'Mille — site institucional, área de pedidos com login e painel "
    "administrativo, em 4 fases; e (II) construção da identidade visual e "
    "presença digital oficial da marca (paleta, logotipo, manual de marca, "
    "Instagram/Facebook, e-mail profissional e domínio). A Gestão de Redes "
    "Sociais mensal (a partir do 4º mês) não está inclusa neste pacote."
)
SERVICE_PRICE = 8500.0
SERVICE_CATEGORY = "Pacote Completo"
SERVICE_BILLING_CYCLE = "one_time"
SERVICE_MINIMUM_TERM = 0

START_DATE = "2026-08-24"
END_DATE = "2026-12-20"
CONTRACT_VALUE = 8500.0
AUTO_RENEW = False

# Cronograma de parcelas reconstruído (entrada dividida + restante original das duas propostas)
INSTALLMENTS = [
    {"due_date": "2026-08-24", "amount": 600.0, "label": "Entrada (1/2)"},
    {"due_date": "2026-08-28", "amount": 1250.0, "label": "Entrada (2/2)"},
    {"due_date": "2026-09-15", "amount": 750.0, "label": "Identidade Visual - 2ª parcela"},
    {"due_date": "2026-09-20", "amount": 1100.0, "label": "Sistema - 2ª parcela"},
    {"due_date": "2026-10-15", "amount": 750.0, "label": "Identidade Visual - 3ª parcela"},
    {"due_date": "2026-10-20", "amount": 1100.0, "label": "Sistema - 3ª parcela"},
    {"due_date": "2026-11-15", "amount": 750.0, "label": "Identidade Visual - 4ª parcela"},
    {"due_date": "2026-11-20", "amount": 1100.0, "label": "Sistema - 4ª parcela"},
    {"due_date": "2026-12-20", "amount": 1100.0, "label": "Sistema - 5ª parcela"},
]

DOCUMENT_CONTENT = """Contrato de Prestação de Serviços de Desenvolvimento de Sistema Web e Identidade Visual de Marca

1. IDENTIFICAÇÃO DAS PARTES
CONTRATANTE: Cristiane Peres dos Santos, pessoa física, inscrita no CPF sob o nº 255.701.938-04, residente à Avenida Maria Luiza Americano, 1598, Cidade Líder, na cidade de São Paulo, Estado de SP, neste ato representando a marca D'Mille, doravante denominada "CONTRATANTE", com e-mail de contato cris.peres1010@gmail.com e WhatsApp (11) 98561-0121.

CONTRATADA: Agência Pratic, pessoa jurídica inscrita no CNPJ sob o nº 57.200.006/0001-20, com sede online, neste ato representada por Isabela Brito Macedo Mendonça, publicitária independente, inscrita no CPF sob o nº 120.894.339-14, doravante denominada "CONTRATADA".

CLÁUSULA PRIMEIRA – DO OBJETO
Constitui objeto do presente contrato a prestação conjunta de dois pacotes de serviços pela CONTRATADA à CONTRATANTE, unificados neste instrumento por conveniência das partes: (I) o desenvolvimento de sistema web personalizado para a marca D'Mille (site institucional, área de pedidos com login e painel administrativo); e (II) a construção da identidade visual e presença digital oficial da marca D'Mille.

Parágrafo Primeiro – Frente I: Sistema Web D'Mille, desenvolvida em 4 (quatro) fases:
a) Fase 1 – Rascunho visual: protótipo navegável de todas as telas do sistema (site, área de pedidos e painel administrativo), para validação da CONTRATANTE antes do desenvolvimento final;
b) Fase 2 – Site institucional: desenvolvimento do site público com a identidade visual da marca (Home, Sobre a D'Mille, Catálogo por coleção e Página de produto), publicado e navegável;
c) Fase 3 – Área de pedidos e painel administrativo: cadastro e login de clientes, aprovação de acesso, catálogo com preços, montagem e envio de pedidos, histórico de pedidos; e painel administrativo com cadastro de produtos, coleções, fornecedores, gestão de clientes, gestão de pedidos e mapa de produção;
d) Fase 4 – Faturamento, e-mails e relatórios: fluxo completo do pedido, geração automática de fatura, acompanhamento de recebimento, envio automático de e-mails de confirmação e relatórios de vendas e produção.

Parágrafo Segundo – Frente II: Identidade Visual e Presença Digital D'Mille:
a) Construção da identidade visual completa (paleta de cores, símbolo, logotipo, fontes, manual de aplicação e mockups);
b) Criação do Instagram e do Facebook oficiais da marca, no padrão visual definido;
c) Configuração de e-mail profissional e domínio oficial da marca;
d) Imagem oficial para WhatsApp e link na bio.

Parágrafo Terceiro – A Gestão de Redes Sociais mensal (curadoria, produção de posts, cronograma de postagens, imagens com IA e estruturação do WhatsApp Business), prevista para iniciar a partir do 4º mês de vigência, não integra o valor fechado deste contrato, devendo ser objeto de contratação/fatura mensal à parte, no valor de R$ 1.500,00 (mil e quinhentos reais) por mês, caso a CONTRATANTE opte por sua continuidade.

CLÁUSULA SEGUNDA – DAS OBRIGAÇÕES DA CONTRATADA
São obrigações da CONTRATADA:
a) Entregar cada fase descrita na Cláusula Primeira dentro do cronograma acordado, submetendo-a à aprovação da CONTRATANTE antes de iniciar a fase seguinte;
b) Disponibilizar a estrutura de cadastro, permissões e automações necessárias para que o conteúdo cadastrado no painel administrativo seja refletido automaticamente no site e na área de pedidos;
c) Desenvolver a identidade visual, os canais oficiais e a plataforma web com práticas modernas de design, usabilidade e segurança da informação;
d) Prestar suporte técnico e correção de bugs pelo prazo de garantia legal de 30 (trinta) dias após a entrega final de cada frente.

CLÁUSULA TERCEIRA – DAS OBRIGAÇÕES DA CONTRATANTE
São obrigações da CONTRATANTE:
a) Fornecer, em tempo hábil, os materiais institucionais, fotos de produtos, textos e demais insumos necessários ao desenvolvimento de ambas as frentes;
b) Validar cada fase entregue em até 3 (três) dias úteis, indicando ajustes ou aprovação;
c) Efetuar os pagamentos nas datas e valores previstos na Cláusula Quinta;
d) Arcar com os custos de domínio e hospedagem, quando houver, contratados em nome da D'Mille, não inclusos no valor deste contrato.

CLÁUSULA QUARTA – DOS PRAZOS E ENTREGAS
4.1. O presente contrato inicia sua vigência em 24/08/2026.
4.2. Cada fase da Frente I (Cláusula Primeira, Parágrafo Primeiro) é entregue e conferida pela CONTRATANTE antes do início da fase seguinte.
4.3. A Frente II (identidade visual e canais oficiais) tem entrega prevista já nas primeiras semanas de vigência, servindo de base visual para o desenvolvimento do site.
4.4. O prazo total estimado para a conclusão de todas as fases é até 20/12/2026, podendo ser ajustado de comum acordo conforme o ritmo de aprovações da CONTRATANTE.

CLÁUSULA QUINTA – DO VALOR E CONDIÇÕES DE PAGAMENTO
5.1. Pela prestação de todos os serviços descritos neste contrato (Frentes I e II), a CONTRATANTE pagará à CONTRATADA o valor total fechado de R$ 8.500,00 (oito mil e quinhentos reais), parcelado conforme abaixo:

- Entrada (1/2): 24/08/2026 — R$ 600,00
- Entrada (2/2): 28/08/2026 — R$ 1.250,00
- Identidade Visual – 2ª parcela: 15/09/2026 — R$ 750,00
- Sistema – 2ª parcela: 20/09/2026 — R$ 1.100,00
- Identidade Visual – 3ª parcela: 15/10/2026 — R$ 750,00
- Sistema – 3ª parcela: 20/10/2026 — R$ 1.100,00
- Identidade Visual – 4ª parcela: 15/11/2026 — R$ 750,00
- Sistema – 4ª parcela: 20/11/2026 — R$ 1.100,00
- Sistema – 5ª parcela: 20/12/2026 — R$ 1.100,00

5.2. O faturamento será processado e gerado pela plataforma ASAAS, mediante envio de boleto ou link de pagamento (PIX) para os canais de contato da CONTRATANTE.
5.3. O não pagamento de qualquer parcela poderá acarretar a suspensão do desenvolvimento até a regularização de valores, incidindo multa de 2% (dois por cento) e correção monetária sobre valores em atraso.

CLÁUSULA SEXTA – DA PROPRIEDADE INTELECTUAL
6.1. Após a quitação integral dos valores descritos na Cláusula Quinta, a propriedade de todo o código-fonte do sistema, arquivos de identidade visual (logotipo, manual de marca) e credenciais de acesso passa a ser de posse exclusiva da CONTRATANTE, mantendo a CONTRATADA os direitos autorais e menção em portfólio.

DISPOSIÇÕES GERAIS
As partes concordam em manter em sigilo todas as informações comerciais, industriais e dados trocados no âmbito deste contrato.

CLÁUSULA SÉTIMA – DA ISENÇÃO DE RESPONSABILIDADE
A CONTRATADA ficará isenta de qualquer responsabilidade:
I. Caso a demora na execução do serviço decorrer de omissão de informação, atraso em aprovações ou erro exclusivo da CONTRATANTE;
II. Em caso fortuito ou de força maior.

CLÁUSULA OITAVA – DO USO DE PORTFÓLIO
A CONTRATADA se reserva o direito de expor ou não os projetos desenvolvidos (identidade visual e sistema web), a título de modelo, em seu portfólio.

CLÁUSULA NONA – DA RESCISÃO
9.1. O contrato poderá ser rescindido por qualquer das partes mediante aviso prévio de 30 (trinta) dias corridos, por escrito.
9.2. Havendo pagamentos em aberto até a data da rescisão, a CONTRATANTE se compromete a quitar integralmente os valores devidos correspondentes às fases já entregues.

CLÁUSULA DÉCIMA – DO FORO
Para dirimir quaisquer controvérsias oriundas do presente instrumento, as partes elegem o foro da plataforma Autentique / meio eletrônico para a coleta das assinaturas digitais, ou a Comarca de Londrina/PR.

Por estarem assim justas e contratadas, firmam o presente instrumento.

(Londrina, 24/08/2026)

_________________________________________
Cristiane Peres dos Santos

_________________________________________
Agência Pratic"""


def brl(v):
    return f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--commit", action="store_true", help="Grava no banco (default: dry-run)")
    args = ap.parse_args()
    dry = not args.commit
    tag = "[DRY-RUN] " if dry else "[COMMIT] "

    # --- Cliente ---
    cli = sb.table('clients').select('id,name,status').eq('id', CLIENT_ID).execute().data
    if not cli:
        raise SystemExit(f"Cliente com id={CLIENT_ID} não encontrado.")
    client = cli[0]
    print(f"{tag}Cliente: {client['name']} (id={client['id']}, status={client['status']})")

    # --- Serviço (reaproveita se existir) ---
    existing_svc = sb.table('services').select('id,name,price').eq('name', SERVICE_NAME).execute().data
    if existing_svc:
        service_id = existing_svc[0]['id']
        print(f"{tag}Serviço já existe: {SERVICE_NAME} (id={service_id}) — reaproveitando.")
    else:
        svc_payload = {
            "name": SERVICE_NAME,
            "description": SERVICE_DESCRIPTION,
            "price": SERVICE_PRICE,
            "is_recurring": False,
            "category": SERVICE_CATEGORY,
            "billing_cycle": SERVICE_BILLING_CYCLE,
            "minimum_term": SERVICE_MINIMUM_TERM,
        }
        print(f"{tag}Criar serviço: {SERVICE_NAME} — {brl(SERVICE_PRICE)}")
        if dry:
            service_id = "<novo-service-id>"
        else:
            service_id = sb.table('services').insert(svc_payload).execute().data[0]['id']
            print(f"        -> service_id={service_id}")

    # --- Contrato (evita duplicar cliente+serviço) ---
    if existing_svc:
        dup = sb.table('contracts').select('id').eq('client_id', client['id']).eq('service_id', service_id).execute().data
        if dup:
            raise SystemExit(f"Já existe contrato {client['name']}+{SERVICE_NAME} (id={dup[0]['id']}). Abortando para não duplicar.")

    contract_payload = {
        "client_id": client['id'],
        "service_id": service_id,
        "start_date": START_DATE,
        "end_date": END_DATE,
        "value": CONTRACT_VALUE,
        "auto_renew": AUTO_RENEW,
        "status": "active",
        "document_status": "pending",
        "billing_cycle": SERVICE_BILLING_CYCLE,
        "minimum_term": SERVICE_MINIMUM_TERM,
        "document_content": DOCUMENT_CONTENT,
    }
    print(f"{tag}Criar contrato: {START_DATE} -> {END_DATE} | valor total {brl(CONTRACT_VALUE)} | auto_renew={AUTO_RENEW}")
    if dry:
        contract_id = "<novo-contract-id>"
    else:
        contract_id = sb.table('contracts').insert(contract_payload).execute().data[0]['id']
        print(f"        -> contract_id={contract_id}")

    # --- Faturas (cronograma combinado, valores/datas irregulares) ---
    invoices_payload = []
    total = 0.0
    for i, item in enumerate(INSTALLMENTS):
        total += item["amount"]
        invoices_payload.append({
            "client_id": client['id'],
            "contract_id": contract_id,
            "amount": item["amount"],
            "due_date": item["due_date"],
            "status": "pending",
            "description": f"{client['name']} - {SERVICE_NAME} - {item['label']}",
        })
        print(f"{tag}Criar fatura {i + 1}/{len(INSTALLMENTS)}: venc {item['due_date']} | {brl(item['amount'])} | {item['label']}")

    print(f"{tag}Total das {len(INSTALLMENTS)} faturas: {brl(total)}")
    assert abs(total - CONTRACT_VALUE) < 0.01, "Soma das faturas não bate com o valor do contrato!"

    if not dry:
        sb.table('invoices').insert(invoices_payload).execute()

    # --- Ativar cliente (mesma lógica da tela de criação de contrato) ---
    if client['status'] != 'active':
        print(f"{tag}Atualizar status do cliente: {client['status']} -> active")
        if not dry:
            sb.table('clients').update({"status": "active"}).eq('id', client['id']).execute()

    print("\n" + ("Dry-run concluído — nada foi gravado. Rode com --commit para efetivar."
                  if dry else "Concluído. Serviço, contrato e faturas criados."))


if __name__ == "__main__":
    main()
