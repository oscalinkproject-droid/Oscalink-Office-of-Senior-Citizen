-- Workflow Enhancements Migration
-- Adds fields for pension tracking, municipal configuration, and batch endorsements.

-- 1. Expand seniors table
ALTER TABLE public.seniors 
ADD COLUMN IF NOT EXISTS has_other_pension BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pension_source TEXT,
ADD COLUMN IF NOT EXISTS occupation TEXT,
ADD COLUMN IF NOT EXISTS is_social_pension_applicant BOOLEAN DEFAULT FALSE;

-- 2. Create municipal_config table (Singleton pattern for city-wide settings)
CREATE TABLE IF NOT EXISTS public.municipal_config (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    mayor_name TEXT NOT NULL DEFAULT 'Hon. Mayor',
    mayor_signature_url TEXT,
    osca_head_name TEXT NOT NULL DEFAULT 'OSCA Head',
    osca_head_signature_url TEXT,
    municipality_name TEXT NOT NULL DEFAULT 'Municipal Government',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for municipal_config
ALTER TABLE public.municipal_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read municipal_config" ON public.municipal_config FOR SELECT USING (true);
CREATE POLICY "Allow service_role full access municipal_config" ON public.municipal_config USING (auth.role() = 'service_role');

-- Insert default config
INSERT INTO public.municipal_config (id, mayor_name, osca_head_name, municipality_name)
VALUES (1, 'Hon. Mayor Name', 'OSCA Head Name', 'Pangil, Laguna')
ON CONFLICT (id) DO NOTHING;

-- 3. Create batch_endorsements table
CREATE TABLE IF NOT EXISTS public.batch_endorsements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number TEXT UNIQUE NOT NULL,
    barangay TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Draft', 'Submitted', 'Approved', 'Rejected')) DEFAULT 'Draft',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for batch_endorsements
ALTER TABLE public.batch_endorsements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read batch_endorsements" ON public.batch_endorsements FOR SELECT USING (true);

-- 4. Create batch_endorsement_items table
CREATE TABLE IF NOT EXISTS public.batch_endorsement_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES public.batch_endorsements(id) ON DELETE CASCADE,
    senior_id UUID REFERENCES public.seniors(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(batch_id, senior_id)
);

-- Enable RLS for batch_endorsement_items
ALTER TABLE public.batch_endorsement_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read batch_endorsement_items" ON public.batch_endorsement_items FOR SELECT USING (true);
