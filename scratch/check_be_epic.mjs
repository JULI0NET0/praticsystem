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
  // Look for invoices with number 828262810
  const { data: invoices, error: invErr } = await supabase
    .from('invoices')
    .select('*')
    .or('invoice_number.eq.828262810,description.ilike.%828262810%,asaas_payment_id.ilike.%828262810%')

  console.log("=== INVOICES MATCHING 828262810 ===")
  console.log(invoices)

  // Look for client/contract with Be Epic
  const { data: clients, error: cliErr } = await supabase
    .from('clients')
    .select('*')
    .ilike('nome_fantasia', '%epic%')
  
  console.log("=== CLIENTS MATCHING EPIC ===")
  console.log(clients)

  // Look for transactions matching 828262810 or BLACK HOME or Be Epic
  const { data: txns, error: txnErr } = await supabase
    .from('asaas_transactions')
    .select('*')
    .or('description.ilike.%828262810%,description.ilike.%epic%,description.ilike.%black%')

  console.log("=== TRANSACTIONS ===")
  console.log(txns)
}

run().catch(console.error)
