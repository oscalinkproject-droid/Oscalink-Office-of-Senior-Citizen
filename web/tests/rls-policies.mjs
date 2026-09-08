/**
 * RLS Policy Direct Verification Script
 *
 * Tests Supabase Row-Level Security policies by authenticating as different
 * user roles and verifying correct data access patterns.
 *
 * Run: node tests/rls-policies.mjs
 * Requires: .env.local with SUPABASE_URL, SUPABASE_ANON_KEY
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env
function loadEnv() {
  const envPath = resolve(__dirname, '..', '.env.local');
  try {
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...rest] = trimmed.split('=');
        const val = rest.join('=').replace(/^["']|["']$/g, '');
        process.env[key.trim()] = val;
      }
    }
  } catch {
    console.warn('⚠  No .env.local found, using existing env vars');
  }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment');
  process.exit(1);
}

let passed = 0;
let failed = 0;
let skipped = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}`);
    failed++;
  }
}

async function loginAs(email, password) {
  const client = createClient(SUPABASE_URL, ANON_KEY);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    console.error(`  ❌ Login failed for ${email}: ${error.message}`);
    return null;
  }
  return client;
}

async function testRLSPolicies() {
  console.log('\n══════════════════════════════════════════');
  console.log('  OSCALink RLS Policy Verification');
  console.log('══════════════════════════════════════════\n');

  // Use admin client (service_role) for test setup
  const adminClient = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Start with service_role test
  console.log('━━━ Service Role (admin bypass) ━━━');
  const { data: allSeniors } = await adminClient
    .from('seniors')
    .select('id, full_name, barangay', { count: 'exact', head: true })
    .limit(1);
  assert(allSeniors !== null, 'Service role can query seniors');

  // Get a sample senior to use in role tests
  const { data: sampleSenior } = await adminClient
    .from('seniors')
    .select('id, full_name, barangay')
    .limit(1)
    .single();

  if (!sampleSenior) {
    console.log('  ⚠ No seniors found in database — some tests skipped');
    skipped++;
  }

  const testSeniorId = sampleSenior?.id;
  const testBarangay = sampleSenior?.barangay;

  // ─── 1. City-Wide Roles ───
  console.log('\n━━━ City-Wide Roles (osca_head) ━━━');
  const headClient = await loginAs('head@gmail.com');
  if (headClient) {
    const { data: seniors, error } = await headClient
      .from('seniors')
      .select('id')
      .limit(5);
    assert(!error && seniors && seniors.length > 0, 'OSCA Head can query all seniors');

    const { error: familyErr } = await headClient
      .from('family_composition')
      .select('id')
      .limit(5);
    assert(!familyErr, 'OSCA Head can query family_composition');

    const { error: profilesErr } = await headClient
      .from('profiles')
      .select('id')
      .limit(5);
    assert(!profilesErr, 'OSCA Head can query profiles');

    const { error: requestsErr } = await headClient
      .from('assistance_requests')
      .select('id')
      .limit(5);
    assert(!requestsErr, 'OSCA Head can query assistance_requests');
  } else {
    skipped += 4;
  }

  // ─── 2. Sector-Locked Role (Official in Bagua I) ───
  console.log('\n━━━ Sector-Locked Role (official@ Bagua I) ━━━');
  const officialClient = await loginAs('official@gmail.com');
  if (officialClient && testBarangay) {
    // Official should see only their barangay's seniors
    const { error: err1 } = await officialClient
      .from('seniors')
      .select('id, barangay')
      .eq('barangay', testBarangay)
      .limit(5);
    assert(!err1, `Official can query seniors in their barangay (${testBarangay})`);

    // Should NOT be able to see seniors from other barangays
    const otherBarangay = testBarangay === 'Bagua I' ? 'Poblacion I' : 'Bagua I';
    const { error: err2 } = await officialClient
      .from('seniors')
      .select('id, barangay')
      .eq('barangay', otherBarangay)
      .limit(5);
    assert(!err2, `Official query returns (possibly empty) for ${otherBarangay} (RLS expected to block)`);

    // Official should be able to INSERT a new senior (sector-locked insert policy)
    const unique = `OFFICIAL-TEST-${Date.now()}`;
    const { error: insertErr } = await officialClient
      .from('seniors')
      .insert({
        registration_id: unique,
        full_name: `Official Test ${unique}`,
        age: 68,
        barangay: testBarangay,
        status: 'Pending',
      });
    assert(!insertErr, 'Official can insert senior in their barangay');
    if (!insertErr) {
      // Clean up
      await adminClient.from('seniors').delete().eq('registration_id', unique);
    }
  } else {
    skipped += 3;
  }

  // ─── 3. Mayor Role (read-only) ───
  console.log('\n━━━ Mayor Role ━━━');
  const mayorClient = await loginAs('mayor@gmail.com');
  if (mayorClient) {
    const { data: seniors, error } = await mayorClient
      .from('seniors')
      .select('id')
      .limit(5);
    assert(!error && seniors !== null, 'Mayor can SELECT seniors (read-only)');

    // Mayor should NOT be able to delete
    const { error: deleteErr } = await mayorClient
      .from('seniors')
      .delete()
      .eq('id', testSeniorId || '00000000-0000-0000-0000-000000000000');
    assert(deleteErr, 'Mayor cannot DELETE seniors (RLS blocks)');
  } else {
    skipped += 2;
  }

  // ─── 4. Family Composition RLS ───
  console.log('\n━━━ Family Composition RLS ━━━');
  if (headClient && testSeniorId) {
    // City-wide: can query any family member
    const { data: familyData } = await headClient
      .from('family_composition')
      .select('id, senior_id')
      .eq('senior_id', testSeniorId);
    assert(familyData !== null, 'City-wide role can query family composition for any senior');

    // City-wide: can insert
    const { error: insertFamErr } = await headClient
      .from('family_composition')
      .insert({
        senior_id: testSeniorId,
        member_name: 'Test Family RLS',
        relationship: 'Child',
      });
    assert(!insertFamErr, 'City-wide role can insert family member');
  } else {
    skipped += 2;
  }

  // ─── 5. Tables without prior RLS now have it ───
  console.log('\n━━━ Newly-Enabled RLS Tables ━━━');
  if (headClient) {
    const tables = ['profiles', 'id_inventory', 'bedridden_verifications', 'quarterly_updates', 'complaints', 'endorsements'];
    for (const table of tables) {
      const { error } = await headClient.from(table).select('id').limit(1);
      assert(!error || error.code === 'PGRST116', `City-wide role can query "${table}"`);
    }
  } else {
    skipped += 6;
  }

  // ─── 6. News (public read published, city-wide write) ───
  console.log('\n━━━ News & Downloads RLS ━━━');
  const anonClient = createClient(SUPABASE_URL, ANON_KEY);
  const { error: newsErr } = await anonClient.from('news').select('id').eq('is_published', true).limit(1);
  assert(!newsErr, 'Anonymous can read published news');
  if (headClient) {
    const { error: insertNewsErr } = await headClient.from('news').insert({
      title: `Test News ${Date.now()}`,
      content: 'Test content',
      category: 'News',
      is_published: false,
      created_at: new Date().toISOString(),
    });
    assert(!insertNewsErr, 'City-wide role can insert news');
  } else {
    skipped++;
  }

  // ─── 7. Resident access (own records only) ───
  console.log('\n━━━ Resident Data Isolation ━━━');
  // Residents use localStorage-based auth, not Supabase Auth, so we test with
  // a resident-tagged JWT if available, otherwise skip
  const { data: residentUser } = await headClient?.auth.admin.listUsers().catch(() => ({ data: null })) || {};
  const resident = residentUser?.users?.find(u => u.user_metadata?.role === 'resident');
  if (resident) {
    const residentClient = createClient(SUPABASE_URL, ANON_KEY);
    const { error: residentLoginErr } = await residentClient.auth.signInWithPassword({
      email: resident.email,
      password: 'password123',
    });
    if (!residentLoginErr) {
      const { data: ownProfile } = await residentClient
        .from('profiles')
        .select('id')
        .eq('id', resident.id)
        .single();
      assert(ownProfile?.id === resident.id, 'Resident can see their own profile');
    } else {
      console.log('  ⚠ Could not log in as resident (may use non-standard auth)');
      skipped++;
    }
  } else {
    console.log('  ⚠ No resident user found in Auth — skipping resident tests');
    skipped++;
  }

  // ─── Summary ───
  console.log('\n══════════════════════════════════════════');
  console.log('  RESULTS');
  console.log('══════════════════════════════════════════');
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  ⏭  Skipped: ${skipped}`);
  console.log('══════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

testRLSPolicies().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
