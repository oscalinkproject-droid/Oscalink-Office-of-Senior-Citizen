"use client";

import { useState, useEffect } from "react";
import { decideForHeadApproval, getNextSeniorIdSequence } from "@/app/actions/seniors";
import { createClient } from "@/lib/supabase";

interface Senior {
  id: string;
  full_name: string;
  registration_id: string;
  id_number?: string | null;
  birthdate?: string | null;
  age?: number | null;
  sex?: string;
  barangay?: string;
  purok?: string;
  contact_number?: string;
  address?: string;
  place_of_birth?: string;
  occupation?: string;
  classification?: string;
  is_pensioner?: boolean;
  is_voter?: boolean;
  is_bedridden?: boolean;
  is_verified?: boolean;
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
  status?: string;
  decision_reason?: string;
  created_at?: string;
}

interface HeadProfile {
  signature_url?: string | null;
  full_name?: string;
}

type TabKey = 'pending' | 'disapproved' | 'disqualified';

interface ApprovalsClientProps {
  seniors: Senior[];
  headProfile: HeadProfile | null;
}

function Field({ label, value }: { label: string; value?: string | number | boolean | null }) {
  if (value == null || value === '') return null;
  const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value;
  return (
    <div>
      <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">{label}</p>
      <p className="text-sm font-medium text-slate-900 mt-0.5">{display as string}</p>
    </div>
  );
}

export const sanitizeDisplayName = (str: string): string => {
  if (!str) return '';

  const parts = str.split(',').map((s) => s.trim()).filter(Boolean);

  if (parts.length <= 1) return str;

  const lastName = parts[0];

  const possibleSuffixes = ['sr', 'sr.', 'jr', 'jr.', 'i', 'ii', 'iii', 'iv', 'v'];
  const lastPart = parts[parts.length - 1];
  const hasSuffix = possibleSuffixes.includes(lastPart.toLowerCase());

  if (hasSuffix && parts.length > 2) {
    const suffix = parts.pop();
    const middleAndFirst = parts.slice(1).join(' ');
    return `${lastName}, ${middleAndFirst}, ${suffix}`;
  }

  const restOfName = parts.slice(1).join(' ');
  return `${lastName}, ${restOfName}`;
};

// Detect whether an uploaded document URL points to a PDF (e.g. Cloudinary raw
// uploads use /raw/upload/ and/or a .pdf extension).
const isPdfUrl = (url?: string | null): boolean => {
  if (!url) return false;
  const u = url.toLowerCase();
  return u.endsWith('.pdf') || u.includes('/raw/upload/') || u.includes('.pdf?');
};

// Records in the Pending tab are awaiting head approval (FOR_HEAD_APPROVAL), so
// the display identifier is always the REF-... number minted when OSCA Staff
// completed the pre-registration.
function displayIdentifier(s: Senior): string {
  return s.registration_id || 'REF-PENDING';
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// 'YYYY-MM-DD' -> 'YYYYMMDD' (the date part used inside OSC-YYYYMMDD-####).
const datePartFromISO = (iso: string): string => iso.replace(/-/g, '').slice(0, 8);

const TAB_DEFS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'pending', label: 'Pending', icon: 'schedule' },
  { key: 'disapproved', label: 'Disapproved', icon: 'thumb_down' },
  { key: 'disqualified', label: 'Disqualified', icon: 'block' },
];

