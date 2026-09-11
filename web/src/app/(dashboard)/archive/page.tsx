import { createServerClient as createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { ArchiveClient } from './archive-client';

export const dynamic = 'force-dynamic';

const RECORD_FIELDS =
  'id, registration_id, full_name, sex, age, barangay, status, transferred_at, deceased_at, inactive_at, decision_reason, created_at, death_certificate_url';

export default async function ArchivePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'osca_staff') {
    redirect('/dashboard');
  }

  const [transferredRes, deceasedRes, docsRes] = await Promise.all([
    supabase
      .from('seniors')
      .select(RECORD_FIELDS)
      .in('status', ['Transferred', 'Cancelled', 'Disqualified', 'Inactive'])
      .order('transferred_at', { ascending: false, nullsFirst: false }),
    supabase
      .from('seniors')
      .select(RECORD_FIELDS)
      .or('status.eq.Deceased,status.eq.DECEASED,status.eq.deceased')
      .order('deceased_at', { ascending: false, nullsFirst: false }),
    supabase
      .from('legacy_documents')
      .select('*')
      .eq('document_type', 'Death Certificate')
      .order('scanned_at', { ascending: false })
      .limit(500),
  ]);

  return (
    <ArchiveClient
      transferred={transferredRes.data ?? []}
      deceased={deceasedRes.data ?? []}
      docs={docsRes.data ?? []}
    />
  );
}
