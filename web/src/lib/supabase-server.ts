import { createServerClient as createServerClientFromSSR } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Server-side factory (for Server Components & Server Actions)
export const createServerClient = async () => {
  const cookieStore = await cookies();
  
  return createServerClientFromSSR(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
          }
        },
      },
    }
  );
};

// Admin factory (Elevated Privileges - Staff Provisioning)
export const createAdminClient = async () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.warn('[supabase-server] SUPABASE_SERVICE_ROLE_KEY is not set. Admin client unavailable — falling back to anon client. Set this in Vercel Dashboard → Settings → Environment Variables.');
    return null;
  }

  if (serviceKey === '[SENSITIVE]' || serviceKey.startsWith('your_')) {
    console.warn('[supabase-server] SUPABASE_SERVICE_ROLE_KEY appears to be a placeholder ("' + serviceKey + '"). Replace it with the real key from Supabase Dashboard → Settings → API → service_role.');
    return null;
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};
