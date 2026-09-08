// Delete the specific test/dummy PENDING seniors listed below.
//
// Uses the Supabase SERVICE ROLE key (bypasses RLS). Run from ./web:
//   node scripts/delete-test-pending-seniors.js           # dry-run (safe, shows matches)
//   node scripts/delete-test-pending-seniors.js --confirm # actually deletes
//
// Matches by full_name (primary) OR registration_id (including legacy "OSC-"
// forms and the "REF-" / "sdfsdf" variants), then deletes the exact matched rows
// and prints a verification count.
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const CONFIRM = process.argv.includes('--confirm');

if (!url) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL is not set (web/.env).');
  process.exit(1);
}
if (!serviceKey) {
  console.warn('WARN: SUPABASE_SERVICE_ROLE_KEY not set; falling back to ANON key. RLS may block DELETE.');
}

const supabase = createClient(url, serviceKey || anonKey);

// Exact target identifiers from the user's request.
const TARGET_REG_IDS = [
  'OSC-20261229-47', 'OSC-20260717-1324', 'OSC-20260717-1234', 'sdfsdf',
  'OSC-20260608-1848', 'OSC-20260608-3729', 'OSC-20260601-7755', 'OSC-20260601-1384',
  'OSC-20260531-7647', 'OSC-20260531-7515', 'OSC-20260528-6958', 'OSC-20260528-7200',
  'OSC-20260526-6263', 'OSC-20260526-3522', 'OSC-20260526-8704', 'OSC-20260505-1155',
  'OSC-20260424-1966',
];

const TARGET_NAMES = [
  'adwdad, dreiads',
  'Geron, Felicita Sebastian',
  'Grave, Edwin D., Sr.',
  'fsdfsd, fsdfsdf sdfsdfsdf, II (sdfsdf)',
  'Aokjhak Kskabak',
  'Ken Cruz',
  'Nhel Khalid',
  'Aziz NOR',
  'Prias, Mark',
  'Daryll Valencia Ariego',
  'link, osca',
  'Ken, Yen',
  'Ong, Albert',
  'Maria Hwasa',
  'Jabo Wakez',
  'Tsek Sistoso',
];

async function main() {
  // Fetch candidate rows that could match either a target name or a target id.
  const { data: rows, error } = await supabase
    .from('seniors')
    .select('id, full_name, status, registration_id, id_number')
    .filter('full_name', 'in', `(${TARGET_NAMES.map((n) => `"${n.replace(/"/g, '""')}"`).join(',')})`)
    .or(TARGET_REG_IDS.map((r) => `registration_id.eq.${r}`).join(','));

  if (error) {
    console.error('ERROR fetching candidate records:', error.message);
    process.exit(1);
  }

  const candidates = rows || [];
  // Final safety filter: only rows that truly match a target name OR target id.
  const targetRegSet = new Set(TARGET_REG_IDS);
  const targetNameSet = new Set(TARGET_NAMES);
  const matches = candidates.filter(
    (r) => targetNameSet.has(r.full_name) || targetRegSet.has(r.registration_id)
  );

  console.log(`\nCandidate records fetched: ${candidates.length}`);
  console.log(`Exact matches to delete: ${matches.length}\n`);

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

  // Verification: remaining target-name records and remaining pending total.
  const { count: remainingNamed } = await supabase
    .from('seniors')
    .select('id', { count: 'exact', head: true })
    .filter('full_name', 'in', `(${TARGET_NAMES.map((n) => `"${n.replace(/"/g, '""')}"`).join(',')})`);
  const { count: remainingPending } = await supabase
    .from('seniors')
    .select('id', { count: 'exact', head: true })
    .in('status', ['Pending', 'Pending Barangay', 'Pending OSCA', 'Pending Mayor']);

  console.log(`Remaining target-name records: ${remainingNamed ?? 0}`);
  console.log(`Remaining Pending total: ${remainingPending ?? 0}`);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
