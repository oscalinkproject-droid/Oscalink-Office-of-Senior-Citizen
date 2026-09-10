'use server';

import { createServerClient as createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { validateBarangay, GeofenceError } from "@/lib/geofencing";
import { createSeniorSchema, updateSeniorSchema } from "@/lib/validation";
import { normalizeRole } from "@/lib/rbac";
import { ZodError } from "zod";

export async function createSenior(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const role = normalizeRole(user?.user_metadata?.role);
  if (role !== 'osca_staff') {
    return { error: 'FORBIDDEN: Only OSCA Staff can register seniors.' };
  }
  
  const birthdate = formData.get('birthdate') as string;
  const barangay = formData.get('barangay') as string;

  const age = birthdate ? (() => {
    const birthDate = new Date(birthdate + 'T00:00:00');
    const today = new Date();
    let a = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) a--;
    return a >= 60 ? a : 60;
  })() : null;

  try {
    validateBarangay(barangay);
  } catch (e) {
    if (e instanceof GeofenceError) {
      return { error: e.message };
    }
    throw e;
  }

  const firstName = (formData.get('first_name') as string) || '';
  const middleName = (formData.get('middle_name') as string) || '';
  const lastName = (formData.get('last_name') as string) || '';
  const suffix = (formData.get('suffix') as string) || '';
  const fullName = (formData.get('full_name') as string) || [firstName, middleName, lastName, suffix].filter(Boolean).join(' ').trim() || '';

  // Dedup: prevent duplicate profiles by full name + birthdate.
  // Returnees (Cancelled / Transferred) are excluded at the DB level and here.
  if (fullName && birthdate) {
    const { data: matches } = await supabase
      .from('seniors')
      .select('id, registration_id, status')
      .eq('full_name', fullName)
      .eq('birthdate', birthdate);

    const duplicate = (matches || []).find(m => m.status !== 'Cancelled' && m.status !== 'Transferred');
    if (duplicate) {
      return { error: `Duplicate entry: ${fullName} (born ${birthdate}) already exists with status "${duplicate.status}" and ID ${duplicate.registration_id}.` };
    }
  }

  const registrationId = (formData.get('registration_id') as string)?.trim() || '';

  function generateRefNumber(base?: string): string {
    if (base) return base;
    const d = birthdate ? new Date(birthdate + 'T00:00:00') : new Date();
    const yyyymmdd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const randomSuffix = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `REF-${yyyymmdd}-${randomSuffix}`;
  }

  // Atomic insert with retry on unique violation
  const MAX_RETRIES = 5;
  let finalRegistrationId = generateRefNumber(registrationId);
  let senior: { id: string; registration_id: string; full_name: string } | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      finalRegistrationId = generateRefNumber();
    }

    const data = {
      registration_id: finalRegistrationId,
      full_name: fullName || (formData.get('full_name') as string),
      middle_name: middleName || null,
      suffix: suffix || null,
      age: age,
      barangay: barangay,
      contact_number: formData.get('contact_number') as string || null,
      address: formData.get('address') as string || null,
      birthdate: birthdate || null,
      emergency_contact_name: formData.get('emergency_contact_name') as string || null,
      emergency_contact_number: formData.get('emergency_contact_number') as string || null,
      emergency_contact_relationship: formData.get('emergency_contact_relationship') as string || null,
      address_unit: formData.get('address_unit') as string || null,
      address_building: formData.get('address_building') as string || null,
      address_lot_block: formData.get('address_lot_block') as string || null,
      address_street: formData.get('address_street') as string || null,
      purok: formData.get('purok') as string || null,
      address_subdivision: formData.get('address_subdivision') as string || null,
      address_city: formData.get('address_city') as string || 'Cotabato City',
      address_province: formData.get('address_province') as string || 'Maguindanao',
      address_region: formData.get('address_region') as string || 'BARMM',
      philhealth_no: formData.get('philhealth_no') as string || null,
      sss_no: formData.get('sss_no') as string || null,
      gsis_no: formData.get('gsis_no') as string || null,
      pvao_no: formData.get('pvao_no') as string || null,
      tin: formData.get('tin') as string || null,
      sex: formData.get('sex') as string || null,
      civil_status: formData.get('civil_status') as string || null,
      blood_type: formData.get('blood_type') as string || null,
      religion: formData.get('religion') as string || null,
      education: formData.get('education') as string || null,
      employment_status: formData.get('employment_status') as string || null,
      classification: formData.get('classification') as string || 'Indigent',
      profile_photo_url: formData.get('profile_photo_url') as string || null,
      birth_certificate_url: formData.get('birth_certificate_url') as string || null,
      voter_id_url: formData.get('voter_id_url') as string || null,
      digital_signature_url: formData.get('digital_signature_url') as string || null,
      thumbmark_url: formData.get('thumbmark_url') as string || null,
      is_bedridden: formData.get('is_bedridden') === 'true',
      is_pensioner: formData.get('is_pensioner') === 'true',
      pensioner_type: (formData.get('pensioner_type') as string) || null,
      is_voter: formData.get('is_voter') === 'true',
      place_of_birth: formData.get('place_of_birth') as string || null,
      status: formData.get('status') as string || 'Pending',
    };

    try {
      createSeniorSchema.parse(data);
    } catch (e) {
      if (e instanceof ZodError) {
        return { error: `${e.issues[0].path.join('.')}: ${e.issues[0].message}` };
      }
      throw e;
    }

    if (data.is_pensioner) {
      data.classification = 'Pensioner';
    }

    const result = await supabase
      .from('seniors')
      .insert([data])
      .select()
      .single();

    if (result.error) {
      // PG code 23505 = unique violation on registration_id
      if (result.error.code === '23505' && attempt < MAX_RETRIES - 1) {
        continue; // retry with new random suffix
      }
      console.error('Registration error:', result.error);
      return { error: result.error.message };
    }

    senior = result.data as { id: string; registration_id: string; full_name: string };
    break;
  }

  if (!senior) {
    return { error: 'Failed to generate a unique registration ID after multiple attempts.' };
  }

  const familyJson = formData.get('family_members') as string;
  if (familyJson) {
    try {
      const familyMembers = JSON.parse(familyJson);
      if (Array.isArray(familyMembers) && familyMembers.length > 0) {
        const { error: familyError } = await supabase
          .from('family_composition')
          .insert(
            familyMembers.map((m: { member_name: string; relationship: string; birthdate?: string; occupation?: string; civil_status?: string; monthly_income?: number }) => ({
              senior_id: senior.id,
              member_name: m.member_name,
              relationship: m.relationship,
              birthdate: m.birthdate || null,
              occupation: m.occupation || null,
              civil_status: m.civil_status || null,
              monthly_income: m.monthly_income || 0,
            }))
          );
        if (familyError) {
          console.error('Family member insert error:', familyError);
        }
      }
    } catch (parseError) {
      console.error('Failed to parse family_members JSON:', parseError);
    }
  }

  try {
    const { data: authResult, error: authError } = await supabase
      .rpc('create_senior_auth_user', {
        p_registration_id: senior.registration_id,
        p_password: birthdate?.trim() || '',
        p_full_name: senior.full_name,
        p_senior_id: senior.id,
      });

    if (authError) {
      console.error('Auth user creation failed:', authError);
    } else if (authResult?.user_id) {
      await supabase
        .from('seniors')
        .update({ auth_id: authResult.user_id })
        .eq('id', senior.id);
    }
  } catch (err) {
    console.error('Auth user creation error:', err);
  }

  revalidatePath('/directory');
  revalidatePath('/dashboard');
  revalidatePath('/approvals');
  return {
    success: true,
    senior: {
      id: senior.id,
      registration_id: senior.registration_id,
      full_name: senior.full_name,
      birthdate: birthdate || '',
    },
  };
}

