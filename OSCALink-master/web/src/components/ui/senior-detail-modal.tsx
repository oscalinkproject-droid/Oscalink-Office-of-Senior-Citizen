"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { IDCardPreview } from "@/components/ui/id-card-preview";
import { SignatureCaptureField } from "@/components/ui/capture-fields";
import { updateSenior, approveSenior, disapproveSenior, disqualifySenior, getNextSeniorIdSequence } from "@/app/actions/seniors";
import { deleteCloudinaryFile } from "@/app/actions/cloudinary";
import { useToast } from "@/components/ui/toast";
import { COTABATO_BARANGAYS, CLASSIFICATIONS, BLOOD_TYPES, EDUCATION_LEVELS, EMPLOYMENT_STATUSES, CIVIL_STATUSES, DISQUALIFICATION_REASONS, getPurokOptions } from "@/lib/constants";
import { getUserRole, canApprove } from "@/lib/rbac";
import { printAccessSlip } from "@/lib/print-stub";
import { normalizeOscaId } from "@/lib/os-id";

interface SeniorDetail {
  id: string;
  full_name: string;
  middle_name?: string | null;
  suffix?: string | null;
  registration_id: string;
  id_number?: string | null;
  birthdate?: string | null;
  age?: number | null;
  sex?: string | null;
  civil_status?: string | null;
  barangay?: string | null;
  purok?: string | null;
  contact_number?: string | null;
  address?: string | null;
  place_of_birth?: string | null;
  occupation?: string | null;
  classification?: string | null;
  is_pensioner?: boolean;
  is_voter?: boolean;
  is_bedridden?: boolean;
  is_verified?: boolean;
  status?: string;
  philhealth_no?: string | null;
  sss_no?: string | null;
  gsis_no?: string | null;
  pvao_no?: string | null;
  tin?: string | null;
  blood_type?: string | null;
  religion?: string | null;
  education?: string | null;
  employment_status?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_number?: string | null;
  emergency_contact_relationship?: string | null;
  profile_photo_url?: string | null;
  birth_certificate_url?: string | null;
  voter_id_url?: string | null;
  digital_signature_url?: string | null;
  thumbmark_url?: string | null;
  created_at?: string;
}

interface SeniorDetailModalProps {
  seniorId: string;
  onClose: () => void;
  onUpdate?: () => void;
  autoEdit?: boolean;
}

const INPUT_CLASS = "w-full bg-surface-low border border-outline-variant/30 rounded-lg py-2 px-3 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40";

function isPending(status?: string): boolean {
  return status === 'Pending' || status === 'Pending Barangay' || status === 'Pending OSCA';
}

function Field({ label, value }: { label: string; value?: string | number | boolean | null }) {
  if (value == null || value === '') return null;
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] text-outline font-bold uppercase tracking-widest">{label}</p>
      <p className="text-xs text-foreground">
        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
      </p>
    </div>
  );
}

interface SeniorPII {
  philhealth_no?: string | null;
  sss_no?: string | null;
  gsis_no?: string | null;
  tin?: string | null;
  pvao_no?: string | null;
  contact_number?: string | null;
  address?: string | null;
}

