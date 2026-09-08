-- ============================================
-- OSCALink: Track OSCA ID / Stub download
-- ============================================
-- Purpose
-- -------
-- Adds `id_downloaded_at` to `public.seniors`. This flag marks the moment a
-- senior downloads their official OSCA Stub (Claim Stub / Acknowledgment
-- Receipt) from the mobile app. It is the trigger that permanently enables the
-- official OSCA ID Number (`OSC-YYYYMMDD-XXXX`) as the login credential and
-- invalidates the Temporary Reference Number (`REF-YYYYMMDD-XXXX`).
--
-- NULL  -> OSCA ID / stub not yet downloaded (Temporary Reference still valid).
-- set   -> OSCA stub downloaded; only the official OSCA ID Number may be used
--          to log in from now on.
-- ============================================

ALTER TABLE public.seniors
  ADD COLUMN IF NOT EXISTS id_downloaded_at timestamptz;

COMMENT ON COLUMN public.seniors.id_downloaded_at IS
  'When the senior downloaded their official OSCA ID Stub. Non-null permanently '
  'enables the OSCA ID Number as login and invalidates the Temporary Reference Number.';
