-- Add sex column to seniors table for PhilHealth export
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS sex TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS citizenship TEXT DEFAULT 'Filipino';