export function SeniorDetailModal({ seniorId, onClose, onUpdate, autoEdit }: SeniorDetailModalProps) {
  const { toast } = useToast();
  const [senior, setSenior] = useState<SeniorDetail | null>(null);
  const [pii, setPii] = useState<SeniorPII | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'profile' | 'idcard'>('profile');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [headSignature, setHeadSignature] = useState<string | null>(null);
  const [headName, setHeadName] = useState<string | null>(null);
  const [pendingPreviews, setPendingPreviews] = useState<Record<string, string>>({});
  const [canEdit, setCanEdit] = useState(false);
  const [canApproveRecord, setCanApproveRecord] = useState(false);
  const [canPrintStub, setCanPrintStub] = useState(false);
  const [hasActions, setHasActions] = useState(false);
  const [approving, setApproving] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectMode, setRejectMode] = useState<'disapprove' | 'disqualify' | null>(null);
  const [reason, setReason] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [manualSequence, setManualSequence] = useState('');
  const manualId = manualDate && manualSequence ? `OSC-${manualDate.replace(/-/g, '')}-${manualSequence}` : '';
  const handleManualDateChange = async (value: string) => {
    setManualDate(value);
    setManualSequence('');
    if (!value) return;
    const result = await getNextSeniorIdSequence(value.replace(/-/g, ''));
    if (result && !result.error && result.success) {
      setManualSequence(result.sequence);
    }
  };
  const docBlobsRef = useRef<Map<string, Blob>>(new Map());
  const previewUrlsRef = useRef<string[]>([]);
  const didAutoEditRef = useRef(false);

  const onDocReady = useCallback((fieldName: string, blob: Blob) => {
    docBlobsRef.current.set(fieldName, blob);
    const url = URL.createObjectURL(blob);
    previewUrlsRef.current.push(url);
    setPendingPreviews(prev => ({ ...prev, [fieldName]: url }));
  }, []);

  const onSignatureReady = useCallback((fieldName: string, blob: Blob, _previewUrl?: string) => {
    docBlobsRef.current.set(fieldName, blob);
    const url = URL.createObjectURL(blob);
    previewUrlsRef.current.push(url);
    setPendingPreviews(prev => ({ ...prev, [fieldName]: url }));
  }, []);

  useEffect(() => {
    const urls = previewUrlsRef.current;
    return () => {
      urls.forEach(URL.revokeObjectURL);
    };
  }, []);

  const loadSenior = useCallback(() => {
    const supabase = createClient();
    supabase
      .from('seniors')
      .select('*')
      .eq('id', seniorId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setSenior(data);
        setLoading(false);
        if (data) {
          supabase
            .rpc('decrypt_senior_pii', { p_senior_id: data.id })
            .then(
              ({ data: piiData }) => {
                if (piiData) setPii(piiData as SeniorPII);
              },
              () => {}
            );
        }
      });
  }, [seniorId]);

  const loadHeadSignature = useCallback(() => {
    const supabase = createClient();
    supabase
      .from('profiles')
      .select('signature_url, full_name')
      .eq('role', 'osca_head')
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data) {
          setHeadSignature(data.signature_url || null);
          setHeadName(data.full_name || null);
        }
      });
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      const role = getUserRole(user?.user_metadata as Record<string, unknown> | undefined);
      setCanEdit(role === 'super_admin' || role === 'osca_staff');
      setCanApproveRecord(canApprove(role));
      setCanPrintStub(role === 'osca_staff');
      setHasActions(role === 'osca_staff');
    });
  }, []);

  useEffect(() => { loadSenior(); loadHeadSignature(); }, [seniorId, loadHeadSignature, loadSenior]);

  const startEditing = () => {
    if (!senior) return;
    setEditForm({
      full_name: senior.full_name || '',
      registration_id: senior.registration_id || '',
      birthdate: senior.birthdate || '',
      sex: senior.sex || '',
      civil_status: senior.civil_status || '',
      barangay: senior.barangay || '',
      purok: senior.purok || '',
      contact_number: pii?.contact_number ?? senior.contact_number ?? '',
      address: pii?.address ?? senior.address ?? '',
      place_of_birth: senior.place_of_birth || '',
      occupation: senior.occupation || '',
      classification: senior.classification || 'Indigent',
      is_pensioner: senior.is_pensioner ?? false,
      is_voter: senior.is_voter ?? false,
      is_bedridden: senior.is_bedridden ?? false,
      blood_type: senior.blood_type || '',
      religion: senior.religion || '',
      education: senior.education || '',
      employment_status: senior.employment_status || '',
      philhealth_no: pii?.philhealth_no ?? senior.philhealth_no ?? '',
      sss_no: pii?.sss_no ?? senior.sss_no ?? '',
      gsis_no: pii?.gsis_no ?? senior.gsis_no ?? '',
      pvao_no: pii?.pvao_no ?? senior.pvao_no ?? '',
      tin: pii?.tin ?? senior.tin ?? '',
      emergency_contact_name: senior.emergency_contact_name || '',
      emergency_contact_number: senior.emergency_contact_number || '',
      emergency_contact_relationship: senior.emergency_contact_relationship || '',
    });
    setEditing(true);
  };

  useEffect(() => {
    if (autoEdit && canEdit && senior && !editing && !didAutoEditRef.current) {
      didAutoEditRef.current = true;
      startEditing();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoEdit, canEdit, senior]);

  const handleSave = async () => {
    setSaving(true);

    // Upload new documents and delete old ones from Cloudinary
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "oscalink_scans";
    const updates = { ...editForm };
    const deletions: Promise<unknown>[] = [];

    if (cloudName && docBlobsRef.current.size > 0) {
      for (const [fieldName, blob] of docBlobsRef.current) {
        try {
          const fd = new FormData();
          fd.append("file", blob, `${fieldName}.jpg`);
          fd.append("upload_preset", uploadPreset);
          const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: fd });
          const data = await res.json();
          if (data.secure_url) {
            // Delete old file if it exists and is a Cloudinary URL
            const oldUrl = senior?.[fieldName as keyof SeniorDetail] as string | null | undefined;
            if (oldUrl && oldUrl.includes('cloudinary.com')) {
              deletions.push(deleteCloudinaryFile(oldUrl));
            }
            updates[fieldName] = data.secure_url;
            setPendingPreviews(prev => { const next = { ...prev }; delete next[fieldName]; return next; });
          }
        } catch {
          toast(`Failed to upload ${fieldName}. Please try again.`, 'error');
        }
      }
    }

    // Wait for deletions to complete
    await Promise.allSettled(deletions);

    try {
      const result = await updateSenior(seniorId, updates);
      if (result?.error) {
        toast(result.error, 'error');
      } else {
        toast('Profile updated successfully!', 'success');
        setEditing(false);
        loadSenior();
        onUpdate?.();
      }
    } catch {
      toast('Something went wrong. Please try again.', 'error');
    }
    setSaving(false);
  };

  const set = (field: string, value: unknown) => setEditForm(prev => ({ ...prev, [field]: value }));

  const closeRejectModal = () => {
    setShowRejectModal(false);
    setRejectMode(null);
    setReason('');
  };

  const handleApprove = async () => {
    if (!senior) return;
    if (!manualId.trim()) {
      setActionMessage({ type: 'error', text: 'OSCA ID number is required before approval.' });
      return;
    }
    setApproving(true);
    const result = await approveSenior(senior.id, manualId.trim());
    if (result?.error) {
      setActionMessage({ type: 'error', text: result.error });
    } else {
      setActionMessage({ type: 'success', text: 'Senior approved successfully.' });
      setManualDate('');
      setManualSequence('');
      loadSenior();
      onUpdate?.();
    }
    setApproving(false);
  };

  const handleReject = async () => {
    if (!senior || !rejectMode) return;
    if (!reason.trim()) {
      setActionMessage({ type: 'error', text: 'Please provide a reason for this decision.' });
      return;
    }
    setApproving(true);
    const result = rejectMode === 'disapprove'
      ? await disapproveSenior(senior.id, reason)
      : await disqualifySenior(senior.id, reason);
    if (result?.error) {
      setActionMessage({ type: 'error', text: result.error });
    } else {
      setActionMessage({ type: 'success', text: `Senior ${rejectMode === 'disapprove' ? 'disapproved' : 'disqualified'} successfully.` });
      closeRejectModal();
      loadSenior();
      onUpdate?.();
    }
    setApproving(false);
  };

  if (!senior && !loading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-surface-lowest rounded-2xl border border-outline-variant/30 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-surface-lowest border-b border-outline-variant/30 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-headline font-bold text-foreground text-lg">Senior Citizen Profile</h3>
            {!editing && (
              <div className="flex items-center gap-1 ml-4">
                <button onClick={() => setTab('profile')} className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${tab === 'profile' ? 'bg-primary text-white' : 'text-outline hover:text-foreground'}`}>Profile</button>
                <button onClick={() => setTab('idcard')} className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${tab === 'idcard' ? 'bg-primary text-white' : 'text-outline hover:text-foreground'}`}>ID Card</button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {tab === 'profile' && !editing && canEdit && (
              <button onClick={startEditing} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold hover:bg-primary/20 transition-all">
                <span className="material-symbols-outlined text-sm">edit</span> Edit
              </button>
            )}
            <button onClick={onClose} className="material-symbols-outlined text-outline hover:text-foreground transition-colors">close</button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-outline text-xs">Loading...</div>
        ) : !senior ? (
          <div className="p-8 text-center text-outline text-xs">Senior not found.</div>
        ) : tab === 'idcard' ? (
          <div className="p-6">
            <IDCardPreview senior={{
              full_name: senior.full_name,
              registration_id: senior.registration_id,
              birthdate: senior.birthdate,
              barangay: senior.barangay,
              purok: senior.purok,
              is_pensioner: senior.is_pensioner,
              profile_photo_url: senior.profile_photo_url,
              digital_signature_url: senior.digital_signature_url,
              thumbmark_url: senior.thumbmark_url,
              created_at: senior.created_at,
              status: senior.status,
              headSignature,
              headName,
            }} />
          </div>
        ) : editing ? (
          <div className="p-6 space-y-6">
            {/* Personal Info */}
            <div>
              <h5 className="font-headline font-bold text-foreground text-sm mb-3">Personal Information</h5>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="space-y-1"><label className="text-[9px] text-outline font-bold uppercase">OSCA ID Number</label><input className={`${INPUT_CLASS} opacity-60 cursor-not-allowed`} value={senior.id_number || 'Not yet issued'} disabled title="The OSCA ID Number is issued at approval and cannot be edited" /></div>
                <div className="space-y-1"><label className="text-[9px] text-outline font-bold uppercase">Full Name</label><input className={INPUT_CLASS} value={editForm.full_name as string} onChange={e => set('full_name', e.target.value)} /></div>
                <div className="space-y-1"><label className="text-[9px] text-outline font-bold uppercase">Reg ID</label><input className={INPUT_CLASS} value={editForm.registration_id as string} onChange={e => set('registration_id', e.target.value)} /></div>
                <div className="space-y-1"><label className="text-[9px] text-outline font-bold uppercase">Birthdate</label><input type="date" className={INPUT_CLASS} value={editForm.birthdate as string} onChange={e => set('birthdate', e.target.value)} /></div>
                <div className="space-y-1"><label className="text-[9px] text-outline font-bold uppercase">Sex</label><select className={INPUT_CLASS} value={editForm.sex as string} onChange={e => set('sex', e.target.value)}><option value="" disabled hidden>Select sex</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
                <div className="space-y-1"><label className="text-[9px] text-outline font-bold uppercase">Civil Status</label><select className={INPUT_CLASS} value={editForm.civil_status as string} onChange={e => set('civil_status', e.target.value)}><option value="" disabled hidden>Select civil status</option>{CIVIL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div className="space-y-1"><label className="text-[9px] text-outline font-bold uppercase">Barangay</label><select className={INPUT_CLASS} value={editForm.barangay as string} onChange={e => set('barangay', e.target.value)}><option value="" disabled hidden>Select barangay</option>{COTABATO_BARANGAYS.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
                <div className="space-y-1"><label className="text-[9px] text-outline font-bold uppercase">Purok</label><select className={INPUT_CLASS} value={editForm.purok as string} onChange={e => set('purok', e.target.value)}><option value="" disabled hidden>Select purok...</option>{(editForm.barangay ? getPurokOptions(editForm.barangay as string) : []).map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                <div className="space-y-1"><label className="text-[9px] text-outline font-bold uppercase">Contact</label><input className={INPUT_CLASS} value={editForm.contact_number as string} onChange={e => set('contact_number', e.target.value)} maxLength={11} /></div>
                <div className="space-y-1"><label className="text-[9px] text-outline font-bold uppercase">Address</label><input className={INPUT_CLASS} value={editForm.address as string} onChange={e => set('address', e.target.value)} /></div>
                <div className="space-y-1"><label className="text-[9px] text-outline font-bold uppercase">Place of Birth</label><input className={INPUT_CLASS} value={editForm.place_of_birth as string} onChange={e => set('place_of_birth', e.target.value)} /></div>
                <div className="space-y-1"><label className="text-[9px] text-outline font-bold uppercase">Occupation</label><input className={INPUT_CLASS} value={editForm.occupation as string} onChange={e => set('occupation', e.target.value)} /></div>
                <div className="space-y-1"><label className="text-[9px] text-outline font-bold uppercase">Classification</label><select className={INPUT_CLASS} value={editForm.classification as string} onChange={e => { set('classification', e.target.value); if (e.target.value === 'Pensioner') set('is_pensioner', true); }}>{CLASSIFICATIONS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div className="space-y-1"><label className="text-[9px] text-outline font-bold uppercase">Blood Type</label><select className={INPUT_CLASS} value={editForm.blood_type as string} onChange={e => set('blood_type', e.target.value)}><option value="" disabled hidden>Unknown</option>{BLOOD_TYPES.filter(b => b !== 'Unknown').map(b => <option key={b} value={b}>{b}</option>)}</select></div>
                <div className="space-y-1"><label className="text-[9px] text-outline font-bold uppercase">Religion</label><input className={INPUT_CLASS} value={editForm.religion as string} onChange={e => set('religion', e.target.value)} /></div>
                <div className="space-y-1"><label className="text-[9px] text-outline font-bold uppercase">Education</label><select className={INPUT_CLASS} value={editForm.education as string} onChange={e => set('education', e.target.value)}><option value="" disabled hidden>Select education</option>{EDUCATION_LEVELS.map(e2 => <option key={e2} value={e2}>{e2}</option>)}</select></div>
                <div className="space-y-1"><label className="text-[9px] text-outline font-bold uppercase">Employment</label><select className={INPUT_CLASS} value={editForm.employment_status as string} onChange={e => set('employment_status', e.target.value)}><option value="" disabled hidden>Select employment</option>{EMPLOYMENT_STATUSES.map(e2 => <option key={e2} value={e2}>{e2}</option>)}</select></div>
              </div>
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-[11px] text-foreground"><input type="checkbox" checked={editForm.is_pensioner as boolean} onChange={e => { set('is_pensioner', e.target.checked); if (e.target.checked) set('classification', 'Pensioner'); }} className="rounded" /> Pensioner (Green ID)</label>
              <label className="flex items-center gap-2 text-[11px] text-foreground"><input type="checkbox" checked={editForm.is_voter as boolean} onChange={e => set('is_voter', e.target.checked)} className="rounded" /> Registered Voter</label>
              <label className="flex items-center gap-2 text-[11px] text-foreground"><input type="checkbox" checked={editForm.is_bedridden as boolean} onChange={e => set('is_bedridden', e.target.checked)} className="rounded" /> Bedridden</label>
            </div>

            {/* Government IDs */}
            <div>
              <h5 className="font-headline font-bold text-foreground text-sm mb-3">Government IDs</h5>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="space-y-1"><label className="text-[9px] text-outline font-bold uppercase">PhilHealth</label><input className={INPUT_CLASS} value={editForm.philhealth_no as string} onChange={e => set('philhealth_no', e.target.value)} /></div>
                <div className="space-y-1"><label className="text-[9px] text-outline font-bold uppercase">SSS</label><input className={INPUT_CLASS} value={editForm.sss_no as string} onChange={e => set('sss_no', e.target.value)} /></div>
                <div className="space-y-1"><label className="text-[9px] text-outline font-bold uppercase">GSIS</label><input className={INPUT_CLASS} value={editForm.gsis_no as string} onChange={e => set('gsis_no', e.target.value)} /></div>
                <div className="space-y-1"><label className="text-[9px] text-outline font-bold uppercase">PVAO</label><input className={INPUT_CLASS} value={editForm.pvao_no as string} onChange={e => set('pvao_no', e.target.value)} /></div>
                <div className="space-y-1"><label className="text-[9px] text-outline font-bold uppercase">TIN</label><input className={INPUT_CLASS} value={editForm.tin as string} onChange={e => set('tin', e.target.value)} /></div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div>
              <h5 className="font-headline font-bold text-foreground text-sm mb-3">Emergency Contact</h5>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="space-y-1"><label className="text-[9px] text-outline font-bold uppercase">Name</label><input className={INPUT_CLASS} value={editForm.emergency_contact_name as string} onChange={e => set('emergency_contact_name', e.target.value)} /></div>
                <div className="space-y-1"><label className="text-[9px] text-outline font-bold uppercase">Number</label><input className={INPUT_CLASS} value={editForm.emergency_contact_number as string} onChange={e => set('emergency_contact_number', e.target.value)} maxLength={11} /></div>
                <div className="space-y-1"><label className="text-[9px] text-outline font-bold uppercase">Relationship</label><input className={INPUT_CLASS} value={editForm.emergency_contact_relationship as string} onChange={e => set('emergency_contact_relationship', e.target.value)} /></div>
              </div>
            </div>

            {/* Documents */}
            <div>
              <h5 className="font-headline font-bold text-foreground text-sm mb-3">Documents</h5>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { key: 'profile_photo_url' as const, label: 'Profile Photo' },
                  { key: 'birth_certificate_url' as const, label: 'Birth Cert' },
                  { key: 'voter_id_url' as const, label: 'Voter ID' },
                  { key: 'thumbmark_url' as const, label: 'Thumbmark' },
                ].map(({ key, label }) => {
                  const existingUrl = (senior?.[key] as string) || '';
                  const pendingUrl = pendingPreviews[key];
                  const displayUrl = pendingUrl || existingUrl;
                  return (
                    <div key={key} className="space-y-1.5">
                      <p className="text-[9px] text-outline font-bold uppercase">{label}</p>
                      {displayUrl ? (
                        <div className="relative group">
                          <img src={displayUrl} alt="" className="w-full h-20 object-cover rounded-lg border border-outline-variant/30" crossOrigin="anonymous" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                            <button type="button" onClick={() => window.open(displayUrl, '_blank')} className="text-[10px] font-bold text-white bg-white/20 px-2 py-1 rounded">View</button>
                            <label className="text-[10px] font-bold text-white bg-primary/80 px-2 py-1 rounded cursor-pointer hover:bg-primary">
                              {pendingUrl ? 'Replace' : 'Replace'}
                              <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { onDocReady(key, f); e.target.value = ''; } }} />
                            </label>
                          </div>
                          {pendingUrl && (
                            <span className="absolute top-1 right-1 text-[8px] font-bold bg-amber-500/80 text-white px-1.5 py-0.5 rounded">NEW</span>
                          )}
                        </div>
                      ) : (
                        <label className="flex items-center gap-1 px-2 py-2 rounded-lg border border-dashed border-outline-variant/30 hover:border-primary/40 cursor-pointer text-[10px] text-outline">
                          <span className="material-symbols-outlined text-xs">add_photo_alternate</span> Add
                          <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { onDocReady(key, f); e.target.value = ''; } }} />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4">
                <SignatureCaptureField
                  key={senior?.digital_signature_url ?? 'none'}
                  label="Digital Signature"
                  fieldName="digital_signature_url"
                  existingUrl={senior?.digital_signature_url}
                  onFileReady={onSignatureReady}
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-2 border-t border-outline-variant/20">
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={() => setEditing(false)} className="px-5 py-2 rounded-lg bg-surface-low border border-outline-variant/30 text-xs font-bold text-outline hover:text-foreground transition-all">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* ID & Status */}
            <div className="flex items-start gap-4 pb-4 border-b border-outline-variant/20">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg ring-1 ring-primary/20 overflow-hidden">
                {senior.profile_photo_url ? (
                  <img src={senior.profile_photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  (senior.full_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)
                )}
              </div>
              <div className="flex-1">
                <h4 className="text-base font-bold text-foreground">
                  {senior.suffix && senior.full_name?.toLowerCase().endsWith(senior.suffix.toLowerCase()) ? senior.full_name : `${senior.full_name}${senior.suffix ? ` ${senior.suffix}` : ''}`}
                </h4>
                <p className="text-xs text-outline font-mono">{normalizeOscaId(senior.status, senior.registration_id)}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    senior.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    senior.status === 'Pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    'bg-slate-500/10 text-slate-400'
                  }`}>{senior.status}</span>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    senior.is_pensioner ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-500/10 text-slate-400'
                  }`}>{senior.is_pensioner ? 'Green ID (Pensioner)' : 'White ID'}</span>
                  {senior.is_verified && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/20">Verified</span>
                  )}
                </div>
              </div>
            </div>

            {/* Status & Quick Actions */}
            {hasActions && (isPending(senior.status) || senior.status === 'Active') && (
              <div className="p-4 rounded-xl bg-surface-low border border-outline-variant/30 space-y-3">
                {actionMessage && (
                  <div className={`p-2.5 rounded-lg text-[11px] font-bold border ${actionMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                    {actionMessage.text}
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-outline">
                    {isPending(senior.status) ? 'Application Status & Actions' : 'Actions'}
                  </p>
                  {canPrintStub && (
                    <button
                      onClick={() => senior && printAccessSlip({ full_name: senior.full_name, registration_id: senior.registration_id, birthdate: senior.birthdate })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-low border border-outline-variant/30 text-primary text-[10px] font-bold hover:border-primary/40 transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">print</span> Print Stub
                    </button>
                  )}
                </div>
                {isPending(senior.status) && canApproveRecord && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={handleApprove}
                        disabled={approving}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-60"
                      >
                        <span className="material-symbols-outlined text-sm">check_circle</span> {approving ? 'Processing...' : 'Approve'}
                      </button>
                    <button
                      onClick={() => { setRejectMode('disapprove'); setShowRejectModal(true); }}
                      disabled={approving}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20 hover:bg-amber-500/20 transition-all disabled:opacity-60"
                    >
                      <span className="material-symbols-outlined text-sm">warning</span> Disapprove
                    </button>
                    <button
                      onClick={() => { setRejectMode('disqualify'); setShowRejectModal(true); }}
                      disabled={approving}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-[10px] font-bold border border-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-60"
                    >
                      <span className="material-symbols-outlined text-sm">disabled_by_default</span> Disqualify
                    </button>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-outline">
                        OSCA ID Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={manualDate}
                        onChange={(e) => handleManualDateChange(e.target.value)}
                        title="Select the issue date"
                        className="w-full bg-surface-low border border-outline-variant/30 rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                      />
                      <div className="flex gap-2 items-center">
                        <span className="text-xs text-outline font-mono">OSC-</span>
                        <input
                          value={manualDate ? manualDate.replace(/-/g, '') : ''}
                          readOnly
                          placeholder="YYYYMMDD"
                          title="Date part (auto-filled)"
                          className="w-full bg-surface-low border border-outline-variant/30 rounded-lg py-2 px-3 text-xs text-foreground font-mono placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary/40"
                        />
                        <span className="text-xs text-outline font-mono">-</span>
                        <input
                          value={manualSequence}
                          readOnly
                          placeholder="0000"
                          title="Auto-generated sequential number"
                          className="w-full bg-surface-low border border-outline-variant/30 rounded-lg py-2 px-3 text-xs text-foreground font-mono placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary/40"
                        />
                      </div>
                    </div>
                  </div>
                )}
                {isPending(senior.status) && !canApproveRecord && (
                  <p className="text-[10px] text-outline">Only the OSCA Head can approve, disapprove, or disqualify records.</p>
                )}
              </div>
            )}

            {/* Personal Info */}
            <div>
              <h5 className="font-headline font-bold text-foreground text-sm mb-3">Personal Information</h5>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-6">
                <Field label="Age" value={senior.age} />
                <Field label="Sex" value={senior.sex === 'M' ? 'Male' : senior.sex === 'F' ? 'Female' : senior.sex} />
                <Field label="Civil Status" value={senior.civil_status} />
                <Field label="Birthdate" value={senior.birthdate} />
                <Field label="Place of Birth" value={senior.place_of_birth} />
                <Field label="Blood Type" value={senior.blood_type} />
                <Field label="Religion" value={senior.religion} />
                <Field label="Education" value={senior.education} />
                <Field label="Occupation" value={senior.occupation} />
                <Field label="Employment" value={senior.employment_status} />
                <Field label="Classification" value={senior.classification} />
                <Field label="Bedridden" value={senior.is_bedridden} />
                <Field label="Voter" value={senior.is_voter} />
              </div>
            </div>

            {/* Contact & Location */}
            <div>
              <h5 className="font-headline font-bold text-foreground text-sm mb-3">Contact & Location</h5>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-6">
                <Field label="Barangay" value={senior.barangay} />
                <Field label="Purok" value={senior.purok} />
                <Field label="Address" value={pii?.address ?? senior.address} />
                <Field label="Contact Number" value={pii?.contact_number ?? senior.contact_number} />
              </div>
            </div>

            {/* Government IDs */}
            {((pii?.philhealth_no ?? senior.philhealth_no) || (pii?.sss_no ?? senior.sss_no) || (pii?.gsis_no ?? senior.gsis_no) || (pii?.pvao_no ?? senior.pvao_no) || (pii?.tin ?? senior.tin)) && (
              <div>
                <h5 className="font-headline font-bold text-foreground text-sm mb-3">Government IDs</h5>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-6">
                  <Field label="PhilHealth" value={pii?.philhealth_no ?? senior.philhealth_no} />
                  <Field label="SSS" value={pii?.sss_no ?? senior.sss_no} />
                  <Field label="GSIS" value={pii?.gsis_no ?? senior.gsis_no} />
                  <Field label="PVAO" value={pii?.pvao_no ?? senior.pvao_no} />
                  <Field label="TIN" value={pii?.tin ?? senior.tin} />
                </div>
              </div>
            )}

            {/* Emergency Contact */}
            {(senior.emergency_contact_name || senior.emergency_contact_number) && (
              <div>
                <h5 className="font-headline font-bold text-foreground text-sm mb-3">Emergency Contact</h5>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-6">
                  <Field label="Name" value={senior.emergency_contact_name} />
                  <Field label="Number" value={senior.emergency_contact_number} />
                  <Field label="Relationship" value={senior.emergency_contact_relationship} />
                </div>
              </div>
            )}

            <div className="text-[10px] text-outline/60 pt-2 border-t border-outline-variant/20">
              Registered: {senior.created_at ? new Date(senior.created_at).toLocaleDateString() : 'Unknown'}
            </div>
          </div>
        )}
      </div>

      {/* Rejection / Disqualification decision modal */}
      {showRejectModal && senior && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-surface-lowest rounded-2xl border border-outline-variant/30 shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center gap-3">
              {rejectMode === 'disqualify' ? (
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-red-400 text-lg">disabled_by_default</span>
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-amber-400 text-lg">warning</span>
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-foreground">
                  {rejectMode === 'disqualify' ? 'Disqualify Application' : rejectMode === 'disapprove' ? 'Disapprove Application' : 'Reject Application'}
                </p>
                <p className="text-[11px] text-outline mt-0.5">{senior.full_name}</p>
              </div>
            </div>

            {!rejectMode ? (
              <>
                <p className="text-xs text-outline">Select the type of decision:</p>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => setRejectMode('disapprove')}
                    className="p-3 rounded-xl border border-outline-variant/20 bg-surface-low hover:border-amber-500/40 transition-all text-left"
                  >
                    <p className="text-xs font-bold text-foreground flex items-center gap-2">
                      <span className="material-symbols-outlined text-amber-400 text-base">warning</span>
                      Option A: DISAPPROVED
                    </p>
                    <p className="text-[11px] text-outline mt-1">Incomplete / Needs Correction</p>
                  </button>
                  <button
                    onClick={() => setRejectMode('disqualify')}
                    className="p-3 rounded-xl border border-outline-variant/20 bg-surface-low hover:border-red-500/40 transition-all text-left"
                  >
                    <p className="text-xs font-bold text-foreground flex items-center gap-2">
                      <span className="material-symbols-outlined text-red-400 text-base">disabled_by_default</span>
                      Option B: DISQUALIFIED
                    </p>
                    <p className="text-[11px] text-outline mt-1">Not Eligible</p>
                  </button>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={closeRejectModal} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-outline hover:text-foreground transition-colors">
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-outline">
                    {rejectMode === 'disapprove' ? 'Disapproval reason' : 'Disqualification reason'} <span className="text-red-500">*</span>
                  </label>
                  {rejectMode === 'disqualify' ? (
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full bg-surface-low border border-outline-variant/30 rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                    >
                      <option value="">Select reason...</option>
                      {DISQUALIFICATION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  ) : (
                    <input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Missing birth certificate, fake requirement"
                      className="w-full bg-surface-low border border-outline-variant/30 rounded-lg py-2 px-3 text-xs text-foreground placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={() => setRejectMode(null)} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-outline hover:text-foreground transition-colors">
                    Back
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={approving}
                    className={`px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-white rounded-lg transition-colors disabled:opacity-50 ${rejectMode === 'disapprove' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-red-500 hover:bg-red-600'}`}
                  >
                    {approving ? 'Processing...' : `Confirm ${rejectMode === 'disapprove' ? 'Disapproved' : 'Disqualified'}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
