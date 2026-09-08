import { createServerClient as createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { COTABATO_BARANGAYS } from '@/lib/constants';
import { BroadcastCenterClient } from './broadcast-center-client';

export const metadata: Metadata = {
  title: 'Broadcast Center | OSCALink',
};

export default async function BroadcastCenterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || (profile.role !== 'osca_head' && profile.role !== 'osca_staff')) {
    redirect('/dashboard');
  }

  const { data: seniors } = await supabase
    .from('seniors')
    .select('id, full_name, registration_id, is_pensioner')
    .eq('status', 'Active')
    .order('full_name', { ascending: true });

  // Counts — all active seniors (regardless of push token status)
  const { count: totalActive } = await supabase
    .from('seniors')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'Active');

  const { count: pensionerCount } = await supabase
    .from('seniors')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'Active')
    .eq('is_pensioner', true);

  const { count: pushReadyCount } = await supabase
    .from('seniors')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'Active')
    .not('push_token', 'is', null)
    .neq('push_token', '');

  return (
    <BroadcastCenterClient
      seniors={seniors || []}
      totalActive={totalActive || 0}
      pensionerCount={pensionerCount || 0}
      pushReadyCount={pushReadyCount || 0}
      barangays={COTABATO_BARANGAYS}
    />
  );
}