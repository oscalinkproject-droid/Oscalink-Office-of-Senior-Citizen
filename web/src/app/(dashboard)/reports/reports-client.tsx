"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { generatePDF, generateExcel, generateCSV } from "@/lib/exports";
import { useToast } from "@/components/ui/toast";

interface SeniorRow {
  id: string;
  full_name: string | null;
  registration_id: string | null;
  id_number: string | null;
  birthdate: string | null;
  sex: string | null;
  barangay: string | null;
  purok: string | null;
  contact_number: string | null;
  classification: string | null;
  is_pensioner: boolean | null;
  status: string | null;
  created_at: string | null;
}

type ReportType =
  | 'active'
  | 'pensioners'
  | 'non_pensioners'
  | 'transferred'
  | 'deceased_archived'
  | 'pending';

const REPORT_LABELS: Record<ReportType, string> = {
  active: 'Active Seniors Registry',
  pensioners: 'Pensioners Masterlist (Green ID)',
  non_pensioners: 'Non-Pensioners Masterlist (White ID)',
  transferred: 'Transferred Seniors List',
  deceased_archived: 'Deceased / Archived Data Bank',
  pending: 'Pending Applications Summary',
};

const FIELDS: { key: keyof SeniorRow; label: string }[] = [
  { key: 'full_name', label: 'Full Name' },
  { key: 'registration_id', label: 'Registration ID' },
  { key: 'id_number', label: 'ID Number' },
  { key: 'birthdate', label: 'Birthdate' },
  { key: 'sex', label: 'Sex' },
  { key: 'barangay', label: 'Barangay' },
  { key: 'purok', label: 'Purok' },
  { key: 'classification', label: 'Classification' },
  { key: 'is_pensioner', label: 'Pensioner' },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Registered On' },
];

const PREVIEW_LIMIT = 10;

