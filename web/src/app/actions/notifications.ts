'use server';

import { createServerClient as createClient, createAdminClient } from '@/lib/supabase-server';

type NotificationTarget = 'all' | 'pensioners' | 'non_pensioners' | 'barangay' | 'barangay_presidents' | 'senior';
type NotificationType = 'info' | 'success' | 'warning';
export type BroadcastCategory = 'general' | 'priority' | 'barangay' | 'id_collection';

interface SendNotificationInput {
  title: string;
  message: string;
  type: NotificationType;
  target: NotificationTarget;
  category?: BroadcastCategory;
  seniorId?: string;
  barangay?: string;
  sendAt?: string | null;
}

interface Recipient {
  seniorId: string | null;
  userId: string | null;
  fullName: string | null;
  pushToken: string | null;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

function toRecipient(row: {
  id: string;
  auth_id?: string | null;
  full_name?: string | null;
  push_token?: string | null;
}): Recipient {
  return {
    seniorId: row.id,
    userId: row.auth_id || null,
    fullName: row.full_name || null,
    pushToken: row.push_token || null,
  };
}

// Resolve every matching senior for a broadcast target. Group targets fetch ALL
// active senior records — no pagination limit and no filtering that would drop
// seniors who have not registered a device push token.
async function fetchTargetRecipients(
  supabase: Awaited<ReturnType<typeof createClient>>,
  target: NotificationTarget,
  opts: { barangay?: string; seniorId?: string }
): Promise<Recipient[]> {
  if (target === 'senior' && opts.seniorId) {
    const { data: senior } = await supabase
      .from('seniors')
      .select('id, auth_id, full_name, push_token')
      .eq('id', opts.seniorId)
      .single();

    return senior ? [toRecipient(senior)] : [];
  }

  if (target === 'barangay_presidents') {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'barangay_president');

    return (profiles || []).map(p => ({
      seniorId: null,
      userId: p.id,
      fullName: p.full_name || null,
      pushToken: null,
    }));
  }

  let query = supabase
    .from('seniors')
    .select('id, auth_id, full_name, push_token')
    .eq('status', 'Active');

  if (target === 'pensioners') {
    query = query.eq('is_pensioner', true);
  } else if (target === 'non_pensioners') {
    query = query.eq('is_pensioner', false);
  } else if (target === 'barangay' && opts.barangay) {
    query = query.eq('barangay', opts.barangay);
  }

  const { data: seniors } = await query;
  return (seniors || []).map(toRecipient);
}

async function resolveRecipients(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: SendNotificationInput
): Promise<Recipient[]> {
  return fetchTargetRecipients(supabase, input.target, {
    barangay: input.barangay,
    seniorId: input.seniorId,
  });
}

// Best-effort Expo push dispatch. Iterates every recipient, logs any missing
// push token without halting, and sends batches of up to 100 tokens per request
// so the target batch size is never capped by the push loop.
async function dispatchPush(
  supabase: Awaited<ReturnType<typeof createClient>>,
  recipients: Recipient[],
  opts: { title: string; message: string }
): Promise<{ sent: number; missing: number; failed: number }> {
  let sent = 0;
  let missing = 0;
  let failed = 0;

  const adminClient = await createAdminClient();

  for (const r of recipients) {
    const hasToken = !!r.pushToken && r.pushToken.trim() !== '';
    if (!hasToken) {
      missing += 1;
      console.warn(
        `[BROADCAST-PUSH] No push token for recipient ${r.fullName || r.seniorId || r.userId} — delivered in-app only.`
      );
      if (r.seniorId && adminClient) {
        try {
          await adminClient.from('app_debug_logs').insert({
            senior_id: r.seniorId,
            message: `Broadcast "${opts.title}" skipped push (no token)`,
          });
        } catch (logErr) {
          console.error('[BROADCAST-PUSH] Failed to log missing token:', logErr);
        }
      }
    }
  }

  const tokens = recipients
    .filter(r => !!r.pushToken && r.pushToken.trim() !== '')
    .map(r => r.pushToken!.trim());

  if (tokens.length === 0) {
    return { sent: 0, missing, failed: 0 };
  }

  const chunkSize = 100;
  for (let i = 0; i < tokens.length; i += chunkSize) {
    const chunk = tokens.slice(i, i + chunkSize);
    const messages = chunk.map(to => ({
      to,
      sound: 'default',
      title: opts.title,
      body: opts.message,
      data: { screen: 'notifications' },
    }));

    try {
      const expoResponse = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const expoResult = await expoResponse.json();
      const results = Array.isArray(expoResult) ? expoResult : [expoResult];

      results.forEach((item, idx) => {
        if (item?.status === 'ok') {
          sent += 1;
        } else {
          failed += 1;
          console.error(
            '[BROADCAST-PUSH] Expo send failed:',
            item?.message || JSON.stringify(item),
            `(batch ${i}, index ${idx})`
          );
        }
      });
    } catch (pushErr) {
      failed += chunk.length;
      console.error('[BROADCAST-PUSH] Expo request failed:', pushErr instanceof Error ? pushErr.message : pushErr);
    }
  }

  return { sent, missing, failed };
}