export async function updateSeniorStatusByBarangay(id: string, newStatus: string, reason?: string) {
  // 'Deceased' is intentionally NOT an option here: marking a senior deceased
  // requires the dedicated markSeniorDeceased flow, which strictly enforces an
  // uploaded Death Certificate.
  const validStatuses = ['Transferred', 'Inactive', 'Cancelled'];
  if (!validStatuses.includes(newStatus)) {
    return { error: 'Invalid status. Only Transferred, Inactive, or Cancelled allowed. Use the Mark as Deceased flow for deceased records.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'You must be logged in.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, barangay')
    .eq('id', user.id)
    .single();

  const role = normalizeRole(profile?.role ?? (user.user_metadata?.role as string | undefined));

  // Centralized at OSCA Municipal Level only — barangay roles may no longer update statuses.
  if (role !== 'super_admin' && role !== 'osca_head' && role !== 'osca_staff') {
    return { error: 'FORBIDDEN: Status updates are restricted to OSCA Municipal staff (Super Admin, OSCA Head, Admin Staff).' };
  }

  const { data: senior } = await supabase
    .from('seniors')
    .select('status')
    .eq('id', id)
    .single();

  if (!senior) {
    return { error: 'Senior not found.' };
  }

  if (senior.status === newStatus) {
    return { error: `Senior is already marked as ${newStatus}.` };
  }

  const updateData: Record<string, unknown> = {
    status: newStatus,
    benefits_eligible: false,
  };
  const now = new Date().toISOString();
  if (newStatus === 'Inactive') {
    updateData.inactive_at = now;
    updateData.inactive_by = user.id;
    updateData.inactive_reason = reason || 'Deceased or disqualified from benefits';
  }
  if (newStatus === 'Transferred') {
    updateData.transferred_at = now;
    updateData.decision_reason = reason || 'Relocated to another region or city';
  }
  if (newStatus === 'Cancelled') {
    updateData.cancelled_at = now;
    updateData.decision_reason = reason || 'Relocated — record cancelled; returnee treated as new applicant';
  }

  const { error } = await supabase
    .from('seniors')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Status update error:', error);
    return { error: error.message };
  }

  revalidatePath('/barangay/dashboard');
  revalidatePath('/directory');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function verifySenior(id: string) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'You must be logged in to verify records' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    const role = normalizeRole(profile?.role ?? (user.user_metadata?.role as string | undefined));
    if (!role) {
      return { error: 'Could not resolve user role' };
    }

    // OSCA Staff verifies (documents, residency)
    if (role !== 'osca_head' && role !== 'osca_staff') {
      return { error: 'Unauthorized: Only OSCA Head or OSCA Staff can verify records.' };
    }

    const updates: Record<string, unknown> = {
      is_verified: true,
      verified_by: user.id,
      verified_at: new Date().toISOString(),
    };

    const { error: seniorError } = await supabase
      .from('seniors')
      .update(updates)
      .eq('id', id);

    if (seniorError) {
      console.error('[VERIFY] DB update failed:', seniorError);
      return { error: seniorError.message };
    }

    try {
      const headersList = await headers();
      const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || headersList.get('x-real-ip') || 'unknown';
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        user_role: role,
        action: 'senior_verified',
        category: 'senior',
        table_name: 'seniors',
        record_id: id,
        new_values: updates,
        ip_address: ip,
      });
    } catch (err) {
      console.error('[AUDIT] Failed to log:', err);
    }

    revalidatePath('/directory');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return { error: message };
  }
}

const padIdSequence = (n: number) => String(n).padStart(4, '0');

// Cryptographically random 4-digit numeric suffix (0000-9999).
// We intentionally do NOT pre-query the database for a free number: uniqueness
// is enforced by the UNIQUE index on seniors.id_number, and collisions
// (PostgreSQL error 23505) are handled by the retry loop in approveSenior.
// This avoids the check-then-insert race that plagues sequential IDs.
function randomIdSuffix(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return Array.from(bytes, (b) => String(b % 10)).join('');
}

// Returns a candidate OSCA ID with a random 4-digit numeric suffix.
function nextUniqueOscaId(datePart: string): string {
  return `OSC-${datePart}-${randomIdSuffix()}`;
}

