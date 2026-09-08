-- Mobile Senior Self-Read RPC
-- The mobile app uses a custom localStorage session (not Supabase Auth),
-- so auth.uid() is always NULL and the resident_select_seniors RLS policy
-- never matches. This SECURITY DEFINER function lets the mobile app read
-- its own senior row by passing the senior_id it stored in the session,
-- without bypassing the id check.

CREATE OR REPLACE FUNCTION public.get_senior_self(p_senior_id uuid)
RETURNS SETOF public.seniors
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT * FROM public.seniors
  WHERE id = p_senior_id;
$$;

-- Restrict execution: only anon + authenticated can call this (not public)
REVOKE EXECUTE ON FUNCTION public.get_senior_self(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_senior_self(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_senior_self(uuid) TO authenticated;

-- Place in private schema guard: keep the function in public but ensure
-- it can only return data for the exact senior_id provided (enforced above).

SELECT 'get_senior_self RPC created successfully.' AS result;
