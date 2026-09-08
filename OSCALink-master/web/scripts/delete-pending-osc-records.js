// Delete old PENDING records that still hold an "OSC-" identifier.
//
// Uses the Supabase SERVICE ROLE key (bypasses RLS). Run from ./web:
//   node scripts/delete-pending-osc-records.js            # dry-run (safe, counts only)
//   node scripts/delete-pending-osc-records.js --confirm  # actually deletes
//
// Prints:
//   - every matching record (to review scope)
//   - the number of records DELETED (or would-be-deleted)
//   - the remaining Pending count after the operation
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const PENDING = ['Pending', 'Pending Barangay', 'Pending OSCA', 'Pending Mayor'];

const CONFIRM = process.argv.includes('--confirm');

if (!url) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL is not set (web/.env.local).');
  process.exit(1);
}
if (!serviceKey) {
  console.warn('WARN: SUPABASE_SERVICE_ROLE_KEY not set; falling back to ANON key. RLS may block DELETE.');
}

const supabase = createClient(url, serviceKey || anonKey);

async function main() {
  // 1. Fetch all Pending records (filtered in JS to avoid PostgREST pattern quirks).
  const { data: rows, error } = await supabase
    .from('seniors')
    .select('id, full_name, status, registration_id, id_number')
    .in('status', PENDING);

  if (error) {
    console.error('ERROR fetching pending records:', error.message);
    process.exit(1);
  }

  const matches = (rows || []).filter(
    (r) =>
      (r.registration_id && r.registration_id.startsWith('OSC-')) ||
      (r.id_number && r.id_number.startsWith('OSC-'))
  );

  console.log(`\nPending records fetched: ${(rows || []).length}`);
  console.log(`Records matching (OSC- prefix, to be deleted): ${matches.length}\n`);

  if (matches.length) {
    console.log('--- Matching records ---');
    matches.forEach((r) =>
      console.log(
        `  [${r.status}] ${r.full_name}  registration_id=${r.registration_id ?? 'null'}  id_number=${r.id_number ?? 'null'}`
      )
    );
    console.log('------------------------\n');
  }

  if (!CONFIRM) {
    console.log('DRY-RUN: nothing deleted. Re-run with --confirm to actually delete.');
  } else {
    const ids = matches.map((r) => r.id);
    if (ids.length) {
      const { error: delErr } = await supabase
        .from('seniors')
        .delete()
        .in('id', ids);
      if (delErr) {
        console.error('ERROR deleting records:', delErr.message);
        process.exit(1);
      }
    }
    console.log(`DELETED: ${ids.length} record(s).`);
  }

  // 2. Verification: remaining pending count after the operation.
  const { count: remainingPending } = await supabase
    .from('seniors')
    .select('id', { count: 'exact', head: true })
    .in('status', PENDING);
  const { count: remainingOsc } = await supabase
    .from('seniors')
    .select('id', { count: 'exact', head: true })
    .in('status', PENDING)
    .or(`registration_id.like.OSC-%,id_number.like.OSC-%`);

  console.log(`Remaining Pending total: ${remainingPending ?? 0}`);
  console.log(`Remaining Pending with OSC- prefix: ${remainingOsc ?? 0}`);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
