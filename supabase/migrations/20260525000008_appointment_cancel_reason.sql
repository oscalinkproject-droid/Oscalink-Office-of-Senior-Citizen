ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

SELECT 'Cancel reason column added.' AS result;
