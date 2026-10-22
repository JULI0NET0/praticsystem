// Cria a identidade "Grok" (auth.users + public.users) para o chat interno
// e grava GROK_BOT_USER_ID no .env.local. Uso: node scripts/provision_grok_bot.mjs
import { readFileSync, appendFileSync } from 'node:fs';
import { randomBytes, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^"|"$/g, '')])
);
if (env.GROK_BOT_USER_ID) {
  console.log('GROK_BOT_USER_ID já existe:', env.GROK_BOT_USER_ID);
  process.exit(0);
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const email = `grok-bot-${randomUUID().slice(0, 8)}@bots.praticlabs.com.br`;
const { data, error } = await supabase.auth.admin.createUser({
  email,
  password: randomBytes(32).toString('hex'),
  email_confirm: true,
  user_metadata: { name: 'Grok' },
});
if (error) throw error;
const id = data.user.id;
const { error: upErr } = await supabase
  .from('users')
  .upsert({ id, name: 'Grok', email, username: 'grok', role: 'Agente de IA' });
if (upErr) throw upErr;
appendFileSync('.env.local', `\nGROK_BOT_USER_ID=${id}\n`);
console.log('Grok criado. GROK_BOT_USER_ID gravado no .env.local:', id);
