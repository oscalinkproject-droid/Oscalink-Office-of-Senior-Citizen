-- Add multi-stage approval fields to seniors table and update status constraints

-- 1. Drop existing status check constraint
ALTER TABLE seniors DROP CONSTRAINT IF EXISTS seniors_status_check;

-- 2. Re-create constraint with 'Pending Mayor' status included
ALTER TABLE seniors ADD CONSTRAINT seniors_status_check 
    CHECK (status IN ('Active', 'Pending', 'Pending Barangay', 'Pending OSCA', 'Pending Mayor', 'Archived', 'Deceased', 'Transferred'));

-- 3. Add approval tracking columns
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS osca_approved BOOLEAN DEFAULT false;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS osca_approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS osca_approved_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE seniors ADD COLUMN IF NOT EXISTS mayor_approved BOOLEAN DEFAULT false;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS mayor_approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS mayor_approved_at TIMESTAMP WITH TIME ZONE;
