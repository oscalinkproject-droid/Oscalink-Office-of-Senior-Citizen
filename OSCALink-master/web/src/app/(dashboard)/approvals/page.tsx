export const dynamic = 'force-dynamic';

import { createServerClient as createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { ApprovalsClient } from "./approvals-client";

// The OSCA Head's "Pending Verifications" queue has three tabs:
//  - Pending      → pre-registrations completed by OSCA Staff (FOR_HEAD_APPROVAL)
//  - Disapproved  → prior decisions (status 'Disapproved')
//  - Disqualified → prior decisions (status 'Disqualified')
// The Head is a read-only reviewer here; the only write action is the final
// decision (Approve + issue OSCA ID / Disapprove / Disqualify).
async function getSeniors() {
  const supabase = await createClient();
  const { data: seniors } = await supabase
    .from('seniors')
    .select('*')
    .in('status', ['FOR_HEAD_APPROVAL', 'Disapproved', 'Disqualified'])
    .order('created_at', { ascending: false });

  return seniors || [];
}

async function getHeadSignature() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('signature_url, full_name')
    .eq('role', 'osca_head')
    .maybeSingle();
  return data || null;
}

export default async function ApprovalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.user_metadata?.role;
  if (role !== 'osca_head') {
    redirect('/dashboard');
  }

  const seniors = await getSeniors();
  const headProfile = await getHeadSignature();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold font-headline tracking-tighter text-foreground">Pending Verifications</h1>
        <p className="text-outline mt-1 text-sm">
          {seniors.length} record{seniors.length !== 1 ? 's' : ''} completed by OSCA Staff awaiting your decision
        </p>
      </div>
      <ApprovalsClient seniors={seniors} headProfile={headProfile} />
    </div>
  );
}