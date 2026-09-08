import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { sendErrorReportEmail } from '@/lib/send-email';

const MAX_TEXT = 20000;
const MAX_SCREENSHOT = 500000;

function clean(v: unknown, fallback = ''): string {
  if (typeof v !== 'string') return fallback;
  return v.slice(0, MAX_TEXT).trim();
}

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    let supabaseUserId: string | null = null;
    let role: string | null = null;
    let userEmail: string | null = null;
    let userName: string | null = null;

    try {
      const supabase = await createServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      supabaseUserId = user?.id ?? null;
      role = (user?.user_metadata?.role as string | undefined) || null;
      userEmail = user?.email || null;
      userName = (user?.user_metadata?.full_name as string | undefined) || null;
    } catch {
      // Not signed in — fall back to client-provided values below.
    }

    role = role || clean(body.role, null as unknown as string) || null;
    supabaseUserId = supabaseUserId || clean(body.userId, null as unknown as string) || null;
    userName = userName || clean(body.userName, null as unknown as string) || null;
    userEmail = userEmail || clean(body.userEmail, null as unknown as string) || null;

    const message = clean(body.message);
    if (!message) {
      return NextResponse.json({ success: false, error: 'No error message provided' }, { status: 400 });
    }

    const screenshot = typeof body.screenshot === 'string' && body.screenshot.length <= MAX_SCREENSHOT
      ? body.screenshot
      : null;

    const result = await sendErrorReportEmail({
      message,
      stack: clean(body.stack) || undefined,
      pageUrl: clean(body.pageUrl) || undefined,
      timestamp: clean(body.timestamp) || new Date().toISOString(),
      role,
      userId: supabaseUserId,
      userName,
      userEmail,
      browser: clean(body.browser) || undefined,
      description: clean(body.description) || undefined,
      screenshot,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Failed to send report' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[REPORT-ERROR] Error:', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
