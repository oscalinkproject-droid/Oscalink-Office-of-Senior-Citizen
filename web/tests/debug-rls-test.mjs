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

const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function testRole(label, email, password) {
  const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { error: loginErr } = await c.auth.signInWithPassword({ email, password });
  if (loginErr) {
    console.log(`  ⏭ ${label}: login failed (${loginErr.message})`);
    return;
  }
  
  const ts = Date.now();
  const rid = `RLSTEST-${ts}`;
  const { error } = await c.from('seniors').insert({
    registration_id: rid,
    full_name: 'RLS Test',
    age: 70,
    barangay: 'Bagua I',
    status: 'Pending',
  });
  
  if (error) {
    console.log(`  ✅ ${label}: BLOCKED (${error.code}: ${error.message})`);
  } else {
    console.log(`  ❌ ${label}: ALLOWED (should be blocked!)`);
    // Cleanup
    await client.from('seniors').delete().eq('registration_id', rid);
  }
}

async function main() {
  console.log('=== RLS INSERT Policy Test (against pre-existing test accounts) ===\n');
  await testRole('Anon (no auth)', 'anon@test.com', 'invalid');
  await testRole('OSCA Head (should allow)', 'head@gmail.com', 'password123');
  await testRole('Official (should allow)', 'official@gmail.com', 'official123');
  await testRole('Mayor (should BLOCK)', 'mayor@gmail.com', 'mayor123');
  console.log('\nDone');
}

main().catch(console.error);
