-- ============================================================================
-- Diagnostic: Why does head@gmail.com fail to log in?
-- Run in Supabase SQL Editor (requires service role / SQL Editor access)
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- CHECK 1: Does the user exist? What's their state?
-- ──────────────────────────────────────────────────────────────────────────────

SELECT
  id,
  email,
  -- Password hash present? (non-empty encrypted_password means a password is set)
  CASE
    WHEN encrypted_password IS NULL OR encrypted_password = ''
    THEN 'NO PASSWORD SET'
    ELSE 'password hash present (' || length(encrypted_password) || ' chars)'
  END AS password_status,
  -- Email confirmation state
  email_confirmed_at,
  CASE
    WHEN email_confirmed_at IS NULL THEN 'NOT CONFIRMED'
    ELSE 'confirmed at ' || email_confirmed_at::text
  END AS email_status,
  -- Ban state
  banned_until,
  CASE
    WHEN banned_until IS NOT NULL AND banned_until > now()
    THEN 'BANNED until ' || banned_until::text
    ELSE 'not banned'
  END AS ban_status,
  -- Role in JWT metadata
  raw_user_meta_data ->> 'role' AS jwt_role,
  -- Account creation
  created_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'head@gmail.com';

-- ──────────────────────────────────────────────────────────────────────────────
-- CHECK 2: List ALL user emails (to find typos or duplicates)
-- ──────────────────────────────────────────────────────────────────────────────

SELECT
  email,
  email_confirmed_at IS NOT NULL AS confirmed,
  CASE
    WHEN encrypted_password IS NULL OR encrypted_password = ''
    THEN 'no password'
    ELSE 'has password'
  END AS pw,
  raw_user_meta_data ->> 'role' AS role,
  created_at
FROM auth.users
ORDER BY email;

-- ──────────────────────────────────────────────────────────────────────────────
-- CHECK 3: How many total auth users exist?
-- ──────────────────────────────────────────────────────────────────────────────

SELECT count(*) AS total_auth_users FROM auth.users;

-- ──────────────────────────────────────────────────────────────────────────────
-- CHECK 4: Are there any email-confirmation-locked accounts?
-- ──────────────────────────────────────────────────────────────────────────────

SELECT email, email_confirmed_at
FROM auth.users
WHERE email_confirmed_at IS NULL;

-- ──────────────────────────────────────────────────────────────────────────────
-- FIX 1: If the user exists but email is NOT confirmed, confirm it now
-- ──────────────────────────────────────────────────────────────────────────────
-- Uncomment and run ONLY if CHECK 1 shows "NOT CONFIRMED" for head@gmail.com

/*
UPDATE auth.users
SET email_confirmed_at = now(),
    confirmed_at = now()
WHERE email = 'head@gmail.com'
  AND email_confirmed_at IS NULL;
*/

-- ──────────────────────────────────────────────────────────────────────────────
-- FIX 2: If the user exists but is BANNED, unban them
-- ──────────────────────────────────────────────────────────────────────────────
-- Uncomment and run ONLY if CHECK 1 shows "BANNED"

/*
UPDATE auth.users
SET banned_until = NULL
WHERE email = 'head@gmail.com'
  AND banned_until IS NOT NULL
  AND banned_until > now();
*/

-- ──────────────────────────────────────────────────────────────────────────────
-- FIX 3: Reset password for head@gmail.com
-- ──────────────────────────────────────────────────────────────────────────────
-- Use this if the account exists but you can't remember the password.
-- Change 'YOUR_NEW_PASSWORD_HERE' to the actual password you want.
-- Requires service role privileges (SQL Editor has this by default).

/*
UPDATE auth.users
SET encrypted_password = crypt('YOUR_NEW_PASSWORD_HERE', gen_salt('bf')),
    updated_at = now()
WHERE email = 'head@gmail.com';
*/

-- ──────────────────────────────────────────────────────────────────────────────
-- FIX 4: If the user does NOT exist at all, create the account
-- ──────────────────────────────────────────────────────────────────────────────
-- Uncomment and run ONLY if CHECK 1 returns zero rows.
-- Change the password and role as needed.

/*
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  raw_user_meta_data,
  raw_app_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'head@gmail.com',
  crypt('YOUR_PASSWORD_HERE', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  '{"role": "osca_head"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb
);

-- Also create the matching profile row
INSERT INTO public.profiles (id, role, full_name, created_at, updated_at)
SELECT
  id,
  'osca_head',
  'Head Administrator',
  now(),
  now()
FROM auth.users
WHERE email = 'head@gmail.com'
ON CONFLICT (id) DO NOTHING;
*/
