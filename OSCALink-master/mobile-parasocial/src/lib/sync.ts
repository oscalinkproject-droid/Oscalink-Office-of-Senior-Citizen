import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from './supabase';

const PENDING_KEY = 'pending_endorsements';
const PENDING_SENIOR_KEY = 'pending_senior_updates';

const storage = Platform.OS === 'web'
  ? {
      getItem: async (key: string) => {
        try { return Promise.resolve(localStorage.getItem(key)); }
        catch { return Promise.resolve(null); }
      },
      setItem: async (key: string, value: string) => {
        try { localStorage.setItem(key, value); } catch {}
        return Promise.resolve();
      },
      removeItem: async (key: string) => {
        try { localStorage.removeItem(key); } catch {}
        return Promise.resolve();
      },
    }
  : AsyncStorage;

export interface PendingEndorsement {
  local_id: string;
  endorsement_type: string;
  notes: string | null;
  barangay: string;
  submitted_by: string;
  status: 'Pending';
  created_at: string;
  senior_id: string | null;
  senior_name?: string | null;
  case_study_report_url?: string | null;
  clearance_cert_url?: string | null;
  president_countersignature_url?: string | null;
  recommended_amount?: number | null;
}

export interface PendingSeniorUpdate {
  local_id: string;
  senior_id: string;
  data: Record<string, any>;
  created_at: string;
}

export async function getPendingSeniorUpdates(): Promise<PendingSeniorUpdate[]> {
  try {
    const raw = await storage.getItem(PENDING_SENIOR_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addPendingSeniorUpdate(
  seniorId: string,
  data: Record<string, any>,
): Promise<PendingSeniorUpdate> {
  const pending = await getPendingSeniorUpdates();
  // Remove any existing update for the same senior (keep latest)
  const filtered = pending.filter((u) => u.senior_id !== seniorId);
  const entry: PendingSeniorUpdate = {
    local_id: generateId(),
    senior_id: seniorId,
    data,
    created_at: new Date().toISOString(),
  };
  filtered.push(entry);
  await storage.setItem(PENDING_SENIOR_KEY, JSON.stringify(filtered));
  return entry;
}

async function removePendingSeniorUpdate(localId: string): Promise<void> {
  const pending = await getPendingSeniorUpdates();
  const filtered = pending.filter((u) => u.local_id !== localId);
  await storage.setItem(PENDING_SENIOR_KEY, JSON.stringify(filtered));
}

export async function syncPendingSeniorUpdates(): Promise<{ synced: number; failed: PendingSeniorUpdate[] }> {
  const pending = await getPendingSeniorUpdates();
  if (pending.length === 0) return { synced: 0, failed: [] };

  const failed: PendingSeniorUpdate[] = [];

  for (const item of pending) {
    const { error } = await supabase.from('seniors').update(item.data).eq('id', item.senior_id);
    if (error) {
      failed.push(item);
    } else {
      await removePendingSeniorUpdate(item.local_id);
    }
  }

  return { synced: pending.length - failed.length, failed };
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export async function getPendingEndorsements(): Promise<PendingEndorsement[]> {
  try {
    const raw = await storage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addPendingEndorsement(
  endorsement: Omit<PendingEndorsement, 'local_id' | 'status' | 'created_at'>,
): Promise<PendingEndorsement> {
  const pending = await getPendingEndorsements();
  const entry: PendingEndorsement = {
    ...endorsement,
    local_id: generateId(),
    status: 'Pending',
    created_at: new Date().toISOString(),
  };
  pending.push(entry);
  await storage.setItem(PENDING_KEY, JSON.stringify(pending));
  return entry;
}

async function removePendingEndorsement(localId: string): Promise<void> {
  const pending = await getPendingEndorsements();
  const filtered = pending.filter((e) => e.local_id !== localId);
  await storage.setItem(PENDING_KEY, JSON.stringify(filtered));
}

export async function syncPendingEndorsements(): Promise<{ synced: number; failed: PendingEndorsement[] }> {
  const pending = await getPendingEndorsements();
  if (pending.length === 0) return { synced: 0, failed: [] };

  const failed: PendingEndorsement[] = [];

  for (const item of pending) {
    const { error } = await supabase.from('endorsements').insert({
      endorsement_type: item.endorsement_type,
      status: 'Active',
      barangay: item.barangay,
      submitted_by: item.submitted_by,
      notes: item.notes,
      senior_id: item.senior_id,
      case_study_report_url: item.case_study_report_url,
      clearance_cert_url: item.clearance_cert_url,
      president_countersignature_url: item.president_countersignature_url,
      recommended_amount: item.recommended_amount,
    });

    if (error) {
      failed.push(item);
    } else {
      await removePendingEndorsement(item.local_id);
    }
  }

  return { synced: pending.length - failed.length, failed };
}
