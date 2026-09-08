import { createServerClient as createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { AuditTrailClient } from "@/components/ui/audit-trail-client";
import { getAuditLogs, getAuditSummary } from "@/app/actions/reports";

export const dynamic = "force-dynamic";

export default async function AuditTrailPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const role = user.user_metadata?.role as string | undefined;
  if (role !== "osca_head" && role !== "super_admin") {
    redirect("/dashboard");
  }

  const [auditLogs, summary] = await Promise.all([
    getAuditLogs(200),
    getAuditSummary(),
  ]);

  return (
    <AuditTrailClient
      auditLogs={auditLogs || []}
      summary={summary}
    />
  );
}
