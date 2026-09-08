import { createServerClient as createClient } from "@/lib/supabase-server";
import { redirect, notFound } from "next/navigation";
import { COTABATO_BARANGAYS } from "@/lib/constants";
import { BarangaySeniorsClient } from "./barangay-seniors-client";

export const dynamic = "force-dynamic";

const OSCA_ROLES = ["super_admin", "osca_head", "osca_staff"];

interface SeniorRow {
  id: string;
  registration_id: string | null;
  full_name: string | null;
  sex: string | null;
  status: string | null;
  is_pensioner: boolean | null;
  contact_number: string | null;
  purok: string | null;
}

export default async function BarangaySeniorsPage({
  params,
}: {
  params: Promise<{ barangayId: string }>;
}) {
  const { barangayId } = await params;
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

  const barangayName = decodeURIComponent(barangayId);
  const validBarangay = (COTABATO_BARANGAYS as readonly string[]).includes(barangayName);
  if (!validBarangay) notFound();

  const { data: rows } = await supabase
    .from("seniors")
    .select(
      "id, registration_id, full_name, sex, status, is_pensioner, contact_number, purok"
    )
    .eq("barangay", barangayName)
    .not("status", "in", '("Transferred","Deceased")')
    .order("full_name", { ascending: true });

  const seniors = (rows || []) as SeniorRow[];

  return <BarangaySeniorsClient barangay={barangayName} seniors={seniors} />;
}
