-- Add place_of_birth column to seniors table
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS place_of_birth TEXT;
