import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  console.log('Testing services...')
  const { data: services, error: sError } = await supabase.from('services').select('*')
  if (sError) console.error('Services Error:', sError)
  else console.log('Services count:', services?.length)

  console.log('Testing contracts...')
  const { data: contracts, error: cError } = await supabase.from('contracts').select('*')
  if (cError) console.error('Contracts Error:', cError)
  else console.log('Contracts count:', contracts?.length)
}

test()
