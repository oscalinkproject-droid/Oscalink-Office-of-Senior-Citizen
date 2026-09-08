-- RUN IN SUPABASE DASHBOARD SQL EDITOR

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_picture TEXT;

SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'profiles' ORDER BY ordinal_position;
