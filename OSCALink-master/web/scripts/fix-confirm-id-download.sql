-- ============================================================
-- OSCALink: Fix "Lookup failed" on Confirm ID Download
-- Run this in: Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================
-- This is a standalone, idempotent fix. Safe to run multiple times.
-- It recreates the confirm_id_download RPC and forces PostgREST to
-- reload its schema cache so the function is immediately callable.
-- ============================================================

DROP FUNCTION IF EXISTS confirm_id_download(UUID, TEXT);

CREATE OR REPLACE FUNCTION confirm_id_download(
  p_senior_id UUID,
  p_birthdate TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  id_number TEXT,
  id_downloaded_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_number TEXT;
  v_db_birthdate DATE;
  v_input_bd TEXT;
BEGIN
  SELECT seniors.id_number, seniors.birthdate
    INTO v_id_number, v_db_birthdate
  FROM public.seniors
  WHERE seniors.id = p_senior_id
  LIMIT 1;

  IF v_id_number IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF v_id_number = '' THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  v_input_bd := UPPER(TRIM(COALESCE(p_birthdate, '')));
  IF v_db_birthdate IS NOT NULL THEN
    IF v_input_bd <> '' AND TO_CHAR(v_db_birthdate, 'YYYY-MM-DD') <> v_input_bd THEN
      RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TIMESTAMPTZ;
      RETURN;
    END IF;
  END IF;

  UPDATE public.seniors
  SET id_downloaded_at = now()
  WHERE seniors.id = p_senior_id;

  RETURN QUERY
  SELECT TRUE, v_id_number, now()::TIMESTAMPTZ;
END;
$$;

REVOKE EXECUTE ON FUNCTION confirm_id_download(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION confirm_id_download(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION confirm_id_download(UUID, TEXT) TO authenticated;

-- Force PostgREST to reload its schema cache immediately
NOTIFY pgrst, 'reload schema';

-- Verify it exists
SELECT
  (to_regclass('public.seniors') IS NOT NULL) AS seniors_exists,
  p.proowner::regrole::text AS owner,
  p.proacl::text AS grants
FROM pg_proc p
WHERE p.proname = 'confirm_id_download'
LIMIT 1;
