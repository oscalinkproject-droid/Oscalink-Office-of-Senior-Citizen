-- ==========================================
-- OSCALink: Fix register_senior_resident overloading
-- ==========================================
-- Two overloaded versions of this function existed (10-param and 11-param),
-- causing "Could not choose the best candidate function" errors
-- when the mobile app calls it during the Socio-Economic Info step.
-- This migration drops both and creates a single unified version.
-- ==========================================

-- Drop both overloads explicitly
DROP FUNCTION IF EXISTS register_senior_resident(text,text,text,text,text,text,text,text,boolean,text);
DROP FUNCTION IF EXISTS register_senior_resident(text,text,text,text,text,text,text,text,boolean,text,text);

-- Recreate unified version with p_middle_name
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
  p_pension_source TEXT DEFAULT NULL,
  p_middle_name TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  registration_id TEXT,
  birthdate TEXT,
  full_name TEXT,
  auth_user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg_id TEXT;
  v_new_id UUID;
  v_random INT;
  v_birthdate_clean TEXT;
  v_auth_result JSONB;
  v_auth_user_id UUID;
BEGIN
  v_birthdate_clean := TRIM(p_birthdate);
  IF v_birthdate_clean LIKE '%T%' THEN
    v_birthdate_clean := split_part(v_birthdate_clean, 'T', 1);
  END IF;

  v_random := floor(1000 + random() * 9000)::INT;
  v_reg_id := 'OSC-' || to_char(now(), 'YYYYMMDD') || '-' || v_random::TEXT;

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
    pension_source,
    middle_name
  ) VALUES (
    TRIM(p_full_name),
    v_reg_id,
    v_birthdate_clean::DATE,
    p_sex,
    p_barangay,
    p_contact_number,
    p_address,
    p_place_of_birth,
    'Pending',
    p_occupation,
    p_has_other_pension,
    p_pension_source,
    p_middle_name
  )
  RETURNING seniors.id, seniors.registration_id, seniors.birthdate, seniors.full_name
  INTO v_new_id, v_reg_id, v_birthdate_clean, p_full_name;

  INSERT INTO id_inventory (senior_id, id_status, booklet_status)
  VALUES (v_new_id, 'Pending', 'Pending');

  BEGIN
    v_auth_result := create_senior_auth_user(
      v_reg_id,
      v_birthdate_clean,
      TRIM(p_full_name),
      v_new_id
    );
    v_auth_user_id := (v_auth_result->>'user_id')::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_auth_user_id := NULL;
  END;

  RETURN QUERY
  SELECT v_new_id, v_reg_id, v_birthdate_clean, p_full_name, v_auth_user_id;
END;
$$;
