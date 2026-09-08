-- Create the Appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  senior_id UUID REFERENCES public.seniors(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (service_type IN ('Health Checkup', 'Program Registration', 'ID Renewal', 'Aid Consultation')),
  appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Missed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Allow public read access for MVP
CREATE POLICY "Allow public read access" ON public.appointments
  FOR SELECT USING (true);

-- Insert sample data
INSERT INTO public.appointments (senior_id, service_type, appointment_date, status, notes)
SELECT 
  id, 
  'Health Checkup', 
  now() + interval '1 day', 
  'Scheduled',
  'Routine geriatric wellness assessment'
FROM public.seniors
WHERE full_name = 'Eleanor Dalloway'
LIMIT 1;

INSERT INTO public.appointments (senior_id, service_type, appointment_date, status, notes)
SELECT 
  id, 
  'ID Renewal', 
  now() + interval '2 days', 
  'Scheduled',
  'Annual digital ID re-verification'
FROM public.seniors
WHERE full_name = 'Harold Bloom'
LIMIT 1;
