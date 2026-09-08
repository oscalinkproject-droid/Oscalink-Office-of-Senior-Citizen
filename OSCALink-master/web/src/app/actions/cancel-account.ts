'use server';

import { createServerClient as createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

const OSCA_ROLES = ['super_admin', 'admin', 'osca_head', 'osca_staff'];
const CANCEL_REASON =
  'Account cancelled by OSCA — mobile access revoked; record retained for re-registration tracking';

export async function cancelSeniorAccount(seniorId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be logged in.' };

  const role = user.user_metadata?.role as string | undefined;
  if (!role || !OSCA_ROLES.includes(role)) {
    return { error: 'FORBIDDEN: Only OSCA staff can cancel accounts.' };
  }
  if (!seniorId) return { error: 'Missing senior record.' };

  // Primary path: SECURITY DEFINER RPC that marks the record Cancelled and bans
  // the linked Supabase Auth user so mobile login is revoked.
  const { data: rpcData, error: rpcError } = await supabase.rpc('cancel_senior_account', {
    p_senior_id: seniorId,
    p_reason: CANCEL_REASON,
  });

  if (rpcError) {
    console.error('cancel_senior_account RPC error:', rpcError);
    // Fallback for environments where the RPC has not been applied yet: mark the
    // record cancelled. Mobile login is still blocked by the status gate in the
    // mobile login bridge.
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('seniors')
      .update({
        status: 'Cancelled',
        cancelled_at: now,
        decision_reason: CANCEL_REASON,
        benefits_eligible: false,
      })
      .eq('id', seniorId);
    if (updateError) return { error: updateError.message };
  } else if (rpcData && rpcData.success === false) {
    return { error: rpcData.error || 'Could not cancel account.' };
  }

  revalidatePath('/archive');
  revalidatePath('/directory');
  revalidatePath('/dashboard');
  return { success: true };
}