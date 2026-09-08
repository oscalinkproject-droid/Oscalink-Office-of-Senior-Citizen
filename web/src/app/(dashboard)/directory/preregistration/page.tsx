'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { StatusBadge } from "@/components/ui/data-display";
import { useToast } from "@/components/ui/toast";
import { verifyAndForwardPreRegistration } from "@/app/actions/seniors";
import { ClipboardList, Search, RefreshCw, ArrowRight, BadgeCheck } from "lucide-react";

interface PreRegistration {
  id: string;
  registration_id: string | null;
  full_name: string | null;
  birthdate: string | null;
  contact_number: string | null;
  barangay: string | null;
  purok: string | null;
  status: string | null;
  created_at: string | null;
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function PreRegistrationsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<PreRegistration[]>([]);
  const [query, setQuery] = useState("");
  const [barangay, setBarangay] = useState("");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      const role = user?.user_metadata?.role;
      if (role !== 'osca_staff' && role !== 'super_admin') {
        router.replace('/directory');
      } else {
        setAuthorized(true);
      }
    });
  }, [router]);

  const loadRecords = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('seniors')
      .select('id, registration_id, full_name, birthdate, contact_number, barangay, purok, status, created_at')
      .eq('status', 'Pending')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setRecords(data as PreRegistration[]);
    } else {
      console.error('[PREREG] Fetch error:', error);
    }
  }, []);

  useEffect(() => {
    if (!authorized) return;
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from('seniors')
      .select('id, registration_id, full_name, birthdate, contact_number, barangay, purok, status, created_at')
      .eq('status', 'Pending')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) {
          setRecords(data as PreRegistration[]);
        } else {
          console.error('[PREREG] Fetch error:', error);
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [authorized]);

  const barangays = useMemo(
    () => Array.from(new Set(records.map(r => r.barangay).filter(Boolean))) as string[],
    [records]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter(r => {
      if (barangay && r.barangay !== barangay) return false;
      if (!q) return true;
      const searchable = [
        r.full_name,
        r.registration_id,
        r.contact_number,
        r.purok,
        r.barangay,
      ].filter(Boolean).join(' ').toLowerCase();
      return searchable.includes(q);
    });
  }, [records, query, barangay]);

  const handleVerify = useCallback(async (id: string) => {
    if (verifyingId) return;
    setVerifyingId(id);
    const result = await verifyAndForwardPreRegistration(id);
    setVerifyingId(null);

    if (result?.error) {
      toast(result.error, 'error');
      return;
    }

    toast(`${result.senior?.full_name || 'Record'} verified — a reference number was generated and forwarded to the OSCA Head.`, 'success');
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }, [verifyingId, toast]);

  if (!authorized) return null;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold font-headline tracking-tighter text-foreground">Pre-Registrations</h1>
          <p className="text-outline mt-1 text-sm">
            Applications submitted by seniors from the Mobile App — complete the record and forward it to the OSCA Head for approval.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setLoading(true); loadRecords().then(() => setLoading(false)); }}
            className="px-4 py-2.5 rounded-xl bg-surface-low border border-outline-variant/30 text-xs font-bold text-outline hover:text-foreground transition-all inline-flex items-center gap-2"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by Name or Barangay..."
            className="w-full bg-surface-low border border-outline-variant/30 rounded-xl py-2.5 pl-9 pr-4 text-xs text-foreground placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
        <select
          value={barangay}
          onChange={(e) => setBarangay(e.target.value)}
          className="bg-surface-low border border-outline-variant/30 rounded-xl py-2.5 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
        >
          <option value="">All Barangays</option>
          {barangays.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <span className="ml-auto text-[11px] font-bold text-outline bg-surface-low border border-outline-variant/20 rounded-lg px-3 py-2">
          {filtered.length} of {records.length}
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-xs text-outline">Loading pre-registrations...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <div className="h-16 w-16 rounded-2xl bg-surface-low border border-outline-variant/20 flex items-center justify-center">
            <ClipboardList size={28} className="text-outline" />
          </div>
          <p className="text-sm font-bold text-foreground">No PENDING pre-registrations</p>
          <p className="text-xs text-outline max-w-sm">
            New applications submitted from the Mobile App will appear here for verification. Verified records are forwarded to the OSCA Head for approval.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-lowest shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant/20 bg-surface-low/60">
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-outline">Senior</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-outline">Provisional Ref</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-outline">Barangay</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-outline">Contact</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-outline">Submitted</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-outline">Status</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-outline text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-surface-low/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-xs font-bold text-foreground">{r.full_name || 'Unnamed'}</p>
                      <p className="text-[10px] text-outline mt-0.5">
                        {r.birthdate ? formatDate((r.birthdate || '').slice(0, 10)) : '—'}{r.purok ? ` · ${r.purok}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] text-outline">{r.registration_id || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground">{r.barangay || '—'}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-outline">{r.contact_number || '—'}</td>
                    <td className="px-4 py-3 text-xs text-outline">{formatDate(r.created_at)}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status || 'Pending'} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleVerify(r.id)}
                          disabled={verifyingId === r.id}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-[11px] font-bold transition-all"
                        >
                          <BadgeCheck size={13} />
                          {verifyingId === r.id ? 'Verifying...' : 'Save / Verify'}
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push(`/directory/register?prefill=${r.id}`)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-white text-[11px] font-bold hover:bg-primary/90 transition-all"
                        >
                          Review / Edit Record
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}