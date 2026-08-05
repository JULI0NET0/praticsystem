"""
Cria o serviço avulso "Pack de Artes para Eventos" e o contrato + fatura única
da FUNCART (cliente já cadastrado, status prospect).

Contexto: pacote avulso de 10 artes digitais para divulgação de eventos.
Entrega e cobrança em setembro/2026; período de uso nov-dez/2026.

Uso:
  python3 scripts/create_funcart_artes_contract.py            # dry-run (não grava)
  python3 scripts/create_funcart_artes_contract.py --commit   # grava no banco

Idempotente: reaproveita o serviço se já existir pelo nome e não duplica o
contrato Funcart+serviço se já houver um.
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
SERVICE_NAME = "Pack de Artes para Eventos"
SERVICE_DESCRIPTION = (
    "Pacote avulso de 10 artes digitais personalizadas para divulgação de eventos. "
    "Mix de peças escolhido pelo cliente entre: banners, artes de ingresso, flyers, "
    "posts de feed, stories, artes para WhatsApp e painel para fotos. "
    "Até 2 rodadas de revisão por arte. Entrega em PNG de alta resolução via link "
    "de pasta compartilhada. Impressão gráfica NÃO inclusa."
)
SERVICE_PRICE = 549.90
SERVICE_CATEGORY = "Marketing"      # segue categorias existentes no sistema
SERVICE_BILLING_CYCLE = "monthly"   # convenção do sistema (avulso via is_recurring=False)

CLIENT_MATCH = "funcart"            # ilike no name
START_DATE = "2026-09-01"           # início do alinhamento/produção
END_DATE = "2026-09-30"            # entrega final das artes
DUE_DATE = "2026-09-30"            # cobrança única — último dia de setembro
CONTRACT_VALUE = 549.90


def brl(v):
    return f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--commit", action="store_true", help="Grava no banco (default: dry-run)")
    args = ap.parse_args()
    dry = not args.commit
    tag = "[DRY-RUN] " if dry else "[COMMIT] "

    # --- Cliente ---
    cli = sb.table('clients').select('id,name,status').ilike('name', f'%{CLIENT_MATCH}%').execute().data
    if not cli:
        raise SystemExit("Cliente Funcart não encontrado.")
    if len(cli) > 1:
        raise SystemExit(f"Mais de um cliente casou com '{CLIENT_MATCH}': {[c['name'] for c in cli]}")
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
            "minimum_term": 0,
            "default_posts_per_week": 0,
            "default_content_capture": False,
            "default_capture_frequency": None,
        }
        print(f"{tag}Criar serviço avulso: {SERVICE_NAME} — {brl(SERVICE_PRICE)}")
        if dry:
            service_id = "<novo-service-id>"
        else:
            service_id = sb.table('services').insert(svc_payload).execute().data[0]['id']
            print(f"        -> service_id={service_id}")

    # --- Contrato (evita duplicar Funcart+serviço) ---
    if existing_svc:
        dup = sb.table('contracts').select('id').eq('client_id', client['id']).eq('service_id', service_id).execute().data
        if dup:
            raise SystemExit(f"Já existe contrato Funcart+{SERVICE_NAME} (id={dup[0]['id']}). Abortando para não duplicar.")

    contract_payload = {
        "client_id": client['id'],
        "service_id": service_id,
        "start_date": START_DATE,
        "end_date": END_DATE,
        "value": CONTRACT_VALUE,
        "auto_renew": False,
        "status": "active",
        "document_status": "pending",
        "billing_cycle": SERVICE_BILLING_CYCLE,
        "minimum_term": 0,
        "posts_per_week": 0,
        "content_capture": False,
        "capture_frequency": None,
    }
    print(f"{tag}Criar contrato: {START_DATE} -> {END_DATE} | valor {brl(CONTRACT_VALUE)} | auto_renew=False")
    if dry:
        contract_id = "<novo-contract-id>"
    else:
        contract_id = sb.table('contracts').insert(contract_payload).execute().data[0]['id']
        print(f"        -> contract_id={contract_id}")

    # --- Fatura única ---
    invoice_payload = {
        "client_id": client['id'],
        "contract_id": contract_id,
        "amount": CONTRACT_VALUE,
        "due_date": DUE_DATE,
        "status": "pending",
        "description": f"{client['name']} - {SERVICE_NAME} - Parcela única",
    }
    print(f"{tag}Criar fatura única: venc {DUE_DATE} | {brl(CONTRACT_VALUE)} | status=pending")
    if not dry:
        sb.table('invoices').insert(invoice_payload).execute()

    # --- Ativar cliente (mesma lógica da tela de criação de contrato) ---
    if client['status'] != 'active':
        print(f"{tag}Atualizar status do cliente: {client['status']} -> active")
        if not dry:
            sb.table('clients').update({"status": "active"}).eq('id', client['id']).execute()

    print("\n" + ("Dry-run concluído — nada foi gravado. Rode com --commit para efetivar."
                  if dry else "Concluído. Serviço, contrato e fatura criados."))


if __name__ == "__main__":
    main()
