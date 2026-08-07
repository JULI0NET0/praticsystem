"""
Reativa a cliente Thamires Hoffmann Seregni Érnica com um novo contrato de
gestão de redes sociais simples, reaproveitando o serviço já existente
"Gestão de Redes Sociais" (2 posts/semana, captação de 1 meia diária
conforme a necessidade, vigência mínima 3 meses).

Contexto: cliente estava inativa desde a expiração do contrato anterior
(04/2025-07/2025, R$500/mês). Novo contrato: 3 meses a R$800/mês, início
segunda-feira 10/08/2026, com auto-renovação ao final do período.

Uso:
  python3 scripts/reactivate_thamires_contract.py            # dry-run (não grava)
  python3 scripts/reactivate_thamires_contract.py --commit   # grava no banco

Idempotente: não cria um novo serviço (reaproveita o existente) e não
duplica o contrato se já houver um contrato ATIVO cliente+serviço.
Contratos expirados/antigos não bloqueiam a reativação.
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
# Parâmetros do contrato
# ---------------------------------------------------------------------------
CLIENT_ID = "399eee35-77ca-4d2d-944c-48f7e7df1c12"   # Thamires Hoffmann Seregni Érnica
SERVICE_ID = "cfa30014-80c6-4305-b323-b9bdd354ad6e"  # "Gestão de Redes Sociais" (2 posts/sem, 1 meia diária, min. 3 meses)

START_DATE = "2026-08-10"   # segunda-feira — reativação
END_DATE = "2026-11-10"     # start + 3 meses
CONTRACT_VALUE = 800.0      # valor mensal negociado
AUTO_RENEW = True
POSTS_PER_WEEK = 2
CONTENT_CAPTURE = True
CAPTURE_FREQUENCY = "1 meia diária"

FIRST_DUE_DATE = date(2026, 9, 10)
NUM_INSTALLMENTS = 3
INSTALLMENT_AMOUNT = 800.0


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

    # --- Serviço (reaproveitado, sem criar novo) ---
    svc = sb.table('services').select('id,name,price').eq('id', SERVICE_ID).execute().data
    if not svc:
        raise SystemExit(f"Serviço com id={SERVICE_ID} não encontrado.")
    service = svc[0]
    print(f"{tag}Serviço reaproveitado: {service['name']} (id={service['id']}, preço tabela={brl(service['price'])})")

    # --- Contrato (evita duplicar apenas se já houver contrato ATIVO cliente+serviço) ---
    dup = sb.table('contracts').select('id,status').eq('client_id', client['id']).eq('service_id', service['id']).eq('status', 'active').execute().data
    if dup:
        raise SystemExit(f"Já existe contrato ATIVO {client['name']}+{service['name']} (id={dup[0]['id']}). Abortando para não duplicar.")

    contract_payload = {
        "client_id": client['id'],
        "service_id": service['id'],
        "start_date": START_DATE,
        "end_date": END_DATE,
        "value": CONTRACT_VALUE,
        "auto_renew": AUTO_RENEW,
        "status": "active",
        "document_status": "pending",
        "billing_cycle": "monthly",
        "minimum_term": 3,
        "posts_per_week": POSTS_PER_WEEK,
        "content_capture": CONTENT_CAPTURE,
        "capture_frequency": CAPTURE_FREQUENCY,
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
            "description": f"{client['name']} - {service['name']} - Parcela {i + 1}/{NUM_INSTALLMENTS}",
        })
        print(f"{tag}Criar fatura {i + 1}/{NUM_INSTALLMENTS}: venc {due.isoformat()} | {brl(INSTALLMENT_AMOUNT)} | status=pending")

    if not dry:
        sb.table('invoices').insert(invoices_payload).execute()

    # --- Reativar cliente ---
    if client['status'] != 'active':
        print(f"{tag}Atualizar status do cliente: {client['status']} -> active")
        if not dry:
            sb.table('clients').update({"status": "active"}).eq('id', client['id']).execute()

    print("\n" + ("Dry-run concluído — nada foi gravado. Rode com --commit para efetivar."
                  if dry else "Concluído. Contrato e faturas criados, cliente reativada."))


if __name__ == "__main__":
    main()
