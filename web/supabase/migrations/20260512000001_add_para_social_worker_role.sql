-- Add para_social_worker role to profiles constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('admin', 'osca_head', 'mswd_officer', 'mayor', 'official', 'para_social_worker', 'resident'));

UPDATE profiles SET role = 'para_social_worker' WHERE role = 'para_social_worker';

SELECT 'OSCALink: para_social_worker role added to profiles constraint.' AS result;
