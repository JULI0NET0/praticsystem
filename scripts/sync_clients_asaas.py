"""
Sincroniza todos os clientes cadastrados (ativos e inativos) com o histórico
de cobranças do Asaas, criando e vinculando invoices e asaas_transactions.

Uso:
  cd scripts
  python sync_clients_asaas.py                          # 2025-01-01 até 2026-12-31
  python sync_clients_asaas.py --start 2025-01-01 --end 2025-12-31
  python sync_clients_asaas.py --client-id <uuid-do-cliente>
  python sync_clients_asaas.py --dry-run               # apenas mostra o que faria
"""

import os
import argparse
import requests
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client, Client

env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env.local')
load_dotenv(env_path)

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
# Next.js trata \$ como $ no .env.local; python-dotenv preserva o \
_raw_key = os.environ.get("ASAAS_API_KEY", "")
ASAAS_API_KEY = _raw_key.replace("\\$", "$").strip()
ASAAS_BASE_URL = os.environ.get("ASAAS_BASE_URL", "https://api.asaas.com/v3")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas no .env.local")
if not ASAAS_API_KEY:
    raise ValueError("ASAAS_API_KEY não encontrada no .env.local")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
asaas_headers = {"access_token": ASAAS_API_KEY, "Content-Type": "application/json"}

PAID_STATUSES = {"RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"}
OVERDUE_STATUSES = {"OVERDUE"}


def map_status(asaas_status: str) -> str:
    if asaas_status in PAID_STATUSES:
        return "paid"
    if asaas_status in OVERDUE_STATUSES:
        return "overdue"
    return "pending"


def asaas_get_customer_by_doc(cpf_cnpj: str):
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


def asaas_get_payments(customer_id: str, due_start: str, due_end: str) -> list:
    payments = []
    offset = 0
    limit = 100
    while True:
        r = requests.get(
            f"{ASAAS_BASE_URL}/payments",
            headers=asaas_headers,
            params={
                "customer": customer_id,
                "dueDate[ge]": due_start,
                "dueDate[le]": due_end,
                "offset": offset,
                "limit": limit,
            },
            timeout=30,
        )
        r.raise_for_status()
        body = r.json()
        payments.extend(body.get("data", []))
        if not body.get("hasMore"):
            break
        offset += limit
    return payments


def get_client_contract_id(client_id: str) -> str | None:
    res = supabase.table("contracts").select("id").eq("client_id", client_id)\
        .order("start_date", desc=True).limit(1).execute()
    return res.data[0]["id"] if res.data else None


def sync_payment(client_id: str, client_name: str, contract_id: str | None, payment: dict, dry_run: bool) -> str:
    """Retorna: 'created' | 'updated' | 'skipped'"""
    p_id = payment["id"]
    invoice_status = map_status(payment.get("status", ""))
    due_date = payment.get("dueDate") or payment.get("dateCreated", "")[:10]
    paid_at = payment.get("paymentDate") or (due_date if invoice_status == "paid" else None)

    # 1. Invoice já existe com asaas_payment_id?
    res = supabase.table("invoices").select("id, status").eq("asaas_payment_id", p_id).execute()
    if res.data:
        existing = res.data[0]
        if existing["status"] != invoice_status:
            if not dry_run:
                supabase.table("invoices").update({
                    "status": invoice_status,
                    "paid_at": paid_at,
                }).eq("id", existing["id"]).execute()
                supabase.table("asaas_transactions").upsert({
                    "id": p_id, "description": payment.get("description"),
                    "value": payment.get("value", 0), "type": "CREDIT",
                    "date": due_date, "status": payment.get("status", ""),
                    "invoice_id": existing["id"],
                    "synced_at": datetime.now(timezone.utc).isoformat(),
                }).execute()
            return "updated"
        return "skipped"

    # 2. asaas_transaction já tem invoice_id?
    tx_res = supabase.table("asaas_transactions").select("invoice_id").eq("id", p_id).execute()
    if tx_res.data and tx_res.data[0].get("invoice_id"):
        invoice_id = tx_res.data[0]["invoice_id"]
        inv_res = supabase.table("invoices").select("id, status").eq("id", invoice_id).execute()
        if inv_res.data:
            linked = inv_res.data[0]
            if linked["status"] != invoice_status:
                if not dry_run:
                    supabase.table("invoices").update({
                        "status": invoice_status,
                        "asaas_payment_id": p_id,
                        "paid_at": paid_at,
                    }).eq("id", linked["id"]).execute()
                return "updated"
        return "skipped"

    # 3. Cria novo invoice + asaas_transaction
    if not dry_run:
        inv_res = supabase.table("invoices").insert({
            "client_id": client_id,
            "contract_id": contract_id,
            "amount": payment.get("value", 0),
            "due_date": due_date,
            "status": invoice_status,
            "description": payment.get("description") or f"Mensalidade - {client_name}",
            "asaas_payment_id": p_id,
            "paid_at": paid_at,
        }).execute()
        invoice_id = inv_res.data[0]["id"]

        supabase.table("asaas_transactions").upsert({
            "id": p_id, "description": payment.get("description"),
            "value": payment.get("value", 0), "type": "CREDIT",
            "date": due_date, "status": payment.get("status", ""),
            "invoice_id": invoice_id,
            "synced_at": datetime.now(timezone.utc).isoformat(),
        }).execute()

    return "created"


