'use server';

import { createAdminClient, createServerClient } from "@/lib/supabase-server";
import { sendCredentialEmail, sendPasswordResetEmail } from "@/lib/send-email";
import { revalidatePath } from "next/cache";
import { normalizeRole, OSCA_ROLES } from "@/lib/rbac";

// Privileged Supabase client that bypasses RLS for staff management. Falls back
// to the user-authenticated server client when SUPABASE_SERVICE_ROLE_KEY is not
// configured (e.g. local development) so the feature keeps working everywhere.
async function getPrivilegedClient() {
  const adminClient = await createAdminClient();
  return adminClient ?? (await createServerClient());
}

// Resolve a caller's app role from the profiles table, falling back to
// user_metadata. Reads are done through the service-role client when available,
// so an RLS policy can never make a valid staff account look unauthorized. Roles
// are normalized (legacy values like 'head' -> 'osca_head' and 'admin' ->
// 'osca_staff') so stored role names never trigger a false FORBIDDEN.
async function getCallerRole(user: { id: string; user_metadata?: Record<string, unknown> | null }) {
  const client = await getPrivilegedClient();
  const { data: profile } = await client
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  return normalizeRole(profile?.role ?? (user.user_metadata?.role as string | undefined));
}

export async function createStaff(formData: FormData) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'UNAUTHORIZED: You must be logged in to provision staff.' };
  }

  const callerRole = await getCallerRole(user);

  if (!callerRole || !(OSCA_ROLES as readonly string[]).includes(callerRole)) {
    return { error: 'FORBIDDEN: Only OSCA Head or OSCA Staff can create accounts.' };
  }

  const adminClient = await createAdminClient();

  if (!adminClient) {
    return {
      error: "MUNICIPAL_AUTH_REJECTION: SUPABASE_SERVICE_ROLE_KEY is missing from environment variables."
    };
  }

  const email = formData.get('email') as string;
  const fullName = formData.get('fullName') as string;
  const barangay = formData.get('barangay') as string;
  const purok = formData.get('purok') as string;
  const role = formData.get('role') as string || 'osca_staff';
  const contactNumber = formData.get('contact_number') as string;
  const password = Math.random().toString(36).slice(-12);

  const validRoles = ['super_admin', 'admin', 'head', 'osca_head', 'osca_staff'];
  if (!(validRoles.includes(role) || normalizeRole(role))) {
    return { error: 'Invalid role selected. Only OSCA staff roles can be commissioned.' };
  }

  const userMetadata: Record<string, unknown> = {
    full_name: fullName,
    role: role,
    barangay: barangay || null,
  };

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: userMetadata,
  });

  if (authError) {
    console.error('Staff Provisioning Error:', authError.message);
    return { error: `AUTH_FAILURE: ${authError.message}` };
  }

  // Insert the profile through the service-role client to bypass RLS on Vercel.
  const { error: profileError } = await adminClient
    .from('profiles')
    .insert([
      {
        id: authData.user.id,
        full_name: fullName,
        email: email,
        role: role,
        barangay: barangay || null,
        purok: role === 'barangay_president' ? purok || null : null,
        contact_number: contactNumber || null,
      }
    ]);

  if (profileError) {
    console.error('Profile Sync Error:', profileError.message);
  }

  try {
    await sendCredentialEmail(email, fullName, password);
  } catch (emailError) {
    console.error('[EMAIL] Failed to send credential email:', emailError);
  }

  revalidatePath('/staff');
  return {
    success: true,
    temp_credentials: { email, password },
    message: `Account commissioned for ${fullName}.`
  };
}

export async function getStaffList() {
  // Service-role client so RLS never hides staff rows on production; falls back
  // to the anon client locally. Matches both legacy and canonical role names.
  const client = await getPrivilegedClient();
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .in('role', [
      'super_admin',
      'admin',
      'head',
      'osca_head',
      'osca_staff',
      'barangay_president',
      'barangay_official',
      'official',
    ])
    .order('full_name', { ascending: true });

  if (error) {
    console.error('Staff Retrieval Error:', error);
    return [];
  }

  return data || [];
}

