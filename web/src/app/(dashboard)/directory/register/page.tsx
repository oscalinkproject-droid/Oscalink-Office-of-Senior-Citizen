'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSenior, resubmitApplication, completePreRegistration } from "@/app/actions/seniors";
import { createClient } from "@/lib/supabase";
import { uploadSeniorBlob } from "@/lib/senior-uploads";
import { COTABATO_BARANGAYS, CLASSIFICATIONS, BLOOD_TYPES, EDUCATION_LEVELS, EMPLOYMENT_STATUSES, CIVIL_STATUSES, SUFFIX_OPTIONS, getPurokOptions } from "@/lib/constants";
import { phMobileRegex } from "@/lib/validation";
import { PhotoCaptureField, SignatureCaptureField, FileCaptureField, ThumbmarkCaptureField } from "@/components/ui/capture-fields";
import { useToast } from "@/components/ui/toast";
import { printAccessSlip, downloadAccessSlip } from "@/lib/print-stub";

// The temporary Reference Number (REF-YYYYMMDD-XXXX) is now auto-generated in
// the backend (createSenior) on submission and is displayed ONLY on the printed
// Application/Claim Stub that the OSCA Staff gives to the senior.

// When opened with ?edit=<seniorId>, the form loads a declined application
// (Disapproved / Disqualified) pre-filled so OSCA Staff can correct the
// details and resubmit it for OSCA Head review.

interface EditableSenior {
  id: string;
  registration_id: string | null;
  id_number?: string | null;
  status: string | null;
  transferred_at?: string | null;
  full_name: string | null;
  last_name?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  suffix?: string | null;
  birthdate: string | null;
  sex?: string | null;
  civil_status?: string | null;
  barangay: string | null;
  purok?: string | null;
  contact_number?: string | null;
  place_of_birth?: string | null;
  address?: string | null;
  classification?: string | null;
  philhealth_no?: string | null;
  pensioner_type?: string | null;
  sss_no?: string | null;
  gsis_no?: string | null;
  pvao_no?: string | null;
  tin?: string | null;
  is_voter?: boolean | null;
  blood_type?: string | null;
  religion?: string | null;
  occupation?: string | null;
  education?: string | null;
  employment_status?: string | null;
  is_bedridden?: boolean | null;
  is_pensioner?: boolean | null;
  emergency_contact_name?: string | null;
  emergency_contact_number?: string | null;
  emergency_contact_relationship?: string | null;
  profile_photo_url?: string | null;
  birth_certificate_url?: string | null;
  voter_id_url?: string | null;
  digital_signature_url?: string | null;
  thumbmark_url?: string | null;
}

interface DuplicateMatch {
  id: string;
  registration_id: string | null;
  id_number?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  status: string | null;
  deceased_at?: string | null;
}

