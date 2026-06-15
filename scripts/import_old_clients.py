"""
Importa os clientes antigos (inativos de 2025) para o sistema,
buscando cobranças e pagamentos já realizados no Asaas via CPF/CNPJ.

Uso:
  cd scripts
  python import_old_clients.py

  # Para importar apenas um cliente específico pelo CPF/CNPJ:
  python import_old_clients.py --cpf 12015509984
"""

import os
import uuid
import argparse
import requests
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env.local')
load_dotenv(env_path)

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
ASAAS_API_KEY = os.environ.get("ASAAS_API_KEY")
ASAAS_BASE_URL = os.environ.get("ASAAS_BASE_URL", "https://api.asaas.com/v3")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas no .env.local")
if not ASAAS_API_KEY:
    raise ValueError("ASAAS_API_KEY não encontrada no .env.local")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
asaas_headers = {"access_token": ASAAS_API_KEY, "Content-Type": "application/json"}

# ---------------------------------------------------------------------------
# Dados dos clientes antigos extraídos dos contratos em CLIENTES ANTIGOS
# ---------------------------------------------------------------------------
OLD_CLIENTS = [
    {
        "name": "Luanee Aparecida Ferreira Lopes",
        "nome_fantasia": "Luanee Aparecida",
        "cpf_cnpj": "12015509984",
        "tipo_pessoa": "PF",
        "email": None,  # preencher se souber
        "phone": None,
        "address": {},
        "contract_value": None,
        "contract_start": None,
        "contract_duration_months": None,
        "due_day": 10,
        "notes": "Importado via CPF do Asaas - cliente mencionado pelo usuário",
    },
    {
        "name": "Thamires Hoffmann Seregni Érnica",
        "nome_fantasia": "Thamires Hoffmann",
        "cpf_cnpj": "10806462990",
        "tipo_pessoa": "PF",
        "email": "thamires.hoffmann@hotmail.com",
        "phone": None,
        "address": {
            "logradouro": "Av Rio de Janeiro",
            "numero": "1500",
            "complemento": "Sala 403",
            "cidade": "Londrina",
            "uf": "PR",
            "cep": "",
            "bairro": "",
        },
        "contract_value": 500.00,
        "contract_start": "2025-04-01",
        "contract_duration_months": 3,
        "due_day": 10,
        "notes": "Contrato Social Media - 2x/semana + 8 artes/mês",
    },
    {
        "name": "Charlene Reis",
        "nome_fantasia": "Charlene Reis",
        "cpf_cnpj": "04568321905",
        "tipo_pessoa": "PF",
        "email": "charlenereiseventos@gmail.com",
        "phone": "(43) 99146-3018",
        "address": {
            "logradouro": "Rua Dom João VI",
            "numero": "450",
            "complemento": "",
            "cidade": "Londrina",
            "uf": "PR",
            "cep": "86038-090",
            "bairro": "",
        },
        "contract_value": 1500.00,
        "contract_start": "2025-04-09",
        "contract_duration_months": 3,
        "due_day": 15,
        "notes": "Contrato Social Media - 3x/semana FB/IG/TikTok + 12 artes/mês",
    },
    {
        "name": "Carla Flaviane Sanches",
        "nome_fantasia": "Ótica Pioneiros",
        "cpf_cnpj": "05501659913",
        "tipo_pessoa": "PF",
        "email": "oticapioneiros@gmail.com",
        "phone": None,
        "address": {
            "logradouro": "Avenida dos Pioneiros",
            "numero": "2155",
            "complemento": "Sala 03",
            "cidade": "Londrina",
            "uf": "PR",
            "cep": "",
            "bairro": "",
        },
        "contract_value": 1000.00,
        "contract_start": "2025-01-15",
        "contract_duration_months": 3,
        "due_day": 10,
        "notes": "Contrato Social Media - 2x/semana FB/IG + 8-10 artes/mês",
    },
    {
        "name": "Click Iluminação Ltda.",
        "nome_fantasia": "Iluminar",
        "cpf_cnpj": "06293416000121",
        "tipo_pessoa": "PJ",
        "email": "comunicacao@iluminar.com.br",
        "phone": "(31) 3589-1400",
        "address": {
            "logradouro": "Av. Benedito Alves Nazareth",
            "numero": "883",
            "complemento": "",
            "cidade": "Nova Lima",
            "uf": "MG",
            "cep": "34012-290",
            "bairro": "Campo do Pires",
        },
        "contract_value": 1250.00,
        "contract_start": "2026-01-15",
        "contract_duration_months": 6,
        "due_day": 10,
        "notes": "Produção de imagens 3D/IA - contrato encerrado",
    },
    {
        "name": "Instituto de Tricologia e Transplante Capilar Ltda.",
        "nome_fantasia": "Instituto de Tricologia",
        "cpf_cnpj": "32775922000167",
        "tipo_pessoa": "PJ",
        "email": "clinicadetricologiaapucarana@gmail.com",
        "phone": "(43) 996368149",
        "address": {
            "logradouro": "Rua Miguel Simião",
            "numero": "364",
            "complemento": "Sala 2",
            "cidade": "Apucarana",
            "uf": "PR",
            "cep": "",
            "bairro": "",
        },
        "contract_value": 3900.00,
        "contract_start": "2025-11-28",
        "contract_duration_months": 3,
        "due_day": 10,
        "notes": "Gestão de Redes Sociais - 48 conteúdos/mês + captação",
    },
    {
        "name": "Rafaela Sobral Jacinto Cruz",
        "nome_fantasia": "Unik By Rafaela Sobral",
        "cpf_cnpj": "00669753955",  # CPF real — contrato indicava PJ mas no Asaas é PF
        "tipo_pessoa": "PF",
        "email": "unikbyrs@gmail.com",
        "phone": "(43) 996044568",
        "address": {
            "logradouro": "Av José Gabriel de Oliveira",
            "numero": "685",
            "complemento": "",
            "cidade": "Londrina",
            "uf": "PR",
            "cep": "",
            "bairro": "",
        },
        "contract_value": 1200.00,
        "contract_start": "2025-11-28",
        "contract_duration_months": 3,
        "due_day": 10,
        "notes": "Gestão de Redes Sociais - CPF obtido via Asaas (email: unikbyrs@gmail.com)",
    },
]

