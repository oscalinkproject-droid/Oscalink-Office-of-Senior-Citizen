export const dynamic = 'force-dynamic';

import { MasterListClient } from './master-list-client';
import { createServerClient as createClient } from "@/lib/supabase-server";

async function getSeniorData(barangay: string) {
  const supabase = await createClient();

  const { data: seniors, error } = await supabase
    .from('seniors')
    .select('id, registration_id, full_name, middle_name, age, sex, barangay, purok, status, contact_number, is_pensioner, created_at')
    .eq('barangay', barangay)
    .order('purok', { ascending: true })
    .order('full_name', { ascending: true });

  if (error) {
    console.error('Master List fetch error:', error);
    return [];
  }

  return seniors || [];
}

export default async function BarangayDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const baranggay = user?.user_metadata?.barangay as string || '';
  const fullName = user?.user_metadata?.full_name as string || '';
  const role = user?.user_metadata?.role as string || '';
  const roleLabel = role === 'barangay_official' ? 'Barangay Official' : 'Barangay Staff';

  if (!baranggay) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">No Barangay Assigned</h2>
          <p className="text-outline">Please contact an OSCA administrator to assign your barangay.</p>
        </div>
      </div>
    );
  }

  const seniors = await getSeniorData(baranggay);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{roleLabel} {baranggay} — Senior Citizen Master List</h1>
        <p className="text-outline mt-1 text-sm">
          {fullName} · {seniors.length} registered seniors
        </p>
      </div>

      <MasterListClient seniors={seniors} barangay={baranggay} />
    </div>
  );
}
