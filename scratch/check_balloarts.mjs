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
    envVars[match[1]] = value
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing supabase credentials in env.local")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  // Find client Balloarts
  const { data: clients, error: cliErr } = await supabase
    .from('clients')
    .select('*')
    .ilike('nome_fantasia', '%balloarts%')

  console.log("=== CLIENTS ===")
  console.log(clients)

  if (clients && clients.length > 0) {
    const clientId = clients[0].id

    // Find contracts
    const { data: contracts, error: conErr } = await supabase
      .from('contracts')
      .select('*')
      .eq('client_id', clientId)
    
    console.log("=== CONTRACTS ===")
    console.log(contracts)

    // Find invoices in June 2026 or all invoices
    const { data: invoices, error: invErr } = await supabase
      .from('invoices')
      .select('*')
      .eq('client_id', clientId)
      .order('due_date', { ascending: false })

    console.log("=== INVOICES ===")
    console.log(invoices)
  }
}

run().catch(console.error)
