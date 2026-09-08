'use client';

export function MetricCardSkeleton() {
  return (
    <div className="p-6 rounded-xl flex flex-col gap-2 ring-1 ring-outline-variant/30 bg-surface-lowest shadow-sm animate-pulse">
      <div className="flex justify-between items-start">
        <div className="h-3 w-20 bg-surface-high rounded"></div>
        <div className="h-4 w-4 bg-surface-high rounded"></div>
      </div>
      <div className="h-8 w-16 bg-surface-high rounded mt-2"></div>
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-outline-variant/10">
      <div className="w-8 h-8 bg-surface-high rounded-full"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 bg-surface-high rounded"></div>
        <div className="h-3 w-24 bg-surface-high rounded"></div>
      </div>
      <div className="h-4 w-16 bg-surface-high rounded"></div>
      <div className="h-3 w-20 bg-surface-high rounded"></div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-surface-lowest shadow-sm rounded-2xl border border-outline-variant/30 overflow-hidden">
      <div className="grid grid-cols-6 gap-4 p-4 border-b border-outline-variant/30">
        <div className="h-3 w-16 bg-surface-high rounded"></div>
        <div className="h-3 w-12 bg-surface-high rounded"></div>
        <div className="h-3 w-14 bg-surface-high rounded"></div>
        <div className="h-3 w-20 bg-surface-high rounded"></div>
        <div className="h-3 w-16 bg-surface-high rounded"></div>
        <div className="h-3 w-8 bg-surface-high rounded"></div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} />
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  const heights = [40, 65, 45, 80, 55, 70];
  return (
    <div className="bg-surface-lowest shadow-sm rounded-2xl p-8 border border-outline-variant/30">
      <div className="h-6 w-48 bg-surface-high rounded mb-6"></div>
      <div className="flex items-end gap-2 h-48">
        {heights.map((h, i) => (
          <div 
            key={i} 
            className="flex-1 bg-surface-high rounded-t"
            style={{ height: `${h}%` }}
          ></div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-surface-lowest shadow-sm rounded-2xl p-6 border border-outline-variant/30 animate-pulse">
      <div className="h-4 w-24 bg-surface-high rounded mb-4"></div>
      <div className="space-y-3">
        <div className="h-3 w-full bg-surface-high rounded"></div>
        <div className="h-3 w-3/4 bg-surface-high rounded"></div>
        <div className="h-3 w-1/2 bg-surface-high rounded"></div>
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-10 animate-pulse">
      <div>
        <div className="h-10 w-64 bg-surface-high rounded mb-2"></div>
        <div className="h-4 w-96 bg-surface-high rounded"></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      <TableSkeleton rows={5} />
    </div>
  );
}
