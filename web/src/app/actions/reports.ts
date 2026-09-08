'use server';

import { createServerClient as createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function getSeniorsByBarangay() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('seniors')
    .select('barangay');

  if (error) return [];

  const counts: Record<string, number> = {};
  data.forEach(r => {
    counts[r.barangay] = (counts[r.barangay] || 0) + 1;
  });

  return Object.entries(counts).map(([barangay, count]) => ({ barangay, count }));
}

export async function getAssistanceMetrics() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('assistance_requests')
    .select('category, status');

  if (error) return [];

  const metrics: Record<string, { total: number; pending: number; released: number }> = {};
  
  data.forEach(r => {
    if (!metrics[r.category]) {
      metrics[r.category] = { total: 0, pending: 0, released: 0 };
    }
    metrics[r.category].total++;
    if (r.status === 'Pending') metrics[r.category].pending++;
    if (r.status === 'Released') metrics[r.category].released++;
  });

  return Object.entries(metrics).map(([category, stats]) => ({
    category,
    ...stats
  }));
}

export async function getServiceDeliveryLogs() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('appointments')
    .select('status');

  if (error) return [];

  const statusMap: Record<string, number> = {};
  data.forEach(r => {
    statusMap[r.status] = (statusMap[r.status] || 0) + 1;
  });

  return Object.entries(statusMap).map(([status, count]) => ({ status, count }));
}

export async function getAuditLogs(limit = 200, category?: string) {
  const supabase = await createClient();
  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) return [];
  return data;
}

export async function getAuthAuditLogs(limit = 200) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_auth_audit_logs', { p_limit: limit });
  if (error) return [];
  return data;
}

export async function getActiveSessions() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_active_sessions');
  if (error) return [];
  return data;
}

export async function getAuditSummary() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_audit_summary');
  if (error) return {
    totalActions: 0,
    activeSessions: 0,
    todayLogins: 0,
    uniqueUsers: 0,
  };
  return data;
}

export async function getComplianceTrend() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('appointments')
    .select('status, created_at');

  if (error) return [];

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const trend: { label: string; value: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = months[d.getMonth()];
    const count = data.filter(r => {
      if (!r.created_at) return false;
      const created = new Date(r.created_at);
      return created.getMonth() === d.getMonth() && created.getFullYear() === d.getFullYear();
    }).length;
    trend.push({ label: monthLabel, value: count });
  }

  return trend;
}

export async function refreshReports() {
  revalidatePath('/reports');
  return { success: true };
}
