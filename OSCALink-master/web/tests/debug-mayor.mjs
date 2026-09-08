import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envContent = readFileSync(resolve(__dirname, '..', '.env.local'), 'utf8');
for (const line of envContent.split('\n')) {
  const t = line.trim();
  if (t && !t.startsWith('#')) {
    const [k, ...v] = t.split('=');
    process.env[k.trim()] = v.join('=').replace(/^["']|["']$/g, '');
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // Create a test mayor user
  const ts = Date.now();
  const email = `debug-mayor-${ts}@test.com`;
  const { data: user } = await admin.auth.admin.createUser({
    email,
    password: 'TestPass123!',
    email_confirm: true,
    user_metadata: { full_name: 'Debug Mayor', role: 'mayor', barangay: null },
  });
  
  console.log('Created mayor:', email, user?.user?.id);
  
  // Sign in as mayor
  const client = createClient(SUPABASE_URL, ANON_KEY);
  const { data: session } = await client.auth.signInWithPassword({ email, password: 'TestPass123!' });
  
  if (session?.session) {
    const payload = JSON.parse(atob(session.session.access_token.split('.')[1]));
    console.log('\nMayor JWT claims:', JSON.stringify(payload, null, 2));
    
    // Test INSERT
    console.log('\n--- Testing INSERT ---');
    const { error: insertErr } = await client.from('seniors').insert({
      registration_id: `MAYOR-DEBUG-${ts}`,
      full_name: 'Debug Mayor Test',
      age: 80,
      barangay: 'Bagua I',
      status: 'Pending',
    });
    console.log('INSERT error:', insertErr ? `${insertErr.code}: ${insertErr.message}` : 'NONE (allowed!)');
    
    if (!insertErr) {
      console.log('❌ Mayor CAN insert — RLS not enforced');
    } else {
      console.log('✅ Mayor INSERT blocked by RLS');
    }
  } else {
    console.log('Sign in failed');
  }
  
  // Cleanup
  await admin.auth.admin.deleteUser(user.user.id);
}

main().catch(console.error);
