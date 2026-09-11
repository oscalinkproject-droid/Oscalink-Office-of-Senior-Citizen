"use client";

import { useState } from "react";
import { m } from "framer-motion";
import { StatusBadge } from "@/components/ui/data-display";
import { SeniorDetailModal } from "@/components/ui/senior-detail-modal";
import Image from "next/image";

import { useRouter, useSearchParams } from "next/navigation";
import { normalizeOscaId } from "@/lib/os-id";

interface Senior {
  id: string;
  name: string;
  age: number;
  barangay: string;
  purok?: string;
  status: "Active" | "Pending" | "Pending Barangay" | "Pending OSCA" | "Pending Mayor" | "FOR_HEAD_APPROVAL" | "PENDING_APPROVAL" | "DRAFT" | "PRE_REGISTERED" | "Archived" | "Transferred" | "Deceased" | "Inactive" | "Cancelled" | "Disqualified" | "Disapproved";
  registrationId: string;
  progress: number;
  lastCheck: string;
  
  // Compliance Fields
  contactNumber?: string;
  address?: string;
  birthdate?: string;
  emergencyContact?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  sex?: string;
  religion?: string;
  bloodType?: string;
  education?: string;
  employmentStatus?: string;
  classification?: string;
  monthlyIncome?: number;
  philhealthNo?: string;
  sssNo?: string;
  gsisNo?: string;
  tin?: string;
  isBedridden?: boolean;
  addressUnit?: string;
  addressBuilding?: string;
  addressLotBlock?: string;
  addressStreet?: string;
  addressSubdivision?: string;
  addressCity?: string;
  addressProvince?: string;
  addressRegion?: string;
  photoUrl?: string | null;
  birth_certificate_url?: string | null;
  voter_id_url?: string | null;
  digital_signature_url?: string | null;
}

const tableRowVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const }
  }
};

interface DirectoryTableProps {
  seniors: Senior[];
  onVerify?: (id: string) => Promise<{ success?: boolean; error?: string }>;
  onSuccess?: () => void;
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
  userRole?: string | null;
  onStatusAction?: (id: string, name: string, status: string) => void;
}

