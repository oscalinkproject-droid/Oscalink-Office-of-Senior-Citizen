-- OSCALink Revisions — Wave: Cancel Account / Deceased Mobile Access Revocation
-- Staff-cancelled accounts (formerly Transferred) are:
--   1. Marked status = 'Cancelled' (record retained for re-registration tracking)
--   2. Their linked Supabase Auth user is banned so password/email sign-in fails.

CREATE OR REPLACE FUNCTION public.cancel_senior_account(
  p_senior_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
  v_auth_id UUID;
  v_email TEXT;
  v_now TIMESTAMPTZ := now();
BEGIN
  SELECT status, auth_id INTO v_status, v_auth_id
  FROM public.seniors
  WHERE id = p_senior_id;

  IF v_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Senior record not found.');
  END IF;

  IF v_status = 'Cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account is already cancelled.');
  END IF;

  SELECT LOWER(registration_id) || '@oscalink.vercel.app'
  INTO v_email
  FROM public.seniors
  WHERE id = p_senior_id;

  UPDATE public.seniors
  SET status = 'Cancelled',
      cancelled_at = v_now,
      decision_reason = COALESCE(
        NULLIF(p_reason, ''),
        'Account cancelled by OSCA — mobile access revoked; record retained for re-registration tracking'
      ),
      benefits_eligible = false
  WHERE id = p_senior_id;

  -- Revoke mobile app access: ban the linked Supabase Auth user indefinitely so
  -- password/email sign-in can no longer succeed. The far-future timestamp keeps
  -- GoTrue's ban check (banned_until > now()) true forever.
  UPDATE auth.users
  SET banned_until = v_now + interval '100 years'
  WHERE id = COALESCE(v_auth_id, p_senior_id)
     OR email = v_email;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cancel_senior_account(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_senior_account(UUID, TEXT) TO authenticated;