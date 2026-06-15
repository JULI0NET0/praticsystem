import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function listClients() {
  const { data, error } = await supabase.from('clients').select('id, name, nome_fantasia');
  if (error) console.error(error);
  console.log(JSON.stringify(data, null, 2));
}

listClients();