export async function deleteStaff(staffId: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'UNAUTHORIZED: You must be logged in.' };
  }

  const callerRole = await getCallerRole(user);

  if (!callerRole || !(OSCA_ROLES as readonly string[]).includes(callerRole)) {
    return { error: 'FORBIDDEN: Only OSCA Head or OSCA Staff can remove accounts.' };
  }

  const adminClient = await createAdminClient();

  if (!adminClient) {
    return { error: "Service role key not available" };
  }

  const { error: authError } = await adminClient.auth.admin.deleteUser(staffId);

  if (authError) {
    console.error('Delete Staff Auth Error:', authError.message);
    return { error: `AUTH_DELETE_FAILED: ${authError.message}` };
  }

  const { error: profileError } = await adminClient
    .from('profiles')
    .delete()
    .eq('id', staffId);

  if (profileError) {
    console.error('Delete Profile Error:', profileError.message);
  }

  revalidatePath('/staff');
  return { success: true };
}

export async function updateStaff(staffId: string, formData: FormData) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'UNAUTHORIZED: You must be logged in.' };
  }

  const callerRole = await getCallerRole(user);

  if (!callerRole || !(OSCA_ROLES as readonly string[]).includes(callerRole)) {
    return { error: 'FORBIDDEN: Only OSCA Head or OSCA Staff can update accounts.' };
  }

  const adminClient = await createAdminClient();

  if (!adminClient) {
    return { error: "Service role key not available" };
  }

  const fullName = formData.get('fullName') as string;
  const email = formData.get('email') as string;
  const barangay = formData.get('barangay') as string;
  const purok = formData.get('purok') as string;
  const role = formData.get('role') as string;
  const contactNumber = formData.get('contact_number') as string;

  const userMetadata: Record<string, unknown> = {
    full_name: fullName,
    role: role,
    barangay: barangay || null,
    contact_number: contactNumber || null,
  };

  if (role === 'barangay_president' && purok) {
    userMetadata.purok = purok;
  }

  const updatePayload: Record<string, unknown> = {
    user_metadata: userMetadata,
  };

  if (email) {
    updatePayload.email = email;
  }

  const { error: authError } = await adminClient.auth.admin.updateUserById(staffId, updatePayload);

  if (authError) {
    console.error('Update Staff Auth Error:', authError.message);
    return { error: `AUTH_UPDATE_FAILED: ${authError.message}` };
  }

  const { error: profileError } = await adminClient
    .from('profiles')
    .update({
      full_name: fullName,
      email: email,
      barangay: barangay || null,
      purok: role === 'barangay_president' ? purok || null : null,
      role: role,
      contact_number: contactNumber || null,
    })
    .eq('id', staffId);

  if (profileError) {
    console.error('Update Profile Error:', profileError.message);
    return { error: `PROFILE_UPDATE_FAILED: ${profileError.message}` };
  }

  revalidatePath('/staff');
  return { success: true };
}

export async function resetStaffPassword(staffId: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'UNAUTHORIZED: You must be logged in.' };
  }

  const callerRole = await getCallerRole(user);

  if (callerRole !== 'osca_head' && callerRole !== 'super_admin') {
    return { error: 'FORBIDDEN: Only the OSCA Head can reset staff passwords.' };
  }

  const adminClient = await createAdminClient();
  if (!adminClient) {
    return { error: "MUNICIPAL_AUTH_REJECTION: Service role key not available" };
  }

  const { data: staffProfile, error: profileErr } = await adminClient
    .from('profiles')
    .select('email, full_name')
    .eq('id', staffId)
    .single();

  if (profileErr || !staffProfile) {
    return { error: 'Staff profile not found.' };
  }

  const newPassword = Math.random().toString(36).slice(-12);

  const { error: authError } = await adminClient.auth.admin.updateUserById(staffId, {
    password: newPassword
  });

  if (authError) {
    console.error('Reset Password Auth Error:', authError.message);
    return { error: `AUTH_RESET_FAILED: ${authError.message}` };
  }

  try {
    await sendPasswordResetEmail(staffProfile.email, staffProfile.full_name || '', newPassword);
  } catch (emailError) {
    console.error('[EMAIL] Failed to send reset password email:', emailError);
    return { error: 'Password was updated, but failed to send email.' };
  }

  return { success: true, message: `Password reset successfully. A new password has been sent to ${staffProfile.email}.` };
}
