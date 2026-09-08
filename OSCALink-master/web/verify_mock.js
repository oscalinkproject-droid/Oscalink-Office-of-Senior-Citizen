import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  console.log('--- SENIORS ---');
  const { data: seniors, error: err1 } = await supabase
    .from('seniors')
    .select('full_name, age, sex, place_of_birth, sector')
    .like('registration_id', 'MOCK-%');
  if (err1) console.error(err1);
  else console.table(seniors);

  console.log('--- ASSISTANCE REQUESTS ---');
  const { data: requests, error: err2 } = await supabase
    .from('assistance_requests')
    .select('title, sector, full_name')
    .like('title', 'MOCK %');
  if (err2) console.error(err2);
  else console.table(requests);
}

test();
