'use server';

import { createServerClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getUserRole } from "@/lib/rbac";

async function getClientIp(): Promise<string> {
  const headersList = await headers();
  return headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || headersList.get('x-real-ip') || 'unknown';
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { success: false, error: 'Not authenticated' };

  if (newPassword.length < 8) {
    return { success: false, error: 'New password must be at least 8 characters.' };
  }

  const adminClient = await createAdminClient();
  if (!adminClient) {
    return { success: false, error: 'Server configuration error.' };
  }

  // Check if this is a first-login (temp password) scenario
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_login')
    .eq('id', user.id)
    .maybeSingle();

  const isFirstLogin = profile?.first_login === true;

  if (!isFirstLogin && currentPassword) {
    // Only verify current password when NOT a first-time change and password provided
    const { error: signInError } = await adminClient.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      return { success: false, error: 'Current password is incorrect.' };
    }
  }

  const { error: updateError } = await adminClient.auth.admin.updateUserById(
    user.id,
    { password: newPassword }
  );

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Clear first_login flag
  if (isFirstLogin) {
    await supabase
      .from('profiles')
      .update({ first_login: false })
      .eq('id', user.id);
  }

  try {
    const role = getUserRole(user.user_metadata as Record<string, unknown> | undefined);
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_email: user.email,
      user_role: role,
      action: 'password_changed',
      category: 'settings',
      table_name: 'profiles',
      record_id: user.id,
      ip_address: await getClientIp(),
    });
  } catch (err) {
    console.error('[AUDIT] Failed to log password change:', err);
  }

  revalidatePath('/settings');
  revalidatePath('/barangay');
  return { success: true };
}

export async function updateProfilePhone(contactNumber: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const role = getUserRole(user.user_metadata as Record<string, unknown> | undefined);
  const trimmed = contactNumber.trim();

  const { error } = await supabase
    .from('profiles')
    .update({ contact_number: trimmed || null })
    .eq('id', user.id);

  if (error) return { success: false, error: error.message };

  try {
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_email: user.email,
      user_role: role,
      action: 'profile_contact_number_updated',
      category: 'settings',
      table_name: 'profiles',
      record_id: user.id,
      new_values: { contact_number: trimmed || null },
      ip_address: await getClientIp(),
    });
  } catch (err) {
    console.error('[AUDIT] Failed to log:', err);
  }

  revalidatePath('/settings');
  return { success: true };
}

export async function updateDisplayName(fullName: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const role = getUserRole(user.user_metadata as Record<string, unknown> | undefined);

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', user.id);

  if (error) return { success: false, error: error.message };

  try {
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_email: user.email,
      user_role: role,
      action: 'profile_display_name_updated',
      category: 'settings',
      table_name: 'profiles',
      record_id: user.id,
      new_values: { full_name: fullName },
      ip_address: await getClientIp(),
    });
  } catch (err) {
    console.error('[AUDIT] Failed to log:', err);
  }

  revalidatePath('/settings');
  return { success: true };
}

export async function updateMunicipalConfig(config: {
  mayor_name: string;
  osca_head_name: string;
  municipality_name: string;
  mayor_signature_url?: string | null;
  osca_head_signature_url?: string | null;
}) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const role = user ? getUserRole(user.user_metadata as Record<string, unknown> | undefined) : null;

  const { error } = await supabase
    .from('municipal_config')
    .update({
      mayor_name: config.mayor_name,
      osca_head_name: config.osca_head_name,
      municipality_name: config.municipality_name,
      mayor_signature_url: config.mayor_signature_url ?? null,
      osca_head_signature_url: config.osca_head_signature_url ?? null,
    })
    .eq('id', 1);

  if (error) return { success: false, error: error.message };

  if (user) {
    try {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        user_role: role,
        action: 'municipal_config_updated',
        category: 'settings',
        table_name: 'municipal_config',
        new_values: config,
        ip_address: await getClientIp(),
      });
    } catch (err) {
      console.error('[AUDIT] Failed to log:', err);
    }
  }

  revalidatePath('/settings');
  revalidatePath('/reports');
  return { success: true };
}
