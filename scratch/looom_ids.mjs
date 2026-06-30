import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const env = {}
fs.readFileSync('.env.local','utf8').split('\n').forEach(l=>{const m=l.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);if(m){let v=m[2]?m[2].trim():'';if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);env[m[1]]=v.replace(/\\/g,'')}})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY||env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const LOOOM='196d6f2f-f087-47e7-b8ed-57f9535db5b2'
const { data: inv } = await sb.from('invoices').select('id, contract_id, due_date, amount').eq('client_id', LOOOM).order('due_date').limit(1)
console.log('LOOOM invoice sample (for contract_id):', inv)
const { data: txns } = await sb.from('asaas_transactions').select('id, date, value, invoice_id, confirms_asaas_transaction_id, description').ilike('description','%828256183%').order('value',{ascending:false})
console.log('\nAsaas txns fatura 828256183:')
txns?.forEach(t=>console.log(JSON.stringify(t)))