function formatMatchDate(value?: string | null): string {
  if (!value) return 'Unknown';
  const d = value.length === 10 ? new Date(value + 'T00:00:00') : new Date(value);
  if (isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatBirthdayForDisplay(birthdate?: string): string {
  if (!birthdate) return '';
  const d = new Date(birthdate + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function RegisterSeniorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const renewId = searchParams.get('renew');
  const prefillId = searchParams.get('prefill');
  const { toast } = useToast();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(!!editId || !!renewId || !!prefillId);
  const [editingSenior, setEditingSenior] = useState<EditableSenior | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [step, setStep] = useState(1);
  const [selectedBarangay, setSelectedBarangay] = useState("");
  const [customPurok, setCustomPurok] = useState(false);
  const [isPensioner, setIsPensioner] = useState(false);
  const [classification, setClassification] = useState('Indigent');
  const [calculatedAge, setCalculatedAge] = useState<number | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [birthdateVal, setBirthdateVal] = useState('');
  const [firstNameVal, setFirstNameVal] = useState('');
  const [lastNameVal, setLastNameVal] = useState('');
  const [nameCheck, setNameCheck] = useState<{ checking: boolean; matches: DuplicateMatch[] }>({ checking: false, matches: [] });
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchModalDismissed, setMatchModalDismissed] = useState(false);
  const [deceasedOverride, setDeceasedOverride] = useState(false);
  const [lastSavedSenior, setLastSavedSenior] = useState<{ full_name: string; registration_id: string; birthdate: string } | null>(null);
  const [showStub, setShowStub] = useState(false);
  const [downloadingStub, setDownloadingStub] = useState(false);
  const [stubError, setStubError] = useState<string | null>(null);
  const [submitMode, setSubmitMode] = useState<'draft' | 'final'>('final');
  const formRef = useRef<HTMLFormElement>(null);
  const blobsRef = useRef<Map<string, Blob>>(new Map());

  const onFileReady = useCallback((fieldName: string, blob: Blob) => {
    blobsRef.current.set(fieldName, blob);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      const role = user?.user_metadata?.role;
      if (role !== 'osca_staff') {
        router.push('/directory');
      } else {
        setAuthorized(true);
      }
    });
  }, [router]);

  // Load an application to pre-fill when editing (?edit= declined records,
  // ?renew= transferred records, ?prefill= mobile pre-registrations).
  useEffect(() => {
    const recordId = editId || renewId || prefillId;
    if (!recordId) return;
    const supabase = createClient();
    supabase
      .from('seniors')
      .select('*')
      .eq('id', recordId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setMessage({ type: 'error', text: 'Could not load the application record.' });
          setDataLoading(false);
          return;
        }
        const s = data as EditableSenior;
        const st = (s.status || '').toLowerCase();
        if (renewId) {
          if (st !== 'transferred') {
            setMessage({ type: 'error', text: 'Only Transferred records can be re-registered. Open this from the Document Archives.' });
            setDataLoading(false);
            return;
          }
        } else if (prefillId) {
          if (st !== 'pending') {
            setMessage({ type: 'error', text: 'This record is not an open PENDING pre-registration and cannot be completed here.' });
            setDataLoading(false);
            return;
          }
        } else if (st !== 'disapproved' && st !== 'disqualified') {
          setMessage({ type: 'error', text: 'This application is not declined (Disapproved / Disqualified) and cannot be edited here.' });
          setDataLoading(false);
          return;
        }
        setSelectedBarangay(s.barangay || '');
        setClassification((s.classification as (typeof CLASSIFICATIONS)[number]) || 'Indigent');
        const bd = (s.birthdate || '').slice(0, 10);
        setBirthdateVal(bd);
        setFirstNameVal(s.first_name || '');
        setLastNameVal(s.last_name || '');
        if (bd) {
          const birth = new Date(bd + 'T00:00:00');
          const today = new Date();
          let a = today.getFullYear() - birth.getFullYear();
          const m = today.getMonth() - birth.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a--;
          setCalculatedAge(a);
        }
        setIsPensioner(s.is_pensioner === true);
        setEditingSenior(s);
        setDataLoading(false);
      });
  }, [editId, renewId, prefillId]);

  const purokOptions = useMemo(() => (selectedBarangay ? getPurokOptions(selectedBarangay) : []), [selectedBarangay]);

  // When editing, set the purok select + hidden input to the stored value.
  useEffect(() => {
    if (!editingSenior || !selectedBarangay) return;
    const form = formRef.current;
    if (!form) return;
    const p = editingSenior.purok || '';
    const sel = form.querySelector('[name="purok-select"]') as HTMLSelectElement | null;
    const isStandard = purokOptions.includes(p);
    if (sel) sel.value = isStandard ? p : '__custom__';
    setCustomPurok(!isStandard && !!p);
    const hidden = document.getElementById('purok-hidden') as HTMLInputElement | null;
    if (hidden) hidden.value = p;
  }, [editingSenior, selectedBarangay, purokOptions]);

  // When reviewing a pre-registration, auto-split the mobile full_name into the
  // first/last name fields (mobile pre-registration only collects full_name).
  useEffect(() => {
    if (!editingSenior || !prefillId) return;
    if (editingSenior.first_name || editingSenior.last_name) return;
    const form = formRef.current;
    if (!form) return;
    const parts = (editingSenior.full_name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return;
    const last = parts.pop() || '';
    const first = parts.join(' ');
    const lastInput = form.querySelector('[name="last_name"]') as HTMLInputElement | null;
    const firstInput = form.querySelector('[name="first_name"]') as HTMLInputElement | null;
    if (lastInput) lastInput.value = last;
    if (firstInput) firstInput.value = first;
    setFirstNameVal(first);
    setLastNameVal(last);
  }, [editingSenior, prefillId]);

  // When editing, carry over existing uploaded document URLs so they are not
  // lost (the hidden upload inputs are what back required-step validation).
  useEffect(() => {
    if (!editingSenior) return;
    const docs: Record<string, string | null | undefined> = {
      'upload-profile_photo_url': editingSenior.profile_photo_url,
      'upload-birth_certificate_url': editingSenior.birth_certificate_url,
      'upload-voter_id_url': editingSenior.voter_id_url,
      'upload-digital_signature_url': editingSenior.digital_signature_url,
      'upload-thumbmark_url': editingSenior.thumbmark_url,
    };
    Object.entries(docs).forEach(([id, url]) => {
      if (!url) return;
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) el.value = url;
    });
  }, [editingSenior]);

  const deceasedMatches = nameCheck.matches.filter(m => m.status === 'Deceased');
  const otherMatches = nameCheck.matches.filter(m => m.status !== 'Deceased');
  const deceasedKey = deceasedMatches.map(m => m.id).sort().join('|');

  // Real-time duplicate & deceased detection: runs in the background against
  // ALL senior records (including archived Deceased/Transferred) whenever the
  // staff enters first name + last name + date of birth.
  useEffect(() => {
    const lname = lastNameVal.trim();
    const fname = firstNameVal.trim();
    const checkReady = lname.length >= 2 && fname.length >= 2 && birthdateVal.length === 10;
    if (!checkReady) {
      setNameCheck({ checking: false, matches: [] });
      return;
    }
    let cancelled = false;
    setNameCheck(prev => ({ ...prev, checking: true }));
    const timer = setTimeout(async () => {
      const supabase = createClient();
      let query = supabase
        .from('seniors')
        .select('id, registration_id, id_number, full_name, status, deceased_at, first_name, last_name')
        .eq('birthdate', birthdateVal)
        .ilike('last_name', `%${lname}%`);
      const excludeId = editId || renewId || prefillId;
      if (excludeId) query = query.not('id', 'eq', excludeId);
      const { data, error } = await query.limit(20);
      if (cancelled) return;
      if (error) {
        setNameCheck({ checking: false, matches: [] });
        return;
      }
      const rows = (data || []) as DuplicateMatch[];
      const matches = rows.filter(r => {
        const rLN = (r.last_name || '').trim().toLowerCase();
        const rFN = (r.first_name || '').trim().toLowerCase();
        if (!rLN || rLN !== lname.toLowerCase()) return false;
        if (rFN) return rFN.startsWith(fname.toLowerCase());
        return (r.full_name || '').toLowerCase().startsWith(fname.toLowerCase());
      });
      if (!cancelled) setNameCheck({ checking: false, matches });
    }, 650);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [firstNameVal, lastNameVal, birthdateVal, editId, renewId, prefillId]);

  // Re-arm the modal whenever the detected deceased record set changes.
  useEffect(() => {
    setMatchModalDismissed(false);
  }, [deceasedKey]);

  // Auto-open the deceased warning once a match is detected (unless staff
  // dismissed it for these same records or confirmed an override).
  useEffect(() => {
    if (deceasedMatches.length === 0) {
      setShowMatchModal(false);
      return;
    }
    if (!deceasedOverride && !matchModalDismissed && !showMatchModal) {
      setShowMatchModal(true);
    }
  }, [deceasedMatches, deceasedOverride, matchModalDismissed, showMatchModal]);

  if (!authorized) return null;
  if (dataLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-xs text-outline">Loading application for editing...</p>
      </div>
    );
  }

  const sr = editingSenior;

  const getInputClass = (name: string) =>
    `w-full bg-surface-low border rounded-xl py-3 px-4 text-xs text-foreground placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary/40 ${
      fieldErrors[name] ? 'border-red-500/50 ring-1 ring-red-500/30' : 'border-outline-variant/30'
    }`;

  const step1Required = ['last_name', 'first_name', 'birthdate', 'sex', 'barangay'];
  // Document fields are now optional; staff may submit without photos/docs
  const step4Required: readonly string[] = [];

  const validateStep = (stepNum: number): boolean => {
    const form = formRef.current;
    if (!form) return true;
    const errors: Record<string, string> = {};

    if (stepNum === 1) {
      // Required fields
      for (const name of step1Required) {
        const el = form.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement | null;
        if (!el || !el.value.trim()) {
          errors[name] = 'This field is required';
        }
      }
      // Phone format validation
      const contactEl = form.querySelector('[name="contact_number"]') as HTMLInputElement | null;
      if (contactEl?.value?.trim() && !phMobileRegex.test(contactEl.value.trim())) {
        errors.contact_number = 'Must be 11 digits starting with 09';
      }
      // Age >= 60 validation
      const birthdateEl = form.querySelector('[name="birthdate"]') as HTMLInputElement | null;
      if (birthdateEl?.value) {
        const birth = new Date(birthdateEl.value + 'T00:00:00');
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        if (age < 60) {
          errors.birthdate = 'Senior must be at least 60 years old';
        }
      }
      // Purok select validation
      const purokSelect = form.querySelector('[name="purok-select"]') as HTMLSelectElement | null;
      if (selectedBarangay && (!purokSelect || !purokSelect.value)) {
        errors.purok = 'This field is required';
      }
    }
    if (stepNum === 2) {
      const isPensioner = (form.querySelector('[name="is_pensioner"]') as HTMLSelectElement)?.value === 'true';
      if (isPensioner) {
        const sss = (form.querySelector('[name="sss_no"]') as HTMLInputElement)?.value?.trim();
        const gsis = (form.querySelector('[name="gsis_no"]') as HTMLInputElement)?.value?.trim();
        const pvao = (form.querySelector('[name="pvao_no"]') as HTMLInputElement)?.value?.trim();
        if (!sss && !gsis && !pvao) {
          errors.sss_no = 'Pensioner: at least one pension ID (SSS, GSIS, or PVAO) recommended';
        }
      }
    }
    if (stepNum === 3) {
      const ecPhone = form.querySelector('[name="emergency_contact_number"]') as HTMLInputElement | null;
      if (ecPhone?.value?.trim() && !phMobileRegex.test(ecPhone.value.trim())) {
        errors.emergency_contact_number = 'Must be 11 digits starting with 09';
      }
    }
    if (stepNum === 4) {
      // Document uploads are now optional — skip required-document check
      // (populate errors only if staff explicitly needs guidance, but do not block submission)
      // Optional: could leave this block empty or add a soft guidance check here
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const clearError = (name: string) => {
    setFieldErrors(prev => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const checkRequired = (name: string) => {
    const el = formRef.current?.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement | null;
    if (el && !el.value.trim()) {
      setFieldErrors(prev => ({ ...prev, [name]: 'This field is required' }));
    } else {
      clearError(name);
    }
  };

  const normalizeSpaces = (e: React.FormEvent<HTMLInputElement>) => {
    (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.replace(/\s{2,}/g, ' ');
  };

  const numbersOnly = (e: React.FormEvent<HTMLInputElement>) => {
    const input = e.target as HTMLInputElement;
    let val = input.value.replace(/\D/g, '');
    if (val.length > 0 && !val.startsWith('09')) {
      val = '09' + val.replace(/^0*9*/, '');
    }
    if (val.length > 11) val = val.slice(0, 11);
    if (val.length > 1 && !val.startsWith('09')) val = '';
    input.value = val;
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handlePensionerChange = (checked: boolean) => {
    setIsPensioner(checked);
    if (!checked) {
      setClassification('Indigent');
      const form = formRef.current;
      if (form) {
        const toClear = ['philhealth_no', 'tin', 'sss_no', 'gsis_no', 'pvao_no'];
        toClear.forEach((name) => {
          const el = form.querySelector(`[name="${name}"]`) as HTMLInputElement | null;
          if (el) el.value = '';
        });
        const pensionerType = form.querySelector('[name="pensioner_type"]') as HTMLSelectElement | null;
        if (pensionerType) pensionerType.value = 'government';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = formRef.current;
    if (!form) return;

    // Check submit mode: 'draft' for Pre-Registration, 'final' for Head Approval
    const isDraft = submitMode === 'draft';

    // Deceased-Detection gate: only for final submission, not draft
    if (!isDraft) {
      const deceasedBlocking = nameCheck.matches.filter(m => m.status === 'Deceased');
      if (deceasedBlocking.length > 0 && !deceasedOverride) {
        setShowMatchModal(true);
        setMessage({ type: 'error', text: 'A deceased record matches these details. Review the warning and confirm before submitting.' });
        return;
      }
    }

    // Document uploads are now optional — skip the required-document gate so
    // staff can submit the form even if no photos or files are captured/uploaded.
    // The backend (createSenior) will store NULL for any document URLs that are empty.
    if (step === 4 && !validateStep(4)) {
      // validateStep(4) no longer blocks on documents, but keep the guard for
      // any other step-4 validations that may be added in the future.
    }

    setLoading(true);
    setMessage(null);

    // Upload all pending blobs before final submission. Primary target is
    // Supabase Storage (senior-documents bucket); uploadSeniorBlob falls back
    // to Cloudinary if the storage bucket is unavailable.
    const uploadResults: Record<string, string> = {};
    const failedUploads: string[] = [];

    if (blobsRef.current.size > 0) {
      const supabase = createClient();
      for (const [fieldName, blob] of blobsRef.current) {
        try {
          const url = await uploadSeniorBlob(supabase, fieldName, blob);
          uploadResults[fieldName] = url;
        } catch (err) {
          failedUploads.push(fieldName);
          console.error(`Upload error for ${fieldName}:`, err);
          // Roll the hidden input back to the existing URL (or blank) so a
          // stale '__pending__' marker never reaches the server.
          const hidden = document.getElementById(`upload-${fieldName}`) as HTMLInputElement | null;
          if (hidden) hidden.value = String(sr?.[fieldName as keyof EditableSenior] ?? '');
        }
      }
    }

    // If any required uploads failed, show error
    if (failedUploads.length > 0 && step4Required.some(f => failedUploads.includes(f))) {
      setMessage({ type: 'error', text: `Failed to upload: ${failedUploads.join(', ')}. Please try again.` });
      setLoading(false);
      return;
    }

    // Populate hidden inputs with uploaded URLs
    for (const [fieldName, url] of Object.entries(uploadResults)) {
      const hidden = document.getElementById(`upload-${fieldName}`) as HTMLInputElement;
      if (hidden) hidden.value = url;
    }

    const formData = new FormData(form);

    // Add draft mode indicator to form data
    formData.append('save_as_draft', isDraft ? 'true' : 'false');

    let result: Awaited<ReturnType<typeof createSenior>>;
    if (isDraft && prefillId) {
      // For draft mode on existing pre-registration, we save as draft (status: Pending)
      // This would require a backend action that saves as draft - for now we use the existing
      // completePreRegistration but the backend would need to handle save_as_draft flag
      result = (await completePreRegistration(prefillId, formData)) as Awaited<ReturnType<typeof createSenior>>;
    } else if (prefillId) {
      result = (await completePreRegistration(prefillId, formData)) as Awaited<ReturnType<typeof createSenior>>;
    } else if (editId) {
      result = (await resubmitApplication(editId, formData)) as Awaited<ReturnType<typeof createSenior>>;
    } else {
      // Both fresh registration and returning-senior re-registration create a
      // NEW senior record (the archived Transferred record is left untouched).
      result = await createSenior(formData);
    }

    if (result?.error) {
      setMessage({ type: 'error', text: result.error });
    } else if (result?.success) {
      if (editId) {
        toast('Application updated and resubmitted for OSCA Head review.', 'success');
        router.push('/declined');
        router.refresh();
        return;
      }
      if (result.senior) {
        if (isDraft) {
          toast('Pre-registration saved as draft. Complete it later to forward for Head Approval.', 'success');
          router.push('/directory/preregistration');
          router.refresh();
          return;
        }
        if (prefillId) {
          toast('Pre-registration completed — reference number generated and forwarded to the OSCA Head.', 'success');
        } else if (renewId) {
          toast('Re-registration submitted for OSCA Head review — a new OSCA ID will be issued upon approval.', 'success');
        } else {
          toast('Senior account created successfully!', 'success');
        }
        setLastSavedSenior({
          full_name: result.senior.full_name || 'Senior',
          registration_id: result.senior.registration_id,
          birthdate: result.senior.birthdate || birthdateVal,
        });
        setShowStub(true);
        setStubError(null);
        form.reset();
        blobsRef.current.clear();
        setBirthdateVal('');
        setFirstNameVal('');
        setLastNameVal('');
        setNameCheck({ checking: false, matches: [] });
        setDeceasedOverride(false);
        setMatchModalDismissed(false);
        setShowMatchModal(false);
        setStep(1);
      }
    }
    setLoading(false);
  };

  const printSlip = () => {
    if (!lastSavedSenior) return;
    printAccessSlip(lastSavedSenior);
  };

  const downloadSlip = async () => {
    if (!lastSavedSenior) {
      console.warn('[OSCA Stub] No senior data available; aborting download.');
      return;
    }
    console.log('[OSCA Stub] Download requested for:', lastSavedSenior.registration_id);
    setDownloadingStub(true);
    setStubError(null);
    try {
      const safeName = (lastSavedSenior.full_name || 'Senior')
        .trim()
        .replace(/[^a-zA-Z0-9 _-]/g, '')
        .replace(/\s+/g, '_');
      const filename = `OSCA-Stub-${safeName}-${lastSavedSenior.registration_id}.png`;
      await downloadAccessSlip('osca-stub-card', filename);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown download error';
      console.error('[OSCA Stub] Download failed:', message, err);
      setStubError('Could not generate the stub download. Please use Print Slip instead.');
    } finally {
      setDownloadingStub(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold font-headline tracking-tighter text-foreground">
          {sr ? (prefillId ? 'Review Pre-Registration' : renewId ? 'Re-register Returning Senior' : 'Update Declined Application') : 'Register Senior Citizen'}
        </h1>
        <p className="text-outline mt-1 text-sm">
          {sr
            ? prefillId
              ? 'Complete the remaining details from the senior\'s mobile pre-registration — saving generates the Reference Number and forwards this application to the OSCA Head for approval.'
              : renewId
                ? 'This senior was previously transferred. Save to create a new application with a NEW OSCA ID for OSCA Head approval.'
                : 'Correct the previously submitted details below — saving resubmits this application to the OSCA Head for a new review.'
            : 'Manual ID entry — all fields with * are required'}
        </p>
      </div>

      {sr && prefillId && (
        <div className="mb-6 flex items-start gap-3 p-4 rounded-2xl border border-violet-500/20 bg-violet-500/10">
          <span className="material-symbols-outlined text-violet-400 mt-0.5">how_to_reg</span>
          <div className="flex-1">
            <p className="text-xs font-bold text-violet-400">
              {sr.full_name || 'This senior'} pre-registered from the Mobile App
              {sr.registration_id ? ` (provisional ref: ${sr.registration_id})` : ''}.
            </p>
            <p className="text-[11px] text-violet-400/80 mt-0.5">
              Complete the remaining fields below. Saving generates a unique Reference Number (REF-YYYYMMDD-NNNN), links it for Mobile App login, and moves this application to &quot;For Head Approval&quot;.
            </p>
          </div>
        </div>
      )}

      {sr && !prefillId && (renewId ? (
        <div className="mb-6 flex items-start gap-3 p-4 rounded-2xl border border-blue-500/20 bg-blue-500/10">
          <span className="material-symbols-outlined text-blue-400 mt-0.5">refresh</span>
          <div className="flex-1">
            <p className="text-xs font-bold text-blue-400">
              {sr.full_name || 'This senior'} is returning (
              previous ID: <span className="font-mono">{sr.id_number || sr.registration_id || '—'}</span>
              {sr.transferred_at ? `, transferred on ${new Date(sr.transferred_at).toLocaleDateString()}` : ''}).
            </p>
            <p className="text-[11px] text-blue-400/80 mt-0.5">
              The original record stays archived for audit. Submitting creates a new Pending application — a NEW OSCA ID is issued once the OSCA Head approves it.
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-6 flex items-start gap-3 p-4 rounded-2xl border border-amber-500/20 bg-amber-500/10">
          <span className="material-symbols-outlined text-amber-400 mt-0.5">assignment_return</span>
          <div className="flex-1">
            <p className="text-xs font-bold text-amber-400">
              {sr.full_name || 'This application'} was declined as {sr.status}.
            </p>
            <p className="text-[11px] text-amber-400/80 mt-0.5">
              Make the necessary corrections, then submit to send it back to the Pending Approval queue.
            </p>
          </div>
        </div>
      ))}

      <form ref={formRef} onSubmit={handleSubmit} onKeyDown={(e) => { if (e.key === 'Enter' && step < 4) e.preventDefault(); }} className="space-y-8" noValidate>
        {message && (
          <div className={`p-4 rounded-xl text-xs font-bold border ${
            message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

          <div className={`bg-surface-lowest shadow-sm rounded-2xl p-6 border border-outline-variant/30 space-y-5 ${step !== 1 ? 'hidden' : ''}`}>
            <h3 className="font-headline font-bold text-foreground text-lg">Personal Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="hidden" name="status" value="Pending" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Last Name <span className="text-red-500">*</span></label>
                <input name="last_name" required placeholder="Dela Cruz" defaultValue={sr?.last_name || ''} className={getInputClass('last_name')} onInput={normalizeSpaces} onChange={(e) => { setLastNameVal(e.target.value); clearError('last_name'); }} onBlur={() => checkRequired('last_name')} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-outline uppercase tracking-wider">First Name <span className="text-red-500">*</span></label>
                <input name="first_name" required placeholder="Juan" defaultValue={sr?.first_name || ''} className={getInputClass('first_name')} onInput={normalizeSpaces} onChange={(e) => { setFirstNameVal(e.target.value); clearError('first_name'); }} onBlur={() => checkRequired('first_name')} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Middle Name</label>
                <input name="middle_name" placeholder="Santos" defaultValue={sr?.middle_name || ''} className="w-full bg-surface-low border border-outline-variant/30 rounded-xl py-3 px-4 text-xs text-foreground placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary/40" onInput={normalizeSpaces} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Suffix</label>
                <select name="suffix" defaultValue={sr?.suffix || ''} className="w-full bg-surface-low border border-outline-variant/30 rounded-xl py-3 px-4 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40">
                  <option value="">None</option>
                  {SUFFIX_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Birthdate <span className="text-red-500">*</span></label>
                <input name="birthdate" type="date" required defaultValue={(sr?.birthdate || '').slice(0, 10)} className={getInputClass('birthdate')} max={(() => { const d = new Date(); d.setFullYear(d.getFullYear() - 60); return d.toISOString().split('T')[0]; })()} onChange={(e) => {
                  clearError('birthdate');
                  setBirthdateVal(e.target.value);
                  const birth = new Date(e.target.value + 'T00:00:00');
                  const today = new Date();
                  let age = today.getFullYear() - birth.getFullYear();
                  const m = today.getMonth() - birth.getMonth();
                  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
                  setCalculatedAge(e.target.value ? age : null);
                  if (e.target.value && age < 60) {
                    setFieldErrors(prev => ({ ...prev, birthdate: 'Senior must be at least 60 years old' }));
                  }
                }} />
                {calculatedAge !== null && (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-outline">Age:</span>
                    <span className={`text-xs font-bold ${calculatedAge >= 60 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {calculatedAge} years old
                    </span>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Sex <span className="text-red-500">*</span></label>
                <select name="sex" required defaultValue={sr?.sex === 'M' ? 'Male' : sr?.sex === 'F' ? 'Female' : sr?.sex || ''} className={getInputClass('sex')} onChange={() => clearError('sex')} onBlur={() => checkRequired('sex')}>
                  <option value="">Select...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>

            {/* Real-time duplicate & deceased detection feedback */}
            {(nameCheck.checking || nameCheck.matches.length > 0) && (
              <div>
                {nameCheck.checking && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-surface-low border border-outline-variant/20">
                    <span className="material-symbols-outlined text-outline text-sm animate-spin">progress_activity</span>
                    <p className="text-[11px] text-outline">Checking all records (including archived) for match...</p>
                  </div>
                )}
                {!nameCheck.checking && deceasedMatches.length > 0 && !deceasedOverride && (
                  <button type="button" onClick={() => setShowMatchModal(true)} className="w-full flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-left hover:bg-red-500/15 transition-colors">
                    <span className="material-symbols-outlined text-red-400 text-sm">gavel</span>
                    <p className="text-[11px] text-red-400 font-bold">Deceased record match found — review the details to continue.</p>
                    <span className="material-symbols-outlined text-red-400 text-sm ml-auto">open_in_new</span>
                  </button>
                )}
                {!nameCheck.checking && deceasedMatches.length > 0 && deceasedOverride && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-surface-low border border-outline-variant/20">
                    <span className="material-symbols-outlined text-emerald-400 text-sm">check_circle</span>
                    <p className="text-[11px] text-outline font-medium">Deceased match override confirmed — this registration will proceed for OSCA Head review.</p>
                  </div>
                )}
                {!nameCheck.checking && deceasedMatches.length === 0 && otherMatches.length > 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <span className="material-symbols-outlined text-amber-400 text-sm">warning</span>
                    <p className="text-[11px] text-amber-400 font-medium">{otherMatches.length} possible matching record(s) found: {otherMatches.map(m => m.status).join(', ')}.</p>
                  </div>
                )}
                {!nameCheck.checking && nameCheck.matches.length === 0 && firstNameVal.trim() && lastNameVal.trim() && birthdateVal.length === 10 && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <span className="material-symbols-outlined text-emerald-400 text-sm">verified_user</span>
                    <p className="text-[11px] text-emerald-400 font-medium">No matching records found in the database or archives.</p>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Civil Status</label>
                <select name="civil_status" defaultValue={sr?.civil_status || ''} className="w-full bg-surface-low border border-outline-variant/30 rounded-xl py-3 px-4 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40">
                  <option value="">Select...</option>
                  {CIVIL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Barangay <span className="text-red-500">*</span></label>
                <select name="barangay" required value={selectedBarangay} onChange={(e) => { setSelectedBarangay(e.target.value); clearError('barangay'); }} onBlur={() => checkRequired('barangay')} className={getInputClass('barangay')}>
                  <option value="">Select barangay...</option>
                  {COTABATO_BARANGAYS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Purok / Zone <span className="text-red-500">*</span></label>
                {!selectedBarangay ? (
                  <p className="text-[10px] text-outline italic pt-2">Select a barangay first</p>
                ) : (
                  <>
                    <select
                      name="purok-select"
                      defaultValue=""
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__custom__') { setCustomPurok(true); }
                        else { setCustomPurok(false); }
                        const hidden = document.getElementById('purok-hidden') as HTMLInputElement;
                        if (hidden) hidden.value = val;
                        clearError('purok');
                      }}
                      className={`w-full bg-surface-low border rounded-xl py-3 px-4 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 ${fieldErrors.purok ? 'border-red-500/50 ring-1 ring-red-500/30' : 'border-outline-variant/30'}`}
                    >
                      <option value="" disabled hidden>Select purok...</option>
                      {purokOptions.map(p => <option key={p} value={p}>{p}</option>)}
                      <option value="__custom__">Other (type manually)...</option>
                    </select>
                    <input type="hidden" name="purok" id="purok-hidden" value="" />
                    {customPurok && (
                      <input
                        type="text"
                        placeholder="Type purok name..."
                        className="w-full bg-surface-low border border-outline-variant/30 rounded-xl py-3 px-4 text-xs text-foreground placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary/40 mt-2"
                        onChange={(e) => {
                          const hidden = document.getElementById('purok-hidden') as HTMLInputElement;
                          if (hidden) hidden.value = e.target.value;
                        }}
                      />
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Contact Number</label>
                <input name="contact_number" type="tel" maxLength={11} placeholder="09XXXXXXXXX" defaultValue={sr?.contact_number || ''} className={getInputClass('contact_number')} onInput={numbersOnly} onChange={() => clearError('contact_number')} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Place of Birth</label>
                <input name="place_of_birth" defaultValue={sr?.place_of_birth || ''} className="w-full bg-surface-low border border-outline-variant/30 rounded-xl py-3 px-4 text-xs text-foreground placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary/40" onInput={normalizeSpaces} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Address</label>
              <input name="address" placeholder="House/Block/Lot, Street" defaultValue={sr?.address || ''} className="w-full bg-surface-low border border-outline-variant/30 rounded-xl py-3 px-4 text-xs text-foreground placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary/40" onInput={normalizeSpaces} />
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-low border border-outline-variant/20">
              <input
                type="checkbox"
                id="is-pensioner"
                name="is_pensioner_check"
                value="true"
                checked={isPensioner}
                onChange={(e) => handlePensionerChange(e.target.checked)}
                className="rounded"
              />
              <div>
                <label htmlFor="is-pensioner" className="text-xs font-bold text-foreground cursor-pointer">PENSIONER</label>
                <p className="text-[10px] text-outline mt-0.5">Check if the senior citizen receives a pension.</p>
              </div>
            </div>

            {Object.keys(fieldErrors).length > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <span className="material-symbols-outlined text-red-400 text-sm">error</span>
                <p className="text-[11px] text-red-400 font-medium">Fields highlighted in red are required</p>
              </div>
            )}
          </div>

          <div className={`bg-surface-lowest shadow-sm rounded-2xl p-6 border border-outline-variant/30 space-y-5 ${step !== 2 ? 'hidden' : ''}`}>
            <h3 className="font-headline font-bold text-foreground text-lg">Classification & Government IDs</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Classification</label>
                <select name="classification" id="classification-select" value={classification} onChange={(e) => setClassification(e.target.value)} className="w-full bg-surface-low border border-outline-variant/30 rounded-xl py-3 px-4 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40">
                  {CLASSIFICATIONS.filter(c => isPensioner || c !== 'Pensioner').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Pensioner Status</label>
                <select name="is_pensioner" value={isPensioner ? 'true' : 'false'} onChange={(e) => {
                  const isP = e.target.value === 'true';
                  setIsPensioner(isP);
                  if (isP) setClassification('Pensioner');
                }} disabled={!isPensioner} className={`w-full bg-surface-low border border-outline-variant/30 rounded-xl py-3 px-4 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 ${!isPensioner ? 'opacity-60 cursor-not-allowed' : ''}`}>
                  <option value="false">Non-Pensioner (White ID)</option>
                  <option value="true">Pensioner (Green ID)</option>
                </select>
                {!isPensioner && (
                  <p className="text-[10px] text-outline">Set automatically from the &quot;Is Pensioner&quot; checkbox on the first page.</p>
                )}
              </div>
            </div>

            {isPensioner && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline">PhilHealth No. <span className="text-[9px] font-normal normal-case">(optional)</span></label>
                <input name="philhealth_no" placeholder="XX-XXXXXXXXX-X" defaultValue={sr?.philhealth_no || ''} className="w-full bg-surface-low border border-outline-variant/30 rounded-xl py-3 px-4 text-xs text-foreground placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary/40" onInput={normalizeSpaces} />
              </div>
            )}

            {isPensioner && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Pensioner Type</label>
                <select name="pensioner_type" defaultValue={sr?.pensioner_type || 'government'} className="w-full bg-surface-low border border-outline-variant/30 rounded-xl py-3 px-4 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40">
                  <option value="government">Government Pensioner</option>
                  <option value="subsidized">Subsidized Pensioner</option>
                  <option value="private">Private Pensioner</option>
                </select>
              </div>
            )}

            {isPensioner && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline">SSS No.{' '}<span className="text-[9px] font-normal normal-case">(req&apos;d if pensioner)</span></label>
                <input name="sss_no" placeholder="XX-XXXXXXX-X" defaultValue={sr?.sss_no || ''} className={getInputClass('sss_no')} onInput={normalizeSpaces} onChange={() => clearError('sss_no')} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline">GSIS No.{' '}<span className="text-[9px] font-normal normal-case">(req&apos;d if pensioner)</span></label>
                <input name="gsis_no" placeholder="XXXXXXXXXXXX" defaultValue={sr?.gsis_no || ''} className={getInputClass('gsis_no')} onInput={normalizeSpaces} onChange={() => clearError('gsis_no')} />
              </div>
            </div>
            )}

            {isPensioner && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline">PVAO No.{' '}<span className="text-[9px] font-normal normal-case">(req&apos;d if pensioner)</span></label>
                <input name="pvao_no" placeholder="For retired AFP personnel" defaultValue={sr?.pvao_no || ''} className={getInputClass('pvao_no')} onInput={normalizeSpaces} onChange={() => clearError('pvao_no')} />
              </div>
            </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isPensioner && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-outline">TIN <span className="text-[9px] font-normal normal-case">(optional)</span></label>
                  <input name="tin" placeholder="XXX-XXX-XXX" defaultValue={sr?.tin || ''} className="w-full bg-surface-low border border-outline-variant/30 rounded-xl py-3 px-4 text-xs text-foreground placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary/40" onInput={normalizeSpaces} />
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Registered Voter</label>
                <select name="is_voter" defaultValue={sr ? (sr.is_voter ? 'true' : 'false') : 'false'} className="w-full bg-surface-low border border-outline-variant/30 rounded-xl py-3 px-4 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40">
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Blood Type</label>
                <select name="blood_type" defaultValue={sr?.blood_type || ''} className="w-full bg-surface-low border border-outline-variant/30 rounded-xl py-3 px-4 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40">
                  <option value="">Unknown</option>
                  {BLOOD_TYPES.filter(b => b !== 'Unknown').map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Religion</label>
                <input name="religion" placeholder="e.g. Roman Catholic" defaultValue={sr?.religion || ''} className="w-full bg-surface-low border border-outline-variant/30 rounded-xl py-3 px-4 text-xs text-foreground placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary/40" onInput={normalizeSpaces} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Previous Occupation</label>
                <input name="occupation" placeholder="e.g. Teacher" defaultValue={sr?.occupation || ''} className="w-full bg-surface-low border border-outline-variant/30 rounded-xl py-3 px-4 text-xs text-foreground placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary/40" onInput={normalizeSpaces} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Education</label>
                <select name="education" defaultValue={sr?.education || ''} className="w-full bg-surface-low border border-outline-variant/30 rounded-xl py-3 px-4 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40">
                  <option value="">Select...</option>
                  {EDUCATION_LEVELS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Employment Status</label>
                <select name="employment_status" defaultValue={sr?.employment_status || ''} className="w-full bg-surface-low border border-outline-variant/30 rounded-xl py-3 px-4 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40">
                  <option value="">Select...</option>
                  {EMPLOYMENT_STATUSES.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-low border border-outline-variant/20">
              <input type="checkbox" name="is_bedridden" value="true" id="bedridden" defaultChecked={sr?.is_bedridden === true} className="rounded" />
              <label htmlFor="bedridden" className="text-xs text-foreground">Bedridden Senior</label>
            </div>

            {step === 2 && Object.keys(fieldErrors).some(k => ['sss_no','gsis_no','pvao_no'].includes(k)) && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <span className="material-symbols-outlined text-amber-400 text-sm">info</span>
                <p className="text-[11px] text-amber-400 font-medium">Pensioners should have at least one pension ID (SSS, GSIS, or PVAO). You may continue without one.</p>
              </div>
            )}
          </div>

          <div className={`bg-surface-lowest shadow-sm rounded-2xl p-6 border border-outline-variant/30 space-y-5 ${step !== 3 ? 'hidden' : ''}`}>
            <h3 className="font-headline font-bold text-foreground text-lg">Emergency Contact</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Contact Name</label>
                <input name="emergency_contact_name" placeholder="Full name" defaultValue={sr?.emergency_contact_name || ''} className="w-full bg-surface-low border border-outline-variant/30 rounded-xl py-3 px-4 text-xs text-foreground placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary/40" onInput={normalizeSpaces} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Contact Number</label>
                <input name="emergency_contact_number" type="tel" maxLength={11} placeholder="09XXXXXXXXX" defaultValue={sr?.emergency_contact_number || ''} className={getInputClass('emergency_contact_number')} onInput={numbersOnly} onChange={() => clearError('emergency_contact_number')} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Relationship</label>
                <input name="emergency_contact_relationship" placeholder="e.g. Spouse, Child" defaultValue={sr?.emergency_contact_relationship || ''} className="w-full bg-surface-low border border-outline-variant/30 rounded-xl py-3 px-4 text-xs text-foreground placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary/40" onInput={normalizeSpaces} />
              </div>
            </div>

            {step === 3 && Object.keys(fieldErrors).length > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <span className="material-symbols-outlined text-red-400 text-sm">error</span>
                <p className="text-[11px] text-red-400 font-medium">Fix the highlighted fields before continuing</p>
              </div>
            )}
          </div>

          <div className={`bg-surface-lowest shadow-sm rounded-2xl p-6 border border-outline-variant/30 space-y-5 ${step !== 4 ? 'hidden' : ''}`}>
            <h3 className="font-headline font-bold text-foreground text-lg">Documents & Biometrics</h3>
            <p className="text-[10px] text-outline">Documents (Profile Photo, Birth Certificate, Proof of Residency, Digital Signature) are optional — form may be submitted without them.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PhotoCaptureField label="Profile Photo (2x2)" fieldName="profile_photo_url" existingUrl={sr?.profile_photo_url} onFileReady={onFileReady} />
              <FileCaptureField label="Birth Certificate" fieldName="birth_certificate_url" icon="description" buttonLabel="Scan Birth Certificate" buttonIcon="document_scanner" existingUrl={sr?.birth_certificate_url} scan onFileReady={onFileReady} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FileCaptureField label="Proof of Residency" fieldName="voter_id_url" icon="how_to_vote" buttonLabel="Scan Proof of Residency" buttonIcon="document_scanner" existingUrl={sr?.voter_id_url} scan onFileReady={onFileReady} />
              <SignatureCaptureField label="Digital Signature" fieldName="digital_signature_url" existingUrl={sr?.digital_signature_url} onFileReady={onFileReady} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ThumbmarkCaptureField label="Thumbmark (Optional)" fieldName="thumbmark_url" existingUrl={sr?.thumbmark_url} onFileReady={onFileReady} />
              <div />
            </div>

            {Object.keys(fieldErrors).some(k => step4Required.includes(k)) && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <span className="material-symbols-outlined text-red-400 text-sm">error</span>
                <p className="text-[11px] text-red-400 font-medium">Required documents highlighted in red</p>
              </div>
            )}
          </div>

        <div className="flex items-center gap-4">
          {step > 1 && (
            <button type="button" onClick={() => setStep(step - 1)} className="px-6 py-3 rounded-xl bg-surface-low border border-outline-variant/30 text-xs font-bold text-outline hover:text-foreground transition-all">
              Previous
            </button>
          )}
{step < 4 ? (
            <button type="button" onClick={(e) => handleNext(e)} className="px-6 py-3 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all">
              Next
            </button>
          ) : (
            <div className="flex items-center gap-3 w-full sm:flex-row-reverse">
              <button
                type="button"
                onClick={() => { setSubmitMode('draft'); formRef.current?.dispatchEvent(new Event('submit')); }}
                disabled={loading}
                className="px-5 py-3 rounded-xl bg-surface-low border border-outline-variant/30 text-xs font-bold text-outline hover:text-foreground hover:bg-surface-high transition-all disabled:opacity-60 inline-flex items-center gap-2"
              >
                {loading ? 'Saving...' : 'Save as Pre-Registration'}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all disabled:opacity-60 inline-flex items-center gap-2"
              >
                {loading && <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/30 border-t-white" />}
                {loading
                  ? (prefillId ? 'Saving & Generating...' : sr ? (renewId ? 'Creating New Application...' : 'Saving Changes...') : 'Uploading & Registering...')
                  : (prefillId ? 'Save Changes & Generate Ref Number' : sr ? (renewId ? 'Re-register Senior (New OSCA ID)' : 'Resubmit for Approval') : 'Register Senior')}
              </button>
            </div>
          )}
          <button type="button" onClick={() => router.back()} className="ml-auto px-6 py-3 rounded-xl text-xs font-bold text-outline hover:text-foreground transition-all">
            Cancel
          </button>
        </div>
      </form>

      {showMatchModal && deceasedMatches.length > 0 && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-surface-lowest rounded-2xl border border-red-500/40 w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="bg-red-500/15 px-5 py-4 border-b border-red-500/30 flex items-start gap-3">
              <span className="material-symbols-outlined text-red-400 text-2xl">gavel</span>
              <div>
                <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider">Record Match Found</h3>
                <p className="text-[11px] text-red-400/90 mt-0.5">Duplicate &amp; Deceased Detection</p>
              </div>
            </div>
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {deceasedMatches.map(m => {
                const oscaId = m.id_number || m.registration_id || 'Unknown';
                return (
                  <div key={m.id} className="rounded-xl border border-red-500/25 bg-red-500/5 p-4 space-y-1.5">
                    <p className="text-xs font-bold text-foreground">{m.full_name || 'Unknown name'}</p>
                    <p className="text-[11px] text-red-400 font-medium leading-relaxed">
                      This individual is registered as <span className="font-bold">{m.status}</span> in the archives (OSCA ID: {oscaId}, Date of Death: {formatMatchDate(m.deceased_at)}).
                    </p>
                    <p className="text-[10px] text-outline">Status: {m.status} · Record ID: {m.registration_id || '—'}</p>
                  </div>
                );
              })}
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-3.5 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-amber-400 text-base mt-0.5">info</span>
                <p className="text-[11px] text-amber-400 leading-relaxed">
                  Registering a deceased individual without confirmation may be flagged as fraud. Verify the identity carefully, or cancel this registration.
                </p>
              </div>
              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-low border border-outline-variant/30 cursor-pointer">
                <input type="checkbox" checked={deceasedOverride} onChange={(e) => setDeceasedOverride(e.target.checked)} className="mt-0.5 accent-red-500" />
                <span className="text-[11px] text-foreground leading-relaxed font-medium">
                  I (OSCA Staff) confirm I have verified this is a different individual or that the archived record is inaccurate, and I authorize proceeding with this registration for OSCA Head verification.
                </span>
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => { setShowMatchModal(false); setMatchModalDismissed(true); }} className="px-5 py-2.5 rounded-xl text-xs font-bold text-outline hover:text-foreground hover:bg-surface-low transition-colors">
                  Cancel Registration
                </button>
                <button type="button" disabled={!deceasedOverride} onClick={() => { setShowMatchModal(false); setDeceasedOverride(true); }} className="px-5 py-2.5 rounded-xl text-xs font-bold bg-red-500 text-white hover:bg-red-500/90 transition-all disabled:opacity-50">
                  I Confirm — Proceed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showStub && lastSavedSenior && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowStub(false)}
        >
          <div
            className="bg-surface-lowest rounded-2xl border border-outline-variant/30 w-full max-w-md overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-primary px-5 py-4">
              <h3 className="text-sm font-bold text-white">Registration Complete</h3>
              <p className="text-[11px] text-white/80 mt-0.5">Give this slip to the senior for Mobile App access.</p>
            </div>
            <div className="p-5 space-y-4">
              <div id="osca-stub-card" className="rounded-xl border-2 border-dashed border-primary/40 bg-surface-low p-4 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-outline text-center">Mobile App Access Slip</p>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Pangalan ng Senior</p>
                  <p className="text-sm font-bold text-foreground mt-0.5 break-words">{lastSavedSenior.full_name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Mobile App Reference Number</p>
                  <p className="text-3xl font-extrabold font-headline text-primary tracking-tight mt-1 break-all">{lastSavedSenior.registration_id}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Password (Birthday)</p>
                  <p className="text-3xl font-extrabold font-headline text-foreground tracking-tight mt-1 break-words">{formatBirthdayForDisplay(lastSavedSenior.birthdate) || lastSavedSenior.birthdate}</p>
                </div>
                <p className="text-[11px] text-outline leading-relaxed pt-2 border-t border-outline-variant/10">
                  Gamitin ang Reference Number at Birthday para mag-log in sa Mobile App. Magiging OSCA Number na ito kapag na-approve na.
                </p>
              </div>
              {stubError && (
                <p className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-bold">
                  {stubError}
                </p>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowStub(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg text-xs font-bold text-outline hover:text-foreground hover:bg-surface-low transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={printSlip}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-surface-low border border-outline-variant/30 text-primary text-xs font-bold hover:border-primary/40 hover:bg-primary/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  Print Slip
                </button>
                <button
                  type="button"
                  onClick={downloadSlip}
                  disabled={downloadingStub}
                  className="flex-[1.4] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {downloadingStub ? (
                    <>
                      <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/30 border-t-white" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">download</span>
                      Download OSCA Stub
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
