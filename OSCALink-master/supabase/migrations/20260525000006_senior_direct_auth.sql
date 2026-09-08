-- ==========================================
-- OSCALink: Senior Direct Auth via SECURITY DEFINER
-- ==========================================
-- Creates Supabase Auth users directly from the database
-- so mobile app can use supabase.auth.signInWithPassword()
-- without going through the Vercel web API bridge.
-- ==========================================

-- 0. Enable pgcrypto extension (required for crypt/gen_salt)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 1. Function to create a Supabase Auth user for a senior
CREATE OR REPLACE FUNCTION create_senior_auth_user(
  p_registration_id TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_senior_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email TEXT;
  v_user_id UUID;
  v_now TIMESTAMPTZ := now();
BEGIN
  v_email := LOWER(p_registration_id) || '@oscalink.vercel.app';

  -- Use the senior's own UUID as the auth user ID so RLS matches auth.uid() = seniors.id
  v_user_id := p_senior_id;

  -- Check if auth user already exists for this senior
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
    RETURN jsonb_build_object(
      'success', true,
      'user_id', v_user_id,
      'email', v_email,
      'already_exists', true
    );
  END IF;

  -- Also check by email (old records from web API)
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  IF v_user_id IS NOT NULL AND v_user_id != p_senior_id THEN
    RETURN jsonb_build_object(
      'success', true,
      'user_id', v_user_id,
      'email', v_email,
      'already_exists', true
    );
  END IF;

  -- Set back to senior's ID for new creation
  v_user_id := p_senior_id;

  -- Insert into auth.users (Supabase Auth)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token,
    is_super_admin,
    is_sso_user,
    banned_until
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
    v_now,
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object(
      'senior_id', p_senior_id,
      'full_name', p_full_name,
      'registration_id', p_registration_id,
      'role', 'resident'
    ),
    v_now,
    v_now,
    '',
    '',
    '',
    '',
    false,
    false,
    NULL
  );

  -- Insert identity (required for OAuth-less email login)
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    provider,
    identity_data,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    v_user_id::text,
    'email',
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    v_now,
    v_now,
    v_now
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', v_email,
    'already_exists', false
  );
END;
$$;

-- 2. Update register_senior_resident to also create the auth user
-- Drop first because the return type has changed
DROP FUNCTION IF EXISTS register_senior_resident(text,text,text,text,text,text,text,text,boolean,text);

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
    v_birthdate_clean::DATE,
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

  -- Create the Supabase Auth user so the senior can login directly
  BEGIN
    v_auth_result := create_senior_auth_user(
      v_reg_id,
      v_birthdate_clean,
      TRIM(p_full_name),
      v_new_id
    );
    v_auth_user_id := (v_auth_result->>'user_id')::UUID;
  EXCEPTION WHEN OTHERS THEN
    -- Auth user creation failed non-critically; senior record exists
    v_auth_user_id := NULL;
  END;

  RETURN QUERY
  SELECT v_new_id, v_reg_id, v_birthdate_clean, p_full_name, v_auth_user_id;
END;
$$;

-- 3. Grant execute to anon (mobile app calls this via REST)
REVOKE EXECUTE ON FUNCTION create_senior_auth_user FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_senior_auth_user(TEXT, TEXT, TEXT, UUID) TO anon;

-- 4. Clean up any auth users created by previous broken migration runs
-- (where auth.users.id != the senior's UUID, causing RLS mismatch)
DELETE FROM auth.identities
WHERE provider = 'email'
  AND provider_id IN (
    SELECT id::text FROM auth.users
    WHERE email LIKE '%@oscalink.vercel.app'
      AND id NOT IN (SELECT id FROM seniors)
  );

DELETE FROM auth.users
WHERE email LIKE '%@oscalink.vercel.app'
  AND id NOT IN (SELECT id FROM seniors);

SELECT 'Senior direct auth migration complete.' AS result;
