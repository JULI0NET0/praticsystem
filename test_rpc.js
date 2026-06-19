const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const dotenvContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf-8');
const env = {};
dotenvContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase.rpc('exec_sql', { query: 'SELECT 1' });
  console.log('exec_sql with query:', { data, error });
  const { data: data2, error: error2 } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });
  console.log('exec_sql with sql:', { data: data2, error: error2 });
}
test();
