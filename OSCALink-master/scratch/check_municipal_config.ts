import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Try to find .env file
const envPath = path.resolve(process.cwd(), 'web', '.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkConfig() {
  const { data, error } = await supabase.from('municipal_config').select('*').single();
  if (error) {
    console.error('Error fetching municipal_config:', error);
  } else {
    console.log('Municipal Config:', data);
  }
}

checkConfig();
