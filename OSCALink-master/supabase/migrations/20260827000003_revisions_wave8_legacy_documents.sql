-- OSCALink Revisions — Wave 8b: legacy document digitization
-- Tracks scanned legacy paper documents and links them to senior records.

CREATE TABLE IF NOT EXISTS public.legacy_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  senior_id uuid REFERENCES public.seniors(id) ON DELETE SET NULL,
  full_name text,
  document_type text NOT NULL,
  file_url text NOT NULL,
  notes text,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  scanned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.legacy_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS osca_all_legacy_documents ON public.legacy_documents;
CREATE POLICY osca_all_legacy_documents
  ON public.legacy_documents
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','osca_head','osca_staff')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','osca_head','osca_staff')
  ));
