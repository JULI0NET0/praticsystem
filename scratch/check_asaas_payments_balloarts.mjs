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

const ASAAS_API_KEY = envVars.ASAAS_API_KEY
const ASAAS_BASE_URL = envVars.ASAAS_BASE_URL || 'https://api.asaas.com/v3'

async function asaasFetch(urlPath) {
  const res = await fetch(`${ASAAS_BASE_URL}${urlPath}`, {
    headers: {
      'access_token': ASAAS_API_KEY,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Asaas API error ${res.status}: ${text}`)
  }
  return res.json()
}

async function run() {
  // Find customer by CNPJ
  const cleanCnpj = '53108206000104'
  const customers = await asaasFetch(`/customers?cpfCnpj=${cleanCnpj}`)
  console.log("=== ASAAS CUSTOMERS ===")
  console.log(customers.data)

  if (customers.data && customers.data.length > 0) {
    const customerId = customers.data[0].id
    const payments = await asaasFetch(`/payments?customer=${customerId}&limit=100`)
    console.log("=== ASAAS PAYMENTS ===")
    payments.data.forEach(p => {
      console.log(`${p.dueDate} | ${p.value} | ${p.status} | ${p.paymentDate || 'N/A'} | ${p.id} | ${p.description}`)
    })
  }
}

run().catch(console.error)
