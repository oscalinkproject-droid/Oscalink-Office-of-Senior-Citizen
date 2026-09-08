-- Add document_url to seniors for ID scans
ALTER TABLE public.seniors 
ADD COLUMN IF NOT EXISTS document_url TEXT;

-- Add email column to seniors table
ALTER TABLE public.seniors 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Update sample data with emails
UPDATE public.seniors SET email = 'eleanor.d@example.com' WHERE full_name = 'Eleanor Dalloway';
UPDATE public.seniors SET email = 'harold.b@example.com' WHERE full_name = 'Harold Bloom';
UPDATE public.seniors SET email = 'margaret.w@example.com' WHERE full_name = 'Margaret Walker';
UPDATE public.seniors SET email = 'julian.c@example.com' WHERE full_name = 'Julian Casablancas';
