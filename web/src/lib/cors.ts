import { NextResponse } from 'next/server';

// CORS headers for public mobile/API bridge routes. `*` is safe here because
// these endpoints never emit cookies or credentials; they only accept the
// identifier/birthdate the mobile client already holds.
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
} as const;

export function corsJson(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...CORS_HEADERS,
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
}

// Handles the browser's CORS preflight (OPTIONS) request.
export function corsOptionsResponse() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}