import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase
    .from('notes')
    .select('*, client:clients(id, name, nome_fantasia)')
    .order('updated_at', { ascending: false });

  console.log('Error:', error);
  console.log('Data count:', data ? data.length : 0);
}

run();
