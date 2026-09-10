-- Public Supabase Storage bucket for senior registration documents uploaded
-- directly from the browser (Profile Photo, Birth Certificate, Proof of
-- Residency, Digital Signature, Thumbmark). Serves public URLs so both the web
-- Admin and the mobile app can render them in <img> without signed URLs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('senior-documents', 'senior-documents', true, 10485760, null)
on conflict (id) do nothing;

-- OSCA Staff (authenticated) upload/update documents
DROP POLICY IF EXISTS "Authenticated users can insert senior documents" ON storage.objects;
create policy "Authenticated users can insert senior documents"
 on storage.objects for insert to authenticated
 with check (bucket_id = 'senior-documents');

DROP POLICY IF EXISTS "Authenticated users can update senior documents" ON storage.objects;
create policy "Authenticated users can update senior documents"
 on storage.objects for update to authenticated
 using (bucket_id = 'senior-documents' and owner = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can delete senior documents" ON storage.objects;
create policy "Authenticated users can delete senior documents"
 on storage.objects for delete to authenticated
 using (bucket_id = 'senior-documents' and owner = auth.uid());

-- Public read: the mobile app and any public URL render these without auth.
DROP POLICY IF EXISTS "Anyone can read senior documents" ON storage.objects;
create policy "Anyone can read senior documents"
 on storage.objects for select
 using (bucket_id = 'senior-documents');