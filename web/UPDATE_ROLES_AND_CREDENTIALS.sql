-- ==========================================
-- OSCALink Role & Credential Update Script
-- ==========================================
-- This script updates the passwords and emails for OSCA Staff and Barangay Official.
-- Run this in the Supabase SQL Editor.
-- ==========================================

DO $$ 
DECLARE 
    staff_email TEXT := 'staff@gmail.com';
    official_email TEXT := 'official@gmail.com';
    new_password TEXT := 'password123';
    staff_id UUID;
    official_id UUID;
BEGIN
    -- 1. Update/Create OSCA Staff (staff@gmail.com)
    SELECT id INTO staff_id FROM auth.users WHERE email = 'oscalink@gmail.com' OR email = staff_email LIMIT 1;
    
    IF staff_id IS NOT NULL THEN
        UPDATE auth.users 
        SET email = staff_email,
            encrypted_password = crypt(new_password, gen_salt('bf')),
            raw_user_meta_data = raw_user_meta_data || '{"role": "admin", "full_name": "OSCA Staff"}'::jsonb,
            updated_at = now()
        WHERE id = staff_id;
        RAISE NOTICE 'Updated OSCA Staff (%).', staff_email;
    ELSE
        -- Create if not exists
        staff_id := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
        VALUES (staff_id, staff_email, crypt(new_password, gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role": "admin", "full_name": "OSCA Staff"}', now(), now(), 'authenticated', 'authenticated');
        
        INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
        VALUES (gen_random_uuid(), staff_id, format('{"sub":"%s","email":"%s"}', staff_id::text, staff_email)::jsonb, 'email', staff_id::text, now(), now(), now());
        RAISE NOTICE 'Created OSCA Staff (%).', staff_email;
    END IF;

    -- 2. Update/Create Barangay Official (official@gmail.com)
    SELECT id INTO official_id FROM auth.users WHERE email = official_email LIMIT 1;

    IF official_id IS NOT NULL THEN
        UPDATE auth.users 
        SET encrypted_password = crypt(new_password, gen_salt('bf')),
            raw_user_meta_data = raw_user_meta_data || '{"role": "official", "full_name": "Barangay Official"}'::jsonb,
            updated_at = now()
        WHERE id = official_id;
        RAISE NOTICE 'Updated Barangay Official (%).', official_email;
    ELSE
        -- Create if not exists
        official_id := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
        VALUES (official_id, official_email, crypt(new_password, gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role": "official", "full_name": "Barangay Official", "barangay": "4A"}', now(), now(), 'authenticated', 'authenticated');
        
        INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
        VALUES (gen_random_uuid(), official_id, format('{"sub":"%s","email":"%s"}', official_id::text, official_email)::jsonb, 'email', official_id::text, now(), now(), now());
        RAISE NOTICE 'Created Barangay Official (%).', official_email;
    END IF;

END $$;
