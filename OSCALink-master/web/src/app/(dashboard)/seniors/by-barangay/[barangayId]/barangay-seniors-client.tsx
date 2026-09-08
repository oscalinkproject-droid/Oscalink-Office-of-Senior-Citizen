"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { generatePDF, generateExcel } from "@/lib/exports";
import { useToast } from "@/components/ui/toast";
import { SeniorDetailModal } from "@/components/ui/senior-detail-modal";
import { normalizeOscaId } from "@/lib/os-id";

interface SeniorRow {
  id: string;
  registration_id: string | null;
  full_name: string | null;
  sex: string | null;
  status: string | null;
  is_pensioner: boolean | null;
  contact_number: string | null;
  purok: string | null;
}

interface Props {
  barangay: string;
  seniors: SeniorRow[];
}

const STATUS_OPTIONS = ["All", "Active", "Inactive", "Cancelled", "Pending"];
const ID_TYPE_OPTIONS = ["All", "Green (Pensioner)", "White (Non-Pensioner)"];

function idTypeLabel(pensioner: boolean | null): string {
  return pensioner ? "Green" : "White";
}

function idTypeFull(pensioner: boolean | null): string {
  return pensioner ? "Green (Pensioner)" : "White (Non-Pensioner)";
}

export function BarangaySeniorsClient({ barangay, seniors }: Props) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [idTypeFilter, setIdTypeFilter] = useState("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return seniors.filter((s) => {
      if (statusFilter !== "All" && s.status !== statusFilter) return false;
      const type = idTypeFilter === "All" ? null : idTypeFilter.startsWith("Green");
      if (type !== null && Boolean(s.is_pensioner) !== type) return false;
      if (term) {
        const haystack = `${s.full_name ?? ""} ${s.registration_id ?? ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [seniors, search, statusFilter, idTypeFilter]);

  const counts = useMemo(
    () => ({
      total: seniors.length,
      active: seniors.filter((s) => s.status === "Active").length,
      green: seniors.filter((s) => s.is_pensioner).length,
      white: seniors.filter((s) => !s.is_pensioner).length,
    }),
    [seniors]
  );

  const exportRows = () =>
    filtered.map((s) => ({
      full_name: s.full_name ?? "-",
      registration_id: s.registration_id ?? "-",
      id_type: idTypeFull(s.is_pensioner),
      status: s.status ?? "-",
      contact_number: s.contact_number ?? "-",
    }));

  const columns = ["full_name", "registration_id", "id_type", "status", "contact_number"];

  const handlePDF = async () => {
    if (!filtered.length) {
      toast("No records to export.", "error");
      return;
    }
    try {
      await generatePDF(
        `${barangay} Senior Citizens Directory`,
        exportRows(),
        columns,
        { certify: false },
        "landscape"
      );
      toast("PDF exported.", "success");
    } catch (e) {
      toast(`PDF export failed: ${e instanceof Error ? e.message : "unknown error"}`, "error");
    }
  };

  const handleExcel = async () => {
    if (!filtered.length) {
      toast("No records to export.", "error");
      return;
    }
    try {
      await generateExcel(`${barangay} Senior Citizens Directory`, exportRows(), columns);
      toast("Excel exported.", "success");
    } catch (e) {
      toast(`Excel export failed: ${e instanceof Error ? e.message : "unknown error"}`, "error");
    }
  };

  const inputClass = "w-full bg-surface-low border border-outline-variant/30 rounded-xl py-2.5 px-3 text-xs text-foreground placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary/40";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/seniors/by-barangay"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline mb-2"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Barangays
          </Link>
          <h1 className="text-3xl font-extrabold font-headline tracking-tighter text-foreground">
            {barangay} - Senior Citizens Directory
          </h1>
          <p className="text-outline mt-1">All registered senior citizens under Barangay {barangay}.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handlePDF}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
            Export PDF
          </button>
          <button
            onClick={handleExcel}
            className="px-4 py-2.5 rounded-xl bg-surface-low border border-outline-variant/30 text-xs font-bold text-foreground hover:bg-surface-high transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">table_view</span>
            Export Excel
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-outline-variant/20 bg-surface-lowest p-4">
          <p className="text-2xl font-bold text-foreground">{counts.total}</p>
          <p className="text-xs text-outline mt-1">Total Registered</p>
        </div>
        <div className="rounded-2xl border border-outline-variant/20 bg-surface-lowest p-4">
          <p className="text-2xl font-bold text-emerald-400">{counts.active}</p>
          <p className="text-xs text-outline mt-1">Active</p>
        </div>
        <div className="rounded-2xl border border-outline-variant/20 bg-surface-lowest p-4">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{counts.green}</p>
          <p className="text-xs text-outline mt-1">Green ID (Pensioners)</p>
        </div>
        <div className="rounded-2xl border border-outline-variant/20 bg-surface-lowest p-4">
          <p className="text-2xl font-bold text-slate-500 dark:text-slate-400">{counts.white}</p>
          <p className="text-xs text-outline mt-1">White ID (Non-Pensioners)</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface-lowest rounded-2xl border border-outline-variant/20 p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px]">
          <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Search</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or OSCA ID..."
            className={inputClass}
          />
        </div>
        <div className="w-44">
          <label className="text-[10px] font-bold uppercase tracking-widest text-outline">ID Type</label>
          <select value={idTypeFilter} onChange={(e) => setIdTypeFilter(e.target.value)} className={inputClass}>
            {ID_TYPE_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <div className="w-44">
          <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <span className="text-[11px] text-outline pb-2">
          {filtered.length} of {seniors.length} senior(s)
        </span>
      </div>

      {/* Table */}
      <div className="bg-surface-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant/10 text-[10px] uppercase tracking-widest text-outline">
                <th className="px-5 py-3 font-bold">Full Name</th>
                <th className="px-5 py-3 font-bold">OSCA ID / Control No.</th>
                <th className="px-5 py-3 font-bold">ID Type</th>
                <th className="px-5 py-3 font-bold">Status</th>
                <th className="px-5 py-3 font-bold">Contact Number</th>
                <th className="px-5 py-3 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-outline text-sm">
                    No senior records found in {barangay}.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-low/60 transition-colors">
                    <td className="px-5 py-3 text-xs font-bold text-foreground">{s.full_name || "—"}</td>
                    <td className="px-5 py-3 font-mono text-[11px] text-outline">{normalizeOscaId(s.status, s.registration_id) || "—"}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          s.is_pensioner
                            ? "bg-green-500/10 text-green-600 dark:text-green-400"
                            : "bg-slate-500/10 text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {idTypeLabel(s.is_pensioner)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          s.status === "Active"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : s.status === "Transferred"
                            ? "bg-blue-500/10 text-blue-500"
                            : s.status === "Deceased"
                            ? "bg-red-500/10 text-red-500"
                            : "bg-slate-500/10 text-slate-500"
                        }`}
                      >
                        {s.status || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{s.contact_number || "—"}</td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => setSelectedId(s.id)}
                        className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[10px] font-bold hover:bg-primary/20 transition-colors inline-flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[12px]">visibility</span>
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedId && (
        <SeniorDetailModal seniorId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
