import os
import re
import uuid
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# Carregar variáveis de ambiente do .env.local na raiz do projeto
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env.local')
load_dotenv(env_path)

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
# Usando a service role key para criar o usuário no auth e bypass do RLS
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas no .env.local")

# Inicializa o cliente Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def parse_contract_text(file_path: str):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Função auxiliar para limpar colchetes e espaços
    def clean(val):
        if not val: return None
        return val.replace('[', '').replace(']', '').replace('}', '').replace('{', '').strip()

    # 1. Contratante
    contratante_match = re.search(r"CONTRATANTE:\s*\[?([^,\]\n]+)", content)
    name = clean(contratante_match.group(1)) if contratante_match else None

    # 2. CPF/CNPJ
    cnpj_match = re.search(r"sob o n[º°]\s*\[?([\d\.\-\/]+)\]?", content, re.IGNORECASE)
    cnpj = clean(cnpj_match.group(1)) if cnpj_match else None

    # 3. Endereço
    endereco_match = re.search(r"com sede à\s*\[?([^,\]]+)\]?,\s*\[?(\d+)\]?\s*([^,\]]*),\s*na cidade de\s*\[?([^,\]]+)\]?", content)
    address_data = {}
    if endereco_match:
        address_data = {
            "logradouro": clean(endereco_match.group(1)),
            "numero": clean(endereco_match.group(2)),
            "complemento": clean(endereco_match.group(3)),
            "cidade": clean(endereco_match.group(4)),
            "uf": "PR",  # Padrão ou extraído
            "cep": ""
        }
    else:
        # Busca alternativa simplificada para endereços com colchetes tipo "[Rua Pará 1122 sala 73]"
        endereco_alt = re.search(r"com sede à\s*\[?([^,\]\(\)]+)\]?,\s*na cidade de\s*\[?([^,\]]+)\]?", content)
        if endereco_alt:
            address_data = {
                "logradouro": clean(endereco_alt.group(1)),
                "cidade": clean(endereco_alt.group(2)).split('-')[0].strip(),
                "uf": clean(endereco_alt.group(2)).split('-')[-1].strip() if '-' in endereco_alt.group(2) else "PR",
                "numero": "",
                "complemento": "",
                "cep": ""
            }

    # Tentar achar o CEP
    cep_find = re.search(r"CEP\s*\[?([\d\.\-]+)\]?", content, re.IGNORECASE)
    if cep_find and address_data:
        address_data["cep"] = clean(cep_find.group(1))

    # 4. Email
    email_match = re.search(r"e-mail(?:\s+de\s+contato)?\s*(?:de\s*contato)?\s*\[?([a-zA-Z0-9\._%+\-]+@[a-zA-Z0-9\.\-]+\.[a-zA-Z]{2,})\]?", content, re.IGNORECASE)
    email = clean(email_match.group(1)) if email_match else None

    # 5. WhatsApp
    whatsapp_match = re.search(r"WhatsApp\s*\[?\(([^)]+)\)\s*([\d\- ]+)\]?", content)
    phone = ""
    if whatsapp_match:
        phone = f"({whatsapp_match.group(1)}) {whatsapp_match.group(2)}".strip()
    else:
        whatsapp_match_alt = re.search(r"WhatsApp\s*\[?([\d\-\(\) ]+)\]?", content)
        if whatsapp_match_alt:
            phone = clean(whatsapp_match_alt.group(1))

    # 6. Valor Mensal
    valor_match = re.search(r"valor mensal de R\$\s*([\d\.]+(?:,\d{2})?)", content)
    # Se não achar, tenta uma busca mais flexível
    if not valor_match:
        valor_match = re.search(r"pagamento mensal será de R\$\s*([\d\.]+(?:,\d{2})?)", content)
    value = 0.0
    if valor_match:
        raw_val = valor_match.group(1).strip()
        if ',' in raw_val:
            raw_val = raw_val.replace('.', '').replace(',', '.')
        value = float(raw_val)

    # 7. Data de Início e Duração
    data_inicio_match = re.search(r"início em\s*([\d/]+)", content)
    start_date = None
    if data_inicio_match:
        start_date_str = data_inicio_match.group(1).strip()
        start_date = datetime.strptime(start_date_str, "%d/%m/%Y").strftime("%Y-%m-%d")
    else:
        # Tentar achar a data de assinatura no rodapé tipo: (Londrina, 04 de Junho de 2025) ou (Londrina, 13/03/2026)
        assinatura_match = re.search(r"\(\s*Londrina,\s*([^)]+)\)", content, re.IGNORECASE)
        if assinatura_match:
            data_str = clean(assinatura_match.group(1))
            if '/' in data_str:
                start_date = datetime.strptime(data_str, "%d/%m/%Y").strftime("%Y-%m-%d")
            else:
                # Converter data por extenso: "04 de Junho de 2025" -> "2025-06-04"
                meses = {
                    "janeiro": "01", "fevereiro": "02", "março": "03", "abril": "04",
                    "maio": "05", "junho": "06", "julho": "07", "agosto": "08",
                    "setembro": "09", "outubro": "10", "novembro": "11", "dezembro": "12"
                }
                parts = re.split(r"\s+de\s+", data_str, flags=re.IGNORECASE)
                if len(parts) == 3:
                    dia = f"{int(parts[0]):02d}"
                    mes = meses.get(parts[1].lower().strip(), "01")
                    ano = parts[2].strip()
                    start_date = f"{ano}-{mes}-{dia}"

    duracao_match = re.search(r"vigência\s*(?:inicial)?\s*de\s*\[?(\d+)\s*(?:mes|meses)\]?", content, re.IGNORECASE)
    duration_months = 3  # padrão
    if duracao_match:
        duration_months = int(duracao_match.group(1))

    return {
        "name": name,
        "cnpj": cnpj,
        "email": email,
        "phone": phone,
        "address": address_data,
        "value": value,
        "start_date": start_date,
        "duration_months": duration_months,
        "tipo_pessoa": "PF" if len(re.sub(r"\D", "", cnpj or "")) == 11 else "PJ"
    }

