ALTER TABLE profiles ADD COLUMN first_login BOOLEAN DEFAULT true;

-- Set existing users to not need password change
UPDATE profiles SET first_login = false WHERE first_login IS NULL;