# ---------------------------------------------------------------------------
# Helpers Asaas
# ---------------------------------------------------------------------------

def asaas_get_customer_by_cpf_cnpj(cpf_cnpj: str):
    """Busca o cliente no Asaas pelo CPF ou CNPJ (apenas dígitos)."""
    clean = "".join(c for c in cpf_cnpj if c.isdigit())
    r = requests.get(
        f"{ASAAS_BASE_URL}/customers",
        headers=asaas_headers,
        params={"cpfCnpj": clean},
        timeout=30,
    )
    r.raise_for_status()
    data = r.json().get("data", [])
    return data[0] if data else None


def asaas_get_all_payments(customer_id: str):
    """Retorna todos os pagamentos do cliente no Asaas (paginado)."""
    payments = []
    offset = 0
    limit = 100
    while True:
        r = requests.get(
            f"{ASAAS_BASE_URL}/payments",
            headers=asaas_headers,
            params={"customer": customer_id, "offset": offset, "limit": limit},
            timeout=30,
        )
        r.raise_for_status()
        body = r.json()
        payments.extend(body.get("data", []))
        if not body.get("hasMore"):
            break
        offset += limit
    return payments

# ---------------------------------------------------------------------------
# Helpers Supabase
# ---------------------------------------------------------------------------

def map_asaas_status_to_invoice(asaas_status: str) -> str:
    paid_statuses = {"RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"}
    overdue_statuses = {"OVERDUE"}
    if asaas_status in paid_statuses:
        return "paid"
    if asaas_status in overdue_statuses:
        return "overdue"
    return "pending"


def get_or_create_service(name: str = "Gestão de Redes Sociais") -> str:
    res = supabase.table("services").select("id").eq("name", name).execute()
    if res.data:
        return res.data[0]["id"]
    insert_res = supabase.table("services").insert({
        "name": name,
        "description": "Desenvolvimento e execução de ações estratégicas de comunicação digital.",
        "category": "Marketing",
        "price": 0,
        "is_recurring": True,
        "billing_cycle": "monthly",
        "minimum_term": 3,
    }).execute()
    return insert_res.data[0]["id"]


