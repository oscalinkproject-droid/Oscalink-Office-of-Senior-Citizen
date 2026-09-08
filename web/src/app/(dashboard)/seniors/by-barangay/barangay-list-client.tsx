"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

interface BarangayStats {
  name: string;
  total: number;
  active: number;
  pensioners: number;
  nonPensioners: number;
}

export function BarangayListClient({ barangays }: { barangays: BarangayStats[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return barangays;
    return barangays.filter((b) => b.name.toLowerCase().includes(term));
  }, [barangays, search]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold font-headline tracking-tighter text-foreground">
            Barangay Seniors Directory
          </h1>
          <p className="text-outline mt-1">
            View senior citizens grouped by barangay across Cotabato City.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-base pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search barangay name..."
            className="w-full bg-surface-low border border-outline-variant/30 rounded-xl py-2.5 pl-10 pr-4 text-xs text-foreground placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-surface-lowest rounded-2xl border border-outline-variant/20">
          <span className="material-symbols-outlined text-5xl text-outline/40">location_off</span>
          <p className="text-sm font-bold text-foreground mt-3">No barangay found matching your search.</p>
          <p className="text-xs text-outline mt-1">Try a different name, e.g. Bagua or Rosary Heights.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((b) => (
            <Link
              key={b.name}
              href={`/seniors/by-barangay/${encodeURIComponent(b.name)}`}
              className="group bg-surface-lowest rounded-2xl border border-outline-variant/30 p-5 hover:border-primary/40 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">location_city</span>
                  </span>
                  <div>
                    <h3 className="font-headline font-bold text-foreground text-sm leading-tight">{b.name}</h3>
                    <span className="text-[10px] font-bold text-outline uppercase tracking-widest">Barangay</span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 min-w-[44px] justify-center rounded-full bg-primary/10 text-primary text-xs font-bold px-2.5 py-1">
                  {b.total}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-5">
                <div className="rounded-xl bg-surface-low border border-outline-variant/20 p-2.5 text-center">
                  <p className="text-base font-bold text-emerald-400">{b.active}</p>
                  <p className="text-[9px] font-bold text-outline uppercase tracking-wider mt-0.5">Active</p>
                </div>
                <div className="rounded-xl bg-surface-low border border-outline-variant/20 p-2.5 text-center">
                  <p className="text-base font-bold text-green-600 dark:text-green-400">{b.pensioners}</p>
                  <p className="text-[9px] font-bold text-outline uppercase tracking-wider mt-0.5">Pensioners</p>
                </div>
                <div className="rounded-xl bg-surface-low border border-outline-variant/20 p-2.5 text-center">
                  <p className="text-base font-bold text-slate-500 dark:text-slate-400">{b.nonPensioners}</p>
                  <p className="text-[9px] font-bold text-outline uppercase tracking-wider mt-0.5">Non-Pens.</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-outline-variant/10 flex items-center justify-center gap-1.5 text-primary text-xs font-bold group-hover:translate-x-1 transition-transform">
                <span>View List</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
