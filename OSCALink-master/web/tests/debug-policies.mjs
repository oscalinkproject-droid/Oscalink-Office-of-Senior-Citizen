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

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // Check if RLS is enabled on seniors table
  const { error: rlsErr } = await admin
    .from('seniors')
    .select('id')
    .limit(1);
  console.log('seniors accessible:', rlsErr ? 'NO - ' + rlsErr.message : 'YES');

  // Test direct SQL via a wrapper - use /rest/v1/rpc/ with a known function
  const { data: funcData, error: funcErr } = await admin.rpc('is_city_wide_role');
  console.log('\nis_city_wide_role:', funcData, funcErr?.message || 'ok');
  
  // Just create a mayor and test
  const ts = Date.now();
  const { data: u } = await admin.auth.admin.createUser({
    email: `policy-test-${ts}@test.com`,
    password: 'Test123!',
    email_confirm: true,
    user_metadata: { full_name: 'Policy Test', role: 'mayor', barangay: null },
  });
  
  const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  await c.auth.signInWithPassword({ email: `policy-test-${ts}@test.com`, password: 'Test123!' });
  
  // Try INSERT
  const { error: iErr } = await c.from('seniors').insert({
    registration_id: `POL-${ts}`,
    full_name: 'Policy Test Mayor',
    age: 80,
    barangay: 'Bagua I',
    status: 'Pending',
  });
  console.log('\nMayor INSERT:', iErr ? `BLOCKED: ${iErr.message}` : 'ALLOWED');
  if (!iErr) {
    // Cleanup
    await admin.from('seniors').delete().eq('registration_id', `POL-${ts}`);
  }
  
  // Try SELECT
  const { data: sData, error: sErr } = await c.from('seniors').select('id').limit(1);
  console.log('Mayor SELECT:', sErr ? `ERROR: ${sErr.message}` : `OK (${sData?.length || 0} rows)`);
  
  // Cleanup user
  await admin.auth.admin.deleteUser(u.user.id);
}

main().catch(console.error);
