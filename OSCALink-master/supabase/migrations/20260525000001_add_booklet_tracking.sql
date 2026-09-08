-- Add three distinct booklet tracking fields to id_inventory for RA 9257 compliance
-- The CSC Frontline Service Manual mandates tracking of three specific booklet types:
-- Medicine/Hospital, Grocery/Agricultural Products, and Movie discount booklets

ALTER TABLE id_inventory
  ADD COLUMN IF NOT EXISTS booklet_medicine_serial text,
  ADD COLUMN IF NOT EXISTS booklet_medicine_status text NOT NULL DEFAULT 'Pending' CHECK (booklet_medicine_status IN ('Pending', 'Issued', 'Lost', 'Returned')),
  ADD COLUMN IF NOT EXISTS booklet_medicine_issued_date timestamptz,
  ADD COLUMN IF NOT EXISTS booklet_grocery_serial text,
  ADD COLUMN IF NOT EXISTS booklet_grocery_status text NOT NULL DEFAULT 'Pending' CHECK (booklet_grocery_status IN ('Pending', 'Issued', 'Lost', 'Returned')),
  ADD COLUMN IF NOT EXISTS booklet_grocery_issued_date timestamptz,
  ADD COLUMN IF NOT EXISTS booklet_movie_serial text,
  ADD COLUMN IF NOT EXISTS booklet_movie_status text NOT NULL DEFAULT 'Pending' CHECK (booklet_movie_status IN ('Pending', 'Issued', 'Lost', 'Returned')),
  ADD COLUMN IF NOT EXISTS booklet_movie_issued_date timestamptz;

COMMENT ON COLUMN id_inventory.booklet_medicine_serial IS 'Serial number for Medicine/Hospital discount booklet per RA 9257';
COMMENT ON COLUMN id_inventory.booklet_grocery_serial IS 'Serial number for Grocery/Agricultural Products discount booklet per RA 9257';
COMMENT ON COLUMN id_inventory.booklet_movie_serial IS 'Serial number for Movie/Entertainment discount booklet per RA 9257';
