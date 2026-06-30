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
  console.log("Iniciando execução do plano de correções e vínculos...")

  // 1. Deletar faturas duplicadas pendentes
  console.log("\n1. Removendo faturas duplicadas pendentes...")
  const dupBall = await supabase.from('invoices').delete().eq('id', 'b358ef6a-e31b-4359-8edb-dc449ed5db41')
  console.log("Remoção fatura duplicada Balloarts:", dupBall.error ? dupBall.error.message : "Sucesso")

  const dupRec = await supabase.from('invoices').delete().eq('id', '713bd613-8570-442f-9b55-8a8d1d64aa80')
  console.log("Remoção fatura duplicada Recloset Bazar:", dupRec.error ? dupRec.error.message : "Sucesso")

  // 2. Criar e vincular despesas operacionais para os débitos de Junho/2026
  console.log("\n2. Criando e vinculando despesas de Junho/2026...")
  
  const debits = [
    {
      id: 'ftn_001886023824',
      amount: 250.00,
      date: '2026-06-09',
      desc: 'operacional (Anúncios Facebook Recloset)',
      clientId: '378cb824-01e7-4459-a404-9d73bb754ff8' // Recloset
    },
    {
      id: 'ftn_001906600951',
      amount: 240.00,
      date: '2026-06-19',
      desc: 'operacional (Anúncios Facebook Recloset)',
      clientId: '378cb824-01e7-4459-a404-9d73bb754ff8' // Recloset
    },
    {
      id: 'ftn_001919169821',
      amount: 100.00,
      date: '2026-06-27',
      desc: 'operacional (Reembolso/Pix Julio Neto)',
      clientId: 'b2f531fd-23cb-4487-a332-8737401d710a' // Cold Joias
    }
  ]

  for (const deb of debits) {
    // Insere na expense_entries
    const { data: newEntry, error: insertErr } = await supabase
      .from('expense_entries')
      .insert({
        expense_id: 'fe4853b7-8829-4881-a164-59348bca4f29', // operacional
        description: deb.desc,
        amount: deb.amount,
        date: deb.date,
        status: 'paid',
        asaas_transaction_id: deb.id,
        category: 'outros'
      })
      .select()
      .single()

    if (insertErr) {
      console.error(`Erro ao criar despesa para ${deb.id}:`, insertErr.message)
    } else {
      console.log(`Despesa criada com sucesso ID: ${newEntry.id}`)
      
      // Vincula na asaas_transactions
      const { error: updateErr } = await supabase
        .from('asaas_transactions')
        .update({
          expense_entry_id: newEntry.id,
          client_id: deb.clientId
        })
        .eq('id', deb.id)

      if (updateErr) {
        console.error(`Erro ao vincular transação ${deb.id}:`, updateErr.message)
      } else {
        console.log(`Transação ${deb.id} vinculada com sucesso!`)
      }
    }
  }

  // 3. Atualizar despesa operacional de R$ 50,00 para paid
  console.log("\n3. Atualizando despesa operacional de R$ 50,00 para paid...")
  const exp50 = await supabase
    .from('expense_entries')
    .update({ status: 'paid' })
    .eq('id', '89088f56-e5e1-48ce-9365-57cd937ec960')
  console.log("Status despesa R$ 50,00 atualizado:", exp50.error ? exp50.error.message : "Sucesso")

  // 4. Executar correções históricas da BALLOARTS (Jan/Fev 2026)
  console.log("\n4. Vinculando recebimentos históricos da BALLOARTS...")
  const historicalBallo = [
    {
      txnId: 'pay_mjckfjg0i18m0xhe',
      invoiceId: '1379062c-dc08-46e0-a1e9-03f59cd4720b',
      paidDate: '2026-01-10'
    },
    {
      txnId: 'pay_uehkdu1qx9h3oius',
      invoiceId: '7fbb3356-aa3f-4d50-a2da-89c560cff2b5',
      paidDate: '2026-02-06'
    }
  ]

  for (const hb of historicalBallo) {
    const { error: invErr } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_at: hb.paidDate + 'T12:00:00Z'
      })
      .eq('id', hb.invoiceId)

    if (invErr) {
      console.error(`Erro ao atualizar invoice ${hb.invoiceId}:`, invErr.message)
    } else {
      const { error: txnErr } = await supabase
        .from('asaas_transactions')
        .update({
          invoice_id: hb.invoiceId,
          client_id: '51c4871c-b8aa-4a95-8643-9315c35a141d' // BALLOARTS
        })
        .eq('id', hb.txnId)

      if (txnErr) {
        console.error(`Erro ao vincular transação ${hb.txnId}:`, txnErr.message)
      } else {
        console.log(`Vínculo histórico da Balloarts efetuado com sucesso para ${hb.txnId}!`)
      }
    }
  }

  // 5. Atualizar faturas da Dra. Letícia de 2025 para paid
  console.log("\n5. Atualizando faturas da Dra. Letícia para paid...")
  const leticiaInvoices = [
    { id: '829bf4d0-a534-4d1d-a3d0-02dfece7157b', paidDate: '2025-06-10' },
    { id: '24d692a5-a0bc-4f1e-a7a6-0c4d8171dc71', paidDate: '2025-07-10' }
  ]

  for (const li of leticiaInvoices) {
    const { error: letErr } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_at: li.paidDate + 'T12:00:00Z'
      })
      .eq('id', li.id)

    if (letErr) {
      console.error(`Erro ao atualizar invoice da Letícia ${li.id}:`, letErr.message)
    } else {
      console.log(`Fatura da Letícia ${li.id} marcada como paga em ${li.paidDate}`)
    }
  }

  console.log("\nCorreções concluídas!")
}

run().catch(console.error)
