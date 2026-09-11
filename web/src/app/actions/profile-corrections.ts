'use server';

import { createServerClient as createClient, createAdminClient } from '@/lib/supabase-server';
import { normalizeRole, OSCA_ROLES } from '@/lib/rbac';
import { v4 as uuidv4 } from 'uuid';

export type ProfileCorrectionIssueType =
  | 'misspelled_name'
  | 'wrong_birthdate'
  | 'address_update'
  | 'appeal';

export type ProfileCorrectionStatus =
  | 'PENDING'
  | 'APPROVED_UPDATED'
  | 'REJECTED';

export interface ProfileCorrectionFormData {
  seniorId: string;
  issueType: ProfileCorrectionIssueType;
  fieldToCorrect: string;
  originalValue: string;
  requestedCorrection: string;
  remarksReason?: string;
}

export interface ProfileCorrection {
  id: string;
  seniorId: string;
  issueType: ProfileCorrectionIssueType;
  fieldToCorrect: string;
  originalValue: string;
  requestedCorrection: string;
  remarksReason?: string;
  status: ProfileCorrectionStatus;
  createdAt: string;
  createdBy?: string;
  seniorFullName?: string;
  seniorRegistrationId?: string;
}

export async function createProfileCorrection(
  formData: ProfileCorrectionFormData
): Promise<{ success: true; correction: ProfileCorrection } | { error: string; correction?: ProfileCorrection }> {
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'Not authenticated' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const callerRole = normalizeRole(profile?.role ?? (user.user_metadata?.role as string | undefined));
    const validRoles = ['super_admin', 'osca_head', 'mswd_officer', 'mayor', 'official'];
    if (!callerRole || !validRoles.includes(callerRole)) {
      return { error: 'Unauthorized. Only OSCA staff can create correction requests.' };
    }

    const { data: senior } = await supabase
      .from('seniors')
      .select('id, full_name, registration_id')
      .eq('id', formData.seniorId)
      .single();

    if (!senior) {
      return { error: 'Senior not found.' };
    }

    const { data: correction, error: cErr } = await supabase
      .from('profile_corrections')
      .insert({
        senior_id: formData.seniorId,
        issue_type: formData.issueType,
        field_to_correct: formData.fieldToCorrect,
        original_value: formData.originalValue,
        requested_correction: formData.requestedCorrection,
        remarks_reason: formData.remarksReason,
        status: 'PENDING',
        created_by: user.id,
      })
      .select()
      .single();

    if (cErr || !correction) {
      return { error: 'Failed to create correction request: ' + (cErr?.message || 'unknown error') };
    }

    return { success: true, correction: { ...correction, seniorFullName: senior.full_name, seniorRegistrationId: senior.registration_id } };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Failed to create correction request' };
  }
}

export async function updateProfileCorrection(
  correctionId: string,
  status: ProfileCorrectionStatus,
  staffNotes?: string
): Promise<{ success: true; correction: ProfileCorrection } | { error: string }> {
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'Not authenticated' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const callerRole = normalizeRole(profile?.role ?? (user.user_metadata?.role as string | undefined));
    const validStaffRoles = ['super_admin', 'osca_head', 'mswd_officer', 'mayor'];
    if (!callerRole || !validStaffRoles.includes(callerRole)) {
      return { error: 'Unauthorized. Only OSCA staff can approve/reject correction requests.' };
    }

    const updateData: Record<string, unknown> = {
      status,
    };

    if (staffNotes) {
      updateData.remarks_reason = staffNotes;
    }

    const { data: correction, error: cErr } = await supabase
      .from('profile_corrections')
      .update(updateData)
      .eq('id', correctionId)
      .select()
      .single();

    if (cErr || !correction) {
      return { error: 'Failed to update correction request: ' + (cErr?.message || 'unknown error') };
    }

    // If approved, simply update the status - no profile changes or notifications
    if (status === 'APPROVED_UPDATED') {
      // Status only update - no profile modification or notification sending
    }

    return { success: true, correction: { ...correction } };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Failed to update correction request' };
  }
}

export async function getProfileCorrections(
  filters?: {
    status?: ProfileCorrectionStatus;
    issueType?: ProfileCorrectionIssueType;
    seniorId?: string;
  }
): Promise<ProfileCorrection[]> {
  const supabase = await createClient();

  let query = supabase
    .from('profile_corrections')
    .select(`
      *,
      seniors!inner (full_name, registration_id)
    `)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.issueType) {
    query = query.eq('issue_type', filters.issueType);
  }
  if (filters?.seniorId) {
    query = query.eq('senior_id', filters.seniorId);
  }

  const { data, error } = await query;

  if (error || !data) return [];

  return data.map((c: any) => ({
    id: c.id,
    seniorId: c.senior_id,
    issueType: c.issue_type,
    fieldToCorrect: c.field_to_correct,
    originalValue: c.original_value,
    requestedCorrection: c.requested_correction,
    remarksReason: c.remarks_reason,
    status: c.status,
    createdAt: c.created_at,
    createdBy: c.created_by,
    seniorFullName: c.seniors?.full_name,
    seniorRegistrationId: c.seniors?.registration_id,
  }));
}

export async function getProfileCorrectionById(
  id: string
): Promise<ProfileCorrection | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profile_corrections')
    .select(`
      *,
      seniors!inner (full_name, registration_id)
    `)
    .eq('id', id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    seniorId: data.senior_id,
    issueType: data.issue_type,
    fieldToCorrect: data.field_to_correct,
    originalValue: data.original_value,
    requestedCorrection: data.requested_correction,
    remarksReason: data.remarks_reason,
    status: data.status,
    createdAt: data.created_at,
    createdBy: data.created_by,
    seniorFullName: data.seniors?.full_name,
    seniorRegistrationId: data.seniors?.registration_id,
  };
}