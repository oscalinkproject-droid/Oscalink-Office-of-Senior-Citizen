import { ReactNode } from "react";
import { TopNavBar } from "@/components/ui/navbar";
import { createServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export default async function BarangayLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_login')
      .eq('id', user.id)
      .maybeSingle();

    const role = user.user_metadata?.role || '';
    const isBarangayRole = role === 'barangay_president' || role === 'barangay_official';

    if (isBarangayRole && profile?.first_login) {
      redirect('/settings');
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface-lowest">
      <TopNavBar user={user} />
      <main className="flex-1 pt-16 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
