-- Secure authentication lookups and self-registration for senior residents
-- Running under SECURITY DEFINER to bypass client RLS restrictions safely

-- 1. Function to verify senior resident credentials (plaintext registration_id + birthdate)
CREATE OR REPLACE FUNCTION verify_senior_login(p_registration_id TEXT, p_birthdate TEXT)
RETURNS TABLE (
  id UUID,
  registration_id TEXT,
  birthdate TEXT,
  full_name TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with owner privileges, bypassing RLS
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.registration_id, s.birthdate::TEXT, s.full_name, s.status
  FROM seniors s
  WHERE UPPER(TRIM(s.registration_id)) = UPPER(TRIM(p_registration_id))
    AND s.birthdate = p_birthdate::DATE;
END;
$$;

-- 2. Function to register a new senior citizen and generate their ID inventory record transactionally
CREATE OR REPLACE FUNCTION register_senior_resident(
  p_full_name TEXT,
  p_birthdate TEXT,
  p_sex TEXT,
  p_barangay TEXT,
  p_contact_number TEXT,
  p_address TEXT,
  p_place_of_birth TEXT DEFAULT NULL,
  p_occupation TEXT DEFAULT NULL,
  p_has_other_pension BOOLEAN DEFAULT FALSE,
  p_pension_source TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  registration_id TEXT,
  birthdate TEXT,
  full_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with owner privileges, bypassing RLS
SET search_path = public
AS $$
DECLARE
  v_reg_id TEXT;
  v_new_id UUID;
  v_random INT;
  v_birthdate_clean TEXT;
BEGIN
  -- Standardize birthdate format (YYYY-MM-DD)
  v_birthdate_clean := TRIM(p_birthdate);
  IF v_birthdate_clean LIKE '%T%' THEN
    v_birthdate_clean := split_part(v_birthdate_clean, 'T', 1);
  END IF;

  -- Generate registration ID format: OSC-YYYYMMDD-XXXX
  v_random := floor(1000 + random() * 9000)::INT;
  v_reg_id := 'OSC-' || to_char(now(), 'YYYYMMDD') || '-' || v_random::TEXT;

  -- Insert senior record with 'Pending' status
  INSERT INTO seniors (
    full_name,
    registration_id,
    birthdate,
    sex,
    barangay,
    contact_number,
    address,
    place_of_birth,
    status,
    occupation,
    has_other_pension,
    pension_source
  ) VALUES (
    TRIM(p_full_name),
    v_reg_id,
    v_birthdate_clean,
    p_sex,
    p_barangay,
    p_contact_number,
    p_address,
    p_place_of_birth,
    'Pending',
    p_occupation,
    p_has_other_pension,
    p_pension_source
  )
  RETURNING seniors.id, seniors.registration_id, seniors.birthdate, seniors.full_name
  INTO v_new_id, v_reg_id, v_birthdate_clean, p_full_name;

  -- Automatically create a pending ID card & booklet inventory record
  INSERT INTO id_inventory (senior_id, id_status, booklet_status)
  VALUES (v_new_id, 'Pending', 'Pending');

  RETURN QUERY SELECT v_new_id, v_reg_id, v_birthdate_clean, p_full_name;
END;
$$;
