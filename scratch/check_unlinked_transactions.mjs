import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

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
    value = value.replace(/\\/g, '')
    envVars[match[1]] = value
  }
})

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function run() {
  const { data: txns } = await supabase
    .from('asaas_transactions')
    .select('*')
    .ilike('description', '%leticia%')

  console.log("=== TRANSACTIONS FOR LETICIA ===")
  console.log(txns)

  const { data: txnsValue } = await supabase
    .from('asaas_transactions')
    .select('*')
    .eq('value', 1100)

  console.log("=== TRANSACTIONS WITH VALUE 1100 ===")
  console.log(txnsValue)
}

run().catch(console.error)
