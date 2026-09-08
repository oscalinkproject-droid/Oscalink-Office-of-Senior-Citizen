-- ==========================================
-- OSCALink: Promote User to System Administrator
-- ==========================================

-- 1. Check if the profile exists, if not, create it
INSERT INTO public.profiles (id, full_name, role, barangay, is_active)
VALUES (
  'e1b87aa3-1957-4725-99c6-e7982cfdb95f', 
  'System Administrator', 
  'admin', 
  'City-Wide', 
  TRUE
)
ON CONFLICT (id) DO UPDATE 
SET 
  role = 'admin',
  full_name = 'System Administrator',
  barangay = 'City-Wide',
  is_active = TRUE,
  updated_at = now();

-- 2. Update user metadata in auth.users (Internal Supabase Auth)
-- This ensures the JWT contains the correct role on next login
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin", "full_name": "System Administrator", "barangay": "City-Wide"}'::jsonb
WHERE id = 'e1b87aa3-1957-4725-99c6-e7982cfdb95f';

-- 3. Verify
SELECT id, full_name, role, barangay FROM public.profiles WHERE id = 'e1b87aa3-1957-4725-99c6-e7982cfdb95f';
