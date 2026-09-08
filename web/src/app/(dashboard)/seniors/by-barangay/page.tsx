import { createServerClient as createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { COTABATO_BARANGAYS } from "@/lib/constants";
import { BarangayListClient } from "./barangay-list-client";

export const dynamic = "force-dynamic";

interface BarangayStats {
  total: number;
  active: number;
  pensioners: number;
  nonPensioners: number;
}

const OSCA_ROLES = ["super_admin", "osca_head", "osca_staff"];

export default async function SeniorsByBarangayPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !OSCA_ROLES.includes(profile.role)) {
    redirect("/dashboard");
  }

  const { data: rows } = await supabase
    .from("seniors")
    .select("barangay, status, is_pensioner");

  const stats = new Map<string, BarangayStats>();
  (COTABATO_BARANGAYS as readonly string[]).forEach((b) => {
    stats.set(b, { total: 0, active: 0, pensioners: 0, nonPensioners: 0 });
  });

  (rows || []).forEach((r: { barangay: string | null; status: string | null; is_pensioner: boolean | null }) => {
    const key = r.barangay;
    if (!key || !stats.has(key)) return;
    const s = stats.get(key)!;
    s.total += 1;
    if (r.status === "Active") s.active += 1;
    if (r.is_pensioner) s.pensioners += 1;
    else s.nonPensioners += 1;
  });

  const ordered = (COTABATO_BARANGAYS as readonly string[]).map((name) => ({
    name,
    ...(stats.get(name) || { total: 0, active: 0, pensioners: 0, nonPensioners: 0 }),
  }));

  return <BarangayListClient barangays={ordered} />;
}
