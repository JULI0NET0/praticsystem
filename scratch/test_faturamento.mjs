import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Read env variables manually
const envPath = path.resolve('.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
  if (match) {
    let value = match[2] ? match[2].trim() : ''
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1)
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1)
    }
    value = value.replace(/\\/g, '') // Strip backslashes
    envVars[match[1]] = value
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  const { data: invoices } = await supabase.from('invoices').select('*')
  const { data: asaasTransactions } = await supabase.from('asaas_transactions').select('*')

  const startDate = '2026-06-01'
  const endDate = '2026-06-30'

  // Method 1: Current (due date in period)
  const periodInvoices = invoices.filter((i) => {
    const d = i.due_date.split("T")[0];
    return d >= startDate && d <= endDate;
  });

  const realized1 = periodInvoices
    .filter((inv) => {
      if (inv.status === "paid") return true;
      const linked = asaasTransactions.filter(
        (t) => t.invoice_id === inv.id && !t.confirms_asaas_transaction_id
      );
      const total = linked.reduce((s, t) => s + Number(t.value), 0);
      return Number(inv.amount) > 0 && total >= Number(inv.amount);
    })
    .reduce((s, i) => s + Number(i.amount), 0);

  // Method 2: Cash basis (paid_at in period)
  const realized2 = invoices
    .filter((inv) => {
      if (!inv.paid_at) return false;
      const pDate = inv.paid_at.split("T")[0];
      return pDate >= startDate && pDate <= endDate;
    })
    .reduce((s, i) => s + Number(i.amount), 0);

  console.log("Method 1 (Due date in June):", realized1)
  console.log("Method 2 (Paid date in June):", realized2)
}

run().catch(console.error)
