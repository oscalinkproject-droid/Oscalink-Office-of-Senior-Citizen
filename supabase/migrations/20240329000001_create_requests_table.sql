-- Create the Assistance Requests table
CREATE TABLE IF NOT EXISTS public.assistance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "full_name" TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('URGENT', 'ROUTINE', 'VALIDATED', 'LOGISTICS', 'COMPLETED')),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Released')),
  registration_id TEXT REFERENCES public.seniors(registration_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assistance_requests ENABLE ROW LEVEL SECURITY;

-- Allow public read access for MVP
CREATE POLICY "Allow public read access" ON public.assistance_requests
  FOR SELECT USING (true);

-- Insert sample data to match frontend mock
INSERT INTO public.assistance_requests (full_name, title, description, priority, status)
VALUES 
  ('Elena Vance', 'Mobility Support Hub', 'Request for powered wheelchair calibration and battery cycle refresh.', 'URGENT', 'Pending'),
  ('Marcus Thorne', 'Digital Literacy Kit', 'Provisioning of accessibility-enhanced tablet for civic participation.', 'ROUTINE', 'Pending'),
  ('Sarah Jenkins', 'Medication Sync-API', 'Integration of local pharmacy automated refill alerts.', 'VALIDATED', 'Approved'),
  ('David Lowery', 'Transport Voucher Gen', 'Batch generation of QR-based transit passes.', 'LOGISTICS', 'Approved'),
  ('Maya Sterling', 'Winter Supply Grant', 'Distribution of residential heating subsidies.', 'COMPLETED', 'Released');
