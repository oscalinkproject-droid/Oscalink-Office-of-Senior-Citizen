"use client";

import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { ProfileCorrection, ProfileCorrectionIssueType, ProfileCorrectionStatus, getProfileCorrections, updateProfileCorrection } from "@/app/actions/profile-corrections";
import { Button } from "@/components/ui/button";
import { Select, SelectOption } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableCell, TableBody, StatusBadge } from "@/components/ui/data-display";
import { usePathname, useSearchParams } from "next/navigation";

interface Correction {
  id: string;
  seniorId: string;
  issueType: ProfileCorrectionIssueType;
  fieldToCorrect: string;
  originalValue: string;
  requestedCorrection: string;
  remarksReason?: string;
  status: ProfileCorrectionStatus;
  createdAt: string;
  seniorFullName?: string;
}

type FilterStatus = ProfileCorrectionStatus | 'All';
type FilterIssueType = ProfileCorrectionIssueType | 'All';

function getIssueTypeColor(issueType: ProfileCorrectionIssueType): string {
  const colors: Record<ProfileCorrectionIssueType, string> = {
    misspelled_name: 'bg-blue-500/10 text-blue-400',
    wrong_birthdate: 'bg-purple-500/10 text-purple-400',
    address_update: 'bg-emerald-500/10 text-emerald-400',
    appeal: 'bg-amber-500/10 text-amber-400',
  };
  return colors[issueType] || 'bg-slate-500/10 text-slate-400';
}

function getIssueTypeLabel(issueType: ProfileCorrectionIssueType): string {
  const labels: Record<ProfileCorrectionIssueType, string> = {
    misspelled_name: 'Misspelled Name',
    wrong_birthdate: 'Wrong Birthdate',
    address_update: 'Address Update',
    appeal: 'Appeal',
  };
  return labels[issueType] || 'Other';
}

function getStatusColor(status: ProfileCorrectionStatus): string {
  const colors: Record<ProfileCorrectionStatus, string> = {
    PENDING: 'bg-amber-500/10 text-amber-400',
    APPROVED_UPDATED: 'bg-green-500/10 text-green-400',
    REJECTED: 'bg-red-500/10 text-red-400',
  };
  return colors[status] || 'bg-slate-500/10 text-slate-400';
}

function getStatusLabel(status: ProfileCorrectionStatus): string {
  const labels: Record<ProfileCorrectionStatus, string> = {
    PENDING: 'Pending',
    APPROVED_UPDATED: 'Approved & Updated',
    REJECTED: 'Rejected',
  };
  return labels[status] || 'Unknown';
}

