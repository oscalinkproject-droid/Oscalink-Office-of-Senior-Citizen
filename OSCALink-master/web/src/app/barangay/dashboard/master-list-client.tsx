'use client';

import { useState, useMemo } from "react";
import { getPurokOptions } from "@/lib/constants";
import { normalizeOscaId } from "@/lib/os-id";

interface Senior {
  id: string;
  registration_id: string;
  full_name: string;
  middle_name?: string | null;
  age: number | null;
  sex: string | null;
  barangay: string;
  purok?: string | null;
  status: string;
  contact_number?: string | null;
  is_pensioner?: boolean;
  created_at: string;
}

interface MasterListClientProps {
  seniors: Senior[];
  barangay: string;
}

export function MasterListClient({ seniors, barangay }: MasterListClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [purokFilter, setPurokFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [ageFilter, setAgeFilter] = useState("");
  const [sortBy, setSortBy] = useState("purok");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const purokOptions = useMemo(() => getPurokOptions(barangay), [barangay]);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(seniors.map(s => s.status).filter(Boolean));
    return Array.from(statuses).sort();
  }, [seniors]);

  const filteredSeniors = useMemo(() => {
    return seniors
      .filter(s => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchesName = s.full_name?.toLowerCase().includes(q);
          const matchesRegId = s.registration_id?.toLowerCase().includes(q);
          const matchesPurok = s.purok?.toLowerCase().includes(q);
          if (!matchesName && !matchesRegId && !matchesPurok) return false;
        }
        if (purokFilter && s.purok !== purokFilter) return false;
        if (statusFilter && s.status !== statusFilter) return false;
        if (ageFilter === '80plus' && (s.age == null || s.age < 80)) return false;
        if (ageFilter === '60to79' && (s.age == null || s.age < 60 || s.age >= 80)) return false;
        return true;
      })
      .sort((a, b) => {
        const fieldA = (a[sortBy as keyof Senior] || "").toString().toLowerCase();
        const fieldB = (b[sortBy as keyof Senior] || "").toString().toLowerCase();
        if (sortOrder === "asc") return fieldA.localeCompare(fieldB);
        return fieldB.localeCompare(fieldA);
      });
  }, [seniors, searchQuery, purokFilter, statusFilter, ageFilter, sortBy, sortOrder]);

  const totalCount = filteredSeniors.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedSeniors = filteredSeniors.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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

  const activeCount = seniors.filter(s => s.status === 'Active').length;
  const pendingCount = seniors.filter(s => s.status === 'Pending').length;
  const maleCount = seniors.filter(s => s.sex === 'M').length;
  const femaleCount = seniors.filter(s => s.sex === 'F').length;
  const age80Plus = seniors.filter(s => s.age != null && s.age >= 80).length;

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      Active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      Pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      Deceased: "bg-red-500/10 text-red-400 border-red-500/20",
      Transferred: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      Archived: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    };
    return colors[status] || "bg-slate-500/10 text-slate-400";
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-blue-400 mt-0.5">description</span>
        <div>
          <p className="text-xs font-bold text-foreground">Barangay — Document Issuance (View Only)</p>
          <p className="text-[11px] text-outline mt-1">
            Your role is to issue physical supporting documents — <span className="text-foreground font-medium">Barangay Clearance, Certificate of Residency, and Cedula</span> — for applicants to submit to the OSCA Municipal Office. Encoding, status updates, and approvals are handled centrally by OSCA.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-surface-lowest shadow-sm rounded-xl p-3 border border-outline-variant/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-sm">groups</span>
            </div>
            <div>
              <p className="text-[9px] text-outline font-bold uppercase tracking-widest">Total</p>
              <p className="text-lg font-bold text-foreground">{seniors.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-lowest shadow-sm rounded-xl p-3 border border-outline-variant/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-emerald-500 text-sm">verified</span>
            </div>
            <div>
              <p className="text-[9px] text-outline font-bold uppercase tracking-widest">Active</p>
              <p className="text-lg font-bold text-foreground">{activeCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-lowest shadow-sm rounded-xl p-3 border border-outline-variant/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-amber-500 text-sm">pending</span>
            </div>
            <div>
              <p className="text-[9px] text-outline font-bold uppercase tracking-widest">Pending</p>
              <p className="text-lg font-bold text-foreground">{pendingCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-lowest shadow-sm rounded-xl p-3 border border-outline-variant/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-400 text-sm">man</span>
            </div>
            <div>
              <p className="text-[9px] text-outline font-bold uppercase tracking-widest">Male</p>
              <p className="text-lg font-bold text-foreground">{maleCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-lowest shadow-sm rounded-xl p-3 border border-outline-variant/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-pink-400 text-sm">woman</span>
            </div>
            <div>
              <p className="text-[9px] text-outline font-bold uppercase tracking-widest">Female</p>
              <p className="text-lg font-bold text-foreground">{femaleCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-lowest shadow-sm rounded-xl p-3 border border-outline-variant/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-purple-400 text-sm">elderly</span>
            </div>
            <div>
              <p className="text-[9px] text-outline font-bold uppercase tracking-widest">Age 80+</p>
              <p className="text-lg font-bold text-foreground">{age80Plus}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface-lowest shadow-sm rounded-2xl border border-outline-variant/30 overflow-hidden">
        <div className="p-4 border-b border-outline-variant/30 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">search</span>
            <input
              type="text"
              placeholder="Search by name, ID, or purok..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full bg-surface-high border border-outline-variant/30 rounded-lg py-2.5 pl-10 pr-4 text-xs text-foreground placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <select
            value={purokFilter}
            onChange={(e) => { setPurokFilter(e.target.value); setCurrentPage(1); }}
            className="bg-surface-high border border-outline-variant/30 rounded-lg py-2.5 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
          >
            <option value="">All Puroks</option>
            {purokOptions.length > 0 ? purokOptions.map(p => (
              <option key={p} value={p}>{p}</option>
            )) : (
              <option value="" disabled>No puroks configured</option>
            )}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="bg-surface-high border border-outline-variant/30 rounded-lg py-2.5 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
          >
            <option value="">All Statuses</option>
            {uniqueStatuses.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={ageFilter}
            onChange={(e) => { setAgeFilter(e.target.value); setCurrentPage(1); }}
            className="bg-surface-high border border-outline-variant/30 rounded-lg py-2.5 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
          >
            <option value="">All Ages</option>
            <option value="60to79">60-79</option>
            <option value="80plus">80+</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/30 bg-surface-high/50">
                <th
                  className="py-3 px-4 font-label text-[10px] font-bold text-outline uppercase tracking-widest cursor-pointer hover:text-primary transition-colors select-none"
                  onClick={() => handleSort('full_name')}
                >
                  <div className="flex items-center gap-1.5">
                    Senior Name
                    <span className={`material-symbols-outlined text-[14px] ${sortBy === 'full_name' ? 'text-primary' : 'text-outline'}`}>
                      {getSortIcon('full_name')}
                    </span>
                  </div>
                </th>
                <th
                  className="py-3 px-4 font-label text-[10px] font-bold text-outline uppercase tracking-widest cursor-pointer hover:text-primary transition-colors select-none"
                  onClick={() => handleSort('registration_id')}
                >
                  <div className="flex items-center gap-1.5">
                    Reg ID
                    <span className={`material-symbols-outlined text-[14px] ${sortBy === 'registration_id' ? 'text-primary' : 'text-outline'}`}>
                      {getSortIcon('registration_id')}
                    </span>
                  </div>
                </th>
                <th
                  className="py-3 px-4 font-label text-[10px] font-bold text-outline uppercase tracking-widest cursor-pointer hover:text-primary transition-colors select-none"
                  onClick={() => handleSort('purok')}
                >
                  <div className="flex items-center gap-1.5">
                    Purok
                    <span className={`material-symbols-outlined text-[14px] ${sortBy === 'purok' ? 'text-primary' : 'text-outline'}`}>
                      {getSortIcon('purok')}
                    </span>
                  </div>
                </th>
                <th
                  className="py-3 px-4 font-label text-[10px] font-bold text-outline uppercase tracking-widest cursor-pointer hover:text-primary transition-colors select-none"
                  onClick={() => handleSort('age')}
                >
                  <div className="flex items-center gap-1.5">
                    Age
                    <span className={`material-symbols-outlined text-[14px] ${sortBy === 'age' ? 'text-primary' : 'text-outline'}`}>
                      {getSortIcon('age')}
                    </span>
                  </div>
                </th>
                <th
                  className="py-3 px-4 font-label text-[10px] font-bold text-outline uppercase tracking-widest cursor-pointer hover:text-primary transition-colors select-none"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1.5">
                    Status
                    <span className={`material-symbols-outlined text-[14px] ${sortBy === 'status' ? 'text-primary' : 'text-outline'}`}>
                      {getSortIcon('status')}
                    </span>
                  </div>
                </th>
                <th className="py-3 px-4 font-label text-[10px] font-bold text-outline uppercase tracking-widest">
                  Pensioner
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {paginatedSeniors.length > 0 ? paginatedSeniors.map((senior) => (
                <tr key={senior.id} className="group hover:bg-surface-high transition-colors">
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold ring-1 ring-primary/20">
                        {(senior.full_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">{senior.full_name}</p>
                        {senior.contact_number && (
                          <p className="text-[9px] text-outline">{senior.contact_number}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="text-[10px] text-outline font-mono">{normalizeOscaId(senior.status, senior.registration_id) || '—'}</span>
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="text-[10px] text-outline">{senior.purok || '—'}</span>
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="text-[10px] text-outline">{senior.age || '—'}</span>
                  </td>
                  <td className="py-2.5 px-4">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusBadge(senior.status)}`}>
                      {senior.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    {senior.is_pensioner ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                        <span className="material-symbols-outlined text-xs">check_circle</span>
                        Yes
                      </span>
                    ) : (
                      <span className="text-[10px] text-outline">No</span>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-outline text-xs italic">
                    No senior citizens found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-outline-variant/30 flex items-center justify-between">
            <span className="text-[10px] text-outline font-bold uppercase tracking-widest">
              {totalCount} results · Page <span className="text-foreground">{currentPage}</span> of <span className="text-foreground">{totalPages}</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 text-outline hover:text-primary disabled:opacity-30 transition-all rounded"
              >
                <span className="material-symbols-outlined text-base">chevron_left</span>
              </button>
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
                  return <span key={pageNum} className="text-outline text-[10px] px-0.5">...</span>;
                }
                return null;
              })}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 text-outline hover:text-primary disabled:opacity-30 transition-all rounded"
              >
                <span className="material-symbols-outlined text-base">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
