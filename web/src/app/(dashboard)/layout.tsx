import { ReactNode } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
