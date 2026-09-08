-- Create the Seniors table
CREATE TABLE IF NOT EXISTS public.seniors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "full_name" TEXT NOT NULL,
  age INTEGER NOT NULL,
  sector TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Active', 'Pending', 'Archived', 'Deceased')),
  registration_id TEXT UNIQUE DEFAULT 'AX-' || floor(random() * 900 + 100)::text || '-' || floor(random() * 9000 + 1000)::text,
  last_check_in TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.seniors ENABLE ROW LEVEL SECURITY;

-- Create basic policies (Allow public read for MVP - adjust for production)
CREATE POLICY "Allow public read access" ON public.seniors
  FOR SELECT USING (true);

-- Insert sample data to match frontend mock
INSERT INTO public.seniors (full_name, age, sector, status, registration_id)
VALUES 
  ('Eleanor Dalloway', 76, '4A', 'Active', 'AX-902-8822'),
  ('Harold Bloom', 82, '2C', 'Pending', 'AX-112-9901'),
  ('Margaret Walker', 69, '9D', 'Active', 'AX-044-7721'),
  ('Julian Casablancas', 71, '1B', 'Archived', 'AX-221-3310');
