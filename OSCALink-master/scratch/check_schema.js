const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'web/.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  console.log('Checking database tables and columns...');
  
  // Check seniors columns
  const { data: colsSeniors, error: errSeniors } = await supabase
    .from('seniors')
    .select('*')
    .limit(1);

  if (errSeniors) {
    console.error('Error fetching seniors:', errSeniors);
  } else {
    console.log('Seniors columns:', Object.keys(colsSeniors[0] || {}));
  }

  // Check assistance_requests columns
  const { data: colsReqs, error: errReqs } = await supabase
    .from('assistance_requests')
    .select('*')
    .limit(1);

  if (errReqs) {
    console.error('Error fetching assistance_requests:', errReqs);
  } else {
    console.log('Assistance Requests columns:', Object.keys(colsReqs[0] || {}));
  }

  // Test verify_senior_login RPC
  const { data: rpcTest, error: errRpc } = await supabase
    .rpc('verify_senior_login', { p_registration_id: 'TEST', p_birthdate: '1960-01-01' });

  if (errRpc) {
    console.log('verify_senior_login RPC status: ERROR -', errRpc.message);
  } else {
    console.log('verify_senior_login RPC status: EXISTS, returned:', rpcTest);
  }
}

check();
