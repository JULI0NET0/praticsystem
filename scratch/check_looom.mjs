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
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
    value = value.replace(/\\/g, '')
    envVars[match[1]] = value
  }
})

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function run() {
  const { data: clients, error: cErr } = await supabase.from('clients').select('*')
  if (cErr) console.log('clients err:', cErr)
  console.log('Total clients:', clients?.length, '| columns:', clients?.[0] ? Object.keys(clients[0]).join(', ') : '-')
  const hits = clients?.filter(c => /loo+m|ilumina/i.test(JSON.stringify(c)))
  console.log('=== CLIENTS matching LOOOM/iluminação ===')
  console.log(hits?.map(c => ({ id: c.id, nome: c.nome_fantasia, razao: c.razao_social })) || 'none')

  // invoice_number exact + ilike
  const { data: inv } = await supabase.from('invoices').select('*').or('invoice_number.ilike.%828256183%,invoice_number.eq.828256183')
  console.log('\n=== INVOICES with invoice_number 828256183 ===')
  console.log(inv?.length ? inv : 'NENHUMA')

  // Is the asaas txn linked anywhere? check links table existence via asaas_transactions invoice_id already NULL.
  // Show all asaas txns for fatura 828256183 with status fields
  const { data: txns } = await supabase.from('asaas_transactions').select('*').ilike('description', '%828256183%')
  console.log('\n=== ASAAS TXNS fatura 828256183 (full) ===')
  txns?.forEach(t => console.log(JSON.stringify({ date: t.date, value: t.value, invoice_id: t.invoice_id, client_id: t.client_id, status: t.status, desc: t.description })))
}

run().catch(console.error)
