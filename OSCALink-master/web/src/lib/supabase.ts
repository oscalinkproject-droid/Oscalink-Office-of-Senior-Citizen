import { createBrowserClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';

// Client-side factory (Safe for Browser & Client Components)
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

// Deduplicate concurrent auth lookups. The underlying createBrowserClient is a
// singleton per app, and firing multiple supabase.auth.getUser() calls at the
// same time races on an internal token lock ("lock ... was released because
// another request stole it"). Sharing a single in-flight promise means all
// callers in the same tick await the same getUser() instead of each firing
// their own, which eliminates the race.
let cachedUserPromise: Promise<User | null> | null = null;

export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

export function getSharedUser(): Promise<User | null> {
  if (!cachedUserPromise) {
    cachedUserPromise = getCurrentUser()
      .then((user) => {
        // Drop the memoized promise once it resolves so a later real change of
        // user (or sign-out) is picked up. Memoization only needs to cover the
        // window where multiple callers are firing concurrently.
        cachedUserPromise = null;
        return user;
      })
      .catch((err) => {
        cachedUserPromise = null;
        throw err;
      });
  }
  return cachedUserPromise;
}
