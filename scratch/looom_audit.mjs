import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const env = {}
fs.readFileSync('.env.local','utf8').split('\n').forEach(l=>{const m=l.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);if(m){let v=m[2]?m[2].trim():'';if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);env[m[1]]=v.replace(/\\/g,'')}})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY||env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const LOOOM='196d6f2f-f087-47e7-b8ed-57f9535db5b2'

// all txns with 2526.66 or 'gestão de redes' or 828256183 or client_id LOOOM
const { data: txns } = await sb.from('asaas_transactions').select('*')
const rel = txns.filter(t => Math.abs(Number(t.value))===2526.66 || /828256183|gest[aã]o de redes|loooom/i.test(t.description||'') || t.client_id===LOOOM)
console.log('=== Transações relacionadas (asaas_transactions) ===')
rel.forEach(t=>console.log(JSON.stringify({id:t.id,date:t.date,value:t.value,invoice_id:t.invoice_id,client_id:t.client_id,confirms:t.confirms_asaas_transaction_id,type:t.type,desc:t.description})))

// any manual entries? check other tables
console.log('\n=== Procurando tabelas de lançamentos manuais ===')
for (const tbl of ['financial_entries','lancamentos','manual_transactions','transactions','cash_flow','financial_transactions']) {
  const { data, error } = await sb.from(tbl).select('*').limit(1)
  if (!error) console.log(`tabela "${tbl}" existe — colunas:`, data?.[0]?Object.keys(data[0]).join(','):'(vazia)')
}
