import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const role = user.user_metadata?.role as string | undefined;
    if (!role || !['osca_head', 'osca_staff', 'barangay_president'].includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { senior_id, title, body, data } = await request.json();

    if (!senior_id || !title || !body) {
      return NextResponse.json({ error: 'Missing required fields: senior_id, title, body' }, { status: 400 });
    }

    const { data: senior, error: lookupError } = await supabase
      .from('seniors')
      .select('push_token')
      .eq('id', senior_id)
      .single();

    if (lookupError || !senior?.push_token) {
      return NextResponse.json({ error: 'Senior not found or no push token registered' }, { status: 404 });
    }

    const message: Record<string, unknown> = {
      to: senior.push_token,
      sound: 'default',
      title,
      body,
      data: data || {},
    };

    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const expoResult = await expoResponse.json();

    return NextResponse.json({
      success: true,
      expo: expoResult,
    });
  } catch (error) {
    console.error('[PUSH] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
