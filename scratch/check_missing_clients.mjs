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
  const { data: clients } = await supabase.from('clients').select('*')
  const { data: invoices } = await supabase.from('invoices').select('*')

  console.log("=== CLIENTS ===")
  clients.forEach(c => {
    if (c.name.toLowerCase().includes('looom') || c.name.toLowerCase().includes('kallas') || c.name.toLowerCase().includes('tricologia')) {
      console.log(`Client: ${c.name} | id: ${c.id}`)
    }
  })

  console.log("=== INVOICES ===")
  invoices.forEach(inv => {
    if (inv.amount === 2526.66 || inv.amount === 1220 || inv.amount === 1200) {
      console.log(`Invoice: ${inv.due_date} | amount: ${inv.amount} | status: ${inv.status} | desc: ${inv.description} | client_id: ${inv.client_id}`)
    }
  })
}

run().catch(console.error)
