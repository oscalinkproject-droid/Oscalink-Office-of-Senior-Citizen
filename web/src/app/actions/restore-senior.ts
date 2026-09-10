'use server';

import { createServerClient as createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import { normalizeRole } from '@/lib/rbac';

const OSCA_ROLES = ['super_admin', 'admin', 'osca_head', 'osca_staff'];
const DEATH_CERTIFICATE_TYPE = 'Death Certificate';

export async function restoreSeniorToActive(seniorId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be logged in.' };

  const role = normalizeRole(user.user_metadata?.role);
  if (!role || !OSCA_ROLES.includes(role)) {
    return { error: 'FORBIDDEN: Only OSCA staff can restore deceased records.' };
  }
  if (!seniorId) return { error: 'Missing senior record.' };

  const { data: senior } = await supabase
    .from('seniors')
    .select('id, status')
    .eq('id', seniorId)
    .single();

  if (!senior) return { error: 'Senior record not found.' };
  if (senior.status !== 'Deceased') {
    return { error: 'Only Deceased records can be restored to Active.' };
  }

  // Strict guard: never restore a record that still has an attached Death
  // Certificate. The Death Certificate must be removed from the vault first.
  const { count } = await supabase
    .from('legacy_documents')
    .select('id', { count: 'exact', head: true })
    .eq('senior_id', seniorId)
    .eq('document_type', DEATH_CERTIFICATE_TYPE);

  if ((count || 0) > 0) {
    return { error: 'A Death Certificate is attached to this record. Remove it from the vault before restoring to Active.' };
  }

  const { error } = await supabase
    .from('seniors')
    .update({
      status: 'Active',
      benefits_eligible: true,
      deceased_at: null,
      inactive_at: null,
      inactive_by: null,
      inactive_reason: null,
      decision_reason: null,
    })
    .eq('id', seniorId);

  if (error) {
    console.error('Restore senior error:', error);
    return { error: error.message };
  }

  revalidatePath('/archive');
  revalidatePath('/directory');
  revalidatePath('/dashboard');
  return { success: true };
}