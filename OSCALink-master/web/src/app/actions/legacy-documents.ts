'use server';

import { createServerClient as createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

const OSCA_ROLES = ['super_admin', 'admin', 'osca_head', 'osca_staff'];

export async function saveLegacyDocument(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be logged in.' };

  const role = user.user_metadata?.role as string | undefined;
  if (!role || !OSCA_ROLES.includes(role)) {
    return { error: 'FORBIDDEN: Only OSCA staff can digitize archive documents.' };
  }

  const seniorId = (formData.get('senior_id') as string) || null;
  const fullName = (formData.get('full_name') as string) || null;
  const registrationId = (formData.get('registration_id') as string) || null;
  const fileUrl = formData.get('file_url') as string;
  const notes = (formData.get('notes') as string) || null;

  if (!fileUrl) return { error: 'Please upload a scanned document file.' };
  if (!seniorId) return { error: 'Please link the Death Certificate to a deceased senior record.' };

  const { error } = await supabase.from('legacy_documents').insert({
    senior_id: seniorId,
    full_name: fullName || null,
    registration_id: registrationId || null,
    document_type: 'Death Certificate',
    file_url: fileUrl,
    notes: notes || null,
    scanned_by: user.id,
  });

  if (error) {
    console.error('Legacy document save error:', error.message);
    return { error: error.message };
  }

  revalidatePath('/archive');
  return { success: true };
}

export async function deleteLegacyDocument(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be logged in.' };

  const role = user.user_metadata?.role as string | undefined;
  if (!role || !OSCA_ROLES.includes(role)) {
    return { error: 'FORBIDDEN' };
  }

  const { error } = await supabase.from('legacy_documents').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/archive');
  return { success: true };
}
