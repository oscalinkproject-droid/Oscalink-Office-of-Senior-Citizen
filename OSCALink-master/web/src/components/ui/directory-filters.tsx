'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { generatePhilHealthCSV } from '@/lib/exports';
import { createClient } from '@/lib/supabase';

const selectClass =
  'appearance-none pr-8 pl-3 py-2.5 rounded-xl bg-surface-low border border-outline-variant/30 text-xs font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all cursor-pointer';

function FilterSelect({
  name,
  value,
  onChange,
  children,
}: {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select name={name} value={value} onChange={onChange} className={selectClass}>
        {children}
      </select>
      <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-sm">
        arrow_drop_down
      </span>
    </div>
  );
}

export function DirectoryFilters({
  initialSearch,
  initialIdType,
  userRole,
  userBarangay,
  seniorsData,
}: {
  initialSearch?: string;
  initialIdType?: string;
  userRole?: string | null;
  userBarangay?: string | null;
  seniorsData?: unknown[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState(initialSearch || '');

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== initialSearch) {
        const params = new URLSearchParams(searchParams.toString());
        if (searchTerm) {
          params.set('search', searchTerm);
        } else {
          params.delete('search');
        }
        params.set('page', '1');
        router.push(`/directory?${params.toString()}`);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, initialSearch, searchParams, router]);

  const handleFilterChange = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'All') {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    params.set('page', '1');
    router.push(`/directory?${params.toString()}`);
  };

  const idType = initialIdType || 'All';

  const hasActiveFilters =
    !!searchTerm || idType !== 'All' || searchParams.has('status');

  const handleReset = () => router.push('/directory');

  const handleExport = async () => {
    if (!seniorsData || seniorsData.length === 0) {
      toast('No records to export.', 'error');
      return;
    }

    let exportRows = seniorsData as Record<string, unknown>[];
    const ids = exportRows.map((s) => s.id).filter(Boolean) as string[];

    if (ids.length > 0) {
      try {
        const supabase = createClient();
        const { data: decrypted } = await supabase.rpc('decrypt_senior_pii_batch', { p_ids: ids });
        if (decrypted) {
          const philMap = new Map<string, string | null>();
          const contactMap = new Map<string, string | null>();
          const addressMap = new Map<string, string | null>();
          (decrypted as Array<{ senior_id: string; philhealth_no: string | null; contact_number: string | null; address: string | null }>).forEach(
            (d) => {
              philMap.set(d.senior_id, d.philhealth_no);
              contactMap.set(d.senior_id, d.contact_number);
              addressMap.set(d.senior_id, d.address);
            }
          );
          exportRows = exportRows.map((s) => ({
            ...s,
            philhealth_no: philMap.get(s.id as string) ?? s.philhealth_no,
            contact_number: contactMap.get(s.id as string) ?? s.contact_number,
            address: addressMap.get(s.id as string) ?? s.address,
          }));
        }
      } catch {
        // Decryption unavailable — export falls back to whatever is present.
      }
    }

    const filename = generatePhilHealthCSV(exportRows);
    toast(`Downloaded: ${filename} (${exportRows.length} records)`, 'success');
  };

  return (
    <div className="flex flex-col xl:flex-row xl:items-center gap-3 mb-8">
      <div className="relative flex-1 min-w-[220px]">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-base pointer-events-none">
          search
        </span>
        <input
          type="text"
          name="search"
          value={searchTerm}
          placeholder="Search by senior name, OSCA ID, or control number..."
          className="w-full bg-surface-low border border-outline-variant/30 rounded-xl py-2.5 pl-10 pr-10 text-xs font-body text-foreground placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {userRole === 'barangay_president' ? (
          <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px] text-primary">location_on</span>
            <span className="text-xs font-bold text-primary uppercase tracking-wider">{userBarangay}</span>
          </div>
        ) : (
          <FilterSelect
            name="id_type"
            value={idType}
            onChange={(e) => handleFilterChange('id_type', e.target.value)}
          >
            <option value="All">All ID Types</option>
            <option value="green" className="bg-surface-lowest">Green (Pensioner)</option>
            <option value="white" className="bg-surface-lowest">White (Non-Pensioner)</option>
          </FilterSelect>
        )}

        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-outline hover:text-foreground hover:bg-surface-low border border-outline-variant/30 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">filter_alt_off</span>
            Reset Filters
          </button>
        )}

        <div className="flex items-center gap-1 pl-1 ml-auto">
          <button
            onClick={() => router.refresh()}
            className="p-2 text-outline hover:text-primary transition-colors flex items-center justify-center rounded-lg hover:bg-surface-low"
            title="Refresh Registry"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
          </button>
          <button
            onClick={handleExport}
            className="p-2 text-outline hover:text-primary transition-colors flex items-center justify-center rounded-lg hover:bg-surface-low"
            title="Export PhilHealth CSV"
          >
            <span className="material-symbols-outlined text-sm">file_download</span>
          </button>
        </div>
      </div>
    </div>
  );
}