export async function getNextSeniorIdSequence(datePart?: string) {
  try {
    const supabase = await createClient();
    if (datePart) {
      const nextId = nextUniqueOscaId(datePart);
      return { success: true, sequence: nextId.slice(-4) };
    }
    const { count } = await supabase
      .from('seniors')
      .select('id', { count: 'exact', head: true })
      .not('id_number', 'is', null);
    const next = (count || 0) + 1;
    return { success: true, sequence: padIdSequence(next) };
  } catch {
    return { error: 'Failed to generate ID sequence' };
  }
}

export async function approveSenior(id: string, manualIdNumber?: string) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'You must be logged in to approve records' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    const role = normalizeRole(profile?.role ?? (user.user_metadata?.role as string | undefined));
    if (!role) {
      return { error: 'Could not resolve user role' };
    }

    // Only the OSCA Head can give final approval
    if (role !== 'osca_head') {
      return { error: 'Unauthorized: Only the OSCA Head can approve records.' };
    }

    // Mint the official ID number only once, at approval time. An OSCA ID must
    // NOT exist while the senior is still unapproved (Pending). We only reuse an
    // existing id_number if the record is ALREADY approved (osca_approved), never
    // for an unapproved/Pending record (data inconsistency -> force a fresh mint).
    let idNumber: string | null = null;
    let mintedDate: string | null = null;
    const { data: existing } = await supabase
      .from('seniors')
      .select('id_number, osca_approved')
      .eq('id', id)
      .single();

    if (existing?.id_number && existing.osca_approved) {
      idNumber = existing.id_number;
    } else {
      // The OSCA ID number is strictly required and must follow OSC-YYYYMMDD-NNNN.
      if (!manualIdNumber || !manualIdNumber.trim()) {
        return { error: 'OSCA ID number is required before approval.' };
      }
      const submitted = manualIdNumber.trim().toUpperCase();
      const match = /^OSC-(\d{8})-(\d{4})$/.exec(submitted);
      if (!match) {
        return { error: 'OSCA ID must follow the format OSC-YYYYMMDD-NNNN (e.g. OSC-20260901-0001).' };
      }
      // Always mint a fresh random 4-digit numeric suffix that is not already
      // assigned in the database (scoped per issue date), so duplicates are
      // extremely unlikely; the UNIQUE index still guarantees no collision.
      mintedDate = match[1];
      idNumber = nextUniqueOscaId(mintedDate);
    }

    // Auto-convert a pending REF- registration ID to the official OSC- ID on
    // approval, so the registration_id no longer advertises an unresolved/pending
    // reference. Must match the OSCA ID format OSC-YYYYMMDD-NNNN.
    const { data: pending } = await supabase
      .from('seniors')
      .select('registration_id')
      .eq('id', id)
      .maybeSingle();

    let finalRegistrationId: string | null = null;
    const pendingRegId = pending?.registration_id;
    if (pendingRegId && /^REF-\d{8}-\d{4}$/.test(pendingRegId)) {
      const datePart = pendingRegId.slice(4, 12);
      finalRegistrationId = `OSC-${datePart}-${pendingRegId.slice(-4)}`;
    }

    const updates: Record<string, unknown> = {
      status: 'Active',
      osca_approved: true,
      osca_approved_by: user.id,
      osca_approved_at: new Date().toISOString(),
      id_number: idNumber,
      id_issue_date: new Date().toISOString().slice(0, 10),
    };
    if (finalRegistrationId) {
      updates.registration_id = finalRegistrationId;
    }

    // The UNIQUE index on `seniors.id_number` is the hard guarantee against
    // duplicates; if a concurrent approval claims the same suffix between the
    // check above and this update, re-mint a fresh suffix and retry.
    const imposedUpdates = { ...updates };
    let seniorError: { message: string; code?: string } | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      if (attempt > 0) {
        if (!mintedDate) break;
        idNumber = nextUniqueOscaId(mintedDate);
        imposedUpdates.id_number = idNumber;
      }
      const { error } = await supabase
        .from('seniors')
        .update(imposedUpdates)
        .eq('id', id);
      if (!error) {
        seniorError = null;
        break;
      }
      seniorError = error;
      if (error.code === '23505' && mintedDate && attempt < 4) continue;
      break;
    }

    if (seniorError) {
      console.error('[APPROVE] DB update failed:', seniorError);
      return { error: seniorError.message };
    }

    // Send push notification to the approved senior
    const { data: approvedSenior } = await supabase
      .from('seniors')
      .select('auth_id, full_name')
      .eq('id', id)
      .single();

    if (approvedSenior?.auth_id) {
      await supabase.from('notifications').insert({
        user_id: approvedSenior.auth_id,
        title: 'Registration Approved',
        message: `Congratulations ${approvedSenior.full_name}! Your senior citizen registration has been approved by the OSCA Head. Visit the OSCA office to collect your physical ID card.`,
        type: 'success',
        notification_category: 'status_update',
      });
    }

    try {
      const headersList = await headers();
      const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || headersList.get('x-real-ip') || 'unknown';
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        user_role: role,
        action: 'senior_approved',
        category: 'senior',
        table_name: 'seniors',
        record_id: id,
        new_values: updates,
        ip_address: ip,
      });
    } catch (err) {
      console.error('[AUDIT] Failed to log:', err);
    }

    revalidatePath('/directory');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return { error: message };
  }
}

export async function disapproveSenior(id: string, reason: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'You must be logged in.' };

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const role = normalizeRole(profile?.role ?? (user.user_metadata?.role as string | undefined));
    if (role !== 'osca_head') {
      return { error: 'Unauthorized: Only the OSCA Head can disapprove records.' };
    }

    const updates: Record<string, unknown> = {
      status: 'Disapproved',
      decision_reason: reason || 'Missing or fake requirements',
      disapproved_by: user.id,
      disapproved_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('seniors').update(updates).eq('id', id);
    if (error) return { error: error.message };

    await notifyStatus(id, '⚠️ Application Status: Disapproved (Needs Action)', 'Magandang araw. Mayroong kulang o kailangang ayusin sa iyong isinumiteng requirements. Mangyaring pumunta sa OSCA Office para sa kinakailangang pagwawasto.', 'warning');
    await logAudit(supabase, user, role, 'senior_disapproved', id, updates);
    revalidatePath('/directory');
    revalidatePath('/approvals');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Internal Server Error' };
  }
}

