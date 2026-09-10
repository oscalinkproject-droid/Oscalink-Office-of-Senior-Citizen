export const dynamic = 'force-dynamic';

import { Suspense, cache } from "react";
import { createServerClient as createClient } from "@/lib/supabase-server";
import { DashboardClientShell, StatsSection, DemographicsSection } from "./dashboard-client";
import { MetricCardSkeleton, ChartSkeleton } from "@/components/ui/skeletons";

const getDashboardStats = cache(async function() {
  const supabase = await createClient();

  const { count: totalSeniors, error: totalErr } = await supabase
    .from('seniors')
    .select('*', { count: 'exact', head: true });

  if (totalErr) console.error('[dashboard] totalSeniors query failed:', totalErr.message);

  const { count: activeSeniors, error: activeErr } = await supabase
    .from('seniors')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Active');

  if (activeErr) console.error('[dashboard] activeSeniors query failed:', activeErr.message);

  const { count: pendingSeniors, error: pendingErr } = await supabase
    .from('seniors')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Pending');

  if (pendingErr) console.error('[dashboard] pendingSeniors query failed:', pendingErr.message);

  const { count: archivedSeniors, error: archivedErr } = await supabase
    .from('seniors')
    .select('*', { count: 'exact', head: true })
    .in('status', ['Transferred', 'Deceased']);

  if (archivedErr) console.error('[dashboard] archivedSeniors query failed:', archivedErr.message);

  const now = new Date();
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

  const { count: thisMonthCount, error: thisMonthErr } = await supabase
    .from('seniors')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', firstOfThisMonth);

  if (thisMonthErr) console.error('[dashboard] thisMonthCount query failed:', thisMonthErr.message);

  const { count: lastMonthCount, error: lastMonthErr } = await supabase
    .from('seniors')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', firstOfLastMonth)
    .lt('created_at', firstOfThisMonth);

  if (lastMonthErr) console.error('[dashboard] lastMonthCount query failed:', lastMonthErr.message);

  const growth = lastMonthCount && lastMonthCount > 0
    ? Math.round((((thisMonthCount || 0) - lastMonthCount) / lastMonthCount) * 100)
    : 0;

  console.log('[dashboard] stats:', { totalSeniors, activeSeniors, pendingSeniors, archivedSeniors });

  return {
    totalSeniors: totalSeniors || 0,
    activeSeniors: activeSeniors || 0,
    pendingSeniors: pendingSeniors || 0,
    archivedSeniors: archivedSeniors || 0,
    growth
  };
});

const getDemographicData = cache(async function() {
  const supabase = await createClient();

  const { data: seniors, error } = await supabase
    .from('seniors')
    .select('age, birthdate, status, barangay, created_at, purok');

  if (error) {
    console.error('[dashboard] demographics query failed:', error.message, error.code);
  }

  const records = seniors || [];
  console.log('[dashboard] demographics records fetched:', records.length);

  const ageGroups = [
    { label: "60-64", value: 0 },
    { label: "65-69", value: 0 },
    { label: "70-74", value: 0 },
    { label: "75-79", value: 0 },
    { label: "80-84", value: 0 },
    { label: "85+", value: 0 },
  ];

  records.forEach((r: { age: number | null; birthdate?: string | null }) => {
    let age = r.age;
    if ((!age || age === 0) && r.birthdate) {
      const birth = new Date(r.birthdate);
      const today = new Date();
      age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    }
    if (!age || age < 60) return;
    if (age >= 60 && age <= 64) ageGroups[0].value++;
    else if (age >= 65 && age <= 69) ageGroups[1].value++;
    else if (age >= 70 && age <= 74) ageGroups[2].value++;
    else if (age >= 75 && age <= 79) ageGroups[3].value++;
    else if (age >= 80 && age <= 84) ageGroups[4].value++;
    else if (age >= 85) ageGroups[5].value++;
  });

  const statusMap: Record<string, number> = {};
  records.forEach((r: { status: string }) => {
    statusMap[r.status] = (statusMap[r.status] || 0) + 1;
  });

  const statusColors: Record<string, string> = {
    Active: "#006837",
    Pending: "#FDB913",
    Archived: "#74777f",
    Deceased: "#CE1126",
  };

  const statusDist = Object.entries(statusMap).map(([label, value]) => ({
    label,
    value,
    color: statusColors[label] || "#8c909f",
  }));

  const barangayMap: Record<string, number> = {};
  records.forEach((r: { barangay: string | null }) => {
    const validBarangay = r.barangay || 'Unassigned';
    if (validBarangay !== null) {
      barangayMap[validBarangay] = (barangayMap[validBarangay] || 0) + 1;
    }
  });

  const barangayCounts = Object.entries(barangayMap)
    .filter(([label]) => label !== 'null' && label !== 'undefined')
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const monthlyRegistrations: { label: string; value: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = months[d.getMonth()];
    const count = records.filter((r: { created_at: string }) => {
      if (!r.created_at) return false;
      const created = new Date(r.created_at);
      return created.getMonth() === d.getMonth() && created.getFullYear() === d.getFullYear();
    }).length;
    monthlyRegistrations.push({ label: monthLabel, value: count });
  }

  return { ageGroups, statusDist, barangayCounts, monthlyRegistrations };
});

export default async function DashboardPage() {
  return (
    <DashboardClientShell>
      <Suspense fallback={<MetricCardSkeleton />}>
        <StatsSection statsPromise={getDashboardStats()} />
      </Suspense>
      <Suspense fallback={<ChartSkeleton />}>
        <DemographicsSection demographicsPromise={getDemographicData()} />
      </Suspense>
    </DashboardClientShell>
  );
}