function CorrectionsTable({
  corrections,
  onApprove,
  onReject,
}: {
  corrections: Correction[];
  onApprove: (correctionId: string, notes?: string) => void;
  onReject: (correctionId: string, notes?: string) => void;
}) {
  const [openApproveModal, setOpenApproveModal] = useState(false);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [approveNotes, setApproveNotes] = useState<string>('');

  const handleApprove = (id: string, notes?: string) => {
    setApproveId(id);
    setApproveNotes(notes || '');
    setOpenApproveModal(true);
  };

  const confirmApprove = async () => {
    if (!approveId || !approveNotes.trim()) return;
    await onApprove(approveId, approveNotes);
    setOpenApproveModal(false);
    setApproveId(null);
    setApproveNotes('');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">article</span>
          Profile Corrections & Appeals
        </h2>
      </div>

      <div className="bg-surface-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-surface-low border-b border-outline-variant/20">
              <TableRow>
                <TableCell className="px-4 py-3 text-left font-medium text-xs uppercase tracking-widest text-outline w-[180px] whitespace-nowrap">Date</TableCell>
                <TableCell className="px-4 py-3 text-left font-medium text-xs uppercase tracking-widest text-outline w-[200px]">Senior</TableCell>
                <TableCell className="px-4 py-3 text-left font-medium text-xs uppercase tracking-widest text-outline w-[160px]">Issue Type</TableCell>
                <TableCell className="px-4 py-3 text-left font-medium text-xs uppercase tracking-widest text-outline w-[140px]">Field</TableCell>
                <TableCell className="px-4 py-3 text-left font-medium text-xs uppercase tracking-widest text-outline w-[180px]">Original</TableCell>
                <TableCell className="px-4 py-3 text-left font-medium text-xs uppercase tracking-widest text-outline w-[180px]">Requested</TableCell>
                <TableCell className="px-4 py-3 text-left font-medium text-xs uppercase tracking-widest text-outline w-[140px]">Status</TableCell>
                <TableCell className="px-4 py-3 text-left font-medium text-xs uppercase tracking-widest text-outline w-[140px]">Action</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {corrections.length === 0 ? (
                <TableRow>
                  <TableCell className="px-4 py-12 text-center text-outline text-sm" colSpan={8}>
                    No correction requests found.
                  </TableCell>
                </TableRow>
              ) : corrections.map((correction) => (
                <TableRow
                  key={correction.id}
                  className="hover:bg-surface-low/60 transition-colors border-t border-outline-variant/10"
                >
                  <TableCell className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {correction.createdAt ? new Date(correction.createdAt).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <p className="text-xs font-bold text-foreground">{correction.seniorFullName || 'Unknown'}</p>
                    <p className="text-[10px] text-outline font-mono">{correction.seniorId || '—'}</p>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${getIssueTypeColor(correction.issueType)}`}>
                      {getIssueTypeLabel(correction.issueType)}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <p className="text-[10px] text-outline">{correction.fieldToCorrect}</p>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <p className="text-[10px] text-outline truncate max-w-[160px]">{correction.originalValue}</p>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <p className="text-[10px] text-outline truncate max-w-[160px]">{correction.requestedCorrection}</p>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(correction.status)}`}>
                      {getStatusLabel(correction.status)}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex gap-1">
                      {correction.status === 'PENDING' && (
                        <>
                          <Button
                            onClick={() => onApprove(correction.id)}
                            className="px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold hover:bg-green-500/20 transition-colors"
                          >
                            Approve
                          </Button>
                          <Button
                            onClick={() => onReject(correction.id)}
                            className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors"
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

export default function CorrectionsPage() {
  const [statusFilter, setStatusFilter] = useState<ProfileCorrectionStatus | 'All'>('PENDING');
  const [issueTypeFilter, setIssueTypeFilter] = useState<ProfileCorrectionIssueType | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCorrections = useCallback(async () => {
    setLoading(true);
    const result = await getProfileCorrections({
      status: statusFilter === 'All' ? undefined : statusFilter,
      issueType: issueTypeFilter === 'All' ? undefined : issueTypeFilter,
    });

    if (Array.isArray(result)) {
      setCorrections(result.map((c: any) => ({
        ...c,
        seniorFullName: c.seniorFullName || '',
      })));
    }
    setLoading(false);
  }, [statusFilter, issueTypeFilter]);

  useEffect(() => {
    loadCorrections();
  }, [loadCorrections]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profile Corrections & Appeals</h1>
          <p className="text-outline text-sm mt-1">Review and manage incoming correction requests from mobile app</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface-lowest rounded-2xl border border-outline-variant/20 p-4">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-outline mb-1">Status</label>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ProfileCorrectionStatus | 'All')}
              className="w-full bg-surface-low border border-outline-variant/30 rounded-lg py-2 px-3 text-[10px] text-foreground placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary/40"
            >
              <option value="PENDING">Pending</option>
              <option value="APPROVED_UPDATED">Approved & Updated</option>
              <option value="REJECTED">Rejected</option>
              <option value="All">All</option>
            </Select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-outline mb-1">Issue Type</label>
            <Select
              value={issueTypeFilter}
              onChange={(e) => setIssueTypeFilter(e.target.value as ProfileCorrectionIssueType | 'All')}
              className="w-full bg-surface-low border border-outline-variant/30 rounded-lg py-2 px-3 text-[10px] text-foreground placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary/40"
            >
              <option value="All">All Types</option>
              <option value="misspelled_name">Misspelled Name</option>
              <option value="wrong_birthdate">Wrong Birthdate</option>
              <option value="address_update">Address Update</option>
              <option value="appeal">Appeal</option>
            </Select>
          </div>

          <div className="flex-1 min-w-[250px]">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-outline mb-1">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by senior name or OSCA ID..."
              className="w-full bg-surface-low border border-outline-variant/30 rounded-lg py-2 px-3 text-[10px] text-foreground placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
        </div>
      </div>

      <CorrectionsTable
        corrections={corrections}
        onApprove={async (id: string) => {
          await updateProfileCorrection(id, 'APPROVED_UPDATED', 'Approved by OSCA staff');
          loadCorrections();
        }}
        onReject={async (id: string) => {
          await updateProfileCorrection(id, 'REJECTED', 'Rejected by OSCA staff');
          loadCorrections();
        }}
      />
    </div>
  );
}