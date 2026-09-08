-- Add missing SELECT policy for barangay_official role on seniors table
-- Without this, barangay_officials see 0 seniors due to RLS default-deny

CREATE POLICY seniors_select_barangay_official ON seniors
  FOR SELECT TO authenticated
  USING (get_user_role() = 'barangay_official' AND barangay = get_user_barangay());
