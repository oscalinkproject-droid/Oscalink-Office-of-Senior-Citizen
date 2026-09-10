import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  OSCA_ROLES,
  SECTOR_LOCKED_ROLES,
  normalizeRole,
  type RoleLevel,
} from "@/lib/rbac";

const BARANGAY_ROUTES = ["/barangay"];
const MAIN_PORTAL_ROUTES = ["/dashboard", "/directory", "/staff", "/reports", "/archive"];

// Resolve a user's app role from user_metadata first, falling back to the
// profiles table. Accounts provisioned with a legacy or missing
// user_metadata.role used to be bounced straight back to /login after a
// successful sign-in, which made login look stuck even though auth succeeded.
async function resolveRole(
  supabase: ReturnType<typeof createServerClient>,
  user: { id: string; user_metadata?: Record<string, unknown> }
): Promise<RoleLevel | null> {
  const fromMetadata = normalizeRole(user.user_metadata?.role);
  if (fromMetadata) return fromMetadata;

  try {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    return normalizeRole(data?.role);
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Stale/invalid refresh token — treat as unauthenticated
  }
  const pathname = request.nextUrl.pathname;

  // Barangay routes
  if (BARANGAY_ROUTES.some((route) => pathname.startsWith(route))) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    const role = await resolveRole(supabase, user);
    if (!role || !(SECTOR_LOCKED_ROLES as readonly string[]).includes(role)) {
      const url = request.nextUrl.clone();
      url.pathname = role ? "/dashboard" : "/";
      return NextResponse.redirect(url);
    }
  }

  const role = user ? await resolveRole(supabase, user) : null;

  // Redirect barangay roles away from main portal
  if (
    role &&
    (SECTOR_LOCKED_ROLES as readonly string[]).includes(role) &&
    MAIN_PORTAL_ROUTES.some((route) => pathname.startsWith(route))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/barangay/dashboard";
    return NextResponse.redirect(url);
  }

  // Redirect senior_citizen away from web portal (mobile app only)
  if (role === "senior_citizen" && !pathname.startsWith("/login") && !pathname.startsWith("/api")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Require auth for dashboard routes
  if (MAIN_PORTAL_ROUTES.some((route) => pathname.startsWith(route))) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    if (!role || !(OSCA_ROLES as readonly string[]).includes(role)) {
      // Authenticated but with an unrecognized role: send to the public
      // homepage instead of back to /login (which caused a sign-in loop).
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  // System Records are OSCA Staff only
  if (
    (pathname.startsWith("/reports") || pathname.startsWith("/archive")) &&
    role !== "osca_staff"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
