'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { sendReply } from '@/app/actions/notifications';

interface Report {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
  reporter_id: string;
  reporter_name?: string;
  reporter_reg_id?: string;
  status: string | null;
}

interface Reply {
  id: string;
  title: string;
  message: string;
  created_at: string;
  parent_id: string;
}

const REPLY_TEMPLATES = [
  { label: 'Received', text: 'We have received your report and are processing it. You will be notified once updated.' },
  { label: 'Visit Office', text: 'Please visit the OSCA Main Office to have your records corrected. Bring a valid ID.' },
  { label: 'Need Info', text: 'We need additional information to process your request. Please visit the OSCA office.' },
  { label: 'Resolved', text: 'Your inquiry has been resolved. Thank you for reaching out to OSCA.' },
];

export function InquiriesClient({ userId: _userId }: { userId: string }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Report | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const timeAgo = useCallback((dateStr: string) => {
    const diff = now - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }, [now]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  const loadReports = useCallback(async (): Promise<Report[]> => {
    const supabase = createClient();
    let query = supabase
      .from('notifications')
      .select('*')
      .not('reporter_id', 'is', null)
      .not('status', 'eq', 'feedback');

    if (statusFilter === 'resolved') {
      query = query.eq('status', 'resolved');
    } else if (statusFilter === 'all') {
      query = query.or('status.is.null,status.not.eq.resolved');
    } else if (statusFilter === 'open') {
      query = query.or('status.is.null,status.eq.open');
    }

    const { data: notifs } = await query
      .order('created_at', { ascending: false })
      .limit(50);

    if (!notifs) return [];

    const reporterIds = [...new Set(notifs.map(n => n.reporter_id).filter(Boolean))] as string[];
    const { data: reporters } = await supabase
      .from('seniors')
      .select('auth_id, full_name, registration_id')
      .in('auth_id', reporterIds);

    const reporterMap = new Map<string, { name: string; regId: string }>();
    (reporters || []).forEach(r => {
      if (r.auth_id) reporterMap.set(r.auth_id, { name: r.full_name, regId: r.registration_id });
    });

    const reportIds = notifs.map(n => n.id);
    const { data: allReplies } = await supabase
      .from('notifications')
      .select('parent_id')
      .in('parent_id', reportIds);

    const repliedIds = new Set((allReplies || []).map(r => r.parent_id));

    return notifs.map(n => ({
      ...n,
      reporter_name: reporterMap.get(n.reporter_id)?.name,
      reporter_reg_id: reporterMap.get(n.reporter_id)?.regId,
      status: n.status || (repliedIds.has(n.id) ? 'replied' : 'open'),
    }));
  }, [statusFilter]);

  useEffect(() => {
    loadReports().then(data => {
      setReports(data);
      setLoading(false);
    });

    const supabase = createClient();
    channelRef.current = supabase
      .channel('inquiries-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
      }, () => {
        loadReports();
        if (selected) {
          const supabase2 = createClient();
          supabase2
            .from('notifications')
            .select('id, title, message, created_at, parent_id')
            .eq('parent_id', selected.id)
            .order('created_at', { ascending: true })
            .then(({ data }) => { if (data) setReplies(data); });
        }
      })
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [loadReports, selected]);

  const loadReplies = async (reportId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from('notifications')
      .select('id, title, message, created_at, parent_id')
      .eq('parent_id', reportId)
      .order('created_at', { ascending: true });
    setReplies(data || []);
  };

  const handleSelect = (report: Report) => {
    setSelected(report);
    loadReplies(report.id);
  };

  const handleReply = async () => {
    if (!selected || !replyText.trim()) return;
    setSending(true);
    const result = await sendReply(selected.id, replyText.trim(), selected.reporter_id);

    if (result.success) {
      const supabase = createClient();
      await supabase
        .from('notifications')
        .update({ status: 'replied' })
        .eq('id', selected.id);

      setReplyText('');
      loadReplies(selected.id);
      loadReports();
      setSelected(prev => prev ? { ...prev, status: 'replied' } : null);
    }
    setSending(false);
  };

  const handleTemplateReply = async (text: string) => {
    if (!selected) return;
    setSending(true);
    const result = await sendReply(selected.id, text, selected.reporter_id);

    if (result.success) {
      const isResolved = text.includes('has been resolved');
      const supabase = createClient();
      await supabase
        .from('notifications')
        .update({ status: isResolved ? 'resolved' : 'replied' })
        .eq('id', selected.id);

      setReplyText('');
      loadReplies(selected.id);
      loadReports();
      if (isResolved) setSelected(null);
      else setSelected(prev => prev ? { ...prev, status: 'replied' } : null);
    }
    setSending(false);
  };

  const handleResolve = async (reportId: string) => {
    const current = reports.find(r => r.id === reportId);
    const newStatus = current?.status === 'resolved' ? 'replied' : 'resolved';
    const supabase = createClient();
    await supabase
      .from('notifications')
      .update({ status: newStatus })
      .eq('id', reportId);

    if (selected?.id === reportId) {
      setSelected(prev => prev ? { ...prev, status: newStatus } : null);
    }
    loadReports();
  };

  const filteredReports = statusFilter === 'open'
    ? reports.filter(r => r.status === 'open')
    : reports;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-headline font-bold text-foreground">Support Inquiries</h1>
          <p className="text-sm text-outline mt-1">Reports and feedback from senior citizens via the mobile app.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-4">
          <p className="text-2xl font-bold text-foreground">{reports.length}</p>
          <p className="text-xs text-outline mt-1">Active Inquiries</p>
        </div>
        <div className="rounded-xl bg-red-500/5 border border-red-500/10 p-4">
          <p className="text-2xl font-bold text-red-400">{reports.filter(r => r.status === 'open').length}</p>
          <p className="text-xs text-outline mt-1">Unanswered</p>
        </div>
        <div className="rounded-xl bg-green-500/5 border border-green-500/10 p-4">
          <p className="text-2xl font-bold text-green-400">{reports.filter(r => r.status === 'replied').length}</p>
          <p className="text-xs text-outline mt-1">Replied</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[{ key: 'all', label: 'All Active' }, { key: 'open', label: 'Unanswered' }, { key: 'resolved', label: 'Resolved' }].map(f => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
              statusFilter === f.key
                ? 'bg-primary text-white'
                : 'bg-surface-high border border-outline-variant/20 text-outline hover:text-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-1 rounded-2xl border border-outline-variant/20 bg-surface-low p-4 space-y-2 max-h-[600px] overflow-y-auto">
          {filteredReports.length === 0 ? (
            <p className="text-xs text-outline text-center py-8">No inquiries to show.</p>
          ) : (
            filteredReports.map(report => (
              <button
                key={report.id}
                onClick={() => handleSelect(report)}
                className={`w-full text-left p-3 rounded-xl transition-all ${
                  selected?.id === report.id
                    ? 'bg-primary/10 border border-primary/20'
                    : 'bg-white hover:bg-surface-high border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-outline uppercase">
                    {report.reporter_name || 'Senior'}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    report.status === 'replied'
                      ? 'bg-green-500/10 text-green-400'
                      : report.status === 'resolved'
                      ? 'bg-blue-500/10 text-blue-400'
                      : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {report.status === 'replied' ? 'Replied' : report.status === 'resolved' ? 'Resolved' : 'Open'}
                  </span>
                </div>
                <p className="text-xs font-bold text-foreground truncate">{report.title}</p>
                <p className="text-[10px] text-outline mt-0.5">{timeAgo(report.created_at)}</p>
              </button>
            ))
          )}
        </div>

        {/* Detail */}
        <div className="lg:col-span-2 rounded-2xl border border-outline-variant/20 bg-surface-low p-6">
          {!selected ? (
            <div className="flex flex-col items-center justify-center py-16 text-outline">
              <span className="material-symbols-outlined text-4xl mb-3">support_agent</span>
              <p className="text-sm">Select an inquiry to view details</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Original Report */}
              <div className="rounded-xl bg-white p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-outline font-bold uppercase">
                      {selected.reporter_name || 'Senior'} — {selected.reporter_reg_id || 'Unknown ID'}
                    </p>
                    <p className="text-[9px] text-outline">{timeAgo(selected.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                      selected.status === 'replied'
                        ? 'bg-green-500/10 text-green-400'
                        : selected.status === 'resolved'
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {selected.status === 'replied' ? 'Replied' : selected.status === 'resolved' ? 'Resolved' : 'Open'}
                    </span>
                    <button
                      onClick={() => handleResolve(selected.id)}
                      className="text-[9px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                    >
                      {selected.status === 'resolved' ? 'Reopen' : 'Mark Resolved'}
                    </button>
                  </div>
                </div>
                <h3 className="text-sm font-bold text-foreground">{selected.title}</h3>
                <p className="text-xs text-outline whitespace-pre-wrap">{selected.message}</p>
              </div>

              {/* Replies */}
              {replies.length === 0 && selected.status !== 'open' ? (
                <p className="text-[10px] text-outline text-center py-4">No replies yet.</p>
              ) : (
                replies.map(reply => (
                  <div key={reply.id} className="rounded-xl bg-blue-500/5 border border-blue-500/10 p-4 ml-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-blue-400 text-sm">reply</span>
                      <p className="text-[10px] text-outline font-bold uppercase">OSCA Reply</p>
                      <p className="text-[9px] text-outline">{timeAgo(reply.created_at)}</p>
                    </div>
                    <p className="text-xs text-foreground whitespace-pre-wrap">{reply.message}</p>
                  </div>
                ))
              )}

              {/* Reply Form */}
              <div className="rounded-xl bg-white p-4 space-y-3">
                <p className="text-[10px] font-bold text-outline uppercase">Quick Reply</p>
                <div className="flex gap-2 flex-wrap">
                  {REPLY_TEMPLATES.map(tpl => (
                    <button
                      key={tpl.label}
                      onClick={() => handleTemplateReply(tpl.text)}
                      disabled={sending}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-surface-high border border-outline-variant/20 text-outline hover:text-foreground hover:border-primary/30 disabled:opacity-50 transition-colors"
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Or type a custom reply..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant/20 bg-white text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleReply}
                    disabled={!replyText.trim() || sending}
                    className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold disabled:opacity-40 hover:bg-primary/90 transition-colors"
                  >
                    {sending ? 'Sending...' : 'Send Reply'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
