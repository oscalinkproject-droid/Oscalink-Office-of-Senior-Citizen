'use client';

import { useState, useEffect } from "react";
import { StaffForm } from "@/components/ui/staff-form";
import { createClient } from "@/lib/supabase";
import { redirect, useRouter } from "next/navigation";
import { getStaffList, deleteStaff, resetStaffPassword } from "@/app/actions/users";
import { normalizeRole, OSCA_ROLES } from "@/lib/rbac";

interface StaffMember {
  id: string;
  full_name?: string;
  email?: string;
  barangay?: string;
  purok?: string;
  role?: string;
  contact_number?: string;
}

export default function StaffPage() {
  const router = useRouter();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [canManageStaff, setCanManageStaff] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [resetConfirm, setResetConfirm] = useState<{ id: string; name: string; email: string } | null>(null);
  const [resetting, setResetting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const pageSize = 15;

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        redirect("/login");
      }

      const role = normalizeRole(user.user_metadata?.role);
      if (!role || !(OSCA_ROLES as readonly string[]).includes(role)) {
        redirect("/dashboard");
      }

      setCanManageStaff(role === 'osca_head' || role === 'super_admin');

      const staff = await getStaffList();
      setStaffList(staff || []);
      setLoading(false);
      setTimeout(() => setIsVisible(true), 50);
    }

    checkAuth();
  }, []);

  const [sortBy, setSortBy] = useState("full_name");
  const [sortOrder, setSortOrder] = useState("asc");

  const existingRoles = staffList.map(s => s.role).filter(Boolean) as string[];

  const filteredStaff = staffList
    .filter(s =>
      (s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       s.barangay?.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      const fieldA = (a[sortBy as keyof StaffMember] || "").toString().toLowerCase();
      const fieldB = (b[sortBy as keyof StaffMember] || "").toString().toLowerCase();
      if (sortOrder === "asc") return fieldA.localeCompare(fieldB);
      return fieldB.localeCompare(fieldA);
    });

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return "unfold_more";
    return sortOrder === "asc" ? "expand_more" : "expand_less";
  };

  const totalCount = filteredStaff.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedStaff = filteredStaff.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loading) {
    return (
      <div className="flex flex-col animate-pulse">
        <div className="mb-10">
          <div className="h-10 w-48 bg-surface-high rounded mb-2"></div>
          <div className="h-4 w-64 bg-surface-high rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-surface-lowest shadow-sm rounded-2xl p-6 border border-outline-variant/30">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-surface-high"></div>
                <div>
                  <div className="h-3 w-24 bg-surface-high rounded"></div>
                  <div className="h-8 w-16 bg-surface-high rounded mt-2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-surface-lowest shadow-sm rounded-2xl p-6 border border-outline-variant/30 h-64"></div>
          <div className="bg-surface-lowest shadow-sm rounded-2xl p-6 border border-outline-variant/30 h-64"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-10 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div>
        <h1 className="text-4xl font-extrabold font-headline tracking-tighter text-foreground italic">
          Staff Management
        </h1>
        <p className="text-outline mt-2 max-w-xl font-body text-sm leading-relaxed">
          Commission and manage OSCA staff accounts.
        </p>
      </div>

      {notice && (
        <div className={`p-4 rounded-xl border text-xs font-medium flex items-center gap-2 ${
          notice.type === 'success'
            ? 'bg-green-500/10 border-green-500/20 text-green-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          <span className="material-symbols-outlined text-sm">{notice.type === 'success' ? 'check_circle' : 'error'}</span>
          {notice.message}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-lowest shadow-sm rounded-2xl p-6 border border-outline-variant/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">groups</span>
            </div>
            <div>
              <p className="text-[10px] text-outline font-bold uppercase tracking-widest">Total Staff</p>
              <p className="text-2xl font-bold text-foreground">{staffList.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-lowest shadow-sm rounded-2xl p-6 border border-outline-variant/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-emerald-600">workspace_premium</span>
            </div>
            <div>
              <p className="text-[10px] text-outline font-bold uppercase tracking-widest">OSCA Head</p>
              <p className="text-2xl font-bold text-foreground">{staffList.filter(s => normalizeRole(s.role) === 'osca_head').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-lowest shadow-sm rounded-2xl p-6 border border-outline-variant/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary">badge</span>
            </div>
            <div>
              <p className="text-[10px] text-outline font-bold uppercase tracking-widest">OSCA Staff</p>
              <p className="text-2xl font-bold text-foreground">{staffList.filter(s => normalizeRole(s.role) === 'osca_staff').length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {canManageStaff && (
          <div>
            <h3 className="font-headline font-bold text-xl text-foreground mb-4">
              Add New Staff
            </h3>
            <StaffForm
              existingRoles={existingRoles}
            />
          </div>
        )}

        <div className={`flex flex-col h-full bg-surface-lowest shadow-sm rounded-2xl p-6 border border-outline-variant/30 ${!canManageStaff ? 'lg:col-span-2' : ''}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-headline font-bold text-xl text-foreground">
              Existing Staff
            </h3>
            <div className="relative w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">search</span>
              <input
                type="text"
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-surface-high border border-outline-variant/30 rounded-lg py-2.5 pl-10 pr-4 text-xs font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/30">
                  <th
                    className="pb-4 font-label text-[10px] font-bold text-outline uppercase tracking-widest cursor-pointer hover:text-primary transition-colors select-none"
                    onClick={() => handleSort('full_name')}
                  >
                    <div className="flex items-center gap-2">
                      Full Name
                      <span className={`material-symbols-outlined text-[14px] ${sortBy === 'full_name' ? 'text-primary' : 'text-outline'}`}>
                        {getSortIcon('full_name')}
                      </span>
                    </div>
                  </th>
                  <th className="pb-4 font-label text-[10px] font-bold text-outline uppercase tracking-widest">Role</th>
                  <th
                    className="pb-4 font-label text-[10px] font-bold text-outline uppercase tracking-widest cursor-pointer hover:text-primary transition-colors select-none"
                    onClick={() => handleSort('barangay')}
                  >
                    <div className="flex items-center gap-2">
                      Barangay
                      <span className={`material-symbols-outlined text-[14px] ${sortBy === 'barangay' ? 'text-primary' : 'text-outline'}`}>
                        {getSortIcon('barangay')}
                      </span>
                    </div>
                  </th>
                  {canManageStaff && <th className="pb-4 font-label text-[10px] font-bold text-outline uppercase tracking-widest">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {paginatedStaff.length > 0 ? paginatedStaff.map((staff) => (
                  <tr key={staff.id} className="group hover:bg-surface-high transition-colors">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold">
                          {(staff.full_name || staff.email || 'U').split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-foreground">{staff.full_name || 'No name'}</p>
                          <p className="text-[9px] text-outline">{staff.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="text-[9px] text-primary uppercase tracking-tighter font-bold">
                        {normalizeRole(staff.role) === 'osca_head' ? 'OSCA Head' : (staff.role || '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3">
                      <div>
                        <p className="text-[10px] text-outline font-medium">{staff.barangay || 'City-Wide'}</p>
                        {staff.purok && <p className="text-[9px] text-outline/60">Purok: {staff.purok}</p>}
                      </div>
                    </td>
                    {canManageStaff && (
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setResetConfirm({ id: staff.id, name: staff.full_name || staff.email || 'Staff', email: staff.email || '' })}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/20 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[14px]">key</span>
                            Reset Password
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ id: staff.id, name: staff.full_name || staff.email || 'Staff' })}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-error/10 text-error text-[11px] font-bold hover:bg-error/20 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={canManageStaff ? 4 : 3} className="py-10 text-center text-outline text-xs italic">
                      No staff found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between pt-4 border-t border-outline-variant/30">
              <span className="text-[10px] text-outline font-bold uppercase tracking-widest">
                Page <span className="text-foreground">{currentPage}</span> of <span className="text-foreground">{totalPages}</span>
              </span>
              <div className="flex items-center gap-1 mx-2">
                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 rounded flex items-center justify-center text-[11px] font-bold transition-all ${
                          currentPage === pageNum
                            ? 'bg-primary text-white ring-1 ring-primary/50'
                            : 'text-outline hover:text-primary hover:bg-surface-high'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                    return <span key={pageNum} className="text-outline text-[10px]">...</span>;
                  }
                  return null;
                })}
              </div>
              <div className="flex gap-1">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 text-outline hover:text-primary disabled:opacity-30 transition-all">
                  <span className="material-symbols-outlined text-lg">chevron_left</span>
                </button>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1 text-outline hover:text-primary disabled:opacity-30 transition-all">
                  <span className="material-symbols-outlined text-lg">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {resetConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-surface-lowest shadow-2xl border border-outline-variant/30 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-xl">key</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Reset Staff Password</h3>
                  <p className="text-[11px] text-outline">A new temporary password will be sent by email.</p>
                </div>
              </div>
              <p className="text-xs text-outline mb-6">
                Reset the password for <span className="font-bold text-foreground">{resetConfirm.name}</span>? Their current password will be invalidated immediately.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setResetConfirm(null)}
                  className="px-4 py-2 rounded-xl text-[11px] font-bold text-outline hover:bg-surface-high transition-colors"
                  disabled={resetting}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setResetting(true);
                    const result = await resetStaffPassword(resetConfirm.id);
                    setResetting(false);
                    setResetConfirm(null);
                    if (result?.success) {
                      setNotice({ type: 'success', message: `Password reset for ${resetConfirm.name}. A new temporary password was sent to ${resetConfirm.email}.` });
                    } else {
                      setNotice({ type: 'error', message: result?.error || 'Failed to reset password.' });
                    }
                  }}
                  disabled={resetting}
                  className="px-4 py-2 rounded-xl text-[11px] font-bold bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {resetting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Resetting...
                    </span>
                  ) : 'Reset Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-surface-lowest shadow-2xl border border-outline-variant/30 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-error text-xl">warning</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Delete Staff</h3>
                  <p className="text-[11px] text-outline">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-xs text-outline mb-6">
                Are you sure you want to delete <span className="font-bold text-foreground">{deleteConfirm.name}</span>? Their account will be permanently removed.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 rounded-xl text-[11px] font-bold text-outline hover:bg-surface-high transition-colors"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setDeleting(true);
                    await deleteStaff(deleteConfirm.id);
                    setDeleteConfirm(null);
                    setDeleting(false);
                    router.refresh();
                  }}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl text-[11px] font-bold bg-error text-white hover:bg-error/90 transition-colors disabled:opacity-50"
                >
                  {deleting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting...
                    </span>
                  ) : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
