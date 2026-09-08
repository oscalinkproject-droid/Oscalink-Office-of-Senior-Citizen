/**
 * OSCALink Existing Data Audit
 * Analyzes what's actually stored in the database
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://qbdbxwcsvitlmikmdhso.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZGJ4d2Nzdml0bG1pa21kaHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNjY1NzMsImV4cCI6MjA5MDg0MjU3M30.GcFZGYfwEQpztJgRp6VjiPFe3qxarOrAxcEx8H7Aj2k';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function auditExistingData() {
  console.log('=== OSCALink Existing Data Audit ===\n');

  // Get all columns in seniors table
  console.log('1. Fetching existing seniors data...');
  const { data: seniors, error } = await supabase
    .from('seniors')
    .select('*');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log(`   Found ${seniors.length} senior records\n`);

  // Analyze stored fields
  console.log('2. Analyzing stored fields per record:');
  
  const allFields = new Set();
  seniors.forEach(s => Object.keys(s).forEach(k => allFields.add(k)));

  const fieldsArray = Array.from(allFields).sort();
  console.log(`   Total columns in database: ${fieldsArray.length}`);
  console.log('   Fields:', fieldsArray.join(', '));

  // Check extended fields
  const extendedFields = [
    'sex', 'civil_status', 
    'address_unit', 'address_building', 'address_lot_block', 'address_street', 'address_subdivision',
    'philhealth_no', 'sss_no', 'gsis_no', 'tin',
    'blood_type', 'religion', 'education', 'employment_status',
    'classification', 'monthly_income', 'is_verified'
  ];

  console.log('\n3. Extended field status:');
  for (const field of extendedFields) {
    const exists = fieldsArray.includes(field);
    console.log(`   ${field}: ${exists ? '✓ EXISTS' : '✗ MISSING'}`);
  }

  // Show sample record
  console.log('\n4. Sample record:');
  if (seniors.length > 0) {
    console.log(JSON.stringify(seniors[0], null, 2));
  }

  // Summary
  const missingExtended = extendedFields.filter(f => !fieldsArray.includes(f));
  console.log('\n=== SUMMARY ===');
  console.log(`Database columns: ${fieldsArray.length}`);
  console.log(`Extended fields missing: ${missingExtended.length}`);
  console.log(`Missing: ${missingExtended.join(', ')}`);
}

auditExistingData().catch(console.error);
