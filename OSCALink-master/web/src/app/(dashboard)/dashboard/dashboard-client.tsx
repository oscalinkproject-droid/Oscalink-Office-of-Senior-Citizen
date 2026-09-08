'use client';

import React, { use, useEffect } from "react";
import { m } from "framer-motion";
import { MetricCard } from "@/components/ui/data-display";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const containerVariants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    } as const
  }
};

const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const }
  }
};

export function DashboardClientShell({ children }: { children?: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    
    const channel = supabase
      .channel('dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seniors' }, () => router.refresh())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return (
    <m.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className="flex flex-col gap-10"
    >
      <m.div variants={itemVariants}>
        <h1 className="text-4xl font-extrabold font-headline tracking-tighter text-foreground">Operational Overview</h1>
        <p className="text-outline mt-2 max-w-xl font-body text-sm leading-relaxed">
          Real-time senior citizen registry metrics for Cotabato City.
        </p>
      </m.div>

      {children}
    </m.div>
  );
}

function StatsCard({ label, value, trend, icon, highlight }: { label: string; value: number | string; trend?: string; icon?: string; highlight?: boolean }) {
  return (
    <MetricCard
      label={label}
      value={String(value)}
      trend={trend}
      icon={icon}
      highlight={highlight}
    />
  );
}

export function StatsSection({ statsPromise }: { statsPromise: Promise<{
  totalSeniors: number;
  activeSeniors: number;
  pendingSeniors: number;
  archivedSeniors: number;
  growth: number;
}> }) {
  const stats = use(statsPromise);
  const growthStr = stats.growth >= 0 ? `+${stats.growth}% from last month` : `${stats.growth}% from last month`;
  
  return (
    <m.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatsCard label="Total Residents" value={stats.totalSeniors} trend={growthStr} icon="group" />
      <StatsCard label="Active Accounts" value={stats.activeSeniors} icon="verified" />
      <StatsCard label="Pending Verifications" value={stats.pendingSeniors} icon="pending_actions" />
      <StatsCard label="Archived" value={stats.archivedSeniors} icon="archive" />
    </m.div>
  );
}

export function DemographicsSection({ demographicsPromise }: { demographicsPromise: Promise<{
  ageGroups: { label: string; value: number }[];
  statusDist: { label: string; value: number; color: string }[];
  barangayCounts: { label: string; value: number }[];
  monthlyRegistrations: { label: string; value: number }[];
}> }) {
  const demographics = use(demographicsPromise);
  
  const maxAge = Math.max(...demographics.ageGroups.map(g => g.value), 1);
  const maxBarangay = Math.max(...demographics.barangayCounts.map(g => g.value), 1);
  const maxMonthly = Math.max(...demographics.monthlyRegistrations.map(g => g.value), 1);
  const totalStatus = demographics.statusDist.reduce((sum, g) => sum + g.value, 0) || 1;

  return (
    <m.div variants={itemVariants}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-lowest shadow-sm rounded-2xl p-6 border border-outline-variant/30">
          <h4 className="font-headline font-bold text-foreground mb-4">Age Distribution</h4>
          <div className="space-y-2">
            {demographics.ageGroups.map((group) => (
              <div key={group.label} className="flex items-center gap-3">
                <span className="text-[10px] text-outline w-12 text-right">{group.label}</span>
                <div className="flex-1 h-5 bg-surface-high rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${(group.value / maxAge) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-foreground w-8">{group.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-lowest shadow-sm rounded-2xl p-6 border border-outline-variant/30">
          <h4 className="font-headline font-bold text-foreground mb-4">Status Distribution</h4>
          <div className="flex items-center gap-6">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                {demographics.statusDist.reduce((acc, segment, i) => {
                  const prevTotal = demographics.statusDist.slice(0, i).reduce((s, g) => s + g.value, 0);
                  const startAngle = (prevTotal / totalStatus) * 100;
                  const segmentAngle = (segment.value / totalStatus) * 100;
                  const dashArray = `${segmentAngle} ${100 - segmentAngle}`;
                  acc.push(
                    <circle
                      key={segment.label}
                      cx="18" cy="18" r="15.9"
                      fill="none"
                      stroke={segment.color}
                      strokeWidth="4"
                      strokeDasharray={dashArray}
                      strokeDashoffset={-startAngle}
                      className="transition-all duration-500"
                    />
                  );
                  return acc;
                }, [] as React.ReactNode[])}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-foreground">{totalStatus}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              {demographics.statusDist.map((segment) => (
                <div key={segment.label} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: segment.color }} />
                  <span className="text-[10px] text-outline">{segment.label}</span>
                  <span className="text-[10px] font-bold text-foreground">{segment.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-surface-lowest shadow-sm rounded-2xl p-6 border border-outline-variant/30">
          <h4 className="font-headline font-bold text-foreground mb-4">Barangay Distribution</h4>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {demographics.barangayCounts.slice(0, 15).map((group) => (
              <div key={group.label} className="flex items-center gap-2">
                <span className="text-[10px] text-outline w-28 truncate">{group.label}</span>
                <div className="flex-1 h-3 bg-surface-high rounded-full overflow-hidden">
                  <div
                    className="h-full bg-secondary rounded-full transition-all duration-500"
                    style={{ width: `${(group.value / maxBarangay) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-foreground w-6 text-right">{group.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-lowest shadow-sm rounded-2xl p-6 border border-outline-variant/30">
          <h4 className="font-headline font-bold text-foreground mb-4">Monthly Registrations</h4>
          <div className="flex items-end justify-between gap-1 h-40 px-2">
            {demographics.monthlyRegistrations.map((group) => (
              <div key={group.label} className="flex flex-col items-center gap-1 flex-1">
                <span className="text-[10px] font-bold text-foreground">{group.value}</span>
                <div
                  className="w-full bg-primary/80 rounded-t-md transition-all duration-500 min-h-[4px]"
                  style={{ height: `${(group.value / maxMonthly) * 100}%` }}
                />
                <span className="text-[9px] text-outline">{group.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </m.div>
  );
}
