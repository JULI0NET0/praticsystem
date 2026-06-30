import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const env = {}
fs.readFileSync('.env.local','utf8').split('\n').forEach(l=>{const m=l.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);if(m){let v=m[2]?m[2].trim():'';if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);env[m[1]]=v.replace(/\\/g,'')}})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY||env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const LOOOM='196d6f2f-f087-47e7-b8ed-57f9535db5b2'
const { data: inv } = await sb.from('invoices').select('*').eq('client_id', LOOOM).order('due_date')
console.log('=== TODAS as faturas (invoices) da LOOOM ILUMINAÇÃO ===')
console.log(inv?.length ? inv.map(i=>({due:i.due_date?.split('T')[0],nr:i.invoice_number,amount:i.amount,status:i.status,paid_at:i.paid_at?.split('T')[0],desc:i.description})) : 'NENHUMA FATURA LANÇADA')
