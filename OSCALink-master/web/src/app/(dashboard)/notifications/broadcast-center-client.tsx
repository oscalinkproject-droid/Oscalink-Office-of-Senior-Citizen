'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  createBroadcast,
  updateBroadcast,
  sendBroadcastNow,
  deleteBroadcast,
  getBroadcasts,
  type BroadcastCategory,
} from '@/app/actions/notifications';
import { CorrectionInboxTable } from './correction-inbox-table';

interface Senior {
  id: string;
  full_name: string;
  registration_id: string;
  is_pensioner: boolean;
}

interface Broadcast {
  id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  target: string;
  target_barangay: string | null;
  recipient_count: number;
  created_by: string | null;
  send_at: string | null;
  status: string;
  created_at: string;
  creator_name?: string | null;
}

interface BroadcastCenterClientProps {
  seniors: Senior[];
  totalActive: number;
  pensionerCount: number;
  pushReadyCount: number;
  barangays: readonly string[];
}

const CATEGORY_OPTIONS: { value: BroadcastCategory; label: string; icon: string; color: string }[] = [
  { value: 'general', label: 'General Announcement', icon: 'campaign', color: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
  { value: 'priority', label: 'Priority Alert', icon: 'notification_important', color: 'bg-red-500/10 border-red-500/20 text-red-400' },
  { value: 'barangay', label: 'Local Advisory', icon: 'location_city', color: 'bg-purple-500/10 border-purple-500/20 text-purple-400' },
  { value: 'id_collection', label: 'ID Collection Notice', icon: 'badge', color: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
];

const CATEGORY_META: Record<string, { label: string; icon: string; color: string }> = Object.fromEntries(
  CATEGORY_OPTIONS.map(c => [c.value, { label: c.label, icon: c.icon, color: c.color }])
);

const TARGET_OPTIONS = [
  { value: 'all', label: 'All Active Seniors' },
  { value: 'pensioners', label: 'Pensioners Only (Green ID)' },
  { value: 'non_pensioners', label: 'Non-Pensioners Only (White ID)' },
  { value: 'barangay', label: 'Specific Barangay' },
  { value: 'senior', label: 'Single Senior' },
] as const;

const TARGET_LABELS: Record<string, string> = {
  all: 'All Active Seniors',
  pensioners: 'Pensioners',
  non_pensioners: 'Non-Pensioners',
  barangay: 'Specific Barangay',
  senior: 'Single Senior',
};

const TYPE_OPTIONS = [
  { value: 'info', label: 'Information', color: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
  { value: 'success', label: 'Success', color: 'bg-green-500/10 border-green-500/20 text-green-400' },
  { value: 'warning', label: 'Warning', color: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
] as const;

const TITLE_TEMPLATES = [
  { title: 'OSCA Announcement', message: '' },
  { title: 'Pension Disbursement', message: 'Quarterly pension payout schedule update — please visit the OSCA office for details.' },
  { title: 'ID Card Ready', message: 'Your physical Senior Citizen ID card is ready for pickup at the OSCA Main Office.' },
  { title: 'ID Collection Notice', message: 'Please claim your Senior Citizen ID at the designated collection schedule. Bring a valid ID.' },
  { title: 'Document Verification', message: 'Please bring your Certificate of Residency and valid ID for document verification at the OSCA office.' },
  { title: 'Office Closure Notice', message: 'The OSCA Main Office will be closed on the specified date. Please plan your visit accordingly.' },
  { title: 'Community Event', message: 'Join us for a community event for senior citizens. Details at the OSCA office.' },
  { title: 'Health Advisory', message: 'Important health advisory for all senior citizens. Contact OSCA for more information.' },
];

const CATEGORY_CHIP_STYLES: Record<string, { badge: string; text: string; dot: string }> = {
  general: { badge: 'bg-blue-500/10 text-blue-400', text: 'text-blue-400', dot: 'bg-blue-400' },
  priority: { badge: 'bg-red-500/10 text-red-400', text: 'text-red-400', dot: 'bg-red-400' },
  barangay: { badge: 'bg-purple-500/10 text-purple-400', text: 'text-purple-400', dot: 'bg-purple-400' },
  id_collection: { badge: 'bg-amber-500/10 text-amber-400', text: 'text-amber-400', dot: 'bg-amber-400' },
};

const toLocalInput = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatSchedule = (iso: string | null) => {
  if (!iso) return null;
  return new Date(iso).toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
};

export function BroadcastCenterClient({ seniors, totalActive, pensionerCount, pushReadyCount, barangays }: BroadcastCenterClientProps) {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<string>('info');
  const [category, setCategory] = useState<BroadcastCategory>('general');
  const [target, setTarget] = useState<string>('all');
  const [barangay, setBarangay] = useState('');
  const [seniorId, setSeniorId] = useState('');
  const [seniorSearch, setSeniorSearch] = useState('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; error?: string; count?: number; pushSent?: number; scheduled?: boolean } | null>(null);

  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loadingBcasts, setLoadingBcasts] = useState(false);
  const [activeView, setActiveView] = useState<'log' | 'inbox' | null>('log');

  const [editTarget, setEditTarget] = useState<Broadcast | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [editType, setEditType] = useState<string>('info');
  const [editCategory, setEditCategory] = useState<BroadcastCategory>('general');
  const [editScheduleDate, setEditScheduleDate] = useState('');
  const [editing, setEditing] = useState(false);
  const [editResult, setEditResult] = useState<{ success?: boolean; error?: string } | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Broadcast | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [sendingNowId, setSendingNowId] = useState<string | null>(null);

  const loadBroadcasts = useCallback(async () => {
    setLoadingBcasts(true);
    const list = await getBroadcasts();
    setBroadcasts(list);
    setLoadingBcasts(false);
  }, []);

  useEffect(() => {
    loadBroadcasts();
  }, [loadBroadcasts]);

  const handleSend = useCallback(async () => {
    if (!title.trim() || !message.trim()) return;
    if (target === 'barangay' && !barangay) return;
    if (target === 'senior' && !seniorId) return;
    if (scheduleEnabled && !scheduleDate) return;

    setSending(true);
    setResult(null);
    try {
      const res = await createBroadcast({
        title: title.trim(),
        message: message.trim(),
        type: type as 'info' | 'success' | 'warning',
        target: target as 'all' | 'pensioners' | 'non_pensioners' | 'barangay' | 'barangay_presidents' | 'senior',
        category: category as BroadcastCategory,
        seniorId: target === 'senior' ? seniorId : undefined,
        barangay: target === 'barangay' ? barangay : undefined,
        sendAt: scheduleEnabled ? new Date(scheduleDate).toISOString() : null,
      });
      setResult(res);
      if (res.success) {
        setTitle('');
        setMessage('');
        setScheduleEnabled(false);
        setScheduleDate('');
        setSeniorId('');
        setSeniorSearch('');
        setBarangay('');
        loadBroadcasts();
      }
      router.refresh();
    } catch (e: unknown) {
      setResult({ error: e instanceof Error ? e.message : 'Failed to send broadcast' });
    } finally {
      setSending(false);
    }
  }, [title, message, type, target, category, seniorId, barangay, scheduleEnabled, scheduleDate, router, loadBroadcasts]);

  const openEdit = (b: Broadcast) => {
    setEditTarget(b);
    setEditTitle(b.title);
    setEditMessage(b.message);
    setEditType(b.type);
    setEditCategory((b.category as BroadcastCategory) || 'general');
    setEditScheduleDate(toLocalInput(b.send_at));
    setEditResult(null);
  };

  const handleEditSave = async () => {
    if (!editTarget || !editTitle.trim() || !editMessage.trim() || !editScheduleDate) return;
    setEditing(true);
    setEditResult(null);
    const res = await updateBroadcast(editTarget.id, {
      title: editTitle.trim(),
      message: editMessage.trim(),
      type: editType as 'info' | 'success' | 'warning',
      target: editTarget.target as 'all' | 'pensioners' | 'non_pensioners' | 'barangay' | 'barangay_presidents' | 'senior',
      category: editCategory,
      sendAt: new Date(editScheduleDate).toISOString(),
    });
    setEditing(false);
    setEditResult(res);
    if (res.success) {
      setEditTarget(null);
      loadBroadcasts();
    }
  };

  const handleSendNow = async (b: Broadcast) => {
    setSendingNowId(b.id);
    const res = await sendBroadcastNow(b.id);
    setSendingNowId(null);
    if (res.success) loadBroadcasts();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await deleteBroadcast(deleteTarget.id);
    setDeleting(false);
    if (res.success) {
      setDeleteTarget(null);
      loadBroadcasts();
    }
  };

  const filteredSeniors = seniorSearch
    ? seniors.filter(s =>
        s.full_name.toLowerCase().includes(seniorSearch.toLowerCase()) ||
        s.registration_id.toLowerCase().includes(seniorSearch.toLowerCase())
      )
    : seniors;

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-headline font-bold text-foreground">Broadcast Center</h1>
          <p className="text-sm text-outline mt-1">
            Create, schedule, and send announcements directly to senior citizens via the mobile app.
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl bg-blue-500/5 border border-blue-500/10 p-4">
          <p className="text-2xl font-bold text-foreground">{totalActive}</p>
          <p className="text-xs text-outline mt-1">Active Seniors</p>
        </div>
        <div className="rounded-xl bg-green-500/5 border border-green-500/10 p-4">
          <p className="text-2xl font-bold text-green-400">{pensionerCount}</p>
          <p className="text-xs text-outline mt-1">Total Pensioners</p>
        </div>
        <div className="rounded-xl bg-purple-500/5 border border-purple-500/10 p-4">
          <p className="text-2xl font-bold text-purple-400">{broadcasts.filter(b => b.status === 'scheduled').length}</p>
          <p className="text-xs text-outline mt-1">Scheduled Broadcasts</p>
        </div>
        <div className="rounded-xl bg-gray-500/5 border border-gray-500/10 p-4">
          <p className="text-2xl font-bold text-outline">{broadcasts.filter(b => b.status === 'sent').length}</p>
          <p className="text-xs text-outline mt-1">Total Sent</p>
        </div>
      </div>

      {/* Compose Form */}
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-low p-6 space-y-5">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">campaign</span>
          Compose Broadcast
        </h2>

        {/* Title + Template */}
        <div>
          <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Title <span className="text-red-500">*</span></label>
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter broadcast title..."
              maxLength={100}
              className="flex-1 px-3 py-2 rounded-lg border border-outline-variant/20 bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <select
              value=""
              onChange={(e) => {
                const tpl = TITLE_TEMPLATES.find(t => t.title === e.target.value);
                if (tpl) {
                  setTitle(tpl.title);
                  if (tpl.message) setMessage(tpl.message);
                }
              }}
              className="sm:w-64 px-3 py-2 rounded-lg border border-outline-variant/20 bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="" disabled>Quick template...</option>
              {TITLE_TEMPLATES.map((tpl, i) => (
                <option key={i} value={tpl.title}>{tpl.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Category + Type - 2 column row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Broadcast Category <span className="text-red-500">*</span></label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as BroadcastCategory)}
              className="w-full mt-2 px-3 py-2 rounded-lg border border-outline-variant/20 bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {CATEGORY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Notification Type <span className="text-red-500">*</span></label>
            <div className="flex flex-wrap gap-2 mt-2">
              {TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setType(opt.value)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                    type === opt.value ? opt.color + ' shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]' : 'bg-surface-high border-outline-variant/20 text-outline hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Target Audience */}
        <div>
          <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Target Audience <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
            {TARGET_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setTarget(opt.value)}
                className={`px-3 py-2.5 rounded-lg text-xs font-semibold transition-all text-left ${
                  target === opt.value
                    ? 'bg-primary text-white shadow-md ring-1 ring-primary/40'
                    : 'bg-surface-high border border-outline-variant/20 text-outline hover:text-foreground hover:border-primary/40'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Barangay picker */}
        {target === 'barangay' && (
          <div>
            <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Select Barangay</label>
            <select
              value={barangay}
              onChange={(e) => setBarangay(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-outline-variant/20 bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="" disabled>Select a barangay...</option>
              {barangays.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        )}

        {/* Single Senior Search */}
        {target === 'senior' && (
          <div>
            <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Select Senior</label>
            <div className="relative">
              <input
                type="text"
                value={seniorSearch}
                onChange={(e) => { setSeniorSearch(e.target.value); if (seniorId) setSeniorId(''); }}
                placeholder="Search by name or registration ID..."
                className="w-full mt-1 px-3 py-2 rounded-lg border border-outline-variant/20 bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {seniorId && (
                <button
                  onClick={() => { setSeniorId(''); setSeniorSearch(''); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-outline hover:text-red-400 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>
            {!seniorId && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-outline-variant/20 bg-white divide-y divide-outline-variant/10">
                {filteredSeniors.slice(0, 30).length === 0 ? (
                  <p className="text-xs text-outline text-center py-4">No matching seniors found</p>
                ) : (
                  filteredSeniors.slice(0, 30).map(s => (
                    <button
                      key={s.id}
                      onClick={() => { setSeniorId(s.id); setSeniorSearch(s.full_name); }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-surface-low transition-colors ${
                        seniorId === s.id ? 'bg-primary/5 border-l-2 border-primary' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{s.full_name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${s.is_pensioner ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'}`}>
                          {s.is_pensioner ? 'Green' : 'White'}
                        </span>
                      </div>
                      <span className="text-[10px] text-outline">{s.registration_id}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Message */}
        <div>
          <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Message <span className="text-red-500">*</span></label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your broadcast message..."
            rows={4}
            maxLength={500}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-outline-variant/20 bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
          <p className="text-[10px] text-outline mt-1 text-right">{message.length}/500</p>
        </div>

        {/* Result */}
        {result && (
          <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
            result.success
              ? 'bg-green-500/10 border border-green-500/20 text-green-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>
            <span className="material-symbols-outlined text-sm">{result.success ? 'check_circle' : 'error'}</span>
            {result.success
              ? result.scheduled
                ? `Scheduled for delivery to ${result.count} recipient${result.count !== 1 ? 's' : ''}.`
                : `Delivered to ${result.count} recipient${result.count !== 1 ? 's' : ''} in-app` +
                  (typeof result.pushSent === 'number' && result.pushSent > 0
                    ? ` · ${result.pushSent} push notification${result.pushSent !== 1 ? 's' : ''} sent.`
                    : ' (in-app only).')
              : result.error}
          </div>
        )}

        {/* Schedule + Send */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-outline-variant/20">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={scheduleEnabled}
              onChange={(e) => setScheduleEnabled(e.target.checked)}
              className="accent-primary w-4 h-4"
            />
            <span className="text-xs font-bold text-foreground">Schedule for later</span>
          </label>
          {scheduleEnabled && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-1 min-w-[220px]">
              <input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 rounded-lg border border-outline-variant/20 bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <p className="text-[10px] text-outline">Hidden in mobile until set time</p>
            </div>
          )}
          {!scheduleEnabled && (
            <div className="text-[10px] text-outline sm:flex-1">
              {target === 'all' && (
                <>
                  <p className="text-xs font-semibold text-foreground">Will reach {totalActive} active seniors</p>
                  <p className="mt-0.5">{pushReadyCount} push-ready &middot; {totalActive - pushReadyCount} in-app only</p>
                </>
              )}
              {target === 'pensioners' && <p>Will reach {pensionerCount} pensioners</p>}
              {target === 'non_pensioners' && <p>Will reach {totalActive - pensionerCount} non-pensioners</p>}
              {target === 'barangay' && (barangay ? <p>Will reach seniors in Barangay {barangay}</p> : 'Select a barangay above')}
              {target === 'senior' && (seniorId ? 'Will reach the selected senior' : 'Select a senior above')}
            </div>
          )}
          <button
            onClick={handleSend}
            disabled={
              !title.trim() || !message.trim() || sending ||
              (target === 'senior' && !seniorId) ||
              (target === 'barangay' && !barangay) ||
              (scheduleEnabled && !scheduleDate)
            }
            className="self-end sm:self-auto px-6 py-2.5 rounded-lg bg-primary text-white text-xs font-bold disabled:opacity-40 hover:bg-primary/90 active:bg-primary/80 active:scale-[0.98] transition-all flex items-center gap-2 shadow-sm shadow-primary/20"
          >
            <span className="material-symbols-outlined text-sm">{scheduleEnabled ? 'schedule_send' : 'send'}</span>
            {sending ? 'Processing...' : scheduleEnabled ? 'Schedule Broadcast' : 'Send Broadcast'}
          </button>
        </div>
      </div>

      {/* View Toggle: Correction Inbox / Broadcast Log */}
      <div className="flex items-center gap-1 bg-surface-low rounded-xl p-1 border border-outline-variant/20 w-fit">
        <button
          onClick={() => { setActiveView(activeView === 'inbox' ? null : 'inbox'); }}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeView === 'inbox' ? 'bg-primary text-white shadow-md' : 'text-outline hover:text-foreground'
          }`}
        >
          <span className="material-symbols-outlined text-sm">forum</span>
          Correction Inbox
        </button>
        <button
          onClick={() => { setActiveView(activeView === 'log' ? null : 'log'); if (activeView !== 'log') loadBroadcasts(); }}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeView === 'log' ? 'bg-primary text-white shadow-md' : 'text-outline hover:text-foreground'
          }`}
        >
          <span className="material-symbols-outlined text-sm">history</span>
          Broadcast Log
        </button>
      </div>

      {/* Broadcast Log */}
      {activeView === 'log' && (
        <div className="rounded-2xl border border-outline-variant/20 bg-surface-low p-6 space-y-4">
          <h2 className="text-base font-bold text-foreground">Broadcast Log</h2>
          {loadingBcasts ? (
            <p className="text-xs text-outline">Loading broadcasts...</p>
          ) : broadcasts.length === 0 ? (
            <p className="text-xs text-outline">No broadcasts sent yet. Compose one above to get started.</p>
          ) : (
            <div className="space-y-2">
              {broadcasts.map(item => {
                const cat = CATEGORY_META[item.category] || CATEGORY_META.general;
                const isScheduled = item.status === 'scheduled';
                return (
                  <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl bg-white">
                    <span className={`w-9 h-9 rounded-lg flex items-center justify-center material-symbols-outlined text-lg ${cat.color}`}>
                      {cat.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${CATEGORY_CHIP_STYLES[item.category]?.badge || 'bg-slate-500/10 text-slate-400'}`}>
                          {cat.label}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${
                          isScheduled
                            ? 'bg-amber-500/10 text-amber-400'
                            : item.status === 'cancelled'
                              ? 'bg-red-500/10 text-red-400'
                              : 'bg-green-500/10 text-green-400'
                        }`}>
                          {isScheduled ? 'Scheduled' : item.status === 'cancelled' ? 'Cancelled' : 'Sent'}
                        </span>
                      </div>
                      <p className="text-[11px] text-outline truncate mt-0.5">{item.message}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] text-outline">{TARGET_LABELS[item.target] || item.target}</span>
                        {item.target === 'barangay' && item.target_barangay && (
                          <span className="text-[10px] font-bold text-primary">Barangay {item.target_barangay}</span>
                        )}
                        <span className="text-[10px] text-outline">&bull; {item.recipient_count} recipient{item.recipient_count !== 1 ? 's' : ''}</span>
                        {item.creator_name && <span className="text-[10px] text-outline">&bull; {item.creator_name}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      {isScheduled && (
                        <>
                          <button
                            onClick={() => openEdit(item)}
                            className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-[10px] font-bold hover:bg-blue-500/20 transition-colors flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[12px]">edit</span>
                            Edit
                          </button>
                          <button
                            onClick={() => handleSendNow(item)}
                            disabled={sendingNowId === item.id}
                            className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-bold hover:bg-primary/20 transition-colors flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[12px]">send</span>
                            {sendingNowId === item.id ? 'Sending...' : 'Send Now'}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="px-2 py-1 rounded-lg bg-red-500/10 text-red-400 text-[10px] font-bold hover:bg-red-500/20 transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[12px]">delete</span>
                        Delete
                      </button>
                      <span className="text-[10px] text-outline w-full text-right lg:w-auto">
                        {isScheduled && formatSchedule(item.send_at)
                          ? `Scheduled ${formatSchedule(item.send_at)}`
                          : timeAgo(item.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Correction Inbox */}
      {activeView === 'inbox' && (
        <CorrectionInboxTable />
      )}

      {/* Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface-lowest rounded-2xl border border-outline-variant/20 p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Edit Scheduled Broadcast</h3>
              <button onClick={() => setEditTarget(null)} className="text-outline hover:text-foreground">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div>
              <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={100}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-outline-variant/20 bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Message</label>
              <textarea
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
                rows={3}
                maxLength={500}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-outline-variant/20 bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Type</label>
              <div className="flex gap-2 mt-2">
                {TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setEditType(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      editType === opt.value ? opt.color : 'bg-surface-high border-outline-variant/20 text-outline'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Category</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {CATEGORY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setEditCategory(opt.value)}
                    className={`px-3 py-2 rounded-lg text-[11px] font-bold transition-all border text-left flex items-center gap-2 ${
                      editCategory === opt.value
                        ? opt.color
                        : 'bg-surface-high border-outline-variant/20 text-outline hover:text-foreground'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Schedule Time</label>
              <input
                type="datetime-local"
                value={editScheduleDate}
                onChange={(e) => setEditScheduleDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-outline-variant/20 bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {editResult && (
              <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                editResult.success
                  ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}>
                <span className="material-symbols-outlined text-sm">{editResult.success ? 'check_circle' : 'error'}</span>
                {editResult.success ? 'Broadcast updated. Recipients will see the new version at the scheduled time.' : editResult.error}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button onClick={() => setEditTarget(null)} className="px-4 py-2 rounded-lg text-xs text-outline font-bold">
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={!editTitle.trim() || !editMessage.trim() || !editScheduleDate || editing}
                className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold disabled:opacity-40"
              >
                {editing ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface-lowest rounded-2xl border border-outline-variant/20 p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg text-red-400">delete</span>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Delete Broadcast</p>
                <p className="text-[11px] text-outline mt-0.5">
                  {deleteTarget.status === 'scheduled'
                    ? 'This removes the scheduled broadcast before it reaches any senior.'
                    : 'This deletes the broadcast and removes its copies from senior devices.'}
                </p>
              </div>
            </div>
            <p className="text-xs text-outline">
              Are you sure you want to delete <span className="font-bold text-foreground">&quot;{deleteTarget.title}&quot;</span>?
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-outline hover:text-foreground transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Broadcast'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}