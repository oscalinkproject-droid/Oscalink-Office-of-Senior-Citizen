import { createServerClient as createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { SettingsClient } from './settings-client';
import { getAuditLogs, getAuditSummary } from '@/app/actions/reports';

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, barangay, full_name, first_login, contact_number')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role || user.user_metadata?.role;
  const userBarangay = profile?.barangay || user.user_metadata?.barangay;
  const userFullName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Staff';
  const userEmail = user.email || '';
  const userPhone = profile?.contact_number || user.user_metadata?.contact_number || '';
  const isFirstLogin = profile?.first_login === true;

  const isOSCAHead = role === 'osca_head';
  const canViewAudit = role === 'super_admin' || role === 'osca_head';

  const { data: headProfile } = isOSCAHead ? await supabase
    .from('profiles')
    .select('signature_url, full_name, office_address, office_map_url, office_contact')
    .eq('role', 'osca_head')
    .maybeSingle() : { data: null };

  const [auditLogs, auditSummary] = canViewAudit
    ? await Promise.all([getAuditLogs(200), getAuditSummary()])
    : [null, null];

  return (
    <SettingsClient
      role={role}
      userBarangay={userBarangay}
      userFullName={userFullName}
      userEmail={userEmail}
      userPhone={userPhone}
      isFirstLogin={isFirstLogin}
      initialSignatureUrl={headProfile?.signature_url || null}
      headName={headProfile?.full_name || 'OSCA Head'}
      initialOfficeAddress={headProfile?.office_address || ''}
      initialOfficeMapUrl={headProfile?.office_map_url || ''}
      initialOfficeContact={headProfile?.office_contact || ''}
      auditLogs={auditLogs}
      auditSummary={auditSummary}
    />
  );
}