def upsert_client(data: dict) -> str:
    """Cria ou atualiza o cliente na tabela clients. Retorna o UUID do cliente."""
    # Tenta encontrar pelo email ou CPF/CNPJ
    existing_id = None

    if data.get("email"):
        res = supabase.table("clients").select("id").eq("email", data["email"]).execute()
        if res.data:
            existing_id = res.data[0]["id"]

    if not existing_id and data.get("cpf_cnpj"):
        clean_doc = "".join(c for c in data["cpf_cnpj"] if c.isdigit())
        res = supabase.table("clients").select("id").eq("cnpj", clean_doc).execute()
        if res.data:
            existing_id = res.data[0]["id"]

    onboarding_date = data.get("contract_start")
    if onboarding_date:
        onboarding_date = f"{onboarding_date}T12:00:00Z"

    client_payload = {
        "name": data["name"],
        "nome_fantasia": data.get("nome_fantasia") or data["name"].split()[0],
        "cnpj": "".join(c for c in (data.get("cpf_cnpj") or "")) if data.get("cpf_cnpj") else None,
        "tipo_pessoa": data["tipo_pessoa"],
        "email": data.get("email"),
        "portal_email": data.get("email"),
        "phone": data.get("phone") or "",
        "contact_name": data["name"],
        "address": data.get("address") or {},
        "status": "inactive",
        "onboarding_date": onboarding_date,
    }

    if existing_id:
        print(f"  Cliente já existe (ID: {existing_id}). Atualizando para inativo...")
        supabase.table("clients").update(client_payload).eq("id", existing_id).execute()
        return existing_id

    # Cria usuário no Auth para ter um ID válido
    portal_password = f"Pratic@{uuid.uuid4().hex[:6].upper()}"
    try:
        if data.get("email"):
            auth_user = supabase.auth.admin.create_user({
                "email": data["email"],
                "password": portal_password,
                "email_confirm": True,
            })
            client_id = auth_user.user.id
        else:
            client_id = str(uuid.uuid4())
    except Exception as e:
        print(f"  Aviso ao criar auth user: {e}. Gerando UUID local.")
        client_id = str(uuid.uuid4())

    client_payload["id"] = client_id
    client_payload["portal_password"] = portal_password
    supabase.table("clients").insert(client_payload).execute()
    print(f"  Cliente criado com ID: {client_id}")
    return client_id


def upsert_contract(client_id: str, service_id: str, data: dict) -> str | None:
    """Cria o contrato histórico se houver data de início."""
    if not data.get("contract_start") or not data.get("contract_value"):
        return None

    from dateutil.relativedelta import relativedelta
    start_dt = datetime.strptime(data["contract_start"], "%Y-%m-%d")
    duration = data.get("contract_duration_months", 3)
    end_dt = start_dt + relativedelta(months=duration)

    res = supabase.table("contracts").insert({
        "client_id": client_id,
        "service_id": service_id,
        "start_date": data["contract_start"],
        "end_date": end_dt.strftime("%Y-%m-%d"),
        "value": data["contract_value"],
        "auto_renew": False,
        "status": "expired",
        "document_status": "signed",
    }).execute()

    contract_id = res.data[0]["id"]
    print(f"  Contrato criado: {data['contract_start']} → {end_dt.strftime('%Y-%m-%d')} (ID: {contract_id})")
    return contract_id


def sync_payments(client_id: str, contract_id: str | None, asaas_payments: list, data: dict):
    """Cria invoices e asaas_transactions para cada pagamento encontrado no Asaas."""
    if not asaas_payments:
        print("  Nenhum pagamento encontrado no Asaas.")
        return

    for p in asaas_payments:
        invoice_status = map_asaas_status_to_invoice(p.get("status", ""))
        due_date = p.get("dueDate") or p.get("dateCreated", "")[:10]

        # Verifica se já existe invoice linkado a este pagamento Asaas
        existing = supabase.table("asaas_transactions").select("invoice_id").eq("id", p["id"]).execute()
        if existing.data and existing.data[0].get("invoice_id"):
            print(f"  Pagamento {p['id']} já vinculado. Pulando.")
            continue

        # Cria o invoice
        inv_res = supabase.table("invoices").insert({
            "client_id": client_id,
            "contract_id": contract_id,
            "amount": p.get("value", 0),
            "due_date": due_date,
            "status": invoice_status,
            "description": p.get("description") or f"Mensalidade - {data['nome_fantasia']}",
            "paid_at": p.get("paymentDate") or (due_date if invoice_status == "paid" else None),
        }).execute()
        invoice_id = inv_res.data[0]["id"]

        # Upsert na tabela asaas_transactions
        supabase.table("asaas_transactions").upsert({
            "id": p["id"],
            "description": p.get("description"),
            "value": p.get("value", 0),
            "type": "CREDIT",
            "date": due_date,
            "status": p.get("status", ""),
            "invoice_id": invoice_id,
            "synced_at": datetime.utcnow().isoformat() + "Z",
        }).execute()

        status_label = "PAGO" if invoice_status == "paid" else invoice_status.upper()
        print(f"  [{status_label}] R$ {p.get('value', 0):.2f} venc. {due_date} → invoice {invoice_id}")

