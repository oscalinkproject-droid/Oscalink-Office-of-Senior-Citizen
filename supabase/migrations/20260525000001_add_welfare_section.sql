-- Migration: Add welfare_section to profiles for MSWD Officer specialization tracking
-- Enables assigning MSWD Officers to specific welfare sections (Crisis Intervention, Family, Child, Senior Citizen, General)

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS welfare_section TEXT;

COMMENT ON COLUMN profiles.welfare_section IS 'MSWD Officer specialized section: Crisis Intervention, Family, Child, Senior Citizen, or General';
