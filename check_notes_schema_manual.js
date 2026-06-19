const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
const dotenvContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf-8');
const env = {};
dotenvContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase.from('notes').select('*').limit(1);
  if (error) {
    console.error('Error fetching notes:', error);
  } else {
    console.log('Notes keys:', data && data[0] ? Object.keys(data[0]) : 'No records found or empty table');
  }
}
check();
