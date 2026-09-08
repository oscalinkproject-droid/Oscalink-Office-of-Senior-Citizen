-- OSCALink Revisions — mobile pre-registration
-- Allows seniors (anonymous) to pre-register a Pending application from the mobile app.

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
  p_place_of_birth text DEFAULT NULL
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
  v_reg_id := 'OSC-' || to_char(now(), 'YYYYMMDD') || '-' || v_random::text;

  INSERT INTO public.seniors (
    full_name, registration_id, birthdate, age, sex, barangay, purok,
    contact_number, address, place_of_birth, status, is_pensioner, pensioner_type, classification
  ) VALUES (
    TRIM(p_full_name), v_reg_id, v_birthdate_clean::date, v_age, p_sex, p_barangay, p_purok,
    p_contact_number, p_address, p_place_of_birth, 'Pending', p_is_pensioner, p_pensioner_type,
    CASE WHEN p_is_pensioner THEN 'Pensioner' ELSE 'Indigent' END
  )
  RETURNING id, registration_id, full_name INTO v_new_id, v_reg_id, p_full_name;

  RETURN QUERY SELECT v_new_id, v_reg_id, TRIM(p_full_name);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.pre_register_senior(text,text,text,text,text,text,text,boolean,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pre_register_senior(text,text,text,text,text,text,text,boolean,text,text) TO anon, authenticated;
