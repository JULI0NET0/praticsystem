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
  const { data: asaasTransactions } = await supabase.from('asaas_transactions').select('*')
  
  const filterStart = '2026-06-01'
  const filterEnd = '2026-06-30'
  const filterStatus = 'unlinked' // or 'all'

  const filtered = asaasTransactions
    .filter((t) => {
      const d = t.date.split("T")[0];
      if (filterStart && d < filterStart) return false;
      if (filterEnd && d > filterEnd) return false;
      if (filterStatus === "linked" && !(t.expense_entry_id || t.invoice_id)) return false;
      if (filterStatus === "unlinked" && (t.expense_entry_id || t.invoice_id)) return false;
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  console.log("Filtered count:", filtered.length)
  const target = filtered.find(t => t.id === 'pay_uc4do4ijvujysop9')
  console.log("Is pay_uc4do4ijvujysop9 in filtered?", !!target)
  if (target) {
    console.log(target)
  }
}

run().catch(console.error)