export async function createBroadcast(input: SendNotificationInput) {
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isOsca = profile && ['super_admin', 'admin', 'osca_head', 'osca_staff'].includes(profile.role);
    if (!isOsca) return { error: 'Unauthorized. Only OSCA staff can send broadcasts.' };

    if (!input.title.trim() || !input.message.trim()) {
      return { error: 'Title and message are required.' };
    }

    const sendAt = input.sendAt ? new Date(input.sendAt) : null;
    if (sendAt && isNaN(sendAt.getTime())) {
      return { error: 'Invalid schedule time.' };
    }

    const recipients = await resolveRecipients(supabase, input);
    if (recipients.length === 0) {
      return { error: 'No recipients found with the selected filters.' };
    }

    // In-app database notifications are delivered to every target senior who has
    // an account (user_id), regardless of whether they registered a device token.
    const inAppRecipients = recipients.filter(r => r.userId);

    const status: 'scheduled' | 'sent' = sendAt ? 'scheduled' : 'sent';
    const category = input.category || 'general';

    const { data: broadcast, error: bErr } = await supabase
      .from('broadcasts')
      .insert({
        title: input.title.trim(),
        message: input.message.trim(),
        type: input.type,
        category,
        target: input.target,
        target_barangay: input.target === 'barangay' ? input.barangay : null,
        target_senior_id: input.target === 'senior' ? input.seniorId : null,
        recipient_count: inAppRecipients.length,
        created_by: user.id,
        send_at: sendAt ? sendAt.toISOString() : null,
        status,
      })
      .select('id')
      .single();

    if (bErr || !broadcast) {
      return { error: 'Failed to create broadcast: ' + (bErr?.message || 'unknown error') };
    }

    const rows = inAppRecipients.map(r => ({
      user_id: r.userId,
      title: input.title.trim(),
      message: input.message.trim(),
      type: input.type,
      category,
      notification_category: 'status_update',
      broadcast_id: broadcast.id,
      send_at: sendAt ? sendAt.toISOString() : null,
    }));

    const { error } = await supabase.from('notifications').insert(rows);
    if (error) {
      return { error: 'Failed to deliver broadcasts: ' + error.message };
    }

    // Push dispatch runs only for immediate sends; scheduled broadcasts push at
    // delivery time (sendBroadcastNow). Push is best-effort and never blocks the
    // in-app delivery above.
    let pushSent = 0;
    if (!sendAt) {
      const pushResult = await dispatchPush(supabase, recipients, {
        title: input.title.trim(),
        message: input.message.trim(),
      });
      pushSent = pushResult.sent;
    }

    return {
      success: true,
      count: inAppRecipients.length,
      pushSent,
      id: broadcast.id,
      scheduled: Boolean(sendAt),
    };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Failed to send broadcast' };
  }
}

