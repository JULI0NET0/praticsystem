import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const env = {}
fs.readFileSync('.env.local','utf8').split('\n').forEach(l=>{const m=l.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);if(m){let v=m[2]?m[2].trim():'';if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);env[m[1]]=v.replace(/\\/g,'')}})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY||env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const LOOOM='196d6f2f-f087-47e7-b8ed-57f9535db5b2'
const CONTRACT='4f73144a-47a2-456b-8e33-8e4714602b1d'
const TXN='ftn_001893264579'

// 1. Create June invoice
const invoice = {
  client_id: LOOOM,
  contract_id: CONTRACT,
  amount: 2500,
  due_date: '2026-06-10',
  status: 'paid',
  paid_at: '2026-06-12',
  description: 'Gestão de Redes Sociais COMPLETA — June/2026',
  created_at: new Date().toISOString()
}
const { data: inv, error: e1 } = await sb.from('invoices').insert([invoice]).select()
if (e1) { console.error('Erro ao inserir fatura:', e1); process.exit(1) }
const invoiceId = inv[0].id
console.log('✅ Fatura de junho criada:', invoiceId)

// 2. Link Asaas transaction to the new invoice
const { error: e2 } = await sb.from('asaas_transactions').update({ invoice_id: invoiceId }).eq('id', TXN)
if (e2) { console.error('Erro ao vincular transação:', e2); process.exit(1) }
console.log('✅ Transação', TXN, 'vinculada à fatura', invoiceId)

// 3. Verify
const { data: check } = await sb.from('asaas_transactions').select('id, value, invoice_id, description').eq('id', TXN)
console.log('\n=== Verificação ===')
console.log(check)
const { data: invCheck } = await sb.from('invoices').select('due_date, amount, status, paid_at, description').eq('id', invoiceId)
console.log(invCheck)
