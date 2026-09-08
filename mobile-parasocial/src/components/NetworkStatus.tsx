import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { getPendingEndorsements, syncPendingEndorsements, getPendingSeniorUpdates, syncPendingSeniorUpdates } from '@/lib/sync';
import { COLORS } from '@/lib/constants';

const BACKEND_URL = 'https://qbdbxwcsvitlmikmdhso.supabase.co';

async function pingBackend(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${BACKEND_URL}/rest/v1/`, {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

export default function NetworkStatus() {
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkPending = async () => {
    const endorsements = await getPendingEndorsements();
    const seniorUpdates = await getPendingSeniorUpdates();
    setPendingCount(endorsements.length + seniorUpdates.length);
  };

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const state = await NetInfo.fetch();
      if (cancelled) return;

      if (!state.isConnected || state.isInternetReachable === false) {
        setOnline(false);
        return;
      }

      const backendOk = await pingBackend();
      if (!cancelled) setOnline(backendOk);
    };

    check();
    checkPending();

    intervalRef.current = setInterval(() => {
      check();
      checkPending();
    }, 15000);

    const unsub = NetInfo.addEventListener((state) => {
      if (cancelled) return;
      if (!state.isConnected || state.isInternetReachable === false) {
        setOnline(false);
        return;
      }
      check();
    });

    return () => {
      cancelled = true;
      unsub();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  async function handleSync() {
    setSyncing(true);
    await Promise.all([syncPendingEndorsements(), syncPendingSeniorUpdates()]);
    const endorsements = await getPendingEndorsements();
    const seniorUpdates = await getPendingSeniorUpdates();
    setPendingCount(endorsements.length + seniorUpdates.length);
    setSyncing(false);
  }

  return (
    <View style={styles.row}>
      <View style={[styles.badge, online ? styles.online : styles.offline]}>
        <View style={[styles.dot, online ? styles.dotOnline : styles.dotOffline]} />
        <Text style={[styles.label, online ? styles.labelOnline : styles.labelOffline]}>
          {online ? 'Online' : 'Offline'}
        </Text>
      </View>
      {pendingCount > 0 && (
        <TouchableOpacity style={styles.syncBtn} onPress={handleSync} disabled={syncing}>
          {syncing ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.syncBtnText}>Sync ({pendingCount})</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  online: {
    backgroundColor: '#D1FAE5',
  },
  offline: {
    backgroundColor: '#FEE2E2',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotOnline: {
    backgroundColor: '#10B981',
  },
  dotOffline: {
    backgroundColor: '#EF4444',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  labelOnline: {
    color: '#065F46',
  },
  labelOffline: {
    color: '#991B1B',
  },
  syncBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
  },
  syncBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
});
