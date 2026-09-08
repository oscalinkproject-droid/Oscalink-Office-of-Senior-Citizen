-- Mock data test script for OSCALink bug fixes
-- Tests: age trigger, place_of_birth, sex, contact number storage, sector filtering
-- All inserts use registration_id prefix MOCK- for easy cleanup

-- TEST 1: Insert senior with birthdate only (age should auto-compute via trigger)
INSERT INTO seniors (
  full_name, registration_id, birthdate, sex, barangay,
  contact_number, place_of_birth, status
) VALUES (
  'MOCK Juan Dela Cruz',
  'MOCK-AGE-001',
  '1955-03-15',   -- born 1955, should be ~70-71 in 2026
  'M',
  'Bagua I',
  '09123456789',
  'Bagua I, Cotabato City',
  'Pending'
);

-- TEST 2: Female senior - verify sex field saves correctly
INSERT INTO seniors (
  full_name, registration_id, birthdate, sex, barangay,
  contact_number, place_of_birth, status
) VALUES (
  'MOCK Maria Santos',
  'MOCK-SEX-002',
  '1960-07-20',   -- born 1960, should be ~65-66 in 2026
  'F',
  'Kalanganan I',
  '09987654321',
  'Maguindanao',
  'Pending'
);

-- TEST 3: Senior from different barangay for isolation test
INSERT INTO seniors (
  full_name, registration_id, birthdate, sex, barangay,
  contact_number, place_of_birth, status
) VALUES (
  'MOCK Pedro Reyes',
  'MOCK-SEC-003',
  '1950-11-01',   -- born 1950, should be ~75 in 2026
  'M',
  'Poblacion 1',
  '09111222333',
  'Davao City',
  'Pending'
);

-- TEST 4: Assistance request linked to Bagua I senior (for barangay filter test)
INSERT INTO assistance_requests (
  title, description, full_name, category, priority, status, barangay
) VALUES (
  'MOCK Medical Assistance - Bagua',
  'Mock test request for barangay isolation testing',
  'MOCK Juan Dela Cruz',
  'Medical',
  'ROUTINE',
  'Pending',
  'Bagua I'
);

-- TEST 5: Assistance request for Kalanganan (different barangay)
INSERT INTO assistance_requests (
  title, description, full_name, category, priority, status, barangay
) VALUES (
  'MOCK Financial Aid - Kalanganan',
  'Mock test request from different barangay',
  'MOCK Maria Santos',
  'Financial',
  'ROUTINE',
  'Pending',
  'Kalanganan I'
);

SELECT 'Mock data inserted successfully' AS result;
