const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  'http://localhost:3000',
  'http://localhost:8081',
].filter(Boolean) as string[];

export function validateOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // If neither Origin nor Referer is set, it's likely a non-browser client
  if (!origin && !referer) {
    return true;
  }

  // Check Origin if present
  if (origin) {
    try {
      const originUrl = new URL(origin);
      return ALLOWED_ORIGINS.some(allowed => {
        try {
          const allowedUrl = new URL(allowed);
          return originUrl.origin === allowedUrl.origin;
        } catch {
          return origin === allowed;
        }
      });
    } catch {
      return false;
    }
  }

  // Check Referer if Origin not present
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      return ALLOWED_ORIGINS.some(allowed => {
        try {
          const allowedUrl = new URL(allowed);
          return refererUrl.origin === allowedUrl.origin;
        } catch {
          return referer.startsWith(allowed);
        }
      });
    } catch {
      return false;
    }
  }

  return false;
}

export function csrfGuard(request: Request): Response | null {
  if (!validateOrigin(request)) {
    return new Response(
      JSON.stringify({ error: 'Cross-Site Request Forgery detected. Request rejected.' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }
  return null;
}
