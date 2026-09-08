import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SELECT_FIELDS = 'id, full_name, id_number, registration_id, status, barangay';

export async function GET(request: NextRequest) {
  const code = (request.nextUrl.searchParams.get('code') || '').trim();
  if (!code) {
    return NextResponse.json({ verified: false, error: 'Missing code parameter' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // Look up by official ID number first, then fall back to registration ID.
  let { data } = await supabase
    .from('seniors')
    .select(SELECT_FIELDS)
    .eq('id_number', code)
    .maybeSingle();

  if (!data) {
    const byReg = await supabase
      .from('seniors')
      .select(SELECT_FIELDS)
      .eq('registration_id', code)
      .maybeSingle();
    data = byReg.data;
  }

  if (!data) {
    return NextResponse.json({ verified: false, active: false, reason: 'not_found' });
  }

  return NextResponse.json({
    verified: data.status === 'Active',
    active: data.status === 'Active',
    full_name: data.full_name,
    id_number: data.id_number || data.registration_id,
    status: data.status,
    barangay: data.barangay,
  });
}
