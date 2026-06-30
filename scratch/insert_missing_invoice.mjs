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
  const invoice = {
    client_id: '51c4871c-b8aa-4a95-8643-9315c35a141d',
    contract_id: '3dda4b43-b979-43aa-b480-eeee307b5329',
    amount: 2000,
    due_date: '2026-06-20',
    status: 'pending',
    description: 'Gestão de Redes Sociais COMPLETA — June/2026',
    created_at: new Date().toISOString()
  }

  console.log("Inserting invoice:", invoice)
  const { data, error } = await supabase
    .from('invoices')
    .insert([invoice])
    .select()

  if (error) {
    console.error("Error inserting invoice:", error)
  } else {
    console.log("Success! Inserted invoice:", data)
  }
}

run().catch(console.error)