export function ReportsClient() {
  const supabase = createClient();
  const { toast } = useToast();

  const [reportType, setReportType] = useState<ReportType>('active');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [rows, setRows] = useState<SeniorRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const select = ['id', ...FIELDS.map(f => f.key)].join(',');
  const columns = FIELDS.map(f => f.label);
  const needsDateRange = reportType === 'pending';

  const showDateLabel = (v: string | null) => (typeof v === 'string' && v ? v.split('T')[0] : '-');

  const runReport = async () => {
    setLoading(true);
    setMessage(null);
    setRows(null);

    if (reportType === 'pending' && (!fromDate || !toDate)) {
      setMessage('Please provide both a start and end date for the Pending Applications report.');
      setLoading(false);
      return;
    }

    let query = supabase.from('seniors').select(select);

    switch (reportType) {
      case 'active':
        query = query.eq('status', 'Active');
        break;
      case 'pensioners':
        query = query.eq('is_pensioner', true);
        break;
      case 'non_pensioners':
        query = query.eq('is_pensioner', false);
        break;
      case 'transferred':
        query = query.eq('status', 'Transferred');
        break;
      case 'deceased_archived':
        query = query.in('status', ['Deceased', 'Archived']);
        break;
      case 'pending':
        query = query.in('status', ['Pending', 'Pending Barangay', 'Pending OSCA']);
        break;
    }

    // Apply date range to the created_at filter where relevant.
    if (fromDate && toDate) {
      query = query
        .gte('created_at', `${fromDate}T00:00:00`)
        .lte('created_at', `${toDate}T23:59:59`);
    }

    query = query.order('full_name', { ascending: true });

    const { data, error } = await query;
    setLoading(false);

    if (error) {
      setMessage('Failed to load report: ' + error.message);
      return;
    }

    const resultRows = (data || []) as unknown as SeniorRow[];

    setRows(resultRows);
    if (resultRows.length === 0) {
      setMessage('No records found for the selected filters.');
    }
  };

  const toExport = (source: SeniorRow[]) =>
    source.map(r => {
      const obj: Record<string, string> = {};
      for (const f of FIELDS) {
        let v: unknown = r[f.key];
        if (f.key === 'is_pensioner') v = r.is_pensioner ? 'Yes' : 'No';
        if ((f.key === 'created_at' || f.key === 'birthdate') && typeof v === 'string') {
          v = v.split('T')[0];
        }
        obj[f.label] = v == null || v === '' ? '-' : String(v);
      }
      return obj;
    });

  const exportPDF = async () => {
    if (!rows?.length) return;
    try {
      const data = toExport(rows) as unknown as Record<string, unknown>[];
      await generatePDF(REPORT_LABELS[reportType], data, columns, { certify: false }, 'landscape');
      toast('PDF report downloaded.', 'success');
    } catch (e) {
      toast(`PDF export failed: ${e instanceof Error ? e.message : 'unknown error'}`, 'error');
    }
  };

  const exportExcel = async () => {
    if (!rows?.length) return;
    try {
      await generateExcel(REPORT_LABELS[reportType], toExport(rows) as unknown as Record<string, unknown>[], columns);
      toast('Excel sheet downloaded.', 'success');
    } catch (e) {
      toast(`Excel export failed: ${e instanceof Error ? e.message : 'unknown error'}`, 'error');
    }
  };

  const exportCSV = () => {
    if (!rows?.length) return;
    generateCSV(REPORT_LABELS[reportType], toExport(rows) as unknown as Record<string, unknown>[]);
    toast('CSV file downloaded.', 'success');
  };

  const inputClass = "w-full bg-surface-low border border-outline-variant/30 rounded-xl py-2.5 px-3 text-xs text-foreground placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary/40";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold font-headline tracking-tighter text-foreground">Reports Generation</h1>
        <p className="text-outline mt-1 text-sm">
          Generate institutional reports for senior records, masterlists, and archived data.
        </p>
      </div>

      {/* Control panel */}
      <div className="bg-surface-lowest rounded-2xl border border-outline-variant/30 p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5 md:col-span-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Report Type</label>
            <select value={reportType} onChange={(e) => { setReportType(e.target.value as ReportType); setMessage(null); }} className={inputClass}>
              {(Object.entries(REPORT_LABELS) as [ReportType, string][]).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Start Date</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputClass} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-outline">End Date</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="text-[10px] text-outline">
          {needsDateRange
            ? 'Date range is required to filter pending applications by application date.'
            : 'Optionally set a date range to filter records by registration date.'}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 border-t border-outline-variant/10 pt-4">
          <button
            onClick={runReport}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-sm">{loading ? 'progress_activity' : 'manage_search'}</span>
            {loading ? 'Generating...' : 'Run Report'}
          </button>

          {rows && rows.length > 0 && (
            <>
              <button
                onClick={exportPDF}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                Download PDF Report
              </button>
              <button
                onClick={exportExcel}
                className="px-5 py-2.5 rounded-xl bg-surface-low border border-outline-variant/30 text-xs font-bold text-foreground hover:bg-surface-high transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">table_view</span>
                Export Excel Sheet
              </button>
              <button
                onClick={exportCSV}
                className="px-5 py-2.5 rounded-xl bg-surface-low border border-outline-variant/30 text-xs font-bold text-foreground hover:bg-surface-high transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                Export CSV
              </button>
              <span className="text-[11px] text-outline ml-1">
                {rows.length} record{rows.length !== 1 ? 's' : ''} ready
              </span>
            </>
          )}
        </div>

        {message && (
          <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
            {message}
          </div>
        )}
      </div>

      {/* Preview Panel */}
      {rows && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-sm">table</span>
            <h3 className="font-headline font-bold text-foreground text-sm">Table Preview</h3>
            {rows.length > PREVIEW_LIMIT && (
              <span className="text-[10px] font-bold text-outline uppercase tracking-widest">
                Showing first {PREVIEW_LIMIT} of {rows.length} records
              </span>
            )}
          </div>

          <div className="bg-surface-lowest rounded-2xl border border-outline-variant/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-outline-variant/30 bg-surface-low/40">
                    {FIELDS.map(f => (
                      <th key={f.key} className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-outline whitespace-nowrap">
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {rows.slice(0, PREVIEW_LIMIT).map(r => (
                    <tr key={r.id} className="hover:bg-surface-low">
                      {FIELDS.map(f => {
                        let v: unknown = r[f.key];
                        if (f.key === 'is_pensioner') v = r.is_pensioner ? 'Yes' : 'No';
                        if (f.key === 'created_at') v = showDateLabel(r.created_at);
                        if (f.key === 'birthdate') v = showDateLabel(r.birthdate);
                        return (
                          <td key={f.key} className="px-4 py-2.5 text-xs text-foreground whitespace-nowrap">
                            {v == null || v === '' ? '-' : String(v)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > PREVIEW_LIMIT && (
              <div className="px-4 py-3 border-t border-outline-variant/10 text-[11px] text-outline">
                This is a preview. Use the PDF or Excel/CSV buttons to download the complete filtered report ({rows.length} records).
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
