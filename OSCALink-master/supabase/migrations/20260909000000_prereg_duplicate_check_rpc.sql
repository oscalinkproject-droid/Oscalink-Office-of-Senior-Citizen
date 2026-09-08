-- OSCALink Revisions — duplicate-prevention check for pre-registration
--
-- SECURITY DEFINER RPC (returns true/false only — exposes no PII) so the mobile
-- client can detect an existing record before inserting. `seniors` intentionally
-- has NO anon SELECT policy (public reads were revoked for privacy), so a plain
-- client-side `select()` would always come back empty instead of returning the
-- matching rows. The check mirrors the `seniors_dedup_name_birthdate` unique
-- index: Cancelled / Transferred records are treated as new applicants, not
-- duplicates.

CREATE OR REPLACE FUNCTION public.check_preregistration_duplicate(
  p_full_name text,
  p_birthdate text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_birthdate date;
BEGIN
  BEGIN
    v_birthdate := split_part(TRIM(p_birthdate), 'T', 1)::date;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN false;
  END;

  RETURN EXISTS (
    SELECT 1
    FROM public.seniors s
    WHERE UPPER(TRIM(s.full_name)) = UPPER(TRIM(p_full_name))
      AND s.birthdate = v_birthdate
      AND s.status NOT IN ('Cancelled', 'Transferred')
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_preregistration_duplicate(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_preregistration_duplicate(text, text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Reload the PostgREST schema cache so the client sees the new RPC.
-- ---------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';