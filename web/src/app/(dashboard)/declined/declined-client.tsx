"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

interface DeclinedSenior {
  id: string;
  registration_id: string | null;
  full_name: string | null;
  sex: string | null;
  age: number | null;
  barangay: string | null;
  purok?: string | null;
  status: string | null;
  decision_reason: string | null;
  disapproved_at: string | null;
  disqualified_at: string | null;
  created_at: string | null;
}

const INPUT_CLASS =
  "w-full bg-surface-low border border-outline-variant/30 rounded-xl py-2.5 px-4 text-xs text-foreground placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary/40";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function statusMeta(status: string | null): { label: string; badge: string } {
  if ((status || "").toLowerCase() === "disqualified") {
    return {
      label: "Disqualified",
      badge: "bg-red-500/10 text-red-400 border-red-500/20",
    };
  }
  return {
    label: "Disapproved",
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };
}

export function DeclinedClient({ seniors: initialSeniors }: { seniors: DeclinedSenior[] }) {
  const router = useRouter();
  const [seniors] = useState<DeclinedSenior[]>(initialSeniors);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [barangayFilter, setBarangayFilter] = useState("All");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const barangayOptions = useMemo(
    () => Array.from(new Set(seniors.map((s) => s.barangay).filter((b): b is string => !!b))).sort(),
    [seniors]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return seniors.filter((s) => {
      if (statusFilter !== "All" && (s.status || "") !== statusFilter) return false;
      if (barangayFilter !== "All" && s.barangay !== barangayFilter) return false;
      if (term) {
        const haystack = `${s.full_name ?? ""} ${s.registration_id ?? ""} ${s.barangay ?? ""} ${s.decision_reason ?? ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [seniors, search, statusFilter, barangayFilter]);

  const handleEdit = async (id: string) => {
    setEditError(null);
    setEditingId(id);
    const supabase = createClient();
    const { data, error } = await supabase.from("seniors").select("status").eq("id", id).maybeSingle();
    if (error || !data) {
      setEditError("Could not verify this record. Please try again.");
      setEditingId(null);
      return;
    }
    const st = (data.status || "").toLowerCase();
    if (st !== "disapproved" && st !== "disqualified") {
      setEditError("This application is no longer declined and cannot be edited here.");
      setEditingId(null);
      return;
    }
    router.push(`/directory/register?edit=${id}`);
  };

  const counts = useMemo(() => {
    const disapproved = seniors.filter((s) => (s.status || "").toLowerCase() === "disapproved").length;
    const disqualified = seniors.filter((s) => (s.status || "").toLowerCase() === "disqualified").length;
    return { disapproved, disqualified, total: seniors.length };
  }, [seniors]);

  return (
    <div className="space-y-6">
      {editError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-400">
          {editError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { key: "total", label: "Total Declined", value: counts.total, icon: "block", color: "text-primary", bg: "bg-primary/10" },
          { key: "disapproved", label: "Disapproved", value: counts.disapproved, icon: "warning", color: "text-amber-500", bg: "bg-amber-500/10" },
          { key: "disqualified", label: "Disqualified", value: counts.disqualified, icon: "disabled_by_default", color: "text-red-500", bg: "bg-red-500/10" },
        ].map((card) => (
          <button
            key={card.key}
            onClick={() => setStatusFilter(card.key === "total" ? "All" : card.key === "disapproved" ? "Disapproved" : "Disqualified")}
            className={`text-left rounded-2xl border p-4 transition-all cursor-pointer ${
              statusFilter === (card.key === "total" ? "All" : card.key === "disapproved" ? "Disapproved" : "Disqualified")
                ? "border-primary/60 bg-primary/5 ring-1 ring-primary/30"
                : "border-outline-variant/20 bg-surface-lowest hover:border-primary/30 hover:shadow-md"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center`}>
                <span className={`material-symbols-outlined text-base ${card.color}`}>{card.icon}</span>
              </span>
            </div>
            <p className="text-xl font-extrabold mt-3 text-foreground">{card.value}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5 text-outline">{card.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-surface-lowest rounded-2xl border border-outline-variant/20 p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px]">
          <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Search</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, REF number, barangay, or reason..."
            className={INPUT_CLASS}
          />
        </div>
        <div className="w-44">
          <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={INPUT_CLASS}>
            <option value="All">All Statuses</option>
            <option value="Disapproved">Disapproved</option>
            <option value="Disqualified">Disqualified</option>
          </select>
        </div>
        <div className="w-44">
          <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Barangay</label>
          <select value={barangayFilter} onChange={(e) => setBarangayFilter(e.target.value)} className={INPUT_CLASS}>
            <option value="All">All Barangays</option>
            {barangayOptions.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
        <div className="px-5 py-4 border-b border-outline-variant/10 flex items-center justify-between">
          <h3 className="font-headline font-bold text-foreground text-sm">
            Declined Applications
            <span className="ml-2 text-[10px] font-bold text-outline uppercase">{filtered.length} of {seniors.length}</span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant/10 text-[10px] uppercase tracking-widest text-outline">
                <th className="px-5 py-3 font-bold">Registration ID</th>
                <th className="px-5 py-3 font-bold">Full Name</th>
                <th className="px-5 py-3 font-bold">Status</th>
                <th className="px-5 py-3 font-bold">Barangay</th>
                <th className="px-5 py-3 font-bold">Decision Date</th>
                <th className="px-5 py-3 font-bold">Reason</th>
                <th className="px-5 py-3 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-outline text-sm">
                    No declined records found.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const meta = statusMeta(r.status);
                  return (
                    <tr key={r.id} className="hover:bg-surface-low/60 transition-colors">
                      <td className="px-5 py-3 font-mono text-[11px] text-outline">{r.registration_id || "—"}</td>
                      <td className="px-5 py-3">
                        <p className="text-xs font-bold text-foreground">{r.full_name || "—"}</p>
                        <p className="text-[10px] text-outline">{r.sex === "M" ? "Male" : r.sex === "F" ? "Female" : r.sex || ""}{r.age ? ` · ${r.age} y/o` : ""}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-block text-[9px] px-2 py-0.5 rounded-full border font-bold ${meta.badge}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{r.barangay || "—"}{r.purok ? `, ${r.purok}` : ""}</td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {formatDate((r.status || "").toLowerCase() === "disapproved" ? r.disapproved_at : r.disqualified_at)}
                      </td>
                      <td className="px-5 py-3 text-[11px] text-outline max-w-[240px]">{r.decision_reason || "—"}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => handleEdit(r.id)}
                          disabled={editingId === r.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[10px] font-bold hover:bg-primary/20 transition-colors disabled:opacity-60"
                        >
                          {editingId === r.id ? (
                            <>
                              <span className="animate-spin rounded-full h-3 w-3 border-2 border-primary/30 border-t-primary" />
                              Checking...
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-[12px]">edit_square</span>
                              Edit / Update Application
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] text-outline">
        Editing a declined application opens the original registration form pre-filled with the senior&apos;s submitted data. Saving resubmits the corrected application to the OSCA Head for a new review.
      </p>
    </div>
  );
}