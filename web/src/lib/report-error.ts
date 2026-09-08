'use client';

import { createClient } from '@/lib/supabase';

export interface ErrorReportInput {
  message: string;
  stack?: string;
  pageUrl?: string;
  description?: string;
  screenshot?: string | null;
}

function getBrowserInfo(): string {
  if (typeof window === 'undefined' || !navigator) return 'Not available';
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const language = navigator.language || '';
  const screen = typeof window.screen !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : '';
  return `UA: ${ua} | Platform: ${platform} | Lang: ${language} | Screen: ${screen}`;
}

export async function reportErrorToDeveloper(input: ErrorReportInput) {
  let role: string | null = null;
  let userId: string | null = null;
  let userEmail: string | null = null;
  let userName: string | null = null;

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    role = (user?.user_metadata?.role as string | undefined) || null;
    userId = user?.id || null;
    userEmail = user?.email || null;
    userName = (user?.user_metadata?.full_name as string | undefined) || null;
  } catch {
    // Anonymous/offline — send report without user context.
  }

  const payload = {
    message: input.message || 'System error',
    stack: input.stack,
    pageUrl: input.pageUrl || (typeof window !== 'undefined' ? window.location.href : ''),
    timestamp: new Date().toISOString(),
    role,
    userId,
    userName,
    userEmail,
    browser: getBrowserInfo(),
    description: input.description,
    screenshot: input.screenshot,
  };

  try {
    const res = await fetch('/api/report-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return { success: res.ok === true && data.success === true, error: data.error };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}