def get_or_create_service():
    # Busca um serviço padrão de Gestão de Redes Sociais ou cria um se não existir
    res = supabase.table("services").select("id, name").eq("name", "Gestão de Redes Sociais").execute()
    if res.data and len(res.data) > 0:
        return res.data[0]["id"]
    
    # Se não existe, cria
    insert_res = supabase.table("services").insert({
        "name": "Gestão de Redes Sociais",
        "description": "Desenvolvimento e execução de ações estratégicas de comunicação digital, criação de posts e monitoramento.",
        "descriptive": "Gestão estratégica de Redes Sociais incluindo planejamento, criação de conteúdo, captação e relatórios de métricas.",
        "category": "Marketing",
        "price": 580.00,
        "is_recurring": True,
        "billing_cycle": "monthly",
        "minimum_term": 3,
        "default_posts_per_week": 2,
        "default_content_capture": True,
        "default_capture_frequency": "1 meia diária"
    }).execute()
    return insert_res.data[0]["id"]

def import_contract_to_supabase(data):
    print(f"Iniciando importação para: {data['name']}")
    
    # 1. Verificar se o cliente já existe pelo e-mail ou CNPJ
    client_res = supabase.table("clients").select("id").eq("email", data["email"]).execute()
    client_id = None
    
    if client_res.data and len(client_res.data) > 0:
        client_id = client_res.data[0]["id"]
        print(f"Cliente já existe com ID: {client_id}. Atualizando dados...")
        # Atualiza o cliente existente
        supabase.table("clients").update({
            "name": data["name"],
            "cnpj": data["cnpj"],
            "phone": data["phone"],
            "contact_name": data["name"],
            "address": data["address"],
            "status": "active",
            "onboarding_date": f"{data['start_date']}T12:00:00Z"
        }).eq("id", client_id).execute()
    else:
        # Criar usuário no Supabase Auth usando o Admin API da SDK
        # Como o auth.admin requer privilégios de service role, ele funcionará perfeitamente
        portal_password = f"Pratic@{uuid.uuid4().hex[:6].upper()}"
        print(f"Criando novo usuário no Auth com e-mail {data['email']} e senha {portal_password}...")
        
        try:
            auth_user = supabase.auth.admin.create_user({
                "email": data["email"],
                "password": portal_password,
                "email_confirm": True
            })
            client_id = auth_user.user.id
        except Exception as e:
            print(f"Erro ao criar usuário no auth via SDK: {e}. Tentando gerar UUID local para fins de teste...")
            client_id = str(uuid.uuid4())
        
        # Criar na tabela clients
        supabase.table("clients").insert({
            "id": client_id,
            "name": data["name"],
            "nome_fantasia": data["name"].split()[0], # primeiro nome como fantasia se PJ for PF ou reduzido
            "cnpj": data["cnpj"],
            "email": data["email"],
            "portal_email": data["email"],
            "portal_password": portal_password,
            "phone": data["phone"],
            "contact_name": data["name"],
            "address": data["address"],
            "tipo_pessoa": data["tipo_pessoa"],
            "status": "active",
            "onboarding_date": f"{data['start_date']}T12:00:00Z"
        }).execute()
        print(f"Cliente criado na tabela clients com ID: {client_id}")

    # 2. Obter ID do Serviço
    service_id = get_or_create_service()

    # 3. Calcular data de término do contrato
    start_dt = datetime.strptime(data["start_date"], "%Y-%m-%d")
    # Adicionar duração em meses
    from dateutil.relativedelta import relativedelta
    end_dt = start_dt + relativedelta(months=data["duration_months"])
    end_date = end_dt.strftime("%Y-%m-%d")

    # 4. Inserir Contrato
    contract_res = supabase.table("contracts").insert({
        "client_id": client_id,
        "service_id": service_id,
        "start_date": data["start_date"],
        "end_date": end_date,
        "value": data["value"],
        "auto_renew": True,
        "status": "active",
        "document_status": "signed"  # Como é um contrato antigo e assinado
    }).execute()
    
    contract_id = contract_res.data[0]["id"]
    print(f"Contrato criado com ID: {contract_id} (Vigência: {data['start_date']} até {end_date})")

    # 5. Inserir Faturas correspondentes à vigência
    invoices = []
    # O primeiro vencimento geralmente é próximo à data do contrato ou dia 10 do mês seguinte
    # Com base na Cláusula 5.2: "vencimento até o dia 10 de cada mês"
    # Vamos gerar vencimentos para o dia 10 dos meses correspondentes da vigência
    for i in range(data["duration_months"]):
        # Calcular o vencimento
        due_dt = start_dt + relativedelta(months=i)
        # Ajusta para o dia 10 do mês correspondente
        due_date_str = f"{due_dt.year}-{due_dt.month:02d}-10"
        
        invoices.append({
            "client_id": client_id,
            "contract_id": contract_id,
            "amount": data["value"],
            "due_date": due_date_str,
            "status": "pending",
            "description": f"{data['name']} - Gestão de Redes Sociais - Parcela {i+1}/{data['duration_months']}"
        })

    supabase.table("invoices").insert(invoices).execute()
    print(f"Geradas {len(invoices)} faturas associadas a este contrato.")
    print("Importação concluída com sucesso!\n")

if __name__ == "__main__":
    import sys
    
    # Caminho do contrato de exemplo
    default_contract_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "src", "components", "Contrato Pratic [Luane Aparecida Ferreira Lopes] - Gestão Redes Sociais.txt"
    )
    
    path = sys.argv[1] if len(sys.argv) > 1 else default_contract_path
    
    if not os.path.exists(path):
        print(f"Erro: Arquivo não encontrado no caminho: {path}")
        sys.exit(1)
        
    print(f"Lendo contrato de: {path}...")
    extracted_data = parse_contract_text(path)
    
    print("Dados extraídos do contrato:")
    for k, v in extracted_data.items():
        print(f"  {k}: {v}")
    print("-" * 40)
    
    import_contract_to_supabase(extracted_data)
