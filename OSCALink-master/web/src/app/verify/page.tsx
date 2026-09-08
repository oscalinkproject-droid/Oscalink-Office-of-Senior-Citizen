"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface VerifyResult {
  verified?: boolean;
  active?: boolean;
  error?: string;
  reason?: string;
  full_name?: string;
  id_number?: string;
  status?: string;
  barangay?: string;
}

const STATUS_COLOR: Record<string, string> = {
  Active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  Pending: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  "Pending Barangay": "bg-amber-500/10 text-amber-400 border-amber-500/30",
  "Pending OSCA": "bg-amber-500/10 text-amber-400 border-amber-500/30",
  Inactive: "bg-red-500/10 text-red-400 border-red-500/30",
  Deceased: "bg-red-500/10 text-red-400 border-red-500/30",
  Disqualified: "bg-red-500/10 text-red-400 border-red-500/30",
  Disapproved: "bg-red-500/10 text-red-400 border-red-500/30",
  Cancelled: "bg-slate-500/10 text-slate-400 border-slate-500/30",
  Transferred: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  Archived: "bg-slate-500/10 text-slate-400 border-slate-500/30",
};

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyContent />
    </Suspense>
  );
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code") || "";
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [verifiedFor, setVerifiedFor] = useState("");

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    fetch(`/api/verify?code=${encodeURIComponent(code)}`)
      .then((res) => res.json())
      .then((data: VerifyResult) => {
        if (!cancelled) {
          setResult(data);
          setVerifiedFor(code);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResult({ verified: false, error: "Unable to reach the verification service. Please try again." });
          setVerifiedFor(code);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const loading = code !== "" && verifiedFor !== code;

  const statusBadge = result?.status ? STATUS_COLOR[result.status] : "bg-slate-500/10 text-slate-400";

  return (
    <main className="min-h-screen bg-[#f6f8f7] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-2xl">verified_user</span>
          </div>
          <h1 className="text-2xl font-extrabold font-headline tracking-tight text-slate-900">OSCALink Member Verification</h1>
          <p className="text-sm text-slate-500 mt-1">Office for Senior Citizen Affairs · Cotabato City</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          {!code ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-red-500">cancel</span>
              </div>
              <p className="text-sm font-bold text-slate-800">Missing Verification Code</p>
              <p className="text-xs text-slate-500">
                Please scan a valid OSCALink ID QR code to verify a senior citizen membership.
              </p>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
              <p className="text-xs text-slate-500">Verifying membership status...</p>
            </div>
          ) : !result ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-red-500">cancel</span>
              </div>
              <p className="text-sm font-bold text-slate-800">Membership Not Verified</p>
              <p className="text-xs text-slate-500">No verification response was received from the service.</p>
            </div>
          ) : result.error || result.reason === "not_found" ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-red-500">cancel</span>
              </div>
              <p className="text-sm font-bold text-slate-800">Membership Not Verified</p>
              <p className="text-xs text-slate-500">
                {result.error || "No senior citizen record matches this code."}
              </p>
            </div>
          ) : result.active ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-emerald-500">verified</span>
              </div>
              <p className="text-sm font-bold text-emerald-600">ACTIVE MEMBER</p>
              <div className="border-t border-slate-100 pt-4 space-y-2 text-left">
                <Field label="Name" value={result.full_name} />
                <Field label="ID Number" value={result.id_number} />
                <Field label="Barangay" value={result.barangay} />
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</p>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusBadge}`}>
                    {result.status}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-amber-500">pending</span>
              </div>
              <p className="text-sm font-bold text-amber-600">Membership Not Active</p>
              <p className="text-xs text-slate-500">
                This record exists but is currently <span className="font-bold">{result?.status || "not active"}</span>. Please contact the OSCA office for assistance.
              </p>
              <div className="border-t border-slate-100 pt-4 space-y-2 text-left">
                <Field label="Name" value={result.full_name} />
                <Field label="ID Number" value={result.id_number} />
                <Field label="Barangay" value={result.barangay} />
              </div>
            </div>
          )}

          {code && !loading && !result?.error && (
            <p className="text-[9px] text-slate-400 text-center border-t border-slate-100 pt-4">
              Verification performed on <span className="font-bold">{new Date().toLocaleString()}</span> via the OSCALink public verification service.
            </p>
          )}
        </div>

        <p className="text-center text-[10px] text-slate-400 mt-6">
          OSCALink · Office for Senior Citizen Affairs · Cotabato City, BARMM
        </p>
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-xs font-semibold text-slate-800 text-right break-all">{value || "—"}</p>
    </div>
  );
}