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
  const { data: txns } = await supabase
    .from('asaas_transactions')
    .select('*')
    .or('value.eq.509.04,value.eq.500,description.ilike.%recloset%')

  console.log("=== TRANSACTIONS ===")
  console.log(txns)

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .or('amount.eq.509.04,amount.eq.500,description.ilike.%recloset%')

  console.log("=== INVOICES ===")
  console.log(invoices)
}

run().catch(console.error)