export async function disqualifySenior(id: string, reason: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'You must be logged in.' };

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const role = normalizeRole(profile?.role ?? (user.user_metadata?.role as string | undefined));
    if (role !== 'osca_head') {
      return { error: 'Unauthorized: Only the OSCA Head can disqualify records.' };
    }

    const updates: Record<string, unknown> = {
      status: 'Disqualified',
      decision_reason: reason || 'Duplicate or non-resident entry',
      disqualification_indicators: reason || 'Duplicate or non-resident entry',
      benefits_eligible: false,
      disqualified_by: user.id,
      disqualified_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('seniors').update(updates).eq('id', id);
    if (error) return { error: error.message };

    await notifyStatus(id, '❌ Application Status: Disqualified', 'Magandang araw. Paumanhin, ngunit hindi nakapasa ang inyong aplikasyon ayon sa kwalipikasyon ng OSCA. Para sa karagdagang katanungan, maaari kayong bumisita sa OSCA Office.', 'warning');
    await logAudit(supabase, user, role, 'senior_disqualified', id, updates);
    revalidatePath('/directory');
    revalidatePath('/approvals');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Internal Server Error' };
  }
}

export async function markInactiveSenior(id: string, reason: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'You must be logged in.' };

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const role = normalizeRole(profile?.role ?? (user.user_metadata?.role as string | undefined));
    if (role !== 'super_admin' && role !== 'osca_head' && role !== 'osca_staff') {
      return { error: 'Unauthorized: Only OSCA Municipal staff can mark seniors inactive.' };
    }

    const updates: Record<string, unknown> = {
      status: 'Inactive',
      inactive_reason: reason || 'Disqualified from benefits',
      disqualification_indicators: reason || 'Disqualified from benefits',
      benefits_eligible: false,
      inactive_at: new Date().toISOString(),
      inactive_by: user.id,
    };

    const { error } = await supabase.from('seniors').update(updates).eq('id', id);
    if (error) return { error: error.message };

    await logAudit(supabase, user, role, 'senior_inactive', id, updates);
    revalidatePath('/directory');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Internal Server Error' };
  }
}

async function notifyStatus(seniorId: string, title: string, message: string, type: 'info' | 'success' | 'warning') {
  try {
    const supabase = await createClient();
    const { data: senior } = await supabase.from('seniors').select('auth_id').eq('id', seniorId).single();
    if (senior?.auth_id) {
      await supabase.from('notifications').insert({
        user_id: senior.auth_id,
        title,
        message,
        type,
        notification_category: 'status_update',
      });
    }
  } catch (err) {
    console.error('[NOTIFY] Failed to send status notification:', err);
  }
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type AuditUser = { id: string; email?: string | null };

async function logAudit(supabase: SupabaseServerClient, user: AuditUser, role: string, action: string, recordId: string, values: Record<string, unknown>) {
  try {
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || headersList.get('x-real-ip') || 'unknown';
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_email: user.email,
      user_role: role,
      action,
      category: 'senior',
      table_name: 'seniors',
      record_id: recordId,
      new_values: values,
      ip_address: ip,
    });
  } catch (err) {
    console.error('[AUDIT] Failed to log:', err);
  }
}

export async function updateSenior(id: string, updates: Record<string, unknown>) {
  delete updates.id_number;
  try {
    updates = updateSeniorSchema.parse(updates);
  } catch (e) {
    if (e instanceof ZodError) {
      const firstError = e.issues[0];
      return { error: `${firstError.path.join('.')}: ${firstError.message}` };
    }
    throw e;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = normalizeRole(user?.user_metadata?.role);
  if (role !== 'super_admin' && role !== 'osca_staff') {
    return { error: 'FORBIDDEN: Only OSCA Staff can update senior profile details.' };
  }

  if (updates.barangay) {
    try {
      validateBarangay(updates.barangay as string);
    } catch (e) {
      if (e instanceof GeofenceError) {
        return { error: e.message };
      }
      throw e;
    }
  }

  // Enforce pensioner-classification consistency
  if (updates.is_pensioner === true) {
    updates.classification = 'Pensioner';
  }

  const { error } = await supabase
    .from('seniors')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Update error:', error);
    return { error: error.message };
  }

  revalidatePath('/directory');
  revalidatePath('/dashboard');
  return { success: true };
}

const toNullableText = (value: FormDataEntryValue | null): string | null => {
  if (value == null) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
};

