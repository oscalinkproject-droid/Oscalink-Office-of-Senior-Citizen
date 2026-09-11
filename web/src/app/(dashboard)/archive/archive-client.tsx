"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { deleteLegacyDocument } from "@/app/actions/legacy-documents";
import { cancelSeniorAccount } from "@/app/actions/cancel-account";
import { restoreSeniorToActive } from "@/app/actions/restore-senior";
import { generatePDF, generateExcel, generateCSV } from "@/lib/exports";
import { useToast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const DEATH_CERTIFICATE_TYPE = "Death Certificate";

interface ArchiveRecord {
  id: string;
  registration_id: string | null;
  full_name: string | null;
  sex: string | null;
  age: number | null;
  barangay: string | null;
  status: string | null;
  transferred_at: string | null;
  deceased_at: string | null;
  inactive_at: string | null;
  decision_reason: string | null;
  created_at: string | null;
  death_certificate_url: string | null;
}

interface LegacyDoc {
  id: string;
  senior_id: string | null;
  full_name: string | null;
  registration_id: string | null;
  document_type: string;
  file_url: string;
  notes: string | null;
  scanned_at: string;
}

type ViewTab = "records" | "documents";

const INPUT_CLASS = "w-full bg-surface-low border border-outline-variant/30 rounded-xl py-2.5 px-4 text-xs text-foreground placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary/40";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function formatDateOfDeath(record: ArchiveRecord): string {
  // Fallback: deceased_at -> inactive_at -> updated_at -> created_at
  const dateValue = record.deceased_at || record.inactive_at || record.transferred_at || record.created_at;
  return formatDate(dateValue);
}

function isPdf(url: string): boolean {
  return /\.pdf(\?|$)/i.test(url);
}

export function ArchiveClient({
  transferred: initialTransferred,
  deceased: initialDeceased,
  docs: initialDocs,
}: {
  transferred: ArchiveRecord[];
  deceased: ArchiveRecord[];
  docs: LegacyDoc[];
}) {
  const { toast } = useToast();
  const router = useRouter();

  // ---- Navigation ----
  const [view, setView] = useState<ViewTab>("records");

  // ---- Records state ----
  const [transferred] = useState<ArchiveRecord[]>(initialTransferred);
  const [deceased, setDeceased] = useState<ArchiveRecord[]>(initialDeceased);

  // ---- Records filters ----
  const [recordSearch, setRecordSearch] = useState("");
  const [recordBarangay, setRecordBarangay] = useState("All");
  const [recordYear, setRecordYear] = useState("All");

  // ---- Documents state ----
  const [docs, setDocs] = useState<LegacyDoc[]>(initialDocs);
  const [docsLoading, setDocsLoading] = useState(false);

  // ---- Certified deceased state (from seniors table with death_certificate_url) ----
  const [certifiedDeceased, setCertifiedDeceased] = useState<ArchiveRecord[]>([]);
  const [certifiedLoading, setCertifiedLoading] = useState(false);

  // ---- Document vault filters ----
  const [docSearch, setDocSearch] = useState("");
  const [previewDoc, setPreviewDoc] = useState<LegacyDoc | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LegacyDoc | null>(null);

  // ---- Upload certificate modal ----
  const [uploadTarget, setUploadTarget] = useState<ArchiveRecord | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // ---- Cancel account ----
  const [cancelTarget, setCancelTarget] = useState<ArchiveRecord | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // ---- Restore to Active ----
  const [restoreTarget, setRestoreTarget] = useState<ArchiveRecord | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);

  // ---- Derived barangay/year options ----
  const barangayOptions = useMemo(
    () =>
      Array.from(
        new Set(transferred.map((r) => r.barangay).filter((b): b is string => !!b))
      ).sort(),
    [transferred]
  );

  const years = useMemo(() => {
    const ys = transferred
      .map((r) => r.transferred_at)
      .filter((v): v is string => !!v)
      .map((v) => new Date(v).getFullYear());
    return Array.from(new Set(ys)).sort((a, b) => b - a);
  }, [transferred]);

  // ---- Filtered records ----
  const filteredRecords = useMemo(() => {
    const term = recordSearch.trim().toLowerCase();
    return transferred.filter((r) => {
      if (recordBarangay !== "All" && r.barangay !== recordBarangay) return false;
      if (recordYear !== "All" && r.transferred_at) {
        const year = new Date(r.transferred_at).getFullYear();
        if (year !== Number(recordYear)) return false;
      }
      if (term) {
        const haystack = `${r.full_name ?? ""} ${r.registration_id ?? ""} ${r.barangay ?? ""} ${r.decision_reason ?? ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [transferred, recordSearch, recordBarangay, recordYear]);

  // ---- Document vault filter ----
  const filteredDocs = useMemo(() => {
    const term = docSearch.trim().toLowerCase();
    return docs.filter((d) => {
      if (term) {
        const haystack = `${d.full_name ?? ""} ${d.document_type ?? ""} ${d.notes ?? ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [docs, docSearch]);

  // ---- Deceased seniors matching the vault search ----
  const filteredDeceased = useMemo(() => {
    const term = docSearch.trim().toLowerCase();
    return deceased.filter((r) => {
      if (!term) return true;
      const haystack = `${r.full_name ?? ""} ${r.registration_id ?? ""} ${r.barangay ?? ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [deceased, docSearch]);

  // ---- Death certificates linked per deceased senior ----
  const deceasedDocMap = useMemo(() => {
    const map = new Map<string, LegacyDoc>();
    for (const d of docs) {
      if (d.document_type !== DEATH_CERTIFICATE_TYPE || !d.senior_id) continue;
      if (!map.has(d.senior_id)) map.set(d.senior_id, d);
    }
    return map;
  }, [docs]);

  // ---- Document data loading ----
  const loadDocs = useCallback(async () => {
    setDocsLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("legacy_documents")
      .select("*")
      .eq("document_type", DEATH_CERTIFICATE_TYPE)
      .order("scanned_at", { ascending: false })
      .limit(500);
    if (data) setDocs(data as LegacyDoc[]);
    setDocsLoading(false);
  }, []);

  // ---- Load certified deceased (from seniors table with death_certificate_url) ----
  const loadCertifiedDeceased = useCallback(async () => {
    setCertifiedLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("seniors")
      .select("id, registration_id, full_name, barangay, deceased_at, inactive_at, created_at, death_certificate_url")
      .eq("status", "Deceased")
      .not("death_certificate_url", "is", null)
      .order("deceased_at", { ascending: false, nullsFirst: false });
    if (data) setCertifiedDeceased(data as ArchiveRecord[]);
    setCertifiedLoading(false);
  }, []);

  // ---- Load all data ----
  const loadAll = useCallback(async () => {
    await Promise.all([loadDocs(), loadCertifiedDeceased()]);
  }, [loadDocs, loadCertifiedDeceased]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ---- Delete document ----
  const handleDelete = async () => {
    if (!deleteTarget) return;
    const result = await deleteLegacyDocument(deleteTarget.id);
    setDeleteTarget(null);
    if (result?.error) toast(result.error, "error");
    else {
      toast("Document removed from vault.", "success");
      loadDocs();
    }
  };

  // ---- Cancel account ----
  const handleCancelAccount = async () => {
    if (!cancelTarget) return;
    setCancelLoading(true);
    const result = await cancelSeniorAccount(cancelTarget.id);
    setCancelLoading(false);
    setCancelTarget(null);
    if (result?.error) {
      toast(result.error, "error");
    } else {
      toast("Account cancelled. Mobile access revoked; record retained for re-registration.", "success");
      router.refresh();
    }
  };

  // ---- Restore to Active ----
  const handleRestoreToActive = async () => {
    if (!restoreTarget) return;
    setRestoreLoading(true);
    const result = await restoreSeniorToActive(restoreTarget.id);
    if (result?.error) {
      toast(result.error, "error");
    } else {
      toast("Record restored to Active and returned to the Seniors Directory.", "success");
      setDeceased((prev) => prev.filter((r) => r.id !== restoreTarget.id));
    }
    setRestoreLoading(false);
    setRestoreTarget(null);
  };

  // ---- Upload Certificate ----
  const handleUploadClick = (record: ArchiveRecord) => {
    setUploadTarget(record);
    setUploadFile(null);
    setUploadError(null);
  };

  const handleUploadFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!["application/pdf", "image/png", "image/jpeg"].includes(file.type)) {
        setUploadError("Only PDF, PNG, or JPG files are allowed.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("File size must be less than 5MB.");
        return;
      }
      setUploadFile(file);
      setUploadError(null);
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadTarget || !uploadFile) return;
    setUploadLoading(true);
    setUploadError(null);
    try {
      const supabase = createClient();
      // Upload to storage
      const fileExt = uploadFile.name.split(".").pop();
      const fileName = `${uploadTarget.id}-${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("death-certificates")
        .upload(`public/${fileName}`, uploadFile, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("death-certificates")
        .getPublicUrl(uploadData.path);

      // Update senior record with death_certificate_url
      const supabaseClient = createClient();
      const { error: updateError } = await supabaseClient
        .from("seniors")
        .update({ death_certificate_url: publicUrl })
        .eq("id", uploadTarget.id);

      if (updateError) throw updateError;

      toast("Death certificate uploaded and linked successfully.", "success");
      setUploadTarget(null);
      setUploadFile(null);
      setUploadError(null);
      loadCertifiedDeceased();
      loadDocs();
    } catch (err: any) {
      setUploadError(err.message || "Upload failed. Please try again.");
    } finally {
      setUploadLoading(false);
    }
  };

  // ---- Record exports ----
  const recordExportColumns = ["registration_id", "full_name", "sex", "age", "barangay", "transferred_at", "decision_reason"];

  const toExportRows = (): Record<string, unknown>[] =>
    filteredRecords.map((r) => ({
      registration_id: r.registration_id ?? "—",
      full_name: r.full_name ?? "—",
      sex: r.sex ?? "—",
      age: r.age ?? "—",
      barangay: r.barangay ?? "—",
      transferred_at: formatDate(r.transferred_at),
      decision_reason: r.decision_reason ?? "—",
    }));

  const handleExportPDF = async () => {
    if (!filteredRecords.length) {
      toast("No records to export.", "error");
      return;
    }
    const title = "Transferred Senior Records";
    try {
      await generatePDF(title, toExportRows(), recordExportColumns, { certify: false }, "landscape");
      toast("PDF exported.", "success");
    } catch (e) {
      toast(`PDF export failed: ${e instanceof Error ? e.message : "unknown error"}`, "error");
    }
  };

  const handleExportExcel = async () => {
    if (!filteredRecords.length) {
      toast("No records to export.", "error");
      return;
    }
    const title = "Transferred Senior Records";
    try {
      await generateExcel(title, toExportRows(), recordExportColumns);
      toast("Excel exported.", "success");
    } catch (e) {
      toast(`Excel export failed: ${e instanceof Error ? e.message : "unknown error"}`, "error");
    }
  };

  const handleExportCSV = () => {
    if (!filteredRecords.length) {
      toast("No records to export.", "error");
      return;
    }
    const title = "Transferred Senior Records";
    generateCSV(title, toExportRows());
    toast("CSV exported.", "success");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold font-headline tracking-tighter text-foreground">
          Senior Citizen Archives &amp; Document Repository
        </h1>
        <p className="text-outline mt-1 text-sm">
          Centralized data bank for transferred/deceased senior records and digitized Death Certificates.
        </p>
      </div>

      {/* Primary Tabs */}
      <div className="flex flex-wrap gap-2 border border-outline-variant/20 bg-surface-lowest rounded-2xl p-2 w-full">
        <button
          onClick={() => setView("records")}
          className={`flex-1 min-w-[220px] inline-flex items-center justify-center gap-2.5 h-12 px-6 rounded-xl text-sm font-semibold transition-all ${
            view === "records"
              ? "bg-primary text-white shadow-md ring-1 ring-primary/40"
              : "text-outline hover:text-foreground hover:bg-surface-low"
          }`}
        >
          <span className="material-symbols-outlined text-xl leading-none">archive</span>
          <span>Senior Records Archive</span>
          <span className={`inline-flex items-center justify-center min-w-[28px] h-[28px] px-2 rounded-full text-xs font-bold leading-none ${
            view === "records" ? "bg-white/25 text-white" : "bg-surface-low text-outline"
          }`}>
            {transferred.length}
          </span>
        </button>
        <button
          onClick={() => setView("documents")}
          className={`flex-1 min-w-[220px] inline-flex items-center justify-center gap-2.5 h-12 px-6 rounded-xl text-sm font-semibold transition-all ${
            view === "documents"
              ? "bg-primary text-white shadow-md ring-1 ring-primary/40"
              : "text-outline hover:text-foreground hover:bg-surface-low"
          }`}
        >
          <span className="material-symbols-outlined text-xl leading-none">folder_managed</span>
          <span>Death Certificate Vault</span>
          <span className={`inline-flex items-center justify-center min-w-[28px] h-[28px] px-2 rounded-full text-xs font-bold leading-none ${
            view === "documents" ? "bg-white/25 text-white" : "bg-surface-low text-outline"
          }`}>
            {docs.length}
          </span>
        </button>
      </div>

      {/* ============ TAB 1: SENIOR RECORDS ARCHIVE ============ */}
      {view === "records" && (
        <div className="space-y-5">
          {/* Filter bar */}
          <div className="bg-surface-lowest rounded-2xl border border-outline-variant/20 p-4 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Search</label>
              <input
                value={recordSearch}
                onChange={(e) => setRecordSearch(e.target.value)}
                placeholder="Search by name, ID, barangay, or reason..."
                className={INPUT_CLASS}
              />
            </div>
            <div className="w-44">
              <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Barangay</label>
              <select value={recordBarangay} onChange={(e) => setRecordBarangay(e.target.value)} className={INPUT_CLASS}>
                <option value="All">All Barangays</option>
                {barangayOptions.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="w-36">
              <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Year</label>
              <select value={recordYear} onChange={(e) => setRecordYear(e.target.value)} className={INPUT_CLASS}>
                <option value="All">All Years</option>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={handleExportPDF}
                className="px-3.5 py-2.5 rounded-xl bg-surface-low border border-outline-variant/30 text-xs font-bold text-foreground hover:bg-surface-high transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                PDF
              </button>
              <button
                onClick={handleExportExcel}
                className="px-3.5 py-2.5 rounded-xl bg-surface-low border border-outline-variant/30 text-xs font-bold text-foreground hover:bg-surface-high transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">table_view</span>
                Excel
              </button>
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2.5 rounded-xl bg-surface-low border border-outline-variant/30 text-xs font-bold text-foreground hover:bg-surface-high transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                CSV
              </button>
            </div>
          </div>

          {/* Records table */}
          <div className="bg-surface-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant/10 flex items-center justify-between">
              <h3 className="font-headline font-bold text-foreground text-sm">
                Transferred Records
                <span className="ml-2 text-[10px] font-bold text-outline uppercase">
                  {filteredRecords.length} of {transferred.length}
                </span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-outline-variant/10 text-[10px] uppercase tracking-widest text-outline">
                    <th className="px-5 py-3 font-bold">Registration ID</th>
                    <th className="px-5 py-3 font-bold">Full Name</th>
                    <th className="px-5 py-3 font-bold">Sex</th>
                    <th className="px-5 py-3 font-bold">Age</th>
                    <th className="px-5 py-3 font-bold">Barangay</th>
                    <th className="px-5 py-3 font-bold">Transfer Date</th>
                    <th className="px-5 py-3 font-bold">Reason / Notes</th>
                    <th className="px-5 py-3 font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-outline text-sm">
                        No transferred records found.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-surface-low/60 transition-colors">
                        <td className="px-5 py-3 font-mono text-[11px] text-outline">{r.registration_id || "—"}</td>
                        <td className="px-5 py-3 text-xs font-bold text-foreground">{r.full_name || "—"}</td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">{r.sex || "—"}</td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">{r.age ?? "—"}</td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">{r.barangay || "—"}</td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">
                          {formatDate(r.transferred_at)}
                        </td>
                        <td className="px-5 py-3 text-[11px] text-outline max-w-[260px] truncate">{r.decision_reason || "—"}</td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              onClick={() => router.push(`/directory/register?renew=${r.id}`)}
                              title="Open a pre-filled application to re-register this returning senior with a new OSCA ID"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[10px] font-bold hover:bg-primary/20 transition-colors whitespace-nowrap"
                            >
                              <span className="material-symbols-outlined text-[12px]">refresh</span>
                              Reactivate / Re-register
                            </button>
                            <button
                              onClick={() => setCancelTarget(r)}
                              title="Cancel the account, revoke mobile app access, and retain the record for re-registration tracking"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-[10px] font-bold hover:bg-red-500/20 transition-colors whitespace-nowrap"
                            >
                              <span className="material-symbols-outlined text-[12px]">block</span>
                              Cancel Account
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============ TAB 2: DIGITIZED PHYSICAL DOCUMENTS ============ */}
      {view === "documents" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Document Vault */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-surface-lowest rounded-2xl border border-outline-variant/20 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">vault</span>
                  <h3 className="font-headline font-bold text-foreground text-sm">Document Vault</h3>
                  <span className="text-[10px] font-bold text-outline uppercase">({filteredDocs.length} of {docs.length})</span>
                </div>
              </div>

              {/* Vault filters */}
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[220px]">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Search</label>
                  <input
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    placeholder="Search by deceased senior or remarks..."
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="w-auto px-1 py-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-outline">
                    <span className="material-symbols-outlined text-sm">description</span>
                    Death Certificates only
                  </span>
                </div>
              </div>

              {/* Vault content */}
              {docsLoading ? (
                <p className="text-xs text-outline py-8 text-center">Loading documents...</p>
              ) : filteredDocs.length === 0 ? (
                <div className="py-12 text-center text-outline space-y-2">
                  <span className="material-symbols-outlined text-4xl block">folder_off</span>
                  <p className="text-sm">No Death Certificates in the vault yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto pr-1">
                  {filteredDocs.map((d) => (
                    <div key={d.id} className="rounded-xl bg-surface-low border border-outline-variant/20 p-3 space-y-2">
                      <div className="flex items-start gap-2.5">
                        <span className={`w-9 h-9 rounded-lg flex items-center justify-center material-symbols-outlined text-lg ${
                          isPdf(d.file_url) ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"
                        }`}>
                          {isPdf(d.file_url) ? "picture_as_pdf" : "image"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">Death Certificate</p>
                          <p className="text-[11px] text-outline truncate">{d.full_name || "Unlinked"}</p>
                          {d.registration_id && (
                            <p className="text-[10px] text-primary font-mono font-bold truncate">OSCA ID: {d.registration_id}</p>
                          )}
                          <p className="text-[10px] text-outline mt-0.5">Uploaded {formatDate(d.scanned_at)}</p>
                        </div>
                      </div>
                      {d.notes && <p className="text-[10px] text-outline/70 line-clamp-2">{d.notes}</p>}
                      <div className="flex items-center gap-1.5 pt-1 border-t border-outline-variant/10">
                        <button
                          onClick={() => setPreviewDoc(d)}
                          className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-bold hover:bg-primary/20 transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[12px]">visibility</span>
                          View
                        </button>
                        <a
                          href={d.file_url}
                          target="_blank"
                          rel="noreferrer"
                          download
                          className="px-2.5 py-1 rounded-lg bg-surface-high text-foreground text-[10px] font-bold hover:bg-surface-high/60 transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[12px]">download</span>
                          Download
                        </a>
                        <button
                          onClick={() => setDeleteTarget(d)}
                          className="px-2.5 py-1 ml-auto rounded-lg bg-red-500/10 text-red-400 text-[10px] font-bold hover:bg-red-500/20 transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[12px]">delete</span>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Deceased Seniors List -- merged into the Vault */}
              <div className="border-t border-outline-variant/10 mt-6 pt-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-primary">history_edu</span>
                  <h4 className="font-headline font-bold text-foreground text-sm">Deceased Seniors List</h4>
                  <span className="text-[10px] font-bold text-outline uppercase">({filteredDeceased.length} of {deceased.length})</span>
                </div>

                {filteredDeceased.length === 0 ? (
                  <div className="py-10 text-center text-outline space-y-2">
                    <span className="material-symbols-outlined text-4xl block">person_off</span>
                    <p className="text-sm">No deceased senior records or death certificates found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-surface-low border-b border-outline-variant/10 text-[10px] uppercase tracking-widest text-outline">
                          <th className="px-4 py-3 text-left font-semibold text-xs tracking-wider w-[180px] whitespace-nowrap">OSCA ID / Reg ID</th>
                          <th className="px-4 py-3 text-left font-semibold text-xs tracking-wider w-[220px]">Full Name</th>
                          <th className="px-4 py-3 text-left font-semibold text-xs tracking-wider w-[150px]">Barangay</th>
                          <th className="px-4 py-3 text-left font-semibold text-xs tracking-wider w-[160px]">Date of Death</th>
                          <th className="px-4 py-3 text-left font-semibold text-xs tracking-wider w-[220px]">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/10">
                        {filteredDeceased.map((r) => {
                          const doc = r.id ? deceasedDocMap.get(r.id) : undefined;
                          const hasCertOnRecord = !!r.death_certificate_url;
                          const hasAnyCert = !!doc || hasCertOnRecord;
                          const certUrl = doc?.file_url || r.death_certificate_url;
                          return (
                            <tr key={r.id} className="hover:bg-surface-low/60 transition-colors">
                              <td className="px-4 py-3 font-mono text-[11px] text-outline whitespace-nowrap">{r.registration_id || "—"}</td>
                              <td className="px-4 py-3 text-xs font-bold text-foreground max-w-[200px] truncate">{r.full_name || "—"}</td>
                              <td className="px-4 py-3 text-xs text-muted_foreground max-w-[130px] truncate">{r.barangay || "—"}</td>
                              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDateOfDeath(r)}</td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col sm:flex-row items-center gap-2">
                                  {hasAnyCert && certUrl ? (
                                    <button
                                      onClick={() => setPreviewDoc({ ...doc, file_url: certUrl, full_name: r.full_name, registration_id: r.registration_id } as LegacyDoc)}
                                      title="Open this senior's Death Certificate to view or download it"
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[10px] font-bold hover:bg-primary/20 transition-colors whitespace-nowrap"
                                    >
                                      <span className="material-symbols-outlined text-[12px]">visibility</span>
                                      View/Download Death Certificate
                                    </button>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      onClick={() => handleUploadClick(r)}
                                      className="w-full sm:w-auto"
                                    >
                                      <span className="material-symbols-outlined text-[12px]">cloud_upload</span>
                                      Upload Certificate
                                    </Button>
                                  )}
                                  <button
                                    onClick={() => setRestoreTarget(r)}
                                    title="Restore this senior to Active and return them to the main Seniors Directory"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-bold hover:bg-emerald-500/20 transition-colors whitespace-nowrap"
                                  >
                                    <span className="material-symbols-outlined text-[12px]">restore</span>
                                    Revert to Active
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ PDF / IMAGE PREVIEW MODAL ============ */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setPreviewDoc(null)}>
          <div className="bg-surface-lowest rounded-2xl border border-outline-variant/20 w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-primary">preview</span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">Death Certificate</p>
                  <p className="text-[10px] text-outline truncate">{previewDoc.full_name || "Unlinked"}{previewDoc.registration_id ? ` · OSCA ID: ${previewDoc.registration_id}` : ""} · {formatDate(previewDoc.scanned_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={previewDoc.file_url} target="_blank" rel="noreferrer" download className="px-3 py-1.5 rounded-lg bg-primary text-white text-[10px] font-bold hover:bg-primary/90 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">download</span>
                  Download
                </a>
                <button onClick={() => setPreviewDoc(null)} className="w-8 h-8 rounded-lg bg-surface-low flex items-center justify-center text-outline hover:text-foreground">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-5 bg-surface-low/40">
              {isPdf(previewDoc.file_url) ? (
                <iframe src={previewDoc.file_url} className="w-full h-[70vh] rounded-xl border border-outline-variant/20 bg-white" title="Document preview" />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={previewDoc.file_url} alt="Document preview" className="max-w-full mx-auto rounded-xl border border-outline-variant/20 shadow" />
              )}
            </div>
            {previewDoc.notes && (
              <div className="px-5 py-3 border-t border-outline-variant/10">
                <p className="text-[10px] text-outline uppercase tracking-widest font-bold mb-1">Remarks</p>
                <p className="text-xs text-foreground">{previewDoc.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ DELETE CONFIRM MODAL ============ */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-surface-lowest rounded-2xl border border-outline-variant/20 p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg text-red-400">delete</span>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Remove Death Certificate</p>
                <p className="text-[11px] text-outline mt-0.5">
                  Death Certificate{deleteTarget.full_name ? ` · ${deleteTarget.full_name}` : ""}
                </p>
              </div>
            </div>
            <p className="text-xs text-outline mt-4">
              This permanently removes the Death Certificate from the archive. This action cannot be undone.
            </p>
            <div className="flex items-center gap-2 justify-end mt-5">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-outline hover:text-foreground">
                Cancel
              </button>
              <button onClick={handleDelete} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white bg-red-500 hover:bg-red-600 rounded-lg">
                Remove Death Certificate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ CANCEL ACCOUNT MODAL ============ */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => { if (!cancelLoading) setCancelTarget(null); }}>
          <div className="bg-surface-lowest rounded-2xl border border-outline-variant/20 p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg text-red-400">block</span>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Cancel Account</p>
                <p className="text-[11px] text-outline mt-0.5">
                  {cancelTarget.full_name}
                  {cancelTarget.registration_id ? ` · ${cancelTarget.registration_id}` : ""}
                </p>
              </div>
            </div>
            <p className="text-xs text-outline mt-4">
              Are you sure you want to cancel this account? This will revoke and block mobile app access for this senior.
            </p>
            <p className="text-[11px] text-outline mt-2">
              The archived record is retained in Transferred Records for future re-registration tracking.
            </p>
            <div className="flex items-center gap-2 justify-end mt-5">
              <button onClick={() => setCancelTarget(null)} disabled={cancelLoading} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-outline hover:text-foreground disabled:opacity-50">
                Cancel
              </button>
              <button
                onClick={handleCancelAccount}
                disabled={cancelLoading}
                className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white bg-red-500 hover:bg-red-600 rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {cancelLoading ? (
                  <>
                    <span className="animate-spin border-2 border-white/40 border-t-white rounded-full w-3 h-3 inline-block" />
                    Cancelling...
                  </>
                ) : (
                  'Confirm Cancel'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ RESTORE TO ACTIVE MODAL ============ */}
      {restoreTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => { if (!restoreLoading) setRestoreTarget(null); }}>
          <div className="bg-surface-lowest rounded-2xl border border-outline-variant/20 p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg text-emerald-500">restore</span>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Revert to Active</p>
                <p className="text-[11px] text-outline mt-0.5">
                  {restoreTarget.full_name}
                  {restoreTarget.registration_id ? ` · ${restoreTarget.registration_id}` : ""}
                </p>
              </div>
            </div>
            <p className="text-xs text-outline mt-4">
              This restores the senior&apos;s status to Active and returns them to the main Seniors Directory. Deceased markers (date of death, reason) will be cleared.
            </p>
            <div className="flex items-center gap-2 justify-end mt-5">
              <button onClick={() => setRestoreTarget(null)} disabled={restoreLoading} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-outline hover:text-foreground disabled:opacity-50">
                Cancel
              </button>
              <button
                onClick={handleRestoreToActive}
                disabled={restoreLoading}
                className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {restoreLoading ? (
                  <>
                    <span className="animate-spin border-2 border-white/40 border-t-white rounded-full w-3 h-3 inline-block" />
                    Restoring...
                  </>
                ) : (
                  'Confirm Restore'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
