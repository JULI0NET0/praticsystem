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

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  const { data: invoices, error: invError } = await supabase
    .from('invoices')
    .select('*')
    .gte('due_date', '2026-06-01')
    .lte('due_date', '2026-06-30')

  const { data: clients, error: cliError } = await supabase
    .from('clients')
    .select('id, nome_fantasia')

  if (invError || cliError) {
    console.error("Query Error:", invError || cliError)
    return
  }

  const clientMap = {}
  clients.forEach(c => {
    clientMap[c.id] = c.nome_fantasia
  })

  console.log("=== INVOICES IN JUNE 2026 ===")
  let total = 0
  if (invoices) {
    invoices.forEach(inv => {
      const clientName = clientMap[inv.client_id] || 'N/A'
      console.log(`${inv.due_date} | ${clientName} | ${inv.amount} | ${inv.status} | ${inv.description}`)
      total += Number(inv.amount)
    })
  }
  console.log("Total:", total)
}

run().catch(console.error)
