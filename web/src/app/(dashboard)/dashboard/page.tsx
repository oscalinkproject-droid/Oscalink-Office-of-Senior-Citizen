export const dynamic = 'force-dynamic';

import { Suspense, cache } from "react";
import { createServerClient as createClient } from "@/lib/supabase-server";
import { DashboardClientShell, StatsSection, DemographicsSection } from "./dashboard-client";
import { MetricCardSkeleton, ChartSkeleton } from "@/components/ui/skeletons";

const getDashboardStats = cache(async function() {
  const supabase = await createClient();

  const { count: totalSeniors } = await supabase
    .from('seniors')
    .select('*', { count: 'exact', head: true });

  const { count: activeSeniors } = await supabase
    .from('seniors')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Active');

  const { count: pendingSeniors } = await supabase
    .from('seniors')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Pending');

  const { count: archivedSeniors } = await supabase
    .from('seniors')
    .select('*', { count: 'exact', head: true })
    .in('status', ['Transferred', 'Deceased']);

  const now = new Date();
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

  const { count: thisMonthCount } = await supabase
    .from('seniors')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', firstOfThisMonth);

  const { count: lastMonthCount } = await supabase
    .from('seniors')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', firstOfLastMonth)
    .lt('created_at', firstOfThisMonth);

  const growth = lastMonthCount && lastMonthCount > 0
    ? Math.round((((thisMonthCount || 0) - lastMonthCount) / lastMonthCount) * 100)
    : 0;

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

  const { data: seniors } = await supabase
    .from('seniors')
    .select('age, birthdate, status, barangay, created_at, purok');

  const records = seniors || [];

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
