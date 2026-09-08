/**
 * OSCALink Smoke Test Script
 * Tests database integration, registration, and data persistence
 * 
 * Usage: node scripts/smoke-test.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://qbdbxwcsvitlmikmdhso.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZGJ4d2Nzdml0bG1pa21kaHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNjY1NzMsImV4cCI6MjA5MDg0MjU3M30.GcFZGYfwEQpztJgRp6VjiPFe3qxarOrAxcEx8H7Aj2k';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TEST_RECORDS = [];

function generateRandomId() {
  return 'TEST-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateMockSenior() {
  const firstNames = ['Juan', 'Maria', 'Pedro', 'Rosa', 'Carlos', 'Ana', 'Jose', 'Lisa'];
  const lastNames = ['Dela Cruz', 'Garcia', 'Mendoza', 'Santos', 'Rodriguez', 'Bautista'];
  const barangays = ['Barangay 1', 'Barangay 2', 'Rosary Heights 1', 'Poblacion 1', 'Bagua 1'];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  
  return {
    registration_id: generateRandomId(),
    full_name: `${lastName}, ${firstName} Test`,
    age: Math.floor(Math.random() * 30) + 60,
    sector: barangays[Math.floor(Math.random() * barangays.length)],
    status: 'Pending',
    contact_number: '+63' + Math.floor(Math.random() * 9000000000 + 1000000000),
    birthdate: '1960-' + String(Math.floor(Math.random() * 12) + 1).padStart(2, '0') + '-' + String(Math.floor(Math.random() * 28) + 1).padStart(2, '0'),
    
    // Extended fields (to test if they get saved)
    sex: Math.random() > 0.5 ? 'M' : 'F',
    civil_status: ['Single', 'Married', 'Widowed'][Math.floor(Math.random() * 3)],
    address_unit: 'Unit ' + Math.floor(Math.random() * 100),
    address_building: 'Building A',
    address_lot_block: 'Lot ' + Math.floor(Math.random() * 50),
    address_street: 'Main Street',
    address_subdivision: 'Villa Subdivision',
    philhealth_no: '12-' + Math.floor(Math.random() * 900000000 + 100000000) + '-' + Math.floor(Math.random() * 10),
    sss_no: Math.floor(Math.random() * 9000000000 + 1000000000),
    gsis_no: Math.floor(Math.random() * 90000000000 + 10000000000),
    tin: Math.floor(Math.random() * 900000000 + 100000000),
    blood_type: ['A+', 'B+', 'O+', 'AB+'][Math.floor(Math.random() * 4)],
    religion: 'Roman Catholic',
    education: 'High School Graduate',
    employment_status: 'Retired',
    classification: ['Pensioner', 'Indigent', 'Supported'][Math.floor(Math.random() * 3)],
    monthly_income: Math.floor(Math.random() * 20000) + 5000,
    is_verified: false
  };
}

async function testDatabaseConnection() {
  console.log('\n=== TEST 1: Database Connection ===');
  try {
    const { data, error } = await supabase
      .from('seniors')
      .select('id, full_name, status')
      .limit(1);
    
    if (error) throw error;
    console.log('✓ Database connection successful');
    console.log('  Sample record:', data[0] || 'No records found');
    return true;
  } catch (err) {
    console.error('✗ Database connection failed:', err.message);
    return false;
  }
}

async function testRegistration() {
  console.log('\n=== TEST 2: Senior Registration (Mock Data) ===');
  
  const mockData = generateMockSenior();
  console.log('  Creating mock senior:', mockData.full_name);
  
  // Only use fields that exist in current database schema
  const coreData = {
    registration_id: mockData.registration_id,
    full_name: mockData.full_name,
    age: mockData.age,
    sector: mockData.sector,
    status: mockData.status,
    contact_number: mockData.contact_number,
    birthdate: mockData.birthdate
  };

  console.log('  Core fields:', coreData);
  console.log('  Extended fields (will be dropped):', {
    sex: mockData.sex,
    civil_status: mockData.civil_status,
    philhealth_no: mockData.philhealth_no,
    sss_no: mockData.sss_no,
    classification: mockData.classification,
    monthly_income: mockData.monthly_income
  });

  try {
    const { data, error } = await supabase
      .from('seniors')
      .insert([mockData])
      .select()
      .single();

    if (error) throw error;
    
    console.log('✓ Registration successful');
    console.log('  Generated ID:', data.id);
    TEST_RECORDS.push(data.id);
    return data;
  } catch (err) {
    console.error('✗ Registration failed:', err.message);
    return null;
  }
}

async function testDataPersistence(createdRecord) {
  console.log('\n=== TEST 3: Data Persistence Verification ===');
  
  if (!createdRecord) {
    console.log('✗ Skipped - no record to verify');
    return false;
  }

  try {
    // Fetch the record back
    const { data, error } = await supabase
      .from('seniors')
      .select('*')
      .eq('id', createdRecord.id)
      .single();

    if (error) throw error;

    console.log('  Fetched record fields:');
    
    const coreFields = [
      'registration_id', 'full_name', 'age', 'sector', 'status', 
      'contact_number', 'birthdate', 'last_check_in', 'created_at'
    ];
    
    const expectedExtendedFields = [
      'sex', 'civil_status', 'address_unit', 'address_building',
      'address_lot_block', 'address_street', 'address_subdivision',
      'philhealth_no', 'sss_no', 'gsis_no', 'tin',
      'blood_type', 'religion', 'education', 'employment_status',
      'classification', 'monthly_income', 'is_verified'
    ];

    let coreOk = 0;
    let schemaMissing = 0;
    let notSaved = 0;

    console.log('\n  CORE FIELDS (Expected to save):');
    for (const field of coreFields) {
      const value = data[field];
      const saved = value !== null && value !== undefined;
      console.log(`    ${field}: ${saved ? '✓' : '✗'} (${value || 'null'})`);
      if (saved) coreOk++;
    }

    console.log('\n  EXTENDED FIELDS (PhilHealth, IDs, Demographics):');
    console.log('  These exist in code but may not exist in DB schema:');
    for (const field of expectedExtendedFields) {
      const value = data[field];
      if (value === undefined) {
        console.log(`    ${field}: ⚠️  SCHEMA MISSING (column not in DB)`);
        schemaMissing++;
      } else if (value === null || value === '') {
        console.log(`    ${field}: ✗ NOT SAVED (null)`);
        notSaved++;
      } else {
        console.log(`    ${field}: ✓ saved (${value})`);
      }
    }

    console.log('\n  SUMMARY:');
    console.log(`    Core fields: ${coreOk}/${coreFields.length} saved`);
    console.log(`    Extended fields: ${schemaMissing} columns missing from DB schema`);
    console.log(`    Extended fields: ${notSaved} not saved (Ghost Inputs)`);

    if (schemaMissing > 0) {
      console.log('\n  ⚠️  CRITICAL: Database schema not migrated!');
      console.log(`     ${schemaMissing} columns from migration are NOT in the database.`);
      console.log('     Run the migration: 20260330000001_expanded_seniors_schema.sql');
    }

    if (notSaved > 0) {
      console.log('\n  ⚠️  WARNING: GHOST INPUTS DETECTED!');
      console.log('     Extended fields collected in UI but NOT saved to DB');
    }

    return schemaMissing === 0 && notSaved === 0;
  } catch (err) {
    console.error('✗ Verification failed:', err.message);
    return false;
  }
}

async function testDashboardMetrics() {
  console.log('\n=== TEST 4: Dashboard Metrics ===');
  
  try {
    const { count: totalSeniors, error: countError } = await supabase
      .from('seniors')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    const { count: activeCount, error: activeError } = await supabase
      .from('seniors')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Active');

    if (activeError) throw activeError;

    const { count: pendingCount, error: pendingError } = await supabase
      .from('seniors')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Pending');

    if (pendingError) throw pendingError;

    console.log('✓ Metrics retrieved successfully');
    console.log(`  Total Seniors: ${totalSeniors}`);
    console.log(`  Active: ${activeCount}`);
    console.log(`  Pending: ${pendingCount}`);

    return true;
  } catch (err) {
    console.error('✗ Metrics retrieval failed:', err.message);
    return false;
  }
}

async function testPhilHealthExport() {
  console.log('\n=== TEST 5: PhilHealth Export Data Query ===');
  
  try {
    const { data, error } = await supabase
      .from('seniors')
      .select(`
        id, full_name, birthdate, sex, civil_status, sector,
        address, address_unit, address_building, address_lot_block,
        address_street, address_subdivision, contact_number,
        philhealth_no, gsis_no, sss_no, tin, classification, monthly_income
      `)
      .eq('status', 'Active')
      .limit(10);

    if (error) throw error;

    console.log('✓ PhilHealth export query successful');
    console.log(`  Records fetched: ${data.length}`);
    
    const withPhilHealth = data.filter(s => s.philhealth_no).length;
    console.log(`  With PhilHealth #: ${withPhilHealth}`);

    return true;
  } catch (err) {
    console.error('✗ PhilHealth export query failed:', err.message);
    return false;
  }
}

async function cleanupTestRecords() {
  console.log('\n=== CLEANUP: Removing Test Records ===');
  
  if (TEST_RECORDS.length === 0) {
    console.log('  No test records to clean up');
    return;
  }

  try {
    const { error } = await supabase
      .from('seniors')
      .delete()
      .in('id', TEST_RECORDS);

    if (error) throw error;

    console.log(`✓ Successfully deleted ${TEST_RECORDS.length} test record(s)`);
    console.log('  Deleted IDs:', TEST_RECORDS.join(', '));
  } catch (err) {
    console.error('✗ Cleanup failed:', err.message);
    console.log('  Manual cleanup required for IDs:', TEST_RECORDS.join(', '));
  }
}

async function runSmokeTests() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║         OSCALink Smoke Test - Zero Error Audit           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('Starting tests at:', new Date().toISOString());

  const results = {
    connection: false,
    registration: false,
    persistence: false,
    metrics: false,
    philhealth: false
  };

  // Run tests
  results.connection = await testDatabaseConnection();
  
  if (results.connection) {
    const createdRecord = await testRegistration();
    results.registration = createdRecord !== null;
    
    if (createdRecord) {
      results.persistence = await testDataPersistence(createdRecord);
    }
  }
  
  results.metrics = await testDashboardMetrics();
  results.philhealth = await testPhilHealthExport();

  // Summary
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                      TEST SUMMARY                         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(`  Database Connection:    ${results.connection ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`  Senior Registration:    ${results.registration ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`  Data Persistence:      ${results.persistence ? '✓ PASS' : '✗ FAIL (Ghost Inputs!)'}`);
  console.log(`  Dashboard Metrics:     ${results.metrics ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`  PhilHealth Export:      ${results.philhealth ? '✓ PASS' : '✗ FAIL'}`);

  const allPassed = Object.values(results).every(v => v);
  
  if (!results.persistence) {
    console.log('\n⚠️  CRITICAL: Data loss detected!');
    console.log('   Extended fields are NOT being saved to the database.');
    console.log('   See QA_AUDIT_REPORT.md for details.');
  }

  // Cleanup
  await cleanupTestRecords();

  console.log('\n' + (allPassed ? '✓ All tests passed!' : '✗ Some tests failed - see above'));
  console.log('═══════════════════════════════════════════════════════════\n');

  process.exit(allPassed ? 0 : 1);
}

runSmokeTests().catch(console.error);
