-- ==========================================
-- OSCALink Manual Admin Provisioning Suite
-- ==========================================
-- INSTRUCTIONS:
-- 1. Open your Supabase SQL Editor.
-- 2. Paste this script.
-- 3. Replace [EMAIL], [FULL_NAME], and [PASSWORD] with actual values.
-- 4. Click 'Run'.
-- ==========================================

-- 1. Ensure pgcrypto is enabled for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Define Variables (Paste your values here)
DO $$ 
DECLARE 
    target_email TEXT := 'admin@oscalink.gov'; -- Change this
    target_name TEXT := 'OSCA Administrator'; -- Change this
    target_pass TEXT := 'OSCA_Secure_2024';    -- Change this
    target_role TEXT := 'admin';              -- 'admin' or 'official'
    target_barangay TEXT := 'City-Wide';        -- 'City-Wide' or Barangay (e.g., '4A')
    user_id UUID := gen_random_uuid();
BEGIN
    -- 3. Check if user already exists in auth.users
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = target_email) THEN
        RAISE NOTICE 'User % already exists. Skipping insertion into auth.users.', target_email;
    ELSE
        -- 4. Insert into auth.users
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            role,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token,
            aud,
            is_sso_user
        )
        VALUES (
            user_id,
            '00000000-0000-0000-0000-000000000000',
            target_email,
            crypt(target_pass, gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}',
            jsonb_build_object(
                'full_name', target_name,
                'role', target_role,
                'barangay', target_barangay
            ),
            now(),
            now(),
            'authenticated',
            '',
            '',
            '',
            '',
            'authenticated',
            false
        );

        -- 5. Insert into auth.identities
        -- FIXED: Added provider_id and removed generated email column
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        )
        VALUES (
            gen_random_uuid(),
            user_id,
            format('{"sub":"%s","email":"%s"}', user_id::text, target_email)::jsonb,
            'email',
            user_id::text,
            now(),
            now(),
            now()
        );

        RAISE NOTICE 'User % created successfully with ID %', target_email, user_id;
    END IF;
END $$;
