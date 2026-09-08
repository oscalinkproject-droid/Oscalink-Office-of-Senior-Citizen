"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { sendReply } from "@/app/actions/notifications";

interface Correction {
  id: string;
  title: string;
  message: string;
  type: string;
  status: string | null;
  category: string | null;
  created_at: string;
  reporter_id: string;
  reporter_name?: string;
  reporter_reg_id?: string;
}

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  profile_data: { label: "Profile Data Issue", color: "bg-blue-500/10 text-blue-400" },
  feedback: { label: "App Feedback", color: "bg-purple-500/10 text-purple-400" },
  general: { label: "General", color: "bg-slate-500/10 text-slate-400" },
  other: { label: "Other", color: "bg-slate-500/10 text-slate-400" },
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-amber-500/10 text-amber-400" },
  replied: { label: "Replied", color: "bg-green-500/10 text-green-400" },
  resolved: { label: "Resolved", color: "bg-blue-500/10 text-blue-400" },
};

const REPLY_TEMPLATES = [
  { label: "Received", text: "We have received your request and are processing it. You will be notified once updated." },
  { label: "Visit Office", text: "Please visit the OSCA Main Office to have your records corrected. Bring a valid ID." },
  { label: "Resolved", text: "Your request has been resolved. Thank you for reaching out to OSCA." },
];

