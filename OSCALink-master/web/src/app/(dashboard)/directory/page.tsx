'use client';

import { verifySenior, updateSeniorStatusByBarangay } from "@/app/actions/seniors";
import { markSeniorDeceased } from "@/app/actions/death-certificate";
import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { DirectoryTable } from "@/components/ui/directory-table";
import { createClient, getSharedUser } from "@/lib/supabase";
import { DirectoryFilters } from "@/components/ui/directory-filters";

const INPUT_CLASS = "w-full bg-surface-low border border-outline-variant/30 rounded-xl py-2.5 px-4 text-xs text-foreground placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary/40";

const MAX_FILE_MB = 5;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg"];

interface SeniorRecord {
  id: string;
  registration_id: string;
  full_name: string;
  age: number;
  barangay: string;
  purok?: string | null;
  status: string;
  last_check_in?: string;
  contact_number?: string;
  address?: string;
  birthdate?: string;
  emergency_contact?: string;
  emergency_contact_name?: string;
  emergency_contact_number?: string;
  sex?: string;
  religion?: string;
  blood_type?: string;
  education?: string;
  employment_status?: string;
  classification?: string;
  civil_status?: string;
  place_of_birth?: string;
  occupation?: string;
  monthly_income?: number;
  philhealth_no?: string;
  sss_no?: string;
  gsis_no?: string;
  pvao_no?: string;
  tin?: string;
  is_bedridden?: boolean;
  address_unit?: string;
  address_building?: string;
  address_lot_block?: string;
  address_street?: string;
  address_subdivision?: string;
  address_city?: string;
  address_province?: string;
  address_region?: string;
  profile_photo_url?: string | null;
  photo_url?: string | null;
  birth_certificate_url?: string | null;
  voter_id_url?: string | null;
  digital_signature_url?: string | null;
}

function DirectoryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const search = searchParams.get("search") || "";
  const statusFilter = ["Transferred", "Deceased"].includes(searchParams.get("status") || "") ? "All" : (searchParams.get("status") || "All");
  const idType = searchParams.get("id_type") || "All";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = 15;
  const sortBy = searchParams.get("sortBy") || "full_name";
  const sortOrder = searchParams.get("sortOrder") || "asc";
  
  const [seniors, setSeniors] = useState<SeniorRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userBarangay, setUserBarangay] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; name: string; status: string } | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [deceasedTarget, setDeceasedTarget] = useState<{ id: string; name: string } | null>(null);
  const [deathDate, setDeathDate] = useState('');
  const [deathFileUrl, setDeathFileUrl] = useState<string | null>(null);
  const [deathFileName, setDeathFileName] = useState('');
  const [deathNotes, setDeathNotes] = useState('');
  const [deathUploading, setDeathUploading] = useState(false);
  const [deathSubmitting, setDeathSubmitting] = useState(false);
  const [deathDragOver, setDeathDragOver] = useState(false);
  const deathFileRef = useRef<HTMLInputElement>(null);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({ all: 0, Active: 0, Pending: 0, Archived: 0 });

  const applyStatusFilter = (status: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status) {
      params.set('status', status);
    } else {
      params.delete('status');
    }
    params.set('page', '1');
    router.push(`/directory?${params.toString()}`);
  };

  const handleStatusUpdate = async () => {
    if (!confirmAction) return;
    if (!statusReason.trim()) {
      alert('Please provide a reason for this status change.');
      return;
    }
    setActionLoading(true);
    const result = await updateSeniorStatusByBarangay(confirmAction.id, confirmAction.status, statusReason.trim());
    if (result?.error) {
      alert(result.error);
    }
    if (result?.success) setRefreshKey(prev => prev + 1);
    setActionLoading(false);
    setStatusReason('');
    setConfirmAction(null);
  };

  const resetDeceasedModal = () => {
    setDeathDate('');
    setDeathFileUrl(null);
    setDeathFileName('');
    setDeathNotes('');
    if (deathFileRef.current) deathFileRef.current.value = '';
  };

  const validateDeathFile = (file: File): boolean => {
    if (!ACCEPTED_TYPES.includes(file.type) && !/\.(pdf|png|jpe?g)$/i.test(file.name)) {
      alert('Unsupported file type. Only PDF, PNG, or JPG are allowed.');
      return false;
    }
    if (file.size > MAX_FILE_BYTES) {
      alert(`File too large. Maximum size is ${MAX_FILE_MB}MB.`);
      return false;
    }
    return true;
  };

  const handleDeathFile = async (file: File) => {
    if (!validateDeathFile(file)) return;
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "oscalink_scans";
    if (!cloudName) {
      alert('Cloudinary is not configured.');
      return;
    }
    setDeathUploading(true);
    try {
      const isPdfFile = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", uploadPreset);
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/${isPdfFile ? "raw/upload" : "image/upload"}`,
        { method: "POST", body: fd }
      );
      const data = await res.json();
      if (data.secure_url) {
        setDeathFileUrl(data.secure_url);
        setDeathFileName(file.name);
      } else {
        alert('Upload failed: ' + (data.error?.message || 'Unknown error'));
      }
    } catch {
      alert('Upload failed. Please try again.');
    }
    setDeathUploading(false);
  };

  const handleMarkDeceased = async () => {
    if (!deceasedTarget) return;
    if (!deathDate) {
      alert('Please select the date of death.');
      return;
    }
    if (!deathFileUrl) {
      alert('Please upload the scanned Death Certificate.');
      return;
    }
    setDeathSubmitting(true);
    const fd = new FormData();
    fd.append('senior_id', deceasedTarget.id);
    fd.append('date_of_death', deathDate);
    fd.append('file_url', deathFileUrl);
    fd.append('notes', deathNotes);
    const result = await markSeniorDeceased(fd);
    setDeathSubmitting(false);
    if (result?.error) {
      alert(result.error);
    } else {
      setRefreshKey(prev => prev + 1);
      setDeceasedTarget(null);
      resetDeceasedModal();
    }
  };

  useEffect(() => {
    const fetchSeniors = async () => {
      setLoading(true);
      const supabase = createClient();
      const user = await getSharedUser();
      const role = user?.user_metadata?.role;
      const userAssignedBarangay = user?.user_metadata?.barangay;
      
      setUserRole(role ?? null);
      setUserBarangay(userAssignedBarangay ?? null);
      
      let query = supabase
        .from('seniors')
        .select('*', { count: 'exact' })
        .not('status', 'in', '("Transferred","Deceased")');

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      if (search) {
        query = query.ilike('full_name', `%${search}%`);
      }

      if (role === 'barangay_president' && userAssignedBarangay) {
        query = query.eq('barangay', userAssignedBarangay);
      }

      if (idType === 'green') {
        query = query.eq('is_pensioner', true);
      } else if (idType === 'white') {
        query = query.eq('is_pensioner', false);
      }

      if (statusFilter && statusFilter !== 'All') {
        query = query.eq('status', statusFilter);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await query.range(from, to);
      if (!error && data) {
        setSeniors(data);
        setTotalCount(count || 0);
      }
      setLoading(false);
    };

    fetchSeniors();
  }, [search, idType, statusFilter, refreshKey, page, sortBy, sortOrder]);

  useEffect(() => {
    const fetchCounts = async () => {
      const supabase = createClient();
      const user = await getSharedUser();
      const role = user?.user_metadata?.role;
      const userAssignedBarangay = user?.user_metadata?.barangay;

      const countSeniors = async (statuses: string[] | null): Promise<number> => {
        let q = supabase
          .from('seniors')
          .select('id', { count: 'exact', head: true });
        if (role === 'barangay_president' && userAssignedBarangay) {
          q = q.eq('barangay', userAssignedBarangay);
        }
        if (statuses && statuses.length === 1) {
          q = q.eq('status', statuses[0]);
        } else if (statuses && statuses.length > 1) {
          q = q.in('status', statuses);
        }
        const { count } = await q;
        return count || 0;
      };

      const [active, pending, archived] = await Promise.all([
        countSeniors(['Active']),
        countSeniors(['Pending']),
        countSeniors(['Transferred', 'Deceased']),
      ]);
      // Global total stays consistent with the status cards:
      // Total Seniors = Active + Pending + Archived (Transferred + Deceased).
      const all = active + pending + archived;
      setStatusCounts({ all, Active: active, Pending: pending, Archived: archived });
    };
    fetchCounts();
  }, [refreshKey]);

  const mappedSeniors = seniors.map((s) => {
    const requiredFields = [
      s.registration_id,
      s.full_name,
      s.birthdate,
      s.sex,
      s.barangay,
      s.civil_status,
      s.contact_number,
      s.address,
      s.classification,
      s.place_of_birth,
      s.blood_type || s.religion,
      s.philhealth_no || s.sss_no || s.gsis_no || s.pvao_no || s.tin,
      s.emergency_contact_name,
      s.emergency_contact_number,
      s.occupation,
      s.education,
      s.employment_status,
      s.profile_photo_url || s.photo_url,
      s.birth_certificate_url,
    ];
    const filled = requiredFields.filter(v => v != null && v !== '').length;
    const progress = Math.round((filled / requiredFields.length) * 100);

    return {
      id: s.id,
      name: s.full_name || 'Unknown',
      age: (s.age != null && s.age > 0) ? s.age : (s.birthdate ? (() => {
        const birth = new Date(s.birthdate!);
        const today = new Date();
        let a = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a--;
        return a > 0 ? a : 0;
      })() : 0),
      barangay: s.barangay || '',
      purok: s.purok || '',
    status: (s.status as "Pending" | "Active" | "Transferred" | "Deceased" | "Inactive" | "Cancelled" | "Disqualified" | "Disapproved" | "Pending Barangay" | "Pending OSCA" | "Archived") || "Pending",
    registrationId: s.registration_id || '',
    progress,
    lastCheck: s.last_check_in ? new Date(s.last_check_in).toLocaleDateString() : 'N/A',
    contactNumber: s.contact_number,
    address: s.address,
    birthdate: s.birthdate,
    emergencyContact: s.emergency_contact_name
      ? `${s.emergency_contact_name}${s.emergency_contact_number ? ` - ${s.emergency_contact_number}` : ''}`
      : s.emergency_contact,
    emergencyContactName: s.emergency_contact_name,
    emergencyContactNumber: s.emergency_contact_number,
    sex: s.sex,
    religion: s.religion,
    bloodType: s.blood_type,
    education: s.education,
    employmentStatus: s.employment_status,
    classification: s.classification,
    monthlyIncome: s.monthly_income,
    philhealthNo: s.philhealth_no,
    sssNo: s.sss_no,
    gsisNo: s.gsis_no,
    tin: s.tin,
    isBedridden: s.is_bedridden,
    addressUnit: s.address_unit,
    addressBuilding: s.address_building,
    addressLotBlock: s.address_lot_block,
    addressStreet: s.address_street,
    addressSubdivision: s.address_subdivision,
    addressCity: s.address_city,
    addressProvince: s.address_province,
    addressRegion: s.address_region,
    photoUrl: s.profile_photo_url || s.photo_url,
    birth_certificate_url: s.birth_certificate_url,
    voter_id_url: s.voter_id_url,
      digital_signature_url: s.digital_signature_url,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-headline tracking-tighter text-foreground">Seniors Directory</h1>
          <p className="text-outline mt-1">Manage and view all registered senior citizens</p>
        </div>
        {/* OSCA Staff can register a new senior (and mint a Temporary Reference
            Number). The register page itself enforces this role as well. */}
        {userRole === 'osca_staff' && (
          <button
            onClick={() => router.push('/directory/register')}
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-base">add</span>
            New Record
          </button>
        )}
      </div>

      <DirectoryFilters 
        initialSearch={search}
        initialIdType={idType}
        userRole={userRole}
        userBarangay={userBarangay}
        seniorsData={seniors}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { key: 'all', label: 'Total Seniors', value: statusCounts.all, icon: 'group', color: 'text-primary', bg: 'bg-primary/10', active: statusFilter === 'All' },
          { key: 'Active', label: 'Active', value: statusCounts.Active, icon: 'verified', color: 'text-emerald-500', bg: 'bg-emerald-500/10', active: statusFilter === 'Active' },
          { key: 'Pending', label: 'Pending', value: statusCounts.Pending, icon: 'pending', color: 'text-amber-500', bg: 'bg-amber-500/10', active: statusFilter === 'Pending' },
          { key: 'Archived', label: 'Archived', value: statusCounts.Archived, icon: 'archive', color: 'text-slate-500', bg: 'bg-slate-500/10', active: statusFilter === 'Archived' },
        ].map((card) => (
          <button
            key={card.key}
            onClick={() => applyStatusFilter(card.key === 'all' ? null : card.key)}
            className={`text-left rounded-2xl border p-4 transition-all cursor-pointer ${
              card.active
                ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/30 shadow-[0_0_15px_rgba(0,104,55,0.08)]'
                : 'border-outline-variant/20 bg-surface-lowest hover:border-primary/30 hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center`}>
                <span className={`material-symbols-outlined text-base ${card.color}`}>{card.icon}</span>
              </span>
              {card.active && (
                <span className="material-symbols-outlined text-sm text-primary">check_circle</span>
              )}
            </div>
            <p className={`text-xl font-extrabold mt-3 ${card.active ? 'text-primary' : 'text-foreground'}`}>
              {card.value}
            </p>
            <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${card.active ? 'text-primary' : 'text-outline'}`}>
              {card.label}
            </p>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <DirectoryTable 
          seniors={mappedSeniors} 
          onVerify={verifySenior}
          onSuccess={() => setRefreshKey(prev => prev + 1)}
          totalCount={totalCount}
          currentPage={page}
          pageSize={pageSize}
          userRole={userRole}
          onStatusAction={(id, name, status) => {
            if (status === 'Deceased') setDeceasedTarget({ id, name });
            else setConfirmAction({ id, name, status });
          }}
        />
      )}

      {confirmAction && (() => {
        const meta: Record<string, { icon: string; color: string; hint: string }> = {
          Deceased: { icon: 'disabled_by_default', color: 'bg-red-500/10 text-red-400', hint: 'Record is retained as a reference marker (e.g., for Burial Assistance).' },
          Inactive: { icon: 'block', color: 'bg-slate-500/10 text-slate-400', hint: 'Deceased or disqualified from benefits.' },
          Transferred: { icon: 'swap_horiz', color: 'bg-blue-500/10 text-blue-400', hint: 'Moved to the Transferred data bank.' },
        };
        const m = meta[confirmAction.status] || meta.Inactive;
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-lowest rounded-2xl border border-outline-variant/30 shadow-xl max-w-sm w-full mx-4 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${m.color}`}>
                <span className="material-symbols-outlined text-lg">{m.icon}</span>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Mark as {confirmAction.status}</p>
                <p className="text-[11px] text-outline mt-0.5">{m.hint}</p>
              </div>
            </div>
            <p className="text-xs text-outline">
              Are you sure you want to mark <span className="font-bold text-foreground">{confirmAction.name}</span> as <span className="font-bold">{confirmAction.status}</span>?
            </p>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Reason / Indicators <span className="text-red-500">*</span></label>
              <textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                rows={2}
                placeholder={
                  confirmAction.status === 'Deceased' ? 'e.g. Passed away on...' :
                  confirmAction.status === 'Inactive' ? 'e.g. Disqualified — falsified documents' :
                  'e.g. Moved to Davao City'
                }
                className="w-full bg-surface-low border border-outline-variant/30 rounded-lg py-2 px-3 text-xs text-foreground placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none"
              />
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => { setConfirmAction(null); setStatusReason(''); }} disabled={actionLoading} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-outline hover:text-foreground transition-colors disabled:opacity-50">Cancel</button>
              <button onClick={handleStatusUpdate} disabled={actionLoading} className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white rounded-lg transition-colors disabled:opacity-50 ${confirmAction.status === 'Deceased' ? 'bg-red-500 hover:bg-red-600' : confirmAction.status === 'Transferred' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-slate-500 hover:bg-slate-600'}`}>
                {actionLoading ? 'Updating...' : `Confirm ${confirmAction.status}`}
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {deceasedTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => { if (!deathSubmitting) { setDeceasedTarget(null); resetDeceasedModal(); } }}
        >
          <div className="bg-surface-lowest rounded-2xl border border-outline-variant/30 shadow-xl max-w-lg w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg text-red-400">disabled_by_default</span>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Mark as Deceased</p>
                <p className="text-[11px] text-outline mt-0.5">
                  Finalize <span className="font-bold text-foreground">{deceasedTarget.name}</span> — the record leaves the directory and the Death Certificate is filed in the Document Vault.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Date of Death <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={deathDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDeathDate(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Scanned Death Certificate <span className="text-red-500">*</span></label>
              <div
                onDragOver={(e) => { e.preventDefault(); setDeathDragOver(true); }}
                onDragLeave={() => setDeathDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDeathDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleDeathFile(f); }}
                onClick={() => deathFileRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition-all ${deathDragOver ? "border-primary bg-primary/5" : "border-outline-variant/30 hover:border-primary/40"}`}
              >
                <input
                  ref={deathFileRef}
                  type="file"
                  accept=".pdf,image/png,image/jpeg"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleDeathFile(f); e.target.value = ""; }}
                />
                {deathFileUrl ? (
                  <div className="space-y-1">
                    <span className="material-symbols-outlined text-3xl text-emerald-400">check_circle</span>
                    <p className="text-xs font-bold text-foreground">{deathFileName || "File ready"}</p>
                    <p className="text-[10px] text-emerald-400">✓ Uploaded — ready to save</p>
                  </div>
                ) : deathUploading ? (
                  <div className="space-y-1">
                    <span className="material-symbols-outlined text-3xl text-primary animate-pulse">cloud_upload</span>
                    <p className="text-xs text-outline">Uploading certificate...</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <span className="material-symbols-outlined text-3xl text-outline">cloud_upload</span>
                    <p className="text-xs font-bold text-foreground">Drag &amp; drop scanned Death Certificate</p>
                    <p className="text-[10px] text-outline">or click to browse — PDF, PNG, JPG (Max {MAX_FILE_MB}MB)</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Remarks / Cause of Death</label>
              <textarea
                value={deathNotes}
                onChange={(e) => setDeathNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Cause of death, burial details..."
                className={INPUT_CLASS}
              />
            </div>

            <div className="flex items-center gap-2 justify-end pt-1">
              <button
                onClick={() => { setDeceasedTarget(null); resetDeceasedModal(); }}
                disabled={deathSubmitting}
                className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-outline hover:text-foreground transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkDeceased}
                disabled={deathSubmitting || !deathDate || !deathFileUrl}
                title={!deathFileUrl ? "A scanned Death Certificate is required before marking this record as Deceased." : undefined}
                className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              >
                {deathSubmitting ? (
                  <>
                    <span className="animate-spin border-2 border-white/40 border-t-white rounded-full w-3 h-3 inline-block" />
                    Marking...
                  </>
                ) : (
                  'Mark as Deceased'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DirectoryPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <DirectoryContent />
    </Suspense>
  );
}
