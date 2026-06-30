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
  const { data: txns, error: txnErr } = await supabase
    .from('asaas_transactions')
    .select('*')
    .eq('type', 'CREDIT')
    .gte('date', '2026-06-01')
    .lte('date', '2026-06-30')

  const { data: invoices, error: invErr } = await supabase
    .from('invoices')
    .select('*')

  if (txnErr || invErr) {
    console.error("Error:", txnErr || invErr)
    return
  }

  const invoiceMap = {}
  invoices.forEach(inv => {
    invoiceMap[inv.id] = inv
  })

  console.log("=== CREDIT TRANSACTIONS IN JUNE 2026 ===")
  txns.forEach(t => {
    const isLinked = t.invoice_id !== null
    const linkedInvoice = isLinked ? invoiceMap[t.invoice_id] : null
    const isPaid = linkedInvoice ? linkedInvoice.status === 'paid' : false
    console.log(`${t.date} | ${t.value} | Linked: ${isLinked} | Invoice Paid: ${isPaid} | Desc: ${t.description}`)
  })
}

run().catch(console.error)
