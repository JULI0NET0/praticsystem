import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const env = {}
fs.readFileSync('.env.local','utf8').split('\n').forEach(l=>{const m=l.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);if(m){let v=m[2]?m[2].trim():'';if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);env[m[1]]=v.replace(/\\/g,'')}})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY||env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const INVOICE='648782c6-24a9-48e4-a47d-88ed2b9e4a2c'
const PRIMARY='pay_pcu0prpwwy26mmvm'      // cobrança gestão de redes sociais +2526.66 (contada)
const CONFIRM='ftn_001893264579'          // crédito no extrato +2526.66 (confirma o pagamento)

// 1. Fatura -> 2526.66
const { error: e1 } = await sb.from('invoices').update({ amount: 2526.66 }).eq('id', INVOICE)
if (e1) { console.error('Erro fatura:', e1); process.exit(1) }
console.log('✅ Fatura ajustada para R$ 2.526,66')

// 2. Cobrança = crédito primário
const { error: e2 } = await sb.from('asaas_transactions').update({ invoice_id: INVOICE, confirms_asaas_transaction_id: null }).eq('id', PRIMARY)
if (e2) { console.error('Erro primary:', e2); process.exit(1) }
console.log('✅', PRIMARY, 'vinculado como crédito primário')

// 3. Crédito do extrato = confirmação (não duplica)
const { error: e3 } = await sb.from('asaas_transactions').update({ invoice_id: INVOICE, confirms_asaas_transaction_id: PRIMARY }).eq('id', CONFIRM)
if (e3) { console.error('Erro confirm:', e3); process.exit(1) }
console.log('✅', CONFIRM, 'marcado como confirmação de', PRIMARY)

// Verify
const { data: inv } = await sb.from('invoices').select('amount,status,paid_at,description').eq('id', INVOICE)
const { data: tx } = await sb.from('asaas_transactions').select('id,value,invoice_id,confirms_asaas_transaction_id,description').in('id',[PRIMARY,CONFIRM])
console.log('\n=== Verificação ===')
console.log('Fatura:', inv[0])
tx.forEach(t=>console.log(JSON.stringify({id:t.id,value:t.value,invoice_id:t.invoice_id,confirms:t.confirms_asaas_transaction_id})))
const counted = tx.filter(t=>t.invoice_id===INVOICE && !t.confirms_asaas_transaction_id).reduce((s,t)=>s+Number(t.value),0)
console.log('Crédito contado no faturamento (sem duplicar):', counted)