export function ApprovalsClient({ seniors: initialSeniors, headProfile }: ApprovalsClientProps) {
  const supabase = createClient();
  const [seniors, setSeniors] = useState<Senior[]>(initialSeniors);
  const [tab, setTab] = useState<TabKey>('pending');
  const [selected, setSelected] = useState<Senior | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [reasonModal, setReasonModal] = useState<{ mode: 'disapprove' | 'disqualify' } | null>(null);
  const [reason, setReason] = useState('');
  const [pii, setPii] = useState<{ seniorId: string; data: { contact_number?: string | null; address?: string | null } | null } | null>(null);
  // Viewer state for uploaded documents (image/pdf lightbox opened by OSCA Head).
  const [documentPreview, setDocumentPreview] = useState<{ url: string; label: string } | null>(null);
  // ID issuance state — only used while reviewing a FOR_HEAD_APPROVAL record.
  const [issueDate, setIssueDate] = useState(todayISO());
  const [idNumber, setIdNumber] = useState('');

  const pendingList = seniors.filter((s) => s.status === 'FOR_HEAD_APPROVAL');
  const disapprovedList = seniors.filter((s) => s.status === 'Disapproved');
  const disqualifiedList = seniors.filter((s) => s.status === 'Disqualified');
  const listForTab: Record<TabKey, Senior[]> = {
    pending: pendingList,
    disapproved: disapprovedList,
    disqualified: disqualifiedList,
  };

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    supabase
      .rpc('decrypt_senior_pii', { p_senior_id: selected.id })
      .then(
        ({ data }) => { if (!cancelled) setPii({ seniorId: selected.id, data: (data ?? null) as { contact_number?: string | null; address?: string | null } | null }); },
        () => {}
      );
    return () => { cancelled = true; };
  }, [selected, supabase]);

  const piiForSelected = pii && pii.seniorId === selected?.id ? pii.data : null;

  useEffect(() => {
    const channel = supabase
      .channel('approvals-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seniors' }, () => {
        supabase
          .from('seniors')
          .select('*')
          .in('status', ['FOR_HEAD_APPROVAL', 'Disapproved', 'Disqualified'])
          .order('created_at', { ascending: false })
          .then(({ data }) => {
            if (!data) return;
            const refreshed = data as Senior[];
            setSeniors(refreshed);
            // Keep the right-hand panel in sync with the freshest copy of the
            // selected record, or close it if the record left the queue entirely.
            setSelected((current) => {
              if (!current) return null;
              return refreshed.find((s) => s.id === current.id) || null;
            });
          });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Re-mint a preview OSCA ID whenever the issue date or selected record changes.
  useEffect(() => {
    if (selected?.status !== 'FOR_HEAD_APPROVAL') return;
    let cancelled = false;
    const d = datePartFromISO(issueDate);
    getNextSeniorIdSequence(d).then((res) => {
      if (cancelled) return;
      setIdNumber(res && res.success && res.sequence ? `OSC-${d}-${res.sequence}` : `OSC-${d}-####`);
    });
    return () => { cancelled = true; };
  }, [selected?.id, selected?.status, issueDate]);

  const switchTab = (key: TabKey) => {
    setTab(key);
    const first = listForTab[key][0] ?? null;
    setSelected(first);
  };

  const activeList = listForTab[tab];

  const handleApprove = async (id: string) => {
    const candidate = idNumber.trim().toUpperCase();
    if (!/^OSC-\d{8}-\d{4}$/.test(candidate)) {
      setMessage({ type: 'error', text: 'OSCA ID must follow the format OSC-YYYYMMDD-#### before approving.' });
      return;
    }
    setActing(id);
    const result = await decideForHeadApproval(id, 'approve', { idNumber: candidate, idIssueDate: issueDate });
    if (result?.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({ type: 'success', text: `Pre-registration approved — record finalized with OSCA ID ${candidate}.` });
      setSeniors((prev) => prev.filter((s) => s.id !== id));
      setSelected(null);
    }
    setActing(null);
  };

  const openReasonModal = (mode: 'disapprove' | 'disqualify') => {
    setReason('');
    setReasonModal({ mode });
  };

  const handleDecideWithReason = async (id: string, mode: 'disapprove' | 'disqualify') => {
    if (!reason.trim()) {
      setMessage({ type: 'error', text: `Please provide a reason for this ${mode === 'disapprove' ? 'disapproval' : 'disqualification'}.` });
      return;
    }
    setActing(id);
    const result = await decideForHeadApproval(id, mode, { reason });
    if (result?.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      const newStatus = mode === 'disapprove' ? 'Disapproved' : 'Disqualified';
      setMessage({
        type: 'success',
        text: mode === 'disapprove'
          ? 'Pre-registration disapproved. The record now has status Disapproved.'
          : 'Pre-registration disqualified. The record now has status Disqualified.',
      });
      setSeniors((prev) => prev.map((s) => (s.id === id ? { ...s, status: newStatus, decision_reason: reason.trim() } : s)));
      setSelected((current) => (current?.id === id ? { ...current, status: newStatus, decision_reason: reason.trim() } : current));
      setReason('');
      setReasonModal(null);
    }
    setActing(null);
  };

  const isPending = selected?.status === 'FOR_HEAD_APPROVAL';

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-3 rounded-xl text-xs font-bold border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          {message.text}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 rounded-full bg-surface-low border border-outline-variant/30 p-1">
          {TAB_DEFS.map((t) => {
            const count = listForTab[t.key].length;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => switchTab(t.key)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all ${active ? 'bg-primary text-white shadow-sm' : 'text-outline hover:text-foreground'}`}
              >
                <span className="material-symbols-outlined text-sm">{t.icon}</span>
                {t.label}
                <span className={`min-w-[18px] h-[18px] rounded-full px-1.5 inline-flex items-center justify-center text-[10px] font-bold ${active ? 'bg-white/20 text-white' : 'bg-outline/10 text-outline'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <span className="text-[11px] font-bold text-outline bg-surface-low border border-outline-variant/20 rounded-lg px-3 py-2">
          {activeList.length} record{activeList.length !== 1 ? 's' : ''} in this tab
        </span>
      </div>

      {activeList.length === 0 ? (
        <div className="text-center py-12 text-outline text-sm">
          {tab === 'pending'
            ? 'No pre-registrations awaiting your approval. Completed records forwarded by OSCA Staff will appear here.'
            : tab === 'disapproved'
              ? 'No disapproved records to review.'
              : 'No disqualified records to review.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* List */}
          <div className="bg-surface-lowest rounded-2xl border border-outline-variant/30 overflow-hidden">
            <div className="p-4 border-b border-outline-variant/30">
              <h3 className="font-headline font-bold text-foreground text-sm">{TAB_DEFS.find((t) => t.key === tab)?.label}</h3>
              <p className="text-[10px] text-outline mt-0.5">{activeList.length} record{activeList.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="divide-y divide-outline-variant/10 max-h-[70vh] overflow-y-auto">
              {activeList.map(s => (
                <div
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className={`p-4 flex items-center gap-3 cursor-pointer transition-colors ${selected?.id === s.id ? 'bg-primary/5 border-l-2 border-primary' : 'hover:bg-surface-high'}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm ring-1 ring-primary/20">
                    {(sanitizeDisplayName(s.full_name) || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{sanitizeDisplayName(s.full_name)}</p>
                    <p className="text-[10px] text-outline font-mono">
                      {displayIdentifier(s)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {s.is_verified ? (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">Verified</span>
                    ) : (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Pending</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detail */}
          {selected ? (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col max-h-[80vh]">
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="font-headline font-bold text-slate-900 text-base">{sanitizeDisplayName(selected.full_name)}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500 font-mono">{displayIdentifier(selected)}</span>
                    {selected.status && (
                      <span className="inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold bg-violet-100 text-violet-700">
                        {selected.status}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="material-symbols-outlined text-slate-400 hover:text-slate-700 text-lg">close</button>
              </div>

              {/* Scrollable body */}
              <div className="p-5 space-y-5 overflow-y-auto approval-scroll">
                {/* Personal Information */}
                <section className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-base">badge</span>
                    Personal Information
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-4">
                    <Field label="Reg ID" value={displayIdentifier(selected)} />
                    <Field label="Age" value={selected.age} />
                    <Field label="Sex" value={selected.sex === 'M' ? 'Male' : selected.sex === 'F' ? 'Female' : selected.sex} />
                    <Field label="Birthday" value={selected.birthdate} />
                    <Field label="Classification" value={selected.classification} />
                    <Field label="Voter" value={selected.is_voter} />
                    <Field label="Pensioner" value={selected.is_pensioner} />
                    <Field label="Bedridden" value={selected.is_bedridden} />
                  </div>
                </section>

                {/* Contact Details & Address */}
                <section className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-base">contact_phone</span>
                    Contact Details &amp; Address
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
                    <Field label="Address" value={piiForSelected?.address ?? selected.address} />
                    <Field label="Phone Number" value={piiForSelected?.contact_number ?? selected.contact_number} />
                  </div>
                </section>

                {/* Emergency Contact */}
                {(selected.emergency_contact_name || selected.emergency_contact_number) && (
                  <section className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-400 text-base">emergency</span>
                      Emergency Contact
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-4">
                      <Field label="Name" value={selected.emergency_contact_name} />
                      <Field label="Relationship" value={selected.emergency_contact_relationship} />
                      <Field label="Phone Number" value={selected.emergency_contact_number} />
                    </div>
                  </section>
                )}

                {/* Documents */}
                <section className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-base">folder_open</span>
                    Uploaded Documents
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { url: selected.profile_photo_url, label: 'Profile Photo' },
                      { url: selected.birth_certificate_url, label: 'Birth Certificate' },
                      { url: selected.voter_id_url, label: "Voter's ID" },
                      { url: selected.digital_signature_url, label: 'Signature' },
                      { url: selected.thumbmark_url, label: 'Thumbmark' },
                    ].filter(d => d.url).map((doc) => (
                      <button
                        key={doc.label}
                        type="button"
                        onClick={() => setDocumentPreview({ url: doc.url!, label: doc.label })}
                        className="group text-left overflow-hidden bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
                      >
                        <div className="relative overflow-hidden aspect-[4/3]">
                          {isPdfUrl(doc.url) ? (
                            <embed src={doc.url!} type="application/pdf" className="w-full h-full object-cover pointer-events-none bg-slate-50" />
                          ) : (
                            <img
                              src={doc.url!}
                              alt={doc.label}
                              className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${doc.label === 'Signature' || doc.label === 'Thumbmark' ? 'object-contain bg-white p-2' : ''}`}
                              crossOrigin="anonymous"
                            />
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1">
                            <span className="material-symbols-outlined text-white text-2xl">zoom_in</span>
                            <span className="text-[11px] font-semibold text-white">Click to Expand/Preview</span>
                          </div>
                        </div>
                        <div className="px-3 py-2 flex items-center justify-between gap-2 border-t border-slate-100">
                          <span className="text-xs font-medium text-slate-700 truncate">{doc.label}</span>
                          <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">Verified</span>
                        </div>
                      </button>
                    ))}
                    {!selected.profile_photo_url && !selected.birth_certificate_url && !selected.voter_id_url && !selected.digital_signature_url && !selected.thumbmark_url && (
                      <p className="text-xs text-slate-500 col-span-full">No documents uploaded for this application.</p>
                    )}
                  </div>
                </section>

                {/* ID Issuance — only while approving a FOR_HEAD_APPROVAL record */}
                {isPending && (
                  <section className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-400 text-base">badge</span>
                      ID Issuance (OSC-YYYYMMDD-####)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          Issue Date
                        </label>
                        <input
                          type="date"
                          value={issueDate}
                          onChange={(e) => setIssueDate(e.target.value || todayISO())}
                          className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary/40"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          OSCA ID Number
                        </label>
                        <input
                          type="text"
                          value={idNumber}
                          onChange={(e) => setIdNumber(e.target.value.toUpperCase())}
                          placeholder="OSC-YYYYMMDD-####"
                          className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 font-mono text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary/40"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">info</span>
                      Auto-generated from the issue date. Approving finalizes the record with this OSCA ID.
                    </p>
                  </section>
                )}

                {/* Head signature status */}
                {!headProfile?.signature_url && isPending && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-500 text-sm">warning</span>
                    <p className="text-xs text-amber-700">OSCA Head signature not uploaded. ID cards will use typed name as fallback.</p>
                  </div>
                )}

                {/* Decision reason for already-decided records */}
                {(selected.status === 'Disapproved' || selected.status === 'Disqualified') && (
                  <div className="p-4 rounded-xl border bg-amber-50 border-amber-200">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                      Decision Reason
                    </p>
                    <p className="text-sm text-slate-900 mt-1">{selected.decision_reason || 'No reason recorded.'}</p>
                  </div>
                )}
              </div>

              {/* Fixed/sticky action footer */}
              <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 space-y-3">
                {isPending ? (
                  <>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Head Decision</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        onClick={() => handleApprove(selected.id)}
                        disabled={acting === selected.id}
                        className="py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-medium shadow-sm transition-colors flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-base">verified</span>
                        {acting === selected.id ? 'Approving...' : 'Approve - Issue ID'}
                      </button>
                      <button
                        onClick={() => openReasonModal('disapprove')}
                        disabled={acting === selected.id}
                        className="py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-medium shadow-sm transition-colors flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-base">thumb_down</span>
                        Disapprove
                      </button>
                      <button
                        onClick={() => openReasonModal('disqualify')}
                        disabled={acting === selected.id}
                        className="py-2.5 px-4 rounded-lg bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-medium shadow-sm transition-colors flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-base">block</span>
                        Disqualify
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Reviewing only: records, IDs, and field edits are handled by OSCA Staff. Approve issues the OSCA ID and finalizes the record.
                    </p>
                  </>
                ) : (
                  <p className="text-[10px] text-slate-400">
                    This record was already decided{selected.status ? ` (status: ${selected.status})` : ''} by the OSCA Head.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-center p-12 text-slate-500 text-sm">
              Select a record from the list to review
            </div>
          )}
        </div>
      )}

      {/* Disapprove / Disqualify reason modal */}
      {reasonModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-surface-lowest rounded-2xl border border-outline-variant/30 shadow-xl max-w-md w-full mx-4 p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-400 text-lg">{reasonModal.mode === 'disapprove' ? 'thumb_down' : 'block'}</span>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {reasonModal.mode === 'disapprove' ? 'Disapprove' : 'Disqualify'} Pre-Registration
                </p>
                <p className="text-[11px] text-outline mt-0.5">{selected.full_name}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-outline">
                {reasonModal.mode === 'disapprove' ? 'Disapproval reason' : 'Disqualification reason'}
                <span className="text-red-500"> *</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={reasonModal.mode === 'disapprove' ? 'e.g. Missing birth certificate, fake requirement' : 'e.g. Duplicate or non-resident entry'}
                rows={3}
                className="w-full bg-surface-low border border-outline-variant/30 rounded-lg py-2 px-3 text-xs text-foreground placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setReasonModal(null)} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-outline hover:text-foreground transition-colors">
                Cancel
              </button>
              <button
                onClick={() => handleDecideWithReason(selected.id, reasonModal.mode)}
                disabled={acting === selected.id}
                className="px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-white rounded-lg bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {acting === selected.id ? 'Processing...' : `Confirm ${reasonModal.mode === 'disapprove' ? 'Disapprove' : 'Disqualify'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Uploaded document viewer (image/PDF lightbox) */}
      {documentPreview && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setDocumentPreview(null)}
        >
          <div
            className="bg-surface-lowest rounded-2xl border border-outline-variant/30 w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/20">
              <div>
                <p className="text-sm font-bold text-foreground">{documentPreview.label}</p>
                <p className="text-[10px] text-outline mt-0.5">{selected?.full_name}</p>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={documentPreview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest text-primary border border-primary/30 hover:bg-primary/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                  Open in new tab
                </a>
                <button
                  onClick={() => setDocumentPreview(null)}
                  className="material-symbols-outlined text-outline hover:text-foreground text-lg"
                  aria-label="Close preview"
                >
                  close
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-auto bg-surface-high/30">
              {isPdfUrl(documentPreview.url) ? (
                <iframe
                  src={documentPreview.url}
                  title={documentPreview.label}
                  className="w-full h-full min-h-[60vh]"
                />
              ) : (
                <div className="flex items-center justify-center h-full min-h-[60vh]">
                  <img
                    src={documentPreview.url}
                    alt={documentPreview.label}
                    className="max-w-full max-h-full object-contain"
                    crossOrigin="anonymous"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}