export function DirectoryTable({ 
  seniors, 
  onVerify: _onVerify, 
  onSuccess: _onSuccess,
  totalCount = 0,
  currentPage = 1,
  pageSize = 15,
  userRole,
  onStatusAction
}: DirectoryTableProps) {
  const [selectedSenior, setSelectedSenior] = useState<{ id: string; autoEdit: boolean } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const isStatusAuthorized = userRole === 'super_admin' || userRole === 'osca_staff';
  const isOscaActions = userRole === 'super_admin' || userRole === 'osca_head' || userRole === 'osca_staff';
  const canEdit = userRole === 'super_admin' || userRole === 'osca_staff';
  const isTerminalStatus = (status: string) => ['Deceased', 'Transferred', 'Inactive', 'Cancelled', 'Disqualified', 'Disapproved'].includes(status);

  const sortBy = searchParams.get("sortBy") || "full_name";
  const sortOrder = searchParams.get("sortOrder") || "asc";

  const totalPages = Math.ceil(totalCount / pageSize);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`/directory?${params.toString()}`);
  };

  const handleSort = (field: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (sortBy === field) {
      params.set('sortOrder', sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      params.set('sortBy', field);
      params.set('sortOrder', 'asc');
    }
    params.set('page', '1'); // Reset to page 1 when sorting
    router.push(`/directory?${params.toString()}`);
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return "unfold_more";
    return sortOrder === 'asc' ? "expand_more" : "expand_less";
  };

  const startRange = (currentPage - 1) * pageSize + 1;
  const endRange = Math.min(currentPage * pageSize, totalCount);
  return (
    <>
      <div className="overflow-x-auto overflow-y-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-high/20 border-b border-outline-variant/30">
              <th 
                className="px-6 py-4 font-label text-[11px] font-bold text-outline uppercase tracking-widest cursor-pointer hover:text-primary transition-colors select-none"
                onClick={() => handleSort('full_name')}
              >
                <div className="flex items-center gap-2">
                  Full Name 
                  <span className={`material-symbols-outlined text-[14px] transition-transform ${sortBy === 'full_name' ? 'text-primary' : 'text-slate-600'}`}>
                    {getSortIcon('full_name')}
                  </span>
                </div>
              </th>
              <th 
                className="px-6 py-4 font-label text-[11px] font-bold text-outline uppercase tracking-widest cursor-pointer hover:text-primary transition-colors select-none"
                onClick={() => handleSort('registration_id')}
              >
                <div className="flex items-center gap-2">
                  ID Cluster 
                  <span className={`material-symbols-outlined text-[14px] transition-transform ${sortBy === 'registration_id' ? 'text-primary' : 'text-slate-600'}`}>
                    {getSortIcon('registration_id')}
                  </span>
                </div>
              </th>
              <th className="px-6 py-4 font-label text-[11px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 font-label text-[11px] font-bold text-slate-500 uppercase tracking-widest">Verification</th>
              <th className="px-6 py-4 font-label text-[11px] font-bold text-slate-500 uppercase tracking-widest">Last Check-in</th>
              {(userRole === 'super_admin' || userRole === 'osca_head' || userRole === 'osca_staff') && <th className="px-6 py-4 font-label text-[11px] font-bold text-slate-500 uppercase tracking-widest">Actions</th>}
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {seniors.length > 0 ? seniors.map((senior, index) => (
              <m.tr
                key={senior.id}
                variants={tableRowVariants}
                initial="initial"
                animate="animate"
                transition={{ delay: index * 0.05 }}
                className="group hover:bg-white/[0.02] transition-colors cursor-pointer"
                onClick={() => setSelectedSenior({ id: senior.id, autoEdit: false })}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <m.div 
                      className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary ring-1 ring-primary/20 overflow-hidden relative z-10"
                      whileHover={{ 
                        scale: 2.5, 
                        zIndex: 50,
                        boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)"
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      {senior.photoUrl ? (
                        <Image 
                          src={senior.photoUrl.includes('cloudinary.com') 
                            ? senior.photoUrl.replace('/upload/', '/upload/c_thumb,g_face,w_100,h_100/') 
                            : senior.photoUrl} 
                          alt={senior.name} 
                          width={40}
                          height={40}
                          unoptimized
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (senior.name || '').split(" ").map((n) => n[0]).join("")
                      )}
                    </m.div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{senior.name || 'Unknown'}</p>
                      <p className="text-[10px] text-outline">
                        {senior.age > 0 ? `${senior.age} Years` : 'Age not recorded'} &bull; Barangay {senior.barangay}{senior.purok ? ` &bull; ${senior.purok}` : ''}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono text-[11px] text-outline">#{normalizeOscaId(senior.status, senior.registrationId)}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={senior.status} />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 bg-surface-highest rounded-full overflow-hidden">
                      <div
                        className={`h-full ${senior.status === 'Pending' || senior.status === 'Archived' ? 'bg-tertiary' : senior.status === 'Transferred' ? 'bg-slate-500' : 'bg-primary'}`}
                        style={{ width: `${senior.progress}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-outline">{senior.progress}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs text-outline">{senior.lastCheck}</td>
                {isOscaActions && (
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedSenior({ id: senior.id, autoEdit: false })}
                        className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded border bg-primary/5 border-primary/20 text-primary hover:bg-primary/15 transition-colors"
                      >
                        View Details
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => setSelectedSenior({ id: senior.id, autoEdit: true })}
                          className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded border bg-surface-high border-outline-variant/30 text-foreground hover:bg-surface-highest transition-colors"
                        >
                          Edit Info
                        </button>
                      )}
                      {isStatusAuthorized && !isTerminalStatus(senior.status) && (
                        <>
                          <button
                            onClick={() => onStatusAction?.(senior.id, senior.name, 'Deceased')}
                            className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded border bg-red-500/5 border-red-500/20 text-red-400 hover:bg-red-500/15 transition-colors"
                          >
                            Deceased
                          </button>
                          <button
                            onClick={() => onStatusAction?.(senior.id, senior.name, 'Inactive')}
                            className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded border bg-slate-500/5 border-slate-500/20 text-slate-400 hover:bg-slate-500/15 transition-colors"
                          >
                            Inactive
                          </button>
                          <button
                            onClick={() => onStatusAction?.(senior.id, senior.name, 'Transferred')}
                            className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded border bg-blue-500/5 border-blue-500/20 text-blue-400 hover:bg-blue-500/15 transition-colors"
                          >
                            Transferred
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                )}
                <td className="px-6 py-4 text-right">
                  <button className="opacity-0 group-hover:opacity-100 material-symbols-outlined text-outline hover:text-primary transition-all text-sm">
                    more_vert
                  </button>
                </td>
              </m.tr>
            )) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-outline text-sm italic">
                  No records found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between px-6 py-4 bg-surface-low/50 border-t border-outline-variant/30 rounded-b-xl">
          <div className="text-[10px] text-outline font-bold uppercase tracking-widest">
            Showing <span className="text-foreground">{startRange}</span> to <span className="text-foreground">{endRange}</span> of <span className="text-foreground">{totalCount}</span> results
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1 text-slate-400 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>
            
            <div className="flex items-center gap-1 mx-2">
              {[...Array(totalPages)].map((_, i) => {
                const pageNum = i + 1;
                // Show first, last, and pages around current
                if (
                  pageNum === 1 || 
                  pageNum === totalPages || 
                  (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-7 h-7 rounded flex items-center justify-center text-[11px] font-bold transition-all ${
                        currentPage === pageNum 
                          ? 'bg-primary text-white ring-1 ring-primary/50' 
                          : 'text-outline hover:text-primary hover:bg-surface-high'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                } else if (
                  pageNum === currentPage - 2 || 
                  pageNum === currentPage + 2
                ) {
                  return <span key={pageNum} className="text-slate-700 text-[10px]">...</span>;
                }
                return null;
              })}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1 text-slate-400 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <span className="material-symbols-outlined text-lg">chevron_right</span>
            </button>
          </div>
        </div>
      )}
      {selectedSenior && (
        <SeniorDetailModal
          seniorId={selectedSenior.id}
          autoEdit={selectedSenior.autoEdit}
          onClose={() => setSelectedSenior(null)}
        />
      )}
    </>
  );
}