# ---------------------------------------------------------------------------
# Importação principal
# ---------------------------------------------------------------------------

def import_client(data: dict):
    name = data["name"]
    print(f"\n{'='*60}")
    print(f"Importando: {name}")
    print(f"{'='*60}")

    # 1. Busca no Asaas
    asaas_customer = None
    asaas_payments = []

    if data.get("cpf_cnpj"):
        print(f"  Buscando no Asaas pelo doc: {data['cpf_cnpj']}...")
        try:
            asaas_customer = asaas_get_customer_by_cpf_cnpj(data["cpf_cnpj"])
            if asaas_customer:
                print(f"  Encontrado no Asaas: {asaas_customer['name']} (ID: {asaas_customer['id']})")
                asaas_payments = asaas_get_all_payments(asaas_customer["id"])
                print(f"  {len(asaas_payments)} pagamento(s) encontrado(s) no Asaas")

                # Preenche email/phone com dados do Asaas se não tiver no contrato
                if not data.get("email") and asaas_customer.get("email"):
                    data["email"] = asaas_customer["email"]
                if not data.get("phone") and (asaas_customer.get("mobilePhone") or asaas_customer.get("phone")):
                    data["phone"] = asaas_customer.get("mobilePhone") or asaas_customer.get("phone")
            else:
                print(f"  Não encontrado no Asaas.")
        except Exception as e:
            print(f"  Erro ao consultar Asaas: {e}")
    else:
        print("  CPF/CNPJ não disponível — pulando lookup no Asaas.")

    # 2. Cria/atualiza cliente
    client_id = upsert_client(data)

    # 3. Cria contrato
    service_id = get_or_create_service()
    contract_id = upsert_contract(client_id, service_id, data)

    # 4. Sincroniza pagamentos do Asaas
    sync_payments(client_id, contract_id, asaas_payments, data)

    print(f"  Concluído: {name}")


def main():
    parser = argparse.ArgumentParser(description="Importa clientes antigos com histórico do Asaas")
    parser.add_argument("--cpf", help="Importa apenas o cliente com este CPF/CNPJ (somente dígitos)")
    args = parser.parse_args()

    targets = OLD_CLIENTS
    if args.cpf:
        clean = "".join(c for c in args.cpf if c.isdigit())
        targets = [c for c in OLD_CLIENTS if c.get("cpf_cnpj") and "".join(d for d in c["cpf_cnpj"] if d.isdigit()) == clean]
        if not targets:
            # Permite importar um CPF qualquer não listado (buscando só no Asaas)
            print(f"CPF/CNPJ {args.cpf} não encontrado na lista pré-definida.")
            print("Tentando importar direto do Asaas...")
            targets = [{
                "name": "Cliente Asaas",
                "nome_fantasia": "Cliente Asaas",
                "cpf_cnpj": clean,
                "tipo_pessoa": "PF" if len(clean) == 11 else "PJ",
                "email": None,
                "phone": None,
                "address": {},
                "contract_value": None,
                "contract_start": None,
                "contract_duration_months": None,
                "due_day": 10,
                "notes": f"Importado via CPF/CNPJ {clean}",
            }]

    print(f"\nImportando {len(targets)} cliente(s)...\n")

    for client_data in targets:
        try:
            import_client(client_data)
        except Exception as e:
            print(f"ERRO ao importar {client_data['name']}: {e}")
            import traceback
            traceback.print_exc()

    print(f"\n{'='*60}")
    print("Importação finalizada!")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
