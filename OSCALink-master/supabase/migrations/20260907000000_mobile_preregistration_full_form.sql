-- OSCALink Revisions — mobile pre-registration full form schema
-- Extends the anonymous `pre_register_senior` RPC so the Senior Citizen mobile
-- app can collect the same fields as the Web Registration form (name parts,
-- civil status, emergency contact) and store them on `seniors` with
-- status = 'Pending' and a provisional REF- registration_id.
--
-- The web app already writes these columns in createSenior / completePreRegistration;
-- the ADD COLUMN IF NOT EXISTS calls below are defensive for environments where
-- the live schema predates the repo migrations.

-- ---------------------------------------------------------------------------
-- 1. Defensive columns (idempotent; safe if already present)
-- ---------------------------------------------------------------------------
ALTER TABLE public.seniors ADD COLUMN IF NOT EXISTS middle_name text;
ALTER TABLE public.seniors ADD COLUMN IF NOT EXISTS suffix text;
ALTER TABLE public.seniors ADD COLUMN IF NOT EXISTS emergency_contact_relationship text;

-- ---------------------------------------------------------------------------
-- 2. Replace pre_register_senior with the extended (16-arg) signature.
--    The old 10-arg overload is dropped first so PostgREST never hits an
--    ambiguous-candidate error when the mobile app calls the new one.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.pre_register_senior(text,text,text,text,text,text,text,boolean,text,text);

CREATE OR REPLACE FUNCTION public.pre_register_senior(
  p_full_name text,
  p_birthdate text,
  p_sex text,
  p_barangay text,
  p_purok text DEFAULT NULL,
  p_contact_number text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_is_pensioner boolean DEFAULT false,
  p_pensioner_type text DEFAULT NULL,
  p_place_of_birth text DEFAULT NULL,
  p_middle_name text DEFAULT NULL,
  p_suffix text DEFAULT NULL,
  p_civil_status text DEFAULT NULL,
  p_emergency_contact_name text DEFAULT NULL,
  p_emergency_contact_number text DEFAULT NULL,
  p_emergency_contact_relationship text DEFAULT NULL
)
RETURNS TABLE (id uuid, registration_id text, full_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_reg_id text;
  v_new_id uuid;
  v_random int;
  v_birthdate_clean text;
  v_age int;
BEGIN
  v_birthdate_clean := split_part(TRIM(p_birthdate), 'T', 1);
  v_age := EXTRACT(YEAR FROM age(v_birthdate_clean::date));

  v_random := floor(1000 + random() * 9000)::int;
  v_reg_id := 'REF-' || to_char(now(), 'YYYYMMDD') || '-' || to_char(v_random, 'FM0000');

  INSERT INTO public.seniors (
    full_name, middle_name, suffix, registration_id, birthdate, age, sex, barangay, purok,
    contact_number, address, place_of_birth, civil_status,
    emergency_contact_name, emergency_contact_number, emergency_contact_relationship,
    status, is_pensioner, pensioner_type, classification
  ) VALUES (
    TRIM(p_full_name), p_middle_name, p_suffix, v_reg_id, v_birthdate_clean::date, v_age,
    p_sex, p_barangay, p_purok, p_contact_number, p_address, p_place_of_birth, p_civil_status,
    p_emergency_contact_name, p_emergency_contact_number, p_emergency_contact_relationship,
    'Pending', p_is_pensioner, p_pensioner_type,
    CASE WHEN p_is_pensioner THEN 'Pensioner' ELSE 'Indigent' END
  )
  RETURNING id, registration_id, full_name INTO v_new_id, v_reg_id, p_full_name;

  RETURN QUERY SELECT v_new_id, v_reg_id, TRIM(p_full_name);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.pre_register_senior(text,text,text,text,text,text,text,boolean,text,text,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pre_register_senior(text,text,text,text,text,text,text,boolean,text,text,text,text,text,text,text,text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Reload the PostgREST schema cache so the web/mobile clients immediately
--    see the new 16-arg function signature. Without this, PostgREST can keep
--    serving the stale 10-arg signature and named-arg RPC calls from the mobile
--    app fail with PGRST202 ("Could not find the function").
--    Equivalently reachable from Supabase Dashboard → Database → "Reload schema
--    cache", or `SELECT pg_notify('pgrst', 'reload schema');`` in the SQL editor.
-- ---------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';