const stripDividers = (msg: string): string =>
  msg
    .replace(/^\s*-{3,}\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const deriveCategory = (category: string | null, title: string): string => {
  if (category && CATEGORY_META[category]) return category;
  if (title.toLowerCase().includes("correction")) return "profile_data";
  return "general";
};

const deriveStatus = (status: string | null): string => {
  if (status === "resolved") return "resolved";
  if (status === "replied") return "replied";
  return "pending";
};

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CorrectionInboxTable() {
  const [records, setRecords] = useState<Correction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [selected, setSelected] = useState<Correction | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  const loadRecords = useCallback(async (): Promise<Correction[]> => {
    const client = createClient();
    const { data: notifs } = await client
      .from("notifications")
      .select("id, title, message, type, status, category, created_at, reporter_id, parent_id")
      .not("reporter_id", "is", null)
      .is("parent_id", null)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!notifs) return [];

    const reporterIds = [...new Set(notifs.map((n) => n.reporter_id).filter(Boolean))] as string[];
    const { data: reporters } = await client
      .from("seniors")
      .select("auth_id, full_name, registration_id")
      .in("auth_id", reporterIds);

    const reporterMap = new Map<string, { name?: string; regId?: string }>();
    (reporters || []).forEach((r) => {
      if (r.auth_id) reporterMap.set(r.auth_id, { name: r.full_name, regId: r.registration_id });
    });

    const reportIds = notifs.map((n) => n.id);
    const { data: allReplies } = await client
      .from("notifications")
      .select("parent_id")
      .in("parent_id", reportIds);
    const repliedIds = new Set((allReplies || []).map((r) => r.parent_id));

    return notifs.map((n) => ({
      ...n,
      reporter_name: reporterMap.get(n.reporter_id)?.name,
      reporter_reg_id: reporterMap.get(n.reporter_id)?.regId,
      status: n.status || (repliedIds.has(n.id) ? "replied" : "open"),
    }));
  }, []);

  useEffect(() => {
    loadRecords().then((rows) => {
      setRecords(rows);
      setLoading(false);
    });
    const supabase = createClient();
    const channel = supabase
      .channel("correction-inbox-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        loadRecords().then(setRecords);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadRecords]);

  const handleReply = async () => {
    if (!selected || !replyText.trim()) return;
    setReplying(true);
    const result = await sendReply(selected.id, replyText.trim(), selected.reporter_id);
    if (result.success) {
      const client = createClient();
      await client.from("notifications").update({ status: "replied" }).eq("id", selected.id);
      setReplyText("");
      setSelected(null);
      loadRecords();
    }
    setReplying(false);
  };

  const handleResolve = async () => {
    if (!selected) return;
    setReplying(true);
    const client = createClient();
    await client.from("notifications").update({ status: "resolved" }).eq("id", selected.id);
    setReplying(false);
    setSelected(null);
    loadRecords();
  };

  const filtered = records.filter((r) => {
    const cat = deriveCategory(r.category, r.title);
    const stat = deriveStatus(r.status);
    const term = search.trim().toLowerCase();
    if (categoryFilter !== "All" && cat !== categoryFilter) return false;
    if (statusFilter !== "All" && stat !== statusFilter) return false;
    if (term) {
      const haystack = `${r.reporter_name ?? ""} ${r.reporter_reg_id ?? ""}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });

  const pendingCount = records.filter((r) => deriveStatus(r.status) === "pending").length;
  const repliedCount = records.filter((r) => deriveStatus(r.status) === "replied").length;
  const resolvedCount = records.filter((r) => deriveStatus(r.status) === "resolved").length;

  return (
    <div className="space-y-4">
      {/* Header + stats */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">edit_note</span>
            Senior Correction Requests
          </h2>
          <p className="text-xs text-outline mt-0.5">
            Requests and feedback submitted by seniors through the mobile app.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold">
          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400">{pendingCount} Pending</span>
          <span className="px-2.5 py-1 rounded-full bg-green-500/10 text-green-400">{repliedCount} Replied</span>
          <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400">{resolvedCount} Resolved</span>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-base pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by senior name or OSCA ID..."
            className="w-full bg-surface-low border border-outline-variant/30 rounded-xl py-2.5 pl-10 pr-4 text-xs text-foreground placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="appearance-none pr-8 pl-3 py-2.5 rounded-xl bg-surface-low border border-outline-variant/30 text-xs font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
            >
              <option value="All">All Categories</option>
              <option value="profile_data">Profile Data Issue</option>
              <option value="feedback">App Feedback</option>
              <option value="general">General</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-sm">
              arrow_drop_down
            </span>
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pr-8 pl-3 py-2.5 rounded-xl bg-surface-low border border-outline-variant/30 text-xs font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="replied">Replied</option>
              <option value="resolved">Resolved</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-sm">
              arrow_drop_down
            </span>
          </div>
          {(search || categoryFilter !== "All" || statusFilter !== "All") && (
            <button
              onClick={() => {
                setSearch("");
                setCategoryFilter("All");
                setStatusFilter("All");
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-outline hover:text-foreground hover:bg-surface-low border border-outline-variant/30 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">filter_alt_off</span>
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant/10 text-[10px] uppercase tracking-widest text-outline">
                <th className="px-5 py-3 font-bold">Date &amp; Time</th>
                <th className="px-5 py-3 font-bold">Senior Name &amp; OSCA ID</th>
                <th className="px-5 py-3 font-bold">Category / Type</th>
                <th className="px-5 py-3 font-bold">Message / Details</th>
                <th className="px-5 py-3 font-bold">Status</th>
                <th className="px-5 py-3 font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-outline text-sm">
                    Loading correction requests...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-outline text-sm">
                    No correction requests found.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const cat = deriveCategory(r.category, r.title);
                  const stat = deriveStatus(r.status);
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelected(r)}
                      className="hover:bg-surface-low/60 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(r.created_at)}
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-xs font-bold text-foreground">{r.reporter_name || "Unknown Senior"}</p>
                        <p className="text-[10px] text-outline font-mono">{r.reporter_reg_id || "—"}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${CATEGORY_META[cat].color}`}>
                          {CATEGORY_META[cat].label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[11px] text-outline max-w-[280px]">
                        <span className="line-clamp-2 whitespace-pre-line">{stripDividers(r.message)}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_META[stat].color}`}>
                          {STATUS_META[stat].label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(r);
                          }}
                          className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                          Reply / View
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

      {/* Reply Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelected(null)}>
          <div className="bg-surface-lowest rounded-2xl border border-outline-variant/30 w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-surface-lowest border-b border-outline-variant/10 p-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">reply</span>
                Reply to Senior
              </h3>
              <button onClick={() => setSelected(null)} className="text-outline hover:text-foreground">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Senior info */}
              <div className="rounded-xl bg-surface-low border border-outline-variant/20 p-4 space-y-1">
                <p className="text-xs font-bold text-foreground">{selected.reporter_name || "Unknown Senior"}</p>
                <p className="text-[10px] text-outline font-mono">{selected.reporter_reg_id || "—"}</p>
                {selected.reporter_id && (
                  <p className="text-[10px] text-outline truncate">Account: {selected.reporter_id}</p>
                )}
                <div className="flex items-center gap-2 pt-2">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${CATEGORY_META[deriveCategory(selected.category, selected.title)].color}`}>
                    {CATEGORY_META[deriveCategory(selected.category, selected.title)].label}
                  </span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_META[deriveStatus(selected.status)].color}`}>
                    {STATUS_META[deriveStatus(selected.status)].label}
                  </span>
                </div>
              </div>

              {/* Full message */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">Request Details</p>
                <div className="rounded-xl bg-surface-low border border-outline-variant/20 p-3 text-xs text-foreground whitespace-pre-line max-h-52 overflow-y-auto">
                  {stripDividers(selected.message) || selected.message}
                </div>
              </div>

              {/* Reply templates */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">Quick Reply</p>
                <div className="flex flex-wrap gap-2">
                  {REPLY_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.label}
                      onClick={() => setReplyText(tpl.text)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                        replyText === tpl.text
                          ? "bg-primary text-white"
                          : "bg-surface-high border border-outline-variant/20 text-outline hover:text-foreground"
                      }`}
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reply textarea */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline">OSCA Staff Response</label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type a reply to the senior..."
                  rows={3}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-outline-variant/20 bg-surface-low text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={handleResolve}
                  disabled={replying}
                  className="px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold hover:bg-blue-500/20 disabled:opacity-50 transition-colors"
                >
                  {replying ? "Saving..." : "Mark as Resolved"}
                </button>
                <button
                  onClick={handleReply}
                  disabled={!replyText.trim() || replying}
                  className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold disabled:opacity-40 hover:bg-primary/90 transition-colors"
                >
                  {replying ? "Sending..." : "Send Reply"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