// OSCA Staff edit a declined (Disapproved / Disqualified) application and
// resubmit it. The record's status is flipped back to "Pending" so it returns
// to the OSCA Head review queue while preserving the same registration_id and
// the previously uploaded documents unless replaced.
export async function resubmitApplication(id: string, formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'You must be logged in to resubmit an application.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = normalizeRole(profile?.role ?? (user.user_metadata?.role as string | undefined));
  if (role !== 'osca_staff' && role !== 'super_admin') {
    return { error: 'FORBIDDEN: Only OSCA Staff can resubmit declined applications.' };
  }

  const { data: senior } = await supabase
    .from('seniors')
    .select('id, status, registration_id')
    .eq('id', id)
    .single();

  if (!senior) {
    return { error: 'Senior application not found.' };
  }

  const currentStatus = (senior.status || '').toLowerCase();
  if (currentStatus !== 'disapproved' && currentStatus !== 'disqualified') {
    return { error: 'Only declined applications (Disapproved or Disqualified) can be resubmitted for review.' };
  }

  const birthdate = (formData.get('birthdate') as string) || null;
  const barangay = (formData.get('barangay') as string) || '';
  if (!barangay) {
    return { error: 'Barangay is required.' };
  }

  try {
    validateBarangay(barangay);
  } catch (e) {
    if (e instanceof GeofenceError) {
      return { error: e.message };
    }
    throw e;
  }

  const age = birthdate ? (() => {
    const birthDate = new Date(birthdate + 'T00:00:00');
    const today = new Date();
    let a = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) a--;
    return a >= 60 ? a : 60;
  })() : null;

  const firstName = (formData.get('first_name') as string) || '';
  const middleName = (formData.get('middle_name') as string) || '';
  const lastName = (formData.get('last_name') as string) || '';
  const suffix = (formData.get('suffix') as string) || '';
  const fullName = (formData.get('full_name') as string) || [firstName, middleName, lastName, suffix].filter(Boolean).join(' ').trim() || '';

  const data: Record<string, unknown> = {
    full_name: fullName,
    middle_name: toNullableText(formData.get('middle_name')),
    suffix: formData.get('suffix') as string || null,
    age: age,
    barangay: barangay,
    contact_number: toNullableText(formData.get('contact_number')),
    address: toNullableText(formData.get('address')),
    birthdate: birthdate,
    emergency_contact_name: toNullableText(formData.get('emergency_contact_name')),
    emergency_contact_number: toNullableText(formData.get('emergency_contact_number')),
    emergency_contact_relationship: toNullableText(formData.get('emergency_contact_relationship')),
    address_unit: toNullableText(formData.get('address_unit')),
    address_building: toNullableText(formData.get('address_building')),
    address_lot_block: toNullableText(formData.get('address_lot_block')),
    address_street: toNullableText(formData.get('address_street')),
    purok: toNullableText(formData.get('purok')),
    address_subdivision: toNullableText(formData.get('address_subdivision')),
    address_city: toNullableText(formData.get('address_city')) || 'Cotabato City',
    address_province: toNullableText(formData.get('address_province')) || 'Maguindanao',
    address_region: toNullableText(formData.get('address_region')) || 'BARMM',
    philhealth_no: toNullableText(formData.get('philhealth_no')),
    sss_no: toNullableText(formData.get('sss_no')),
    gsis_no: toNullableText(formData.get('gsis_no')),
    pvao_no: toNullableText(formData.get('pvao_no')),
    tin: toNullableText(formData.get('tin')),
    sex: formData.get('sex') as string || null,
    civil_status: toNullableText(formData.get('civil_status')),
    blood_type: toNullableText(formData.get('blood_type')),
    religion: toNullableText(formData.get('religion')),
    education: toNullableText(formData.get('education')),
    employment_status: toNullableText(formData.get('employment_status')),
    classification: formData.get('classification') as string || 'Indigent',
    profile_photo_url: toNullableText(formData.get('profile_photo_url')),
    birth_certificate_url: toNullableText(formData.get('birth_certificate_url')),
    voter_id_url: toNullableText(formData.get('voter_id_url')),
    digital_signature_url: toNullableText(formData.get('digital_signature_url')),
    thumbmark_url: toNullableText(formData.get('thumbmark_url')),
    is_bedridden: formData.get('is_bedridden') === 'true',
    is_pensioner: formData.get('is_pensioner') === 'true',
    pensioner_type: toNullableText(formData.get('pensioner_type')),
    is_voter: formData.get('is_voter') === 'true',
    place_of_birth: toNullableText(formData.get('place_of_birth')),
  };

  if (data.is_pensioner) {
    data.classification = 'Pensioner';
  }

  // Full validation using the same schema as initial registration (the record's
  // registration_id is preserved, so remaining required fields are re-checked).
  const validationPayload = { ...data, registration_id: senior.registration_id || '', status: 'Pending' };
  try {
    createSeniorSchema.parse(validationPayload);
  } catch (e) {
    if (e instanceof ZodError) {
      return { error: `${e.issues[0].path.join('.')}: ${e.issues[0].message}` };
    }
    throw e;
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    ...data,
    status: 'Pending',
    decision_reason: null,
    decision_note: null,
    disqualification_indicators: null,
    disapproved_by: null,
    disapproved_at: null,
    disqualified_by: null,
    disqualified_at: null,
    benefits_eligible: true,
    osca_approved: false,
    resubmitted_at: now,
    resubmitted_by: user.id,
    resubmit_notes: toNullableText(formData.get('resubmit_notes')),
  };

  const { error } = await supabase
    .from('seniors')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('[RESUBMIT] DB update failed:', error);
    return { error: error.message };
  }

  await logAudit(supabase, user, role, 'senior_resubmitted', id, updates);

  revalidatePath('/declined');
  revalidatePath('/approvals');
  revalidatePath('/directory');
  revalidatePath('/dashboard');
  return { success: true };
}

