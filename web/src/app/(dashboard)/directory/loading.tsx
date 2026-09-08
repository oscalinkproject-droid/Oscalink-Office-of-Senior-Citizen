import { TableSkeleton, MetricCardSkeleton } from "@/components/ui/skeletons";

export default function DirectoryLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div>
        <div className="h-10 w-48 bg-surface-high rounded mb-2"></div>
        <div className="h-4 w-64 bg-surface-high rounded"></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>

      <TableSkeleton rows={8} />
    </div>
  );
}
