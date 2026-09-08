import { createServerClient as createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

export default async function InquiriesPage() {
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

  redirect('/notifications');
}
