import { createClient } from '@supabase/supabase-js';


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("Fetching clients...");
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error("Supabase Error:", JSON.stringify(error, null, 2));
    console.error("Error message:", error.message);
  } else {
    console.log("Success! Data:", data);
  }
}

test();
