export const dynamic = 'force-dynamic';

import { createServerClient as createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { DeclinedClient } from "./declined-client";

interface DeclinedSenior {
  id: string;
  registration_id: string | null;
  full_name: string | null;
  sex: string | null;
  age: number | null;
  barangay: string | null;
  purok?: string | null;
  status: string | null;
  decision_reason: string | null;
  disapproved_at: string | null;
  disqualified_at: string | null;
  created_at: string | null;
}

async function getDeclinedSeniors() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = user?.user_metadata?.role;
  if (role !== 'osca_staff' && role !== 'super_admin') {
    redirect('/directory');
  }

  const { data: seniors } = await supabase
    .from('seniors')
    .select('*')
    .in('status', ['Disapproved', 'Disqualified'])
    .order('created_at', { ascending: false });

  return (seniors || []) as DeclinedSenior[];
}

export default async function DeclinedPage() {
  const seniors = await getDeclinedSeniors();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold font-headline tracking-tighter text-foreground">Declined Records</h1>
        <p className="text-outline mt-1 text-sm">
          {seniors.length} declined application{seniors.length !== 1 ? 's' : ''} — correct the details and resubmit for OSCA Head review
        </p>
      </div>
      <DeclinedClient seniors={seniors} />
    </div>
  );
}