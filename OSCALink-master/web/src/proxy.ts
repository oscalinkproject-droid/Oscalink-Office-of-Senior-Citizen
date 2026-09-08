import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { OSCA_ROLES, SECTOR_LOCKED_ROLES } from "@/lib/rbac";

const BARANGAY_ROUTES = ["/barangay"];

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
  const role = (user?.user_metadata?.role as string) || "";
  const pathname = request.nextUrl.pathname;

  const BARANGAY_ROLES = new Set(SECTOR_LOCKED_ROLES as readonly string[]);

  // Barangay routes
  if (BARANGAY_ROUTES.some((route) => pathname.startsWith(route))) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    if (!BARANGAY_ROLES.has(role)) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Redirect barangay roles away from main portal
  const MAIN_PORTAL_ROUTES = ["/dashboard", "/directory", "/staff", "/reports", "/archive"];
  if (BARANGAY_ROLES.has(role) && MAIN_PORTAL_ROUTES.some((route) => pathname.startsWith(route))) {
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
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/directory") || pathname.startsWith("/staff") || pathname.startsWith("/reports") || pathname.startsWith("/archive")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    if (!(OSCA_ROLES as readonly string[]).includes(role)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  // System Records are OSCA Staff only
  if ((pathname.startsWith("/reports") || pathname.startsWith("/archive")) && role !== "osca_staff") {
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
