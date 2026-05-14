import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://uemmewnqgxwodifuslgy.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlbW1ld25xZ3h3b2RpZnVzbGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MTUyMjksImV4cCI6MjA5Mzk5MTIyOX0.xICBXw17_tIIV2GSG7MOfrKZibuNOmm8yrBNOe-engY'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  console.log('Testing services...')
  const { data: services, error: sError } = await supabase.from('services').select('*')
  if (sError) console.error('Services Error:', sError)
  else console.log('Services:', JSON.stringify(services, null, 2))

  console.log('Testing contracts...')
  const { data: contracts, error: cError } = await supabase.from('contracts').select('*')
  if (cError) console.error('Contracts Error:', cError)
  else console.log('Contracts count:', contracts?.length)
}

test()
