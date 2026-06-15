"""
Cria contratos e faturas mensais recorrentes para os 7 clientes ativos.

Uso:
  cd /path/to/project
  python3 scripts/create_client_services.py

  # Apenas um cliente específico (nome fantasia parcial):
  python3 scripts/create_client_services.py --cliente Recloset

  # Apenas criar contratos, sem gerar faturas:
  python3 scripts/create_client_services.py --only-contracts

  # Gerar N meses a partir de hoje:
  python3 scripts/create_client_services.py --meses 12

  # Dry-run (nenhuma alteração no banco):
  python3 scripts/create_client_services.py --dry-run
"""

import os
import uuid
import argparse
from datetime import date
from dateutil.relativedelta import relativedelta
from dotenv import load_dotenv
from supabase import create_client, Client

env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env.local')
load_dotenv(env_path)

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas no .env.local")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ---------------------------------------------------------------------------
# Configuração dos 7 clientes ativos
# ---------------------------------------------------------------------------
CLIENTS_CONFIG = [
    {
        "nome_fantasia": "Recloset",
        "service_name": "Gestão de Redes Sociais COMPLETA",
        "value": 2300.00,
        "due_day": 10,
        "posts_per_week": 3,
        "content_capture": True,
        "capture_frequency": "1x meia-diária",
        "billing_cycle": "monthly",
    },
    {
        "nome_fantasia": "Looom",
        "service_name": "Gestão de Redes Sociais COMPLETA",
        "value": 2500.00,
        "due_day": 10,
        "posts_per_week": 3,
        "content_capture": True,
        "capture_frequency": "1x meia-diária",
        "billing_cycle": "monthly",
    },
    {
        "nome_fantasia": "Be Epic",
        "service_name": "Gestão de Redes Sociais COMPLETA",
        "value": 2150.00,
        "due_day": 10,
        "posts_per_week": 3,
        "content_capture": True,
        "capture_frequency": "1x meia-diária",
        "billing_cycle": "monthly",
    },
    {
        "nome_fantasia": "Cavezzo",
        "service_name": "Gestão de Redes Sociais COMPLETA",
        "value": 2500.00,
        "due_day": 10,
        "posts_per_week": 3,
        "content_capture": True,
        "capture_frequency": "2x meia-diária",
        "billing_cycle": "monthly",
    },
    {
        "nome_fantasia": "Balloarts",
        "service_name": "Gestão de Redes Sociais COMPLETA",
        "value": 2000.00,
        "due_day": 20,
        "posts_per_week": 3,
        "content_capture": True,
        "capture_frequency": "1x meia-diária",
        "billing_cycle": "monthly",
    },
    {
        "nome_fantasia": "Dra. Letícia",
        "service_name": "Gestão de Redes Sociais",
        "value": 1100.00,
        "due_day": 10,
        "posts_per_week": 2,
        "content_capture": True,
        "capture_frequency": "1x meia-diária",
        "billing_cycle": "monthly",
    },
    {
        "nome_fantasia": "Luane Aparecida",
        "service_name": "Gestão de Redes Sociais",
        "value": 580.00,
        "due_day": 10,
        "posts_per_week": 2,
        "content_capture": True,
        "capture_frequency": "1x meia-diária",
        "billing_cycle": "monthly",
    },
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def find_client(nome_fantasia: str):
    """Busca cliente por nome fantasia (case-insensitive, parcial)."""
    resp = supabase.from_("clients").select("id, name, nome_fantasia, status").execute()
    search = nome_fantasia.lower()
    for c in resp.data:
        nf = (c.get("nome_fantasia") or "").lower()
        nm = (c.get("name") or "").lower()
        if search in nf or search in nm:
            return c
    return None


def get_or_create_service(name: str, dry_run: bool) -> str:
    """Retorna o UUID do serviço, criando se necessário."""
    resp = supabase.from_("services").select("id, name").execute()
    for s in resp.data:
        if s["name"].lower() == name.lower():
            return s["id"]

    # Serviço não existe, criar
    service_id = str(uuid.uuid4())
    if not dry_run:
        supabase.from_("services").insert({
            "id": service_id,
            "name": name,
            "price": 0,
            "is_recurring": True,
            "category": "gestao_redes",
            "billing_cycle": "monthly",
        }).execute()
    print(f"  [service] Criado serviço '{name}' → {service_id}")
    return service_id


def get_or_create_contract(client_id: str, service_id: str, cfg: dict, dry_run: bool) -> str:
    """Cria ou reutiliza o contrato ativo do cliente para este serviço."""
    resp = (
        supabase.from_("contracts")
        .select("id, value, status")
        .eq("client_id", client_id)
        .eq("service_id", service_id)
        .eq("status", "active")
        .execute()
    )
    if resp.data:
        contract = resp.data[0]
        print(f"  [contract] Já existe contrato ativo → {contract['id']}")
        return contract["id"]

    contract_id = str(uuid.uuid4())
    today = date.today()
    end = today + relativedelta(years=1)

    data = {
        "id": contract_id,
        "client_id": client_id,
        "service_id": service_id,
        "status": "active",
        "start_date": today.isoformat(),
        "end_date": end.isoformat(),
        "value": cfg["value"],
        "billing_cycle": cfg["billing_cycle"],
        "auto_renew": True,
        "posts_per_week": cfg["posts_per_week"],
        "content_capture": cfg["content_capture"],
        "capture_frequency": cfg["capture_frequency"],
    }

    if not dry_run:
        supabase.from_("contracts").insert(data).execute()
    print(f"  [contract] Criado contrato ativo → {contract_id}")
    return contract_id


def generate_due_dates(due_day: int, months: int) -> list[date]:
    """Gera datas de vencimento para os próximos N meses."""
    today = date.today()
    dates = []
    for i in range(months):
        d = (today + relativedelta(months=i)).replace(day=due_day)
        # Se já passou este mês, inclua mesmo assim (para regularizar)
        dates.append(d)
    return dates


def create_invoice_if_missing(
    client_id: str,
    contract_id: str,
    cfg: dict,
    due_date: date,
    service_name: str,
    dry_run: bool,
) -> str:
    """Cria invoice se não existir nenhuma para este cliente+data+valor."""
    resp = (
        supabase.from_("invoices")
        .select("id, status")
        .eq("client_id", client_id)
        .eq("due_date", due_date.isoformat())
        .eq("amount", cfg["value"])
        .execute()
    )
    if resp.data:
        print(f"    [invoice] Já existe para {due_date} → {resp.data[0]['id']} ({resp.data[0]['status']})")
        return "skipped"

    invoice_id = str(uuid.uuid4())
    data = {
        "id": invoice_id,
        "client_id": client_id,
        "contract_id": contract_id,
        "amount": cfg["value"],
        "due_date": due_date.isoformat(),
        "status": "pending",
        "description": f"{service_name} — {due_date.strftime('%B/%Y')}",
    }

    if not dry_run:
        supabase.from_("invoices").insert(data).execute()
    print(f"    [invoice] Criado para {due_date} → {invoice_id}")
    return "created"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cliente", type=str, help="Filtrar por nome fantasia parcial")
    parser.add_argument("--meses", type=int, default=6, help="Quantidade de meses futuros (padrão: 6)")
    parser.add_argument("--only-contracts", action="store_true", help="Só criar contratos, sem faturas")
    parser.add_argument("--dry-run", action="store_true", help="Não escreve no banco")
    args = parser.parse_args()

    if args.dry_run:
        print("=== DRY-RUN: nenhuma alteração será gravada ===\n")

    configs = CLIENTS_CONFIG
    if args.cliente:
        configs = [c for c in configs if args.cliente.lower() in c["nome_fantasia"].lower()]
        if not configs:
            print(f"Nenhum cliente encontrado com '{args.cliente}'")
            return

    summary = {"clients_found": 0, "clients_missing": 0, "contracts_created": 0, "invoices_created": 0, "invoices_skipped": 0}

    for cfg in configs:
        print(f"\n{'='*60}")
        print(f"Cliente: {cfg['nome_fantasia']}")

        client = find_client(cfg["nome_fantasia"])
        if not client:
            print(f"  [ERRO] Cliente não encontrado no banco: '{cfg['nome_fantasia']}'")
            summary["clients_missing"] += 1
            continue

        summary["clients_found"] += 1
        print(f"  ID: {client['id']} | Status: {client['status']}")

        service_id = get_or_create_service(cfg["service_name"], args.dry_run)
        contract_id = get_or_create_contract(client["id"], service_id, cfg, args.dry_run)

        if args.only_contracts:
            continue

        # Gerar faturas mensais
        print(f"  Gerando faturas para {args.meses} meses (dia {cfg['due_day']}):")
        due_dates = generate_due_dates(cfg["due_day"], args.meses)
        for dd in due_dates:
            result = create_invoice_if_missing(
                client_id=client["id"],
                contract_id=contract_id,
                cfg=cfg,
                due_date=dd,
                service_name=cfg["service_name"],
                dry_run=args.dry_run,
            )
            if result == "created":
                summary["invoices_created"] += 1
            elif result == "skipped":
                summary["invoices_skipped"] += 1

    print(f"\n{'='*60}")
    print("RESUMO:")
    print(f"  Clientes encontrados: {summary['clients_found']}")
    if summary["clients_missing"]:
        print(f"  Clientes NÃO encontrados: {summary['clients_missing']} (verifique o nome_fantasia no banco)")
    print(f"  Faturas criadas: {summary['invoices_created']}")
    print(f"  Faturas já existentes (puladas): {summary['invoices_skipped']}")
    if args.dry_run:
        print("\n=== DRY-RUN: nenhuma alteração foi gravada ===")


if __name__ == "__main__":
    main()
