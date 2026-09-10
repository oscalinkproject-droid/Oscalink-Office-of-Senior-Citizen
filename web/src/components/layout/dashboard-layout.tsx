'use client';

import { ReactNode, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { TopNavBar } from "@/components/ui/navbar";
import { OfflineBanner } from "@/components/ui/offline-banner";
import { LazyMotion, domMax } from "framer-motion";
import { createClient } from "@/lib/supabase";
import { type User } from "@supabase/supabase-js";
import { ErrorBoundary } from "@/components/error-boundary";

// Shared in-flight auth check so concurrent mounts (React Strict Mode) reuse a
// single getUser() instead of racing each other over the shared token cookie.
let sharedAuthPromise: Promise<User | null> | null = null;

function getSharedAuthPromise(): Promise<User | null> | null {
  return sharedAuthPromise;
}

function setSharedAuthPromise(p: Promise<User | null> | null): void {
  sharedAuthPromise = p;
}

async function runAuthCheck(): Promise<User | null> {
  const supabase = createClient();

  // Guard against the transient "Lock ... was released because another request
  // stole it" error that occurs when the server-side middleware (middleware.ts)
  // refreshes the token at the same moment. Retry with a short backoff before
  // concluding the session is actually invalid.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase.auth.getUser();

    if (!error) {
      return data.user || null;
    }

    const lockStolen =
      /lock sb-.*-auth-token.*was released because another request stole it/i.test(
        error.message || ''
      );

    if (lockStolen && attempt < 4) {
      await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
      continue;
    }

    console.error('[dashboard-layout] auth check failed:', error);
    return null;
  }
  return null;
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function getUser() {
      // Share a single in-flight auth check across concurrent mounts. React
      // Strict Mode double-invokes effects in development, and each mount used
      // to run its own `getUser()` concurrently. Because the browser client
      // stores its session in ONE shared cookie, the two refreshes fight for the
      // same token lock and throw "Lock ... was released because another request
      // stole it". Deduping so only ONE getUser runs fixes that race at its root.
      let pending = getSharedAuthPromise();
      if (!pending) {
        pending = runAuthCheck().catch((err) => {
          console.error('[dashboard-layout] auth check failed:', err);
          return null;
        });
        setSharedAuthPromise(pending);
      }
      const userData = await pending;
      setSharedAuthPromise(null);

      if (userData) {
        setUser(userData);
        setLoading(false);
      } else {
        router.push('/login');
      }
    }
    getUser();
  }, [router]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-surface-lowest">
        <div className="fixed top-0 left-0 right-0 h-16 bg-surface-low border-b border-outline-variant/30 z-50"></div>
        <div className="flex flex-1 pt-16">
          <div className="flex-1 ml-0 lg:ml-64 p-10 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <LazyMotion features={domMax}>
      <div className="flex flex-col min-h-screen bg-surface-lowest">
        <OfflineBanner />
        <TopNavBar user={user} />
        
        <div className="flex flex-1 pt-16">
          <Sidebar user={user} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          {sidebarOpen && (
            <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
          )}
          
          <main className="flex-1 ml-0 lg:ml-64 p-4 md:p-6 lg:p-10 overflow-y-auto hide-scrollbar">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden mb-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-low border border-outline-variant/30 text-foreground text-xs font-bold"
            >
              <span className="material-symbols-outlined text-sm">menu</span>
              Menu
            </button>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
            
            <footer className="mt-20 py-6 border-t border-outline-variant/30 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
              <span className="text-outline font-bold font-label text-[10px] uppercase tracking-widest">
                © {new Date().getFullYear()} OSCALink. Kinetic Precision Engineering.
              </span>
              <div className="flex flex-wrap gap-6">
                <a href="/privacy" className="text-outline hover:text-primary transition-colors font-label text-[10px] uppercase tracking-widest">
                  Privacy Policy
                </a>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                  <span className="text-primary font-label text-[10px] uppercase tracking-widest">
                    System Status
                  </span>
                </div>
              </div>
            </footer>
          </main>
        </div>
      </div>
    </LazyMotion>
  );
}
