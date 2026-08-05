"""
Cria o serviço "Gestão de Redes Sociais + Imagens com IA" e o contrato + 3
faturas mensais da JBF-ATACADO E VAREJO LTDA (nome fantasia "COLD COMERCIO",
cliente já cadastrado, status prospect).

Contexto: pacote recorrente de gestão de redes sociais e imagens com IA.
Entregas mensais de 8 posts, material digital, atualização de portfólio e
uma coleção de imagens com IA por mês. Vigência de 3 meses, valor mensal de
R$2.000, vencimento sempre no dia 20 (1º vencimento em 20/09/2026).

Uso:
  python3 scripts/create_cold_joias_contract.py            # dry-run (não grava)
  python3 scripts/create_cold_joias_contract.py --commit   # grava no banco

Idempotente: reaproveita o serviço se já existir pelo nome e não duplica o
contrato cliente+serviço se já houver um.
"""

import os
import argparse
from datetime import date
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
CLIENT_ID = "e8b0997f-05ca-4f38-a430-1c1258340e8c"  # JBF-ATACADO E VAREJO LTDA (COLD COMERCIO)

SERVICE_NAME = "Gestão de Redes Sociais + Imagens com IA"
SERVICE_DESCRIPTION = (
    "Gestão de redes sociais e produção de imagens com Inteligência Artificial. "
    "Entregas mensais: 8 posts, material digital, atualização de portfólio e uma "
    "coleção de imagens geradas com IA."
)
SERVICE_PRICE = 2000.0
SERVICE_CATEGORY = "Marketing"       # segue convenção dos serviços "Gestão de Redes Sociais" existentes
SERVICE_BILLING_CYCLE = "monthly"
SERVICE_MINIMUM_TERM = 3
SERVICE_POSTS_PER_WEEK = 2           # 8 posts/mês

START_DATE = "2026-08-04"            # hoje — início da vigência
END_DATE = "2026-11-04"              # start + 3 meses
CONTRACT_VALUE = 2000.0              # valor mensal
AUTO_RENEW = True

FIRST_DUE_DATE = date(2026, 9, 20)
NUM_INSTALLMENTS = 3
INSTALLMENT_AMOUNT = 2000.0


def brl(v):
    return f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def add_months(d: date, months: int) -> date:
    month = d.month - 1 + months
    year = d.year + month // 12
    month = month % 12 + 1
    day = min(d.day, [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28,
                       31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
    return date(year, month, day)


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
            "is_recurring": True,
            "category": SERVICE_CATEGORY,
            "billing_cycle": SERVICE_BILLING_CYCLE,
            "minimum_term": SERVICE_MINIMUM_TERM,
            "default_posts_per_week": SERVICE_POSTS_PER_WEEK,
            "default_content_capture": False,
            "default_capture_frequency": None,
        }
        print(f"{tag}Criar serviço: {SERVICE_NAME} — {brl(SERVICE_PRICE)}/mês")
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
        "posts_per_week": SERVICE_POSTS_PER_WEEK,
        "content_capture": False,
        "capture_frequency": None,
    }
    print(f"{tag}Criar contrato: {START_DATE} -> {END_DATE} | valor mensal {brl(CONTRACT_VALUE)} | auto_renew={AUTO_RENEW}")
    if dry:
        contract_id = "<novo-contract-id>"
    else:
        contract_id = sb.table('contracts').insert(contract_payload).execute().data[0]['id']
        print(f"        -> contract_id={contract_id}")

    # --- Faturas mensais ---
    invoices_payload = []
    for i in range(NUM_INSTALLMENTS):
        due = add_months(FIRST_DUE_DATE, i)
        invoices_payload.append({
            "client_id": client['id'],
            "contract_id": contract_id,
            "amount": INSTALLMENT_AMOUNT,
            "due_date": due.isoformat(),
            "status": "pending",
            "description": f"{client['name']} - {SERVICE_NAME} - Parcela {i + 1}/{NUM_INSTALLMENTS}",
        })
        print(f"{tag}Criar fatura {i + 1}/{NUM_INSTALLMENTS}: venc {due.isoformat()} | {brl(INSTALLMENT_AMOUNT)} | status=pending")

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