def process_client(client: dict, due_start: str, due_end: str, dry_run: bool) -> dict:
    name = client["name"]
    cnpj = client.get("cnpj") or ""
    client_id = client["id"]

    result = {
        "id": client_id,
        "name": name,
        "cnpj": cnpj,
        "status": client.get("status", ""),
        "asaas_found": False,
        "payments_found": 0,
        "created": 0,
        "updated": 0,
        "skipped": 0,
        "error": None,
    }

    if not "".join(c for c in cnpj if c.isdigit()):
        result["error"] = "Sem CPF/CNPJ"
        return result

    try:
        customer = asaas_get_customer_by_doc(cnpj)
        if not customer:
            return result

        result["asaas_found"] = True
        payments = asaas_get_payments(customer["id"], due_start, due_end)
        result["payments_found"] = len(payments)

        contract_id = get_client_contract_id(client_id)

        for p in payments:
            action = sync_payment(client_id, name, contract_id, p, dry_run)
            result[action] += 1

    except Exception as e:
        result["error"] = str(e)

    return result


def print_result(r: dict, idx: int, total: int):
    prefix = f"[{idx}/{total}]"
    if r.get("error"):
        print(f"  {prefix} ERRO  {r['name']} ({r['cnpj']}): {r['error']}")
    elif not r["asaas_found"]:
        print(f"  {prefix} NÃO ENCONTRADO  {r['name']} ({r['cnpj']})")
    else:
        parts = []
        if r["created"]: parts.append(f"+{r['created']} criados")
        if r["updated"]: parts.append(f"~{r['updated']} atualizados")
        if r["skipped"]: parts.append(f"{r['skipped']} inalterados")
        summary = ", ".join(parts) if parts else "sem pagamentos no período"
        status_label = {"active": "ATIVO", "inactive": "INATIVO", "prospect": "PROSPECT"}.get(r["status"], r["status"].upper())
        print(f"  {prefix} [{status_label}] {r['name']} — {r['payments_found']} cob. → {summary}")


def main():
    parser = argparse.ArgumentParser(description="Sincroniza todos os clientes com o Asaas (2025-2026)")
    parser.add_argument("--start", default="2025-01-01", help="Data início (YYYY-MM-DD)")
    parser.add_argument("--end", default="2026-12-31", help="Data fim (YYYY-MM-DD)")
    parser.add_argument("--client-id", help="Sincroniza apenas este cliente (UUID)")
    parser.add_argument("--dry-run", action="store_true", help="Só simula, não grava nada")
    args = parser.parse_args()

    if args.dry_run:
        print(">>> MODO DRY-RUN — nenhuma alteração será gravada <<<\n")

    print(f"Período: {args.start} → {args.end}\n")

    # Busca clientes
    query = supabase.table("clients").select("id, name, cnpj, status")
    if args.client_id:
        query = query.eq("id", args.client_id)
    res = query.execute()
    # Filtra localmente clientes com CPF/CNPJ preenchido
    all_clients = res.data or []
    clients = [c for c in all_clients if c.get("cnpj") and "".join(d for d in c["cnpj"] if d.isdigit())]

    if not clients:
        print("Nenhum cliente encontrado.")
        return

    print(f"Processando {len(clients)} cliente(s)...\n")

    results = []
    for i, client in enumerate(clients, 1):
        r = process_client(client, args.start, args.end, args.dry_run)
        results.append(r)
        print_result(r, i, len(clients))

    # Resumo final
    found = [r for r in results if r["asaas_found"]]
    total_created = sum(r["created"] for r in results)
    total_updated = sum(r["updated"] for r in results)
    total_skipped = sum(r["skipped"] for r in results)
    not_found = len(results) - len(found)
    errors = [r for r in results if r.get("error") and r["error"] != "Sem CPF/CNPJ"]

    print(f"\n{'='*60}")
    print(f"RESUMO")
    print(f"{'='*60}")
    print(f"  Clientes processados : {len(results)}")
    print(f"  Encontrados no Asaas : {len(found)}")
    print(f"  Não encontrados      : {not_found}")
    print(f"  Invoices criados     : {total_created}")
    print(f"  Invoices atualizados : {total_updated}")
    print(f"  Sem alteração        : {total_skipped}")
    if errors:
        print(f"  Erros               : {len(errors)}")
        for e in errors:
            print(f"    - {e['name']}: {e['error']}")
    if args.dry_run:
        print("\n>>> DRY-RUN: nada foi gravado <<<")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
