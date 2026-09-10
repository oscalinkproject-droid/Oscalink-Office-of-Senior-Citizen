'use server';

import { createServerClient as createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import { normalizeRole } from '@/lib/rbac';

const OSCA_ROLES = ['super_admin', 'admin', 'osca_head', 'osca_staff'];

export async function markSeniorDeceased(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be logged in.' };

  const role = normalizeRole(user.user_metadata?.role);
  if (!role || !OSCA_ROLES.includes(role)) {
    return { error: 'FORBIDDEN: Only OSCA staff can record deceased seniors.' };
  }

  const seniorId = (formData.get('senior_id') as string) || '';
  const dateOfDeath = (formData.get('date_of_death') as string) || '';
  const fileUrl = (formData.get('file_url') as string) || '';
  const notes = ((formData.get('notes') as string) || '').trim() || null;

  if (!seniorId) return { error: 'Missing senior record.' };

  const parsedDate = new Date(`${dateOfDeath}T00:00:00`);
  if (!dateOfDeath || Number.isNaN(parsedDate.getTime())) {
    return { error: 'Please select a valid date of death.' };
  }
  if (!fileUrl || !/^https:\/\/.+\..+\S+$/.test(fileUrl)) {
    return { error: 'Please upload a valid scanned Death Certificate document.' };
  }

  const { data: senior, error: fetchError } = await supabase
    .from('seniors')
    .select('id, registration_id, full_name, status, benefits_eligible')
    .eq('id', seniorId)
    .single();

  if (fetchError || !senior) {
    return { error: 'Senior record not found.' };
  }
  if (senior.status === 'Deceased') {
    return { error: 'Senior is already marked as Deceased.' };
  }

  const deceasedAt = parsedDate.toISOString();
  const now = new Date().toISOString();

  const { error: statusError } = await supabase
    .from('seniors')
    .update({
      status: 'Deceased',
      deceased_at: deceasedAt,
      decision_reason: notes || 'Deceased',
      inactive_reason: notes || 'Deceased',
      inactive_at: now,
      inactive_by: user.id,
      benefits_eligible: false,
    })
    .eq('id', seniorId);

  if (statusError) {
    console.error('Mark deceased error:', statusError);
    return { error: statusError.message };
  }

  const { error: docError } = await supabase.from('legacy_documents').insert({
    senior_id: seniorId,
    registration_id: senior.registration_id ?? null,
    full_name: senior.full_name ?? null,
    document_type: 'Death Certificate',
    file_url: fileUrl,
    notes,
    scanned_by: user.id,
  });

  if (docError) {
    console.error('Death Certificate vault save error:', docError);
    await supabase
      .from('seniors')
      .update({
        status: senior.status,
        benefits_eligible: senior.benefits_eligible,
        deceased_at: null,
        decision_reason: null,
        inactive_reason: null,
        inactive_at: null,
        inactive_by: null,
      })
      .eq('id', seniorId);
    return { error: docError.message };
  }

  revalidatePath('/directory');
  revalidatePath('/dashboard');
  revalidatePath('/approvals');
  revalidatePath('/barangay/dashboard');
  revalidatePath('/archive');
  return { success: true };
}