// OSCA Staff completes a mobile pre-registration (status 'Pending'): the partial
// record is filled out, a unique REF-YYYYMMDD-NNNN reference number is generated,
// the reference is linked to the record for mobile login, and the status moves
// to 'FOR_HEAD_APPROVAL' so it appears in the OSCA Head's approvals queue.
export async function completePreRegistration(id: string, formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'You must be logged in to complete a pre-registration.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = normalizeRole(profile?.role ?? (user.user_metadata?.role as string | undefined));
  if (role !== 'osca_staff' && role !== 'super_admin') {
    return { error: 'FORBIDDEN: Only OSCA Staff can complete pre-registered applications.' };
  }

  const { data: senior } = await supabase
    .from('seniors')
    .select('id, status, registration_id')
    .eq('id', id)
    .single();

  if (!senior) {
    return { error: 'Pre-registration record not found.' };
  }

  const currentStatus = (senior.status || '').toLowerCase();
  if (currentStatus !== 'pending') {
    return { error: 'Only PENDING pre-registrations can be completed and forwarded for head approval.' };
  }

  const birthdate = (formData.get('birthdate') as string) || null;
  const barangay = (formData.get('barangay') as string) || '';
  if (!barangay) {
    return { error: 'Barangay is required.' };
  }

  try {
    validateBarangay(barangay);
  } catch (e) {
    if (e instanceof GeofenceError) {
      return { error: e.message };
    }
    throw e;
  }

  const age = birthdate ? (() => {
    const birthDate = new Date(birthdate + 'T00:00:00');
    const today = new Date();
    let a = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) a--;
    return a >= 60 ? a : 60;
  })() : null;

  const firstName = (formData.get('first_name') as string) || '';
  const middleName = (formData.get('middle_name') as string) || '';
  const lastName = (formData.get('last_name') as string) || '';
  const suffix = (formData.get('suffix') as string) || '';
  const fullName = (formData.get('full_name') as string) || [firstName, middleName, lastName, suffix].filter(Boolean).join(' ').trim() || '';

  // Dedup: reject if another active record already uses the same name + birthdate.
  if (fullName && birthdate) {
    const { data: matches } = await supabase
      .from('seniors')
      .select('id, registration_id, status')
      .eq('full_name', fullName)
      .eq('birthdate', birthdate);

    const duplicate = (matches || []).find(m => m.id !== id && m.status !== 'Cancelled' && m.status !== 'Transferred');
    if (duplicate) {
      return { error: `Duplicate entry: ${fullName} (born ${birthdate}) already exists with status "${duplicate.status}" and ID ${duplicate.registration_id}.` };
    }
  }

  function generateRefNumber(): string {
    const yyyymmdd = `${String(new Date().getFullYear())}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`;
    const randomSuffix = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `REF-${yyyymmdd}-${randomSuffix}`;
  }

  const data: Record<string, unknown> = {
    full_name: fullName,
    middle_name: toNullableText(formData.get('middle_name')),
    suffix: formData.get('suffix') as string || null,
    age: age,
    barangay: barangay,
    contact_number: toNullableText(formData.get('contact_number')),
    address: toNullableText(formData.get('address')),
    birthdate: birthdate,
    emergency_contact_name: toNullableText(formData.get('emergency_contact_name')),
    emergency_contact_number: toNullableText(formData.get('emergency_contact_number')),
    emergency_contact_relationship: toNullableText(formData.get('emergency_contact_relationship')),
    address_unit: toNullableText(formData.get('address_unit')),
    address_building: toNullableText(formData.get('address_building')),
    address_lot_block: toNullableText(formData.get('address_lot_block')),
    address_street: toNullableText(formData.get('address_street')),
    purok: toNullableText(formData.get('purok')),
    address_subdivision: toNullableText(formData.get('address_subdivision')),
    address_city: toNullableText(formData.get('address_city')) || 'Cotabato City',
    address_province: toNullableText(formData.get('address_province')) || 'Maguindanao',
    address_region: toNullableText(formData.get('address_region')) || 'BARMM',
    philhealth_no: toNullableText(formData.get('philhealth_no')),
    sss_no: toNullableText(formData.get('sss_no')),
    gsis_no: toNullableText(formData.get('gsis_no')),
    pvao_no: toNullableText(formData.get('pvao_no')),
    tin: toNullableText(formData.get('tin')),
    sex: formData.get('sex') as string || null,
    civil_status: toNullableText(formData.get('civil_status')),
    blood_type: toNullableText(formData.get('blood_type')),
    religion: toNullableText(formData.get('religion')),
    education: toNullableText(formData.get('education')),
    employment_status: toNullableText(formData.get('employment_status')),
    classification: formData.get('classification') as string || 'Indigent',
    profile_photo_url: toNullableText(formData.get('profile_photo_url')),
    birth_certificate_url: toNullableText(formData.get('birth_certificate_url')),
    voter_id_url: toNullableText(formData.get('voter_id_url')),
    digital_signature_url: toNullableText(formData.get('digital_signature_url')),
    thumbmark_url: toNullableText(formData.get('thumbmark_url')),
    is_bedridden: formData.get('is_bedridden') === 'true',
    is_pensioner: formData.get('is_pensioner') === 'true',
    pensioner_type: toNullableText(formData.get('pensioner_type')),
    is_voter: formData.get('is_voter') === 'true',
    place_of_birth: toNullableText(formData.get('place_of_birth')),
  };

  if (data.is_pensioner) {
    data.classification = 'Pensioner';
  }

  // Generate a fresh unique REF-YYYYMMDD-NNNN reference number and validate the
  // completed payload with the same schema used for a New Record.
  let registrationId = generateRefNumber();
  const validationPayload = { ...data, registration_id: registrationId, status: 'FOR_HEAD_APPROVAL' };
  try {
    createSeniorSchema.parse(validationPayload);
  } catch (e) {
    if (e instanceof ZodError) {
      return { error: `${e.issues[0].path.join('.')}: ${e.issues[0].message}` };
    }
    throw e;
  }

  // Atomic update with retry on unique violation (23505) from a colliding REF suffix.
  const MAX_RETRIES = 5;
  let seniorError: { message: string; code?: string } | null = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      registrationId = generateRefNumber();
    }

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      ...data,
      registration_id: registrationId,
      status: 'FOR_HEAD_APPROVAL',
      decision_reason: null,
      decision_note: null,
      disqualification_indicators: null,
      disapproved_by: null,
      disapproved_at: null,
      disqualified_by: null,
      disqualified_at: null,
      benefits_eligible: true,
      osca_approved: false,
      completed_by: user.id,
      completed_at: now,
    };

    const { error } = await supabase
      .from('seniors')
      .update(updates)
      .eq('id', id);

    if (!error) {
      seniorError = null;
      break;
    }
    seniorError = error;
    if (error.code === '23505' && attempt < MAX_RETRIES - 1) continue;
    break;
  }

  if (seniorError) {
    console.error('[PREREG] DB update failed:', seniorError);
    return { error: seniorError.message };
  }

  // Create/refresh the mobile auth user so the generated reference number can be
  // used for logging into the mobile app (registration_id + birthdate).
  try {
    const { data: authResult, error: authError } = await supabase
      .rpc('create_senior_auth_user', {
        p_registration_id: registrationId,
        p_password: birthdate?.trim() || '',
        p_full_name: fullName || (formData.get('full_name') as string) || '',
        p_senior_id: id,
      });

    if (authError) {
      console.error('[PREREG] Auth user creation failed:', authError);
    } else if (authResult?.user_id) {
      await supabase
        .from('seniors')
        .update({ auth_id: authResult.user_id })
        .eq('id', id);
    }
  } catch (err) {
    console.error('[PREREG] Auth user creation error:', err);
  }

  await logAudit(supabase, user, role, 'senior_completed_preregistration', id, { ...data, registration_id: registrationId, status: 'FOR_HEAD_APPROVAL' });

  revalidatePath('/directory');
  revalidatePath('/directory/preregistration');
  revalidatePath('/approvals');
  revalidatePath('/dashboard');
  return {
    success: true,
    senior: {
      id,
      registration_id: registrationId,
      full_name: fullName || (formData.get('full_name') as string) || '',
      birthdate: birthdate || '',
    },
  };
}

// OSCA Staff one-click "Save / Verify" for a PENDING mobile pre-registration row.
// The partial record is kept as-is: a REF-YYYYMMDD-NNNN reference number is
// minted, the status moves to 'FOR_HEAD_APPROVAL' (forwarding to the OSCA Head's
// approval queue), and the record automatically drops off the Staff's Pending
// list (which only queries status 'Pending').
export async function verifyAndForwardPreRegistration(id: string) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'You must be logged in to verify a pre-registration.' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = normalizeRole(profile?.role ?? (user.user_metadata?.role as string | undefined));
    if (role !== 'osca_staff' && role !== 'super_admin') {
      return { error: 'FORBIDDEN: Only OSCA Staff can verify and forward pre-registrations.' };
    }

    const { data: senior } = await supabase
      .from('seniors')
      .select('id, status, registration_id, full_name, birthdate, barangay, classification, is_pensioner, age')
      .eq('id', id)
      .single();

    if (!senior) {
      return { error: 'Pre-registration record not found.' };
    }

    const currentStatus = (senior.status || '').toLowerCase();
    if (currentStatus !== 'pending') {
      return { error: 'Only PENDING pre-registrations can be verified and forwarded for head approval.' };
    }

    if (!senior.full_name?.trim() || !senior.barangay?.trim()) {
      return { error: 'This pre-registration is missing required details. Use Review / Edit Record to complete it before verifying.' };
    }

    // Dedup: reject if another active record already uses the same name + birthdate.
    if (senior.full_name && senior.birthdate) {
      const { data: matches } = await supabase
        .from('seniors')
        .select('id, registration_id, status')
        .eq('full_name', senior.full_name)
        .eq('birthdate', senior.birthdate);

      const duplicate = (matches || []).find(m => m.id !== id && m.status !== 'Cancelled' && m.status !== 'Transferred');
      if (duplicate) {
        return { error: `Duplicate entry: ${senior.full_name} (born ${senior.birthdate}) already exists with status "${duplicate.status}" and ID ${duplicate.registration_id}.` };
      }
    }

    const fullName = senior.full_name || '';
    const birthdate = senior.birthdate;
    const age = senior.age ?? (birthdate ? (() => {
      const birthDate = new Date(birthdate + 'T00:00:00');
      const today = new Date();
      let a = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) a--;
      return a >= 60 ? a : 60;
    })() : null);
    const classification = senior.is_pensioner ? 'Pensioner' : (senior.classification || 'Indigent');

    function generateRefNumber(): string {
      const yyyymmdd = `${String(new Date().getFullYear())}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`;
      const randomSuffix = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
      return `REF-${yyyymmdd}-${randomSuffix}`;
    }

    // Atomic update with retry on unique violation (23505) from a colliding REF suffix.
    let registrationId = generateRefNumber();
    let seniorError: { message: string; code?: string } | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      if (attempt > 0) {
        registrationId = generateRefNumber();
      }

      const now = new Date().toISOString();
      const updates: Record<string, unknown> = {
        registration_id: registrationId,
        status: 'FOR_HEAD_APPROVAL',
        age,
        classification,
        decision_reason: null,
        decision_note: null,
        disqualification_indicators: null,
        disapproved_by: null,
        disapproved_at: null,
        disqualified_by: null,
        disqualified_at: null,
        benefits_eligible: true,
        osca_approved: false,
        completed_by: user.id,
        completed_at: now,
      };

      const { error } = await supabase
        .from('seniors')
        .update(updates)
        .eq('id', id);

      if (!error) {
        seniorError = null;
        break;
      }
      seniorError = error;
      if (error.code === '23505' && attempt < 4) continue;
      break;
    }

    if (seniorError) {
      console.error('[PREREG VERIFY] DB update failed:', seniorError);
      return { error: seniorError.message };
    }

    // Create/refresh the mobile auth user so the generated reference number can
    // be used for logging into the mobile app (registration_id + birthdate).
    try {
      const { data: authResult, error: authError } = await supabase
        .rpc('create_senior_auth_user', {
          p_registration_id: registrationId,
          p_password: birthdate?.trim() || '',
          p_full_name: fullName,
          p_senior_id: id,
        });

      if (authError) {
        console.error('[PREREG VERIFY] Auth user creation failed:', authError);
      } else if (authResult?.user_id) {
        await supabase
          .from('seniors')
          .update({ auth_id: authResult.user_id })
          .eq('id', id);
      }
    } catch (err) {
      console.error('[PREREG VERIFY] Auth user creation error:', err);
    }

    await logAudit(supabase, user, role, 'senior_completed_preregistration', id, {
      status: 'FOR_HEAD_APPROVAL',
      registration_id: registrationId,
    });

    revalidatePath('/directory');
    revalidatePath('/directory/preregistration');
    revalidatePath('/approvals');
    revalidatePath('/dashboard');
    return { success: true, senior: { id, registration_id: registrationId, full_name: fullName } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return { error: message };
  }
}

