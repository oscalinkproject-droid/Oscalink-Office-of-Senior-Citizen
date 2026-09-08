"use client";

interface ProfileIssue {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
  reporter_id?: string | null;
  parent_id?: string | null;
}

interface ProfileIssuesSectionProps {
  history: ProfileIssue[];
  onReply: (item: ProfileIssue) => void;
  timeAgo: (dateStr: string) => string;
}

export function ProfileIssuesSection({ history, onReply, timeAgo }: ProfileIssuesSectionProps) {
  const issues = history.filter((item) => item.reporter_id && !item.parent_id);

  return (
    <div className="rounded-2xl border border-outline-variant/20 bg-surface-low p-6 space-y-4">
      <div>
        <h2 className="text-base font-bold text-foreground">Profile Correction Requests</h2>
        <p className="text-xs text-outline mt-1">
          Correction requests submitted by seniors through the mobile app.
        </p>
      </div>

      {issues.length === 0 ? (
        <p className="text-xs text-outline">No correction requests yet.</p>
      ) : (
        <div className="space-y-2">
          {issues.map((item) => (
            <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl bg-white">
              <span className="material-symbols-outlined text-lg mt-0.5 text-amber-400">edit_note</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
                <p className="text-[11px] text-outline mt-0.5 whitespace-pre-line line-clamp-3">{item.message}</p>
                <p className="text-[10px] text-outline mt-1">{timeAgo(item.created_at)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onReply(item)}
                  className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-bold hover:bg-primary/20 transition-colors"
                >
                  Reply
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
