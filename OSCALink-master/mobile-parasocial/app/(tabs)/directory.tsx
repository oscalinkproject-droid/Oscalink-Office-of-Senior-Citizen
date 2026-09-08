import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, Platform,
} from 'react-native';
import { router } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/lib/constants';
import { getCache, setCache } from '@/lib/cache';

interface Senior {
  id: string;
  full_name: string;
  registration_id: string;
  age: number;
  status: string;
  contact_number?: string;
  barangay: string;
}

export default function DirectoryScreen() {
  const [seniors, setSeniors] = useState<Senior[]>([]);
  const [filtered, setFiltered] = useState<Senior[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [barangay, setBarangay] = useState('');

  const loadSeniors = useCallback(async () => {
    const netState = await NetInfo.fetch();
    const offline = !netState.isConnected && !netState.isInternetReachable;

    if (offline) {
      const cached = await getCache<Senior[]>('directory');
      if (cached) { setSeniors(cached); setFiltered(cached); }
      setLoading(false);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const b = session?.user?.user_metadata?.barangay as string;
    setBarangay(b || '');

    if (!b) {
      const cached = await getCache<Senior[]>('directory');
      if (cached) { setSeniors(cached); setFiltered(cached); }
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('seniors')
        .select('id, full_name, registration_id, age, status, contact_number, barangay')
        .eq('barangay', b)
        .order('full_name', { ascending: true });

      setSeniors(data || []);
      setFiltered(data || []);
      setCache('directory', data || []);
    } catch {
      const cached = await getCache<Senior[]>('directory');
      if (cached) { setSeniors(cached); setFiltered(cached); }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSeniors();
  }, [loadSeniors]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(seniors);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(
      seniors.filter(s =>
        s.full_name?.toLowerCase().includes(q) ||
        s.registration_id?.toLowerCase().includes(q)
      )
    );
  }, [search, seniors]);

  async function onRefresh() {
    setRefreshing(true);
    await loadSeniors();
    setRefreshing(false);
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'Active': return COLORS.success;
      case 'Pending Barangay': case 'Pending OSCA': case 'Pending': return COLORS.warning;
      default: return COLORS.textSecondary;
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{barangay}</Text>
        <Text style={styles.subtitle}>{seniors.length} registered seniors</Text>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search name or ID..."
        placeholderTextColor={COLORS.textSecondary}
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {search ? 'No seniors match your search.' : 'No seniors registered yet.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/senior-detail?id=${item.id}`)}>
            <View style={styles.cardLeft}>
              <Text style={styles.cardName}>{item.full_name}</Text>
              <Text style={styles.cardId}>{item.registration_id}</Text>
              {item.contact_number && (
                <Text style={styles.cardContact}>{item.contact_number}</Text>
              )}
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.cardAge}>{item.age}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + '15' }]}>
                <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{item.status}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  search: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.outline,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.outline,
  },
  cardLeft: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  cardId: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 2,
  },
  cardContact: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  cardAge: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
