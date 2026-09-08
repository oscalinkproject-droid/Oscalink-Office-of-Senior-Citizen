-- RUN THIS IN SUPABASE DASHBOARD SQL EDITOR
-- Go to https://supabase.com/dashboard/project/qbdbxwcsvitlmikmdhso/sql/new

-- 1. Add email column and ensure contact_number exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contact_number TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Backfill email for existing profiles from auth.users
UPDATE profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id
  AND p.email IS NULL;

-- 3. Replace the trigger function (includes email column in profiles)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, barangay, contact_number)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      COALESCE((NEW.raw_user_meta_data->>'role')::TEXT, 'official'),
      COALESCE(NEW.raw_user_meta_data->>'barangay', NULL),
      COALESCE(NEW.raw_user_meta_data->>'contact_number', NULL)
    )
    ON CONFLICT (id) DO UPDATE SET
      email = COALESCE(NEW.raw_user_meta_data->>'email', NEW.email),
      full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      role = COALESCE((NEW.raw_user_meta_data->>'role')::TEXT, 'official'),
      barangay = COALESCE(NEW.raw_user_meta_data->>'barangay', NULL),
      contact_number = COALESCE(NEW.raw_user_meta_data->>'contact_number', NULL),
      updated_at = now();
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'OSCALink: Profile sync failed for user %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Verify
SELECT proname, prosrc FROM pg_proc WHERE proname = 'handle_new_user';
