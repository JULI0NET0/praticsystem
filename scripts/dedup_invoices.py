"""
Remove invoices duplicados: quando existe um invoice SEM asaas_payment_id
e outro com asaas_payment_id para o mesmo cliente + mesma data + mesmo valor,
mantém o vinculado ao Asaas e deleta o antigo.

Uso:
  python3 dedup_invoices.py           # executa de verdade
  python3 dedup_invoices.py --dry-run # apenas mostra, não apaga
"""

import os
import argparse
from dotenv import load_dotenv
from supabase import create_client, Client

env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env.local')
load_dotenv(env_path)

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if args.dry_run:
        print(">>> DRY-RUN — nada será apagado <<<\n")

    # Busca todos os invoices
    res = supabase.table("invoices").select("id, client_id, due_date, amount, status, asaas_payment_id, description").execute()
    all_invoices = res.data or []

    # Agrupa por (client_id, due_date, amount)
    from collections import defaultdict
    groups = defaultdict(list)
    for inv in all_invoices:
        key = (inv["client_id"], inv["due_date"], float(inv["amount"] or 0))
        groups[key].append(inv)

    to_delete = []

    for key, group in groups.items():
        if len(group) < 2:
            continue

        linked   = [i for i in group if i.get("asaas_payment_id")]
        unlinked = [i for i in group if not i.get("asaas_payment_id")]

        if not linked or not unlinked:
            # Todos vinculados ou todos sem vínculo — pula (não sabemos qual remover)
            continue

        for old in unlinked:
            # Garante que nenhuma asaas_transaction aponta para o antigo
            tx_res = supabase.table("asaas_transactions").select("id").eq("invoice_id", old["id"]).execute()
            if tx_res.data:
                print(f"  AVISO: invoice {old['id']} tem asaas_transaction apontando → pulando")
                continue
            to_delete.append(old)

    if not to_delete:
        print("Nenhum duplicado encontrado.")
        return

    print(f"{'='*60}")
    print(f"Duplicados encontrados: {len(to_delete)}")
    print(f"{'='*60}")
    for inv in to_delete:
        print(f"  [{inv['status']:10}]  {inv['due_date']}  R$ {float(inv['amount']):.2f}  {inv['description'][:50]}  (ID: {inv['id']})")

    if args.dry_run:
        print(f"\n>>> DRY-RUN: {len(to_delete)} invoice(s) seriam apagados <<<")
        return

    print(f"\nApagando {len(to_delete)} invoice(s) antigos...")
    ids = [i["id"] for i in to_delete]
    # Deleta em lote
    supabase.table("invoices").delete().in_("id", ids).execute()
    print(f"Concluído — {len(to_delete)} duplicado(s) removido(s).")


if __name__ == "__main__":
    main()
