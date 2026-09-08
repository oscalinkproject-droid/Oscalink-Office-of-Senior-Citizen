"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase";

interface AuditLogEntry {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_role: string | null;
  action: string;
  category: string;
  table_name: string | null;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

interface AuditSummary {
  totalActions: number;
  activeSessions: number;
  todayLogins: number;
  uniqueUsers: number;
}

interface AuditTrailClientProps {
  auditLogs: AuditLogEntry[];
  summary: AuditSummary;
}

const CATEGORY_COLORS: Record<string, string> = {
  senior: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  settings: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  general: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

const ROLE_COLORS: Record<string, string> = {
  osca_head: "bg-amber-500/10 text-amber-400",
  admin: "bg-blue-500/10 text-blue-400",
  osca_staff: "bg-blue-500/10 text-blue-400",
  mswd_officer: "bg-blue-500/10 text-blue-400",
  mayor: "bg-violet-500/10 text-violet-400",
  official: "bg-emerald-500/10 text-emerald-400",
  para_social_worker: "bg-cyan-500/10 text-cyan-400",
  resident: "bg-slate-500/10 text-slate-400",
  senior_citizen: "bg-slate-500/10 text-slate-400",
};

const ROLE_LABELS: Record<string, string> = {
  osca_head: "Head",
  admin: "Staff",
  osca_staff: "Staff",
  mswd_officer: "MSWD Officer",
  mayor: "Mayor",
  official: "Official",
  para_social_worker: "PSW",
  resident: "Resident",
  senior_citizen: "Senior",
  barangay_president: "BP",

};

function formatDate(d: string) {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ActionBadge({ action }: { action: string }) {
  const label = action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const isDelete = action.includes("delete") || action.includes("remove");
  const isUpdate = action.includes("update") || action.includes("edit");
  const isCreate = action.includes("create") || action.includes("register");
  const isApprove = action.includes("approve") || action.includes("verify") || action.includes("release");
  const isReject = action.includes("reject") || action.includes("deny");

  let color = "bg-slate-500/10 text-slate-400 border-slate-500/20";
  if (isApprove) color = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  else if (isReject) color = "bg-red-500/10 text-red-400 border-red-500/20";
  else if (isCreate) color = "bg-blue-500/10 text-blue-400 border-blue-500/20";
  else if (isUpdate) color = "bg-amber-500/10 text-amber-400 border-amber-500/20";
  else if (isDelete) color = "bg-red-500/10 text-red-400 border-red-500/20";

  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${color}`}>
      {label}
    </span>
  );
}

export function AuditTrailClient({ auditLogs: initialAuditLogs, summary: initialSummary }: AuditTrailClientProps) {
  const [auditLogs, setAuditLogs] = useState(initialAuditLogs);
  const [summary, setSummary] = useState(initialSummary);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const channel = supabase
      .channel("audit_trail_live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "audit_logs" },
        (payload) => {
          setAuditLogs((prev) => [payload.new as unknown as AuditLogEntry, ...prev]);
          setSummary((prev) => ({ ...prev, totalActions: prev.totalActions + 1 }));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const filteredLogs = categoryFilter === "all"
    ? auditLogs
    : auditLogs.filter((l) => l.category === categoryFilter);

  const categories = ["all", ...new Set(auditLogs.map((l) => l.category).filter(Boolean).filter(c => c !== "assistance"))];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline font-bold text-2xl text-foreground italic">Audit Trail</h1>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Staff actions log</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-5">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total Actions</p>
          <p className="text-2xl font-bold text-foreground mt-1">{summary.totalActions.toLocaleString()}</p>
        </div>
        <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl p-5">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Unique Users Today</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{summary.uniqueUsers}</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
              categoryFilter === cat
                ? "bg-primary/20 border-primary text-foreground"
                : "border-outline-variant/30 text-outline hover:text-foreground"
            }`}
          >
            {cat === "all" ? "All" : cat}
          </button>
        ))}
      </div>

      <div className="bg-surface-lowest border border-outline-variant/30 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant/30">
                <th className="text-left py-3 px-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">Date</th>
                <th className="text-left py-3 px-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">User</th>
                <th className="text-left py-3 px-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">Role</th>
                <th className="text-left py-3 px-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">Action</th>
                <th className="text-left py-3 px-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">Category</th>
                <th className="text-left py-3 px-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">Table</th>
                <th className="text-left py-3 px-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">Record</th>
                <th className="text-left py-3 px-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">IP</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-outline">No actions recorded yet.</td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-outline-variant/10 hover:bg-surface-high/30 transition-colors">
                    <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap font-mono">{formatDate(log.created_at)}</td>
                    <td className="py-3 px-4 text-xs text-foreground font-bold">{log.user_email || "—"}</td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${ROLE_COLORS[log.user_role || ""] || ROLE_COLORS.resident}`}>
                        {ROLE_LABELS[log.user_role || ""] || log.user_role || "—"}
                      </span>
                    </td>
                    <td className="py-3 px-4"><ActionBadge action={log.action} /></td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${CATEGORY_COLORS[log.category] || CATEGORY_COLORS.general}`}>
                        {log.category || "—"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500 font-mono">{log.table_name || "—"}</td>
                    <td className="py-3 px-4 text-xs text-slate-500 font-mono max-w-[120px] truncate">{log.record_id ? log.record_id.slice(0, 8) + "..." : "—"}</td>
                    <td className="py-3 px-4 text-xs text-slate-500 font-mono">{log.ip_address || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
