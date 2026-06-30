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
  console.log("Updating Balloarts July Invoice (a994bae6-4734-43a0-8b83-66deab074b09)...")
  const { error: err1 } = await supabase
    .from('invoices')
    .update({ status: 'paid', paid_at: '2026-06-22' })
    .eq('id', 'a994bae6-4734-43a0-8b83-66deab074b09')
  if (err1) console.error("Error 1:", err1)

  console.log("Updating Balloarts June Invoice (4661a4e4-470d-4401-a6f6-5be94e3392d7)...")
  const { error: err2 } = await supabase
    .from('invoices')
    .update({ status: 'paid', paid_at: '2026-06-27' })
    .eq('id', '4661a4e4-470d-4401-a6f6-5be94e3392d7')
  if (err2) console.error("Error 2:", err2)

  console.log("Updating Balloarts Transaction (ftn_001910154065) linking it to July Invoice...")
  const { error: err3 } = await supabase
    .from('asaas_transactions')
    .update({
      invoice_id: 'a994bae6-4734-43a0-8b83-66deab074b09',
      confirms_asaas_transaction_id: 'pay_y2kifq91dli1yncu'
    })
    .eq('id', 'ftn_001910154065')
  if (err3) console.error("Error 3:", err3)

  console.log("Updating BE EPIC Transaction (ftn_001891231286) linking it to June Invoice (cb9b747f-5e6f-4dcf-aa0f-7cea906f2049)...")
  const { error: err4 } = await supabase
    .from('asaas_transactions')
    .update({
      invoice_id: 'cb9b747f-5e6f-4dcf-aa0f-7cea906f2049',
      confirms_asaas_transaction_id: 'pay_4ulqawcn6jlytpmc'
    })
    .eq('id', 'ftn_001891231286')
  if (err4) console.error("Error 4:", err4)

  console.log("All updates executed.")
}

run().catch(console.error)
