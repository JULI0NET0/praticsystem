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
  const { data: txns, error } = await supabase
    .from('asaas_transactions')
    .select('*')
    .order('date', { ascending: false })

  console.log("=== ALL TRANSACTIONS ===")
  const balloartsTxns = txns.filter(t => 
    (t.description && t.description.toLowerCase().includes('balloarts')) ||
    t.client_id === '51c4871c-b8aa-4a95-8643-9315c35a141d'
  )
  console.log(balloartsTxns)
}

run().catch(console.error)
