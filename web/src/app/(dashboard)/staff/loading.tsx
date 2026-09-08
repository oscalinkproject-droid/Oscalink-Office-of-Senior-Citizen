'use client';

import { CardSkeleton, MetricCardSkeleton } from "@/components/ui/skeletons";

export default function StaffLoading() {
  return (
    <div className="flex flex-col animate-pulse">
      <div className="mb-10">
        <div className="h-10 w-48 bg-surface-high rounded mb-2"></div>
        <div className="h-4 w-64 bg-surface-high rounded"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {Array.from({ length: 3 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <CardSkeleton />
        <div className="bg-surface-lowest shadow-sm rounded-2xl border border-outline-variant/30 p-6">
          <div className="h-6 w-40 bg-surface-high rounded mb-6"></div>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 border-b border-outline-variant/10">
                <div className="w-8 h-8 bg-surface-high rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 w-32 bg-surface-high rounded mb-1"></div>
                  <div className="h-3 w-40 bg-surface-high rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}