export async function updateBroadcast(
  broadcastId: string,
  input: SendNotificationInput
) {
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const { data: existing } = await supabase
      .from('broadcasts')
      .select('id, status, send_at, category')
      .eq('id', broadcastId)
      .maybeSingle();

    if (!existing) return { error: 'Broadcast not found.' };
    if (existing.status !== 'scheduled') {
      return { error: 'Only scheduled broadcasts can be edited.' };
    }
    if (new Date(existing.send_at).getTime() <= Date.now()) {
      return { error: 'This broadcast is already due and can no longer be edited.' };
    }

    const sendAt = input.sendAt ? new Date(input.sendAt) : null;
    if (sendAt && isNaN(sendAt.getTime())) {
      return { error: 'Invalid schedule time.' };
    }
    if (sendAt && sendAt.getTime() <= Date.now()) {
      return { error: 'Schedule time must be in the future.' };
    }

    const patch = {
      title: input.title.trim(),
      message: input.message.trim(),
      type: input.type,
      category: input.category || existing.category || 'general',
      send_at: sendAt ? sendAt.toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    const { error: bErr } = await supabase
      .from('broadcasts')
      .update(patch)
      .eq('id', broadcastId);
    if (bErr) return { error: 'Failed to update broadcast: ' + bErr.message };

    const notifPatch = {
      title: patch.title,
      message: patch.message,
      type: patch.type,
      category: patch.category,
      send_at: patch.send_at,
    };

    const { error } = await supabase
      .from('notifications')
      .update(notifPatch)
      .eq('broadcast_id', broadcastId)
      .gt('send_at', new Date().toISOString());
    if (error) return { error: 'Failed to update deliveries: ' + error.message };

    return { success: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Failed to update broadcast' };
  }
}

export async function sendBroadcastNow(broadcastId: string) {
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const { data: existing } = await supabase
      .from('broadcasts')
      .select('id, status, target, target_barangay, target_senior_id, title, message')
      .eq('id', broadcastId)
      .maybeSingle();

    if (!existing) return { error: 'Broadcast not found.' };

    const nowIso = new Date().toISOString();

    await supabase
      .from('broadcasts')
      .update({ status: 'sent', send_at: nowIso, updated_at: nowIso })
      .eq('id', broadcastId);

    const { error } = await supabase
      .from('notifications')
      .update({ send_at: nowIso })
      .eq('broadcast_id', broadcastId)
      .gt('send_at', nowIso);

    if (error) return { error: 'Failed to send broadcast now: ' + error.message };

    // Dispatch push notifications to registered devices for the broadcast target.
    const pushRecipients = await fetchTargetRecipients(supabase, existing.target as NotificationTarget, {
      barangay: existing.target_barangay || undefined,
      seniorId: existing.target_senior_id || undefined,
    });
    const pushResult = await dispatchPush(supabase, pushRecipients, {
      title: existing.title,
      message: existing.message,
    });

    return { success: true, pushSent: pushResult.sent };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Failed to send broadcast now' };
  }
}

export async function deleteBroadcast(broadcastId: string) {
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const { data: existing } = await supabase
      .from('broadcasts')
      .select('id, status')
      .eq('id', broadcastId)
      .maybeSingle();

    if (!existing) return { error: 'Broadcast not found.' };

    const { error } = await supabase.from('broadcasts').delete().eq('id', broadcastId);
    if (error) return { error: 'Failed to delete broadcast: ' + error.message };
    return { success: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Failed to delete broadcast' };
  }
}

interface BroadcastListRow {
  id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  target: string;
  target_barangay: string | null;
  recipient_count: number;
  created_by: string | null;
  send_at: string | null;
  status: string;
  created_at: string;
  creator_name?: string | null;
}

export async function getBroadcasts(): Promise<BroadcastListRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('broadcasts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error || !data) return [];

  const creatorIds = [...new Set((data as BroadcastListRow[]).map(b => b.created_by).filter(Boolean))] as string[];
  let names: Record<string, string> = {};
  if (creatorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', creatorIds);
    names = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name]));
  }

  return (data as BroadcastListRow[]).map(b => ({
    ...b,
    creator_name: b.created_by ? (names[b.created_by] || null) : null,
  }));
}

export async function getNotificationHistory() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, message, type, created_at, reporter_id, parent_id')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return [];
  return data || [];
}

export async function sendReply(originalNotifId: string, replyMessage: string, recipientUserId: string) {
  const supabase = await createClient();

  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: recipientUserId,
      parent_id: originalNotifId,
      title: 'Support Reply',
      message: replyMessage,
      type: 'info',
      notification_category: 'status_update',
    });

    if (error) return { error: 'Failed to send reply' };
    return { success: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Failed' };
  }
}
