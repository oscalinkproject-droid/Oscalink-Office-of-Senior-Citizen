-- Add category column with check constraint
ALTER TABLE public.assistance_requests 
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('Medical Support', 'Financial Aid', 'Burial Assistance', 'Assistive Devices')) DEFAULT 'Medical Support',
ADD COLUMN IF NOT EXISTS beneficiary_email TEXT;

-- Update existing sample data with relevant categories and dummy emails
UPDATE public.assistance_requests 
SET category = 'Assistive Devices', beneficiary_email = 'elena.vance@example.com'
WHERE title = 'Mobility Support Hub';

UPDATE public.assistance_requests 
SET category = 'Assistive Devices', beneficiary_email = 'marcus.thorne@example.com'
WHERE title = 'Digital Literacy Kit';

UPDATE public.assistance_requests 
SET category = 'Medical Support', beneficiary_email = 'sarah.jenkins@example.com'
WHERE title = 'Medication Sync-API';

UPDATE public.assistance_requests 
SET category = 'Financial Aid', beneficiary_email = 'david.lowery@example.com'
WHERE title = 'Transport Voucher Gen';

UPDATE public.assistance_requests 
SET category = 'Financial Aid', beneficiary_email = 'maya.sterling@example.com'
WHERE title = 'Winter Supply Grant';