// OSCA Head decides on a completed pre-registration (status 'FOR_HEAD_APPROVAL')
// forwarded by OSCA Staff. The Head is a read-only reviewer, but issues the final
// OSCA ID at approval time:
//   approve     → status 'APPROVED', mints id_number OSC-YYYYMMDD-####, records
//                 id_issue_date, and finalizes the record (osca_approved).
//   disapprove  → status 'Disapproved' with a recorded reason.
//   disqualify  → status 'Disqualified' with a recorded reason.
export async function decideForHeadApproval(
  id: string,
  decision: 'approve' | 'disapprove' | 'disqualify',
  options: { reason?: string; idNumber?: string; idIssueDate?: string } = {}
) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'You must be logged in to decide on a pre-registration.' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = normalizeRole(profile?.role ?? (user.user_metadata?.role as string | undefined));
    if (role !== 'osca_head') {
      return { error: 'Unauthorized: Only the OSCA Head can decide on pre-registrations.' };
    }

    const { data: senior } = await supabase
      .from('seniors')
      .select('id, status, full_name, registration_id, auth_id, id_number, osca_approved')
      .eq('id', id)
      .single();

    if (!senior) {
      return { error: 'Pre-registration record not found.' };
    }

    if ((senior.status || '').toUpperCase() !== 'FOR_HEAD_APPROVAL') {
      return { error: 'Only records awaiting head approval (FOR_HEAD_APPROVAL) can be decided.' };
    }

    const now = new Date().toISOString();
    const baseUpdates: Record<string, unknown> = {
      head_decision_by: user.id,
      head_decision_at: now,
    };

    if (decision === 'approve') {
      // Mint the official ID number only once, at approval time. Reuse an existing
      // id_number only if the record is ALREADY finalized (osca_approved) — never
      // for an unapproved record (data inconsistency -> force a fresh mint).
      let idNumber: string | null = null;
      let mintedDate: string | null = null;

      if (senior.id_number && senior.osca_approved) {
        idNumber = senior.id_number;
      } else {
        const submitted = (options.idNumber || '').trim().toUpperCase();
        const match = /^OSC-(\d{8})-(\d{4})$/.exec(submitted);
        if (!match) {
          return { error: 'OSCA ID must follow the format OSC-YYYYMMDD-#### (e.g. OSC-20260906-0001).' };
        }
        mintedDate = match[1];
        idNumber = nextUniqueOscaId(mintedDate);
      }

      // Auto-convert a pending REF- registration ID to the official OSC- ID so the
      // registration_id no longer advertises an unresolved/pending reference.
      let finalRegistrationId: string | null = null;
      const pendingRegId = senior.registration_id;
      if (pendingRegId && /^REF-\d{8}-\d{4}$/.test(pendingRegId)) {
        finalRegistrationId = `OSC-${pendingRegId.slice(4, 12)}-${pendingRegId.slice(-4)}`;
      }

      const updates: Record<string, unknown> = {
        ...baseUpdates,
        status: 'APPROVED',
        benefits_eligible: true,
        osca_approved: true,
        osca_approved_by: user.id,
        osca_approved_at: now,
        id_number: idNumber,
        id_issue_date: options.idIssueDate || now.slice(0, 10),
        decision_reason: null,
        decision_note: null,
      };
      if (finalRegistrationId) {
        updates.registration_id = finalRegistrationId;
      }

      // The UNIQUE index on seniors.id_number is the hard guarantee against
      // duplicates; if a concurrent approval claims the same suffix between the
      // check above and this update, re-mint a fresh suffix and retry.
      const imposedUpdates = { ...updates };
      let seniorError: { message: string; code?: string } | null = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        if (attempt > 0) {
          if (!mintedDate) break;
          idNumber = nextUniqueOscaId(mintedDate);
          imposedUpdates.id_number = idNumber;
        }
        const { error } = await supabase
          .from('seniors')
          .update(imposedUpdates)
          .eq('id', id);
        if (!error) {
          seniorError = null;
          break;
        }
        seniorError = error;
        if (error.code === '23505' && mintedDate && attempt < 4) continue;
        break;
      }

      if (seniorError) {
        console.error('[HEAD DECIDE] Approve DB update failed:', seniorError);
        return { error: seniorError.message };
      }
    } else {
      const reason = (options.reason || '').trim();
      const updates: Record<string, unknown> = {
        ...baseUpdates,
        benefits_eligible: false,
      };

      if (decision === 'disapprove') {
        updates.status = 'Disapproved';
        updates.decision_reason = reason || 'Missing or fake requirements';
        updates.decision_note = null;
        updates.disapproved_by = user.id;
        updates.disapproved_at = now;
      } else {
        updates.status = 'Disqualified';
        updates.decision_reason = reason || 'Duplicate or non-resident entry';
        updates.disqualification_indicators = reason || 'Duplicate or non-resident entry';
        updates.disqualified_by = user.id;
        updates.disqualified_at = now;
      }

      const { error } = await supabase
        .from('seniors')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('[HEAD DECIDE] DB update failed:', error);
        return { error: error.message };
      }
    }

    await logAudit(
      supabase,
      user,
      role,
      decision === 'approve'
        ? 'senior_head_approved'
        : decision === 'disapprove'
          ? 'senior_head_disapproved'
          : 'senior_head_disqualified',
      id,
      { ...baseUpdates, status: decision === 'approve' ? 'APPROVED' : decision === 'disapprove' ? 'Disapproved' : 'Disqualified' }
    );

    if (senior.auth_id) {
      const notification =
        decision === 'approve'
          ? {
              title: 'Pre-Registration Approved',
              message: `Magandang araw, ${senior.full_name}! Inaprubahan ng OSCA Head ang iyong pre-registration at nailabas na ang iyong opisyal na OSCA ID. Bisitahin ang OSCA Office upang kunin ang iyong pisikal na ID.`,
              type: 'success' as const,
            }
          : decision === 'disapprove'
            ? {
                title: '⚠️ Application Status: Disapproved (Needs Action)',
                message: 'Magandang araw. Mayroong kulang o kailangang ayusin sa iyong isinumiteng requirements. Mangyaring pumunta sa OSCA Office para sa kinakailangang pagwawasto.',
                type: 'warning' as const,
              }
            : {
                title: '❌ Application Status: Disqualified',
                message: 'Magandang araw. Paumanhin, ngunit hindi nakapasa ang inyong aplikasyon ayon sa kwalipikasyon ng OSCA. Para sa karagdagang katanungan, maaari kayong bumisita sa OSCA Office.',
                type: 'warning' as const,
              };
      await supabase.from('notifications').insert({
        user_id: senior.auth_id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        notification_category: 'status_update',
      });
    }

    revalidatePath('/approvals');
    revalidatePath('/directory');
    revalidatePath('/dashboard');
    return {
      success: true,
      status: decision === 'approve' ? 'APPROVED' : decision === 'disapprove' ? 'Disapproved' : 'Disqualified',
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return { error: message };
  }
}
