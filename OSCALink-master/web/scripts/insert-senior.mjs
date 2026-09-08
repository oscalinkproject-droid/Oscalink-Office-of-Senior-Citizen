import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL in web/.env');
  process.exit(1);
}
if (!serviceRoleKey) {
  console.error(
    'Missing SUPABASE_SERVICE_ROLE_KEY in web/.env or web/.env.local\n' +
      'Paste your rotated service_role key there, then run this script again.'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const record = {
  registration_id: 'REF-19660901-6461',
  id_number: null,
  full_name: 'Wee Go Kan',
  birthdate: '1966-09-01',
  status: 'Pending',
  barangay: 'Bagua I',
};

async function main() {
  const { data, error } = await supabase
    .from('seniors')
    .insert([record])
    .select();

  if (error) {
    console.error('Insert failed:', error.message);
    process.exit(1);
  }

  console.log('Inserted successfully:');
  console.log(JSON.stringify(data, null, 2));
}

main();
