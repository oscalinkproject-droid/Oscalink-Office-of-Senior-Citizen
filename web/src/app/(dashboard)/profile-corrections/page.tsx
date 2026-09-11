"use client";

import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { ProfileCorrection, ProfileCorrectionIssueType, ProfileCorrectionStatus, ProfileCorrectionFormData, createProfileCorrection, getProfileCorrections, updateProfileCorrection } from "@/app/actions/profile-corrections";
import { Table, TableHeader, TableRow, TableCell, TableBody, StatusBadge } from "@/components/ui/data-display";
import { Button } from "@/components/ui/button";
import { Input, Select, SelectOption, Textarea } from "@/components/ui/input";
import { usePathname, useSearchParams } from "next/navigation";

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

function CorrectionTable({
  corrections,
  onApprove,
  onReject,
}: {
  corrections: ProfileCorrection[];
  onApprove: (correctionId: string, notes?: string) => void;
  onReject: (correctionId: string, notes?: string) => void;
}) {
  const [filters, setFilters] = useState<{
    status: FilterStatus;
    issueType: FilterIssueType;
    seniorName: string;
  }>({
    status: 'PENDING',
    issueType: 'misspelled_name' as ProfileCorrectionIssueType,
    seniorName: '',
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openApproveModal, setOpenApproveModal] = useState(false);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [approveNotes, setApproveNotes] = useState<string>('');

  const loadCorrections = useCallback(async () => {
    setLoading(true);
    const result = await getProfileCorrections({
      status: filters.status === 'All' ? undefined : filters.status,
      issueType: filters.issueType === 'All' ? undefined : filters.issueType,
    });
    // Handle loading result
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    loadCorrections();
  }, [loadCorrections]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">article</span>
          Profile Corrections & Appeals
        </h2>
        <div className="flex items-center gap-2 text-[10px] font-bold">
          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400">{"Pending"}</span>
          <span className="px-2.5 py-1 rounded-full bg-green-500/10 text-green-400">{"Approved"}</span>
          <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-400">{"Rejected"}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value as FilterStatus })}
          className="bg-surface-low border border-outline-variant/30 rounded-lg py-2 px-3 text-[10px] text-foreground placeholder:text-outline"
        >
          <SelectOption value="PENDING">Pending</SelectOption>
          <SelectOption value="APPROVED_UPDATED">Approved & Updated</SelectOption>
          <SelectOption value="REJECTED">Rejected</SelectOption>
          <SelectOption value="All">All</SelectOption>
        </Select>

        <Select
          value={filters.issueType}
          onChange={(e) => setFilters({ ...filters, issueType: e.target.value as FilterIssueType })}
          className="bg-surface-low border border-outline-variant/30 rounded-lg py-2 px-3 text-[10px] text-foreground placeholder:text-outline"
        >
          <SelectOption value="All">All Types</SelectOption>
          <SelectOption value="misspelled_name">Misspelled Name</SelectOption>
          <SelectOption value="wrong_birthdate">Wrong Birthdate</SelectOption>
          <SelectOption value="address_update">Address Update</SelectOption>
          <SelectOption value="appeal">Appeal</SelectOption>
        </Select>

        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by senior name or OSCA ID..."
          className="bg-surface-low border border-outline-variant/30 rounded-lg py-2 px-3 text-[10px] text-foreground placeholder:text-outline flex-1"
        />
      </div>

      {/* Table */}
      <div className="bg-surface-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell className="text-[10px] uppercase tracking-widest text-outline">Date</TableCell>
                <TableCell className="text-[10px] uppercase tracking-widest text-outline">Senior</TableCell>
                <TableCell className="text-[10px] uppercase tracking-widest text-outline">Issue Type</TableCell>
                <TableCell className="text-[10px] uppercase tracking-widest text-outline">Field</TableCell>
                <TableCell className="text-[10px] uppercase tracking-widest text-outline">Original</TableCell>
                <TableCell className="text-[10px] uppercase tracking-widest text-outline">Requested</TableCell>
                <TableCell className="text-[10px] uppercase tracking-widest text-outline">Status</TableCell>
                <TableCell className="text-[10px] uppercase tracking-widest text-outline">Action</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {corrections.length === 0 ? (
                <TableRow>
                  <TableCell className="px-5 py-12 text-center text-outline text-sm">
                    No correction requests found.
                  </TableCell>
                </TableRow>
              ) : corrections.map((correction) => (
                <TableRow
                  key={correction.id}
                  className="hover:bg-surface-low/60 transition-colors"
                >
                  <TableCell className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {correction.createdAt ? new Date(correction.createdAt).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell className="px-5 py-3">
                    <p className="text-xs font-bold text-foreground">{correction.seniorFullName || 'Unknown'}</p>
                    <p className="text-[10px] text-outline font-mono">{correction.seniorId || '—'}</p>
                  </TableCell>
                  <TableCell className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${getIssueTypeColor(correction.issueType)}`}>
                      {getIssueTypeLabel(correction.issueType)}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-3">
                    <p className="text-[10px] text-outline">{correction.fieldToCorrect}</p>
                  </TableCell>
                  <TableCell className="px-5 py-3">
                    <p className="text-[10px] text-outline truncate">{correction.originalValue}</p>
                  </TableCell>
                  <TableCell className="px-5 py-3">
                    <p className="text-[10px] text-outline truncate">{correction.requestedCorrection}</p>
                  </TableCell>
                  <TableCell className="px-5 py-3">
                    <StatusBadge status={correction.status} />
                  </TableCell>
                  <TableCell className="px-5 py-3">
                    <div className="flex gap-1">
                      {correction.status === 'PENDING' && (
                        <>
                          <Button
                            onClick={() => onApprove(correction.id, 'Approve')}
                            className="px-2 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold hover:bg-green-500/20 transition-colors"
                          >
                            Approve
                          </Button>
                          <Button
                            onClick={() => onReject(correction.id, 'Reject')}
                            className="px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors"
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

interface CorrectionFormProps {
  seniorId: string | null;
  setSeniorId: (id: string | null) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

function CorrectionForm({ seniorId, setSeniorId, open, setOpen }: CorrectionFormProps) {
  const [formData, setFormData] = useState<ProfileCorrectionFormData>({
    seniorId: seniorId || '',
    issueType: 'misspelled_name' as ProfileCorrectionIssueType,
    fieldToCorrect: '',
    originalValue: '',
    requestedCorrection: '',
    remarksReason: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await createProfileCorrection(formData);
    setSubmitting(false);
    if ('error' in result) {
      setError(result.error);
    } else {
      setOpen(false);
      setFormData({
        seniorId: seniorId || '',
        issueType: 'misspelled_name' as ProfileCorrectionIssueType,
        fieldToCorrect: '',
        originalValue: '',
        requestedCorrection: '',
        remarksReason: '',
      });
      window.location.reload();
    }
  };

  return (
    <div className="bg-surface-lowest rounded-2xl border border-outline-variant/30 p-6 max-w-md w-full">
      <h3 className="text-sm font-bold uppercase tracking-widest text-outline mb-4">
        <span className="material-symbols-outlined text-primary">edit_note</span>
        Submit Profile Correction Request
      </h3>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded px-3 py-2 text-sm text-red-400 mb-3">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">Select Senior</label>
            <Input
              value={formData.seniorId}
              onChange={(e) => setFormData({ ...formData, seniorId: e.target.value }) }
              disabled={true}
              placeholder="OSCA ID or Reference Number"
              className="bg-surface-low border border-outline-variant/30 rounded-lg py-2 px-3 text-[10px] text-foreground placeholder:text-outline"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">Issue Type</label>
            <Select
              value={formData.issueType}
              onChange={(e) => setFormData({ ...formData, issueType: e.target.value as ProfileCorrectionIssueType })}
              className="bg-surface-low border border-outline-variant/30 rounded-lg py-2 px-3 text-[10px] text-foreground placeholder:text-outline"
            >
              <SelectOption value="misspelled_name">Misspelled Name</SelectOption>
              <SelectOption value="wrong_birthdate">Wrong Birthdate</SelectOption>
              <SelectOption value="address_update">Address Update</SelectOption>
              <SelectOption value="appeal">Appeal</SelectOption>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">Field to Correct</label>
            <Select
              value={formData.fieldToCorrect}
              onChange={(e) => setFormData({ ...formData, fieldToCorrect: e.target.value })}
              className="bg-surface-low border border-outline-variant/30 rounded-lg py-2 px-3 text-[10px] text-foreground placeholder:text-outline"
            >
              <SelectOption value="full_name">Full Name</SelectOption>
              <SelectOption value="birthdate">Birthdate</SelectOption>
              <SelectOption value="address">Address</SelectOption>
              <SelectOption value="id_number">OSCA ID Number</SelectOption>
            </Select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">Original Value</label>
            <Input
              value={formData.originalValue}
              onChange={(e) => setFormData({ ...formData, originalValue: e.target.value })}
              placeholder="Current value in record"
              className="bg-surface-low border border-outline-variant/30 rounded-lg py-2 px-3 text-[10px] text-foreground placeholder:text-outline"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">Requested Correction</label>
            <Input
              value={formData.requestedCorrection}
              onChange={(e) => setFormData({ ...formData, requestedCorrection: e.target.value })}
              placeholder="Corrected value"
              className="bg-surface-low border border-outline-variant/30 rounded-lg py-2 px-3 text-[10px] text-foreground placeholder:text-outline"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">Remarks/Reason</label>
            <Textarea
              value={formData.remarksReason || ''}
              onChange={(e) => setFormData({ ...formData, remarksReason: e.target.value })}
              rows={2}
              placeholder="e.g. Typo in birth certificate, address changed, etc."
              className="bg-surface-low border border-outline-variant/30 rounded-lg py-2 px-3 text-[10px] text-foreground placeholder:text-outline"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-end">
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-surface-high border border-outline-variant/20 text-[10px] font-bold uppercase tracking-widest text-outline hover:text-foreground hover:bg-surface-low transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-primary text-white text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ProfileCorrectionsPage() {
  const [corrections, setCorrections] = useState<ProfileCorrection[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [filters, setFilters] = useState<{
    status: 'PENDING' | 'APPROVED_UPDATED' | 'REJECTED' | 'All';
    issueType: 'misspelled_name' | 'wrong_birthdate' | 'address_update' | 'appeal' | 'All';
    seniorName: string;
  }>({
    status: 'PENDING',
    issueType: 'misspelled_name' as ProfileCorrectionIssueType,
    seniorName: '',
  });
  const [search, setSearch] = useState("");

  const loadCorrections = useCallback(async () => {
    setLoading(true);
    const result = await getProfileCorrections({
      status: filters.status === 'All' ? undefined : filters.status as ProfileCorrectionStatus,
      issueType: filters.issueType === 'All' ? undefined : filters.issueType as ProfileCorrectionIssueType,
    });
    if (Array.isArray(result)) {
      setCorrections(result);
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    loadCorrections();
  }, [loadCorrections]);

  return (
    <div className="p-4">
      <h1 className="text-3xl font-extrabold font-headline tracking-tighter text-foreground">
        Profile Corrections & Appeals
      </h1>
      <p className="text-outline mt-1 text-sm">Manage and resolve senior profile correction requests</p>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as 'PENDING' | 'APPROVED_UPDATED' | 'REJECTED' | 'All' })}
            className="bg-surface-low border border-outline-variant/30 rounded-lg py-2 px-3 text-[10px] text-foreground placeholder:text-outline"
          >
            <option value="PENDING">Pending</option>
            <option value="APPROVED_UPDATED">Approved & Updated</option>
            <option value="REJECTED">Rejected</option>
            <option value="All">All</option>
          </Select>

          <Select
            value={filters.issueType}
            onChange={(e) => setFilters({ ...filters, issueType: e.target.value as 'misspelled_name' | 'wrong_birthdate' | 'address_update' | 'appeal' | 'All' })}
            className="bg-surface-low border border-outline-variant/30 rounded-lg py-2 px-3 text-[10px] text-foreground placeholder:text-outline"
          >
            <option value="All">All Types</option>
            <option value="misspelled_name">Misspelled Name</option>
            <option value="wrong_birthdate">Wrong Birthdate</option>
            <option value="address_update">Address Update</option>
            <option value="appeal">Appeal</option>
          </Select>

          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by senior name or OSCA ID..."
            className="bg-surface-low border border-outline-variant/30 rounded-lg py-2 px-3 text-[10px] text-foreground placeholder:text-outline flex-1"
          />
        </div>

        <button
          onClick={() => setOpenModal(true)}
          className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors"
        >
          + New Request
        </button>
      </div>

      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpenModal(false)}>
          <div className="bg-surface-lowest rounded-2xl border border-outline-variant/30 w-full max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-surface-lowest border-b border-outline-variant/10 p-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">
                <span className="material-symbols-outlined text-primary">add</span>
                New Profile Correction Request
              </h3>
              <button onClick={() => setOpenModal(false)} className="text-outline hover:text-foreground">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <CorrectionForm seniorId={null} setSeniorId={() => {}} open={openModal} setOpen={setOpenModal} />
          </div>
        </div>
      )}

      <CorrectionTable
        corrections={corrections}
        onApprove={async (id: string, notes?: string) => {
          await updateProfileCorrection(id, 'APPROVED_UPDATED', notes);
          loadCorrections();
        }}
        onReject={async (id: string, notes?: string) => {
          await updateProfileCorrection(id, 'REJECTED', notes);
          loadCorrections();
        }}
      />
    </div>
  );
}