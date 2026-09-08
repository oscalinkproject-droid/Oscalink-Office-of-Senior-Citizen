import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '@/lib/supabase';
import { COLORS, ROLES } from '@/lib/constants';
import { getCache, setCache } from '@/lib/cache';

interface DashboardStats {
  total: number;
  pending: number;
  active: number;
  endorsementCount: number;
}

interface RecentEndorsement {
  id: string;
  endorsement_type: string;
  created_at: string;
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentEndorsements, setRecentEndorsements] = useState<RecentEndorsement[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [barangay, setBarangay] = useState('');
  const [roleInfo, setRoleInfo] = useState<typeof ROLES[keyof typeof ROLES] | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const netState = await NetInfo.fetch();
    const offline = !netState.isConnected && !netState.isInternetReachable;

    const cachedUser = await getCache<{ barangay: string; fullName: string; role: string; profile_picture?: string | null }>('user');
    if (cachedUser) {
      setFullName(cachedUser.fullName);
      setBarangay(cachedUser.barangay);
      const ri = ROLES[cachedUser.role as keyof typeof ROLES] || null;
      setRoleInfo(ri);
      setProfilePicture(cachedUser.profile_picture || null);
    }

    if (offline) {
      const ds = await getCache<{ stats: DashboardStats; recent: RecentEndorsement[] }>('dashboard');
      if (ds) { setStats(ds.stats); setRecentEndorsements(ds.recent); }
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      let user = session?.user;

      if (!user) {
        const ds = await getCache<{ stats: DashboardStats; recent: RecentEndorsement[] }>('dashboard');
        if (ds) { setStats(ds.stats); setRecentEndorsements(ds.recent); }
        setLoading(false);
        return;
      }

      const barangayVal = user?.user_metadata?.barangay as string || '';
      const name = user?.user_metadata?.full_name as string || '';
      const r = user?.user_metadata?.role as string;
      const ri = ROLES[r as keyof typeof ROLES] || null;

      setFullName(name);
      setBarangay(barangayVal);
      setRoleInfo(ri);

      try {
        const refreshUser = await supabase.auth.getUser();
        if (refreshUser.data?.user) {
          const meta = refreshUser.data.user.user_metadata || {};
          if (meta.barangay) setBarangay(meta.barangay as string);
          if (meta.full_name) setFullName(meta.full_name as string);
        }
      } catch {}

      let picUrl: string | null = null;
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('profile_picture')
          .eq('id', user?.id)
          .single();
        if (profile?.profile_picture) {
          picUrl = profile.profile_picture;
          setProfilePicture(picUrl);
        }
      } catch {}
      setCache('user', { barangay: barangayVal, fullName: name, role: r, profile_picture: picUrl });

      if (!barangayVal) {
        setLoading(false);
        return;
      }

      try {
        const [totalRes, pendingRes, activeRes, endorsementsRes, recentRes] = await Promise.all([
          supabase.from('seniors').select('*', { count: 'exact', head: true }).eq('barangay', barangayVal),
          supabase.from('seniors').select('*', { count: 'exact', head: true }).eq('barangay', barangayVal).eq('status', 'Pending Barangay'),
          supabase.from('seniors').select('*', { count: 'exact', head: true }).eq('barangay', barangayVal).eq('status', 'Active'),
          supabase.from('endorsements').select('*', { count: 'exact', head: true }),
          supabase.from('endorsements').select('id, endorsement_type, created_at').order('created_at', { ascending: false }).limit(3),
        ]);

        const s: DashboardStats = {
          total: totalRes.count || 0,
          pending: pendingRes.count || 0,
          active: activeRes.count || 0,
          endorsementCount: endorsementsRes.count || 0,
        };
        setStats(s);
        setRecentEndorsements(recentRes.data || []);
        setCache('dashboard', { stats: s, recent: recentRes.data || [] });
      } catch {
        const ds = await getCache<{ stats: DashboardStats; recent: RecentEndorsement[] }>('dashboard');
        if (ds) { setStats(ds.stats); setRecentEndorsements(ds.recent); }
      }
    } catch {}
    setLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!barangay) {
    return (
      <View style={styles.centered}>
        <Text style={styles.noBarangayTitle}>No Barangay Assigned</Text>
        <Text style={styles.noBarangaySub}>Contact OSCA to assign your barangay.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.headerBar, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerContent}>
            <Text style={styles.greeting}>Welcome,</Text>
            <Text style={styles.name}>{fullName.toUpperCase()}</Text>
            <View style={styles.badgeRow}>
              <View style={styles.barangayBadge}>
                <Text style={styles.barangayText}>{barangay}</Text>
              </View>
              {roleInfo && (
                <View style={[styles.roleBadge, { backgroundColor: roleInfo.levelIndex <= 2 ? COLORS.mssd : COLORS.warning + '20' }]}>
                  <Text style={[styles.roleText, { color: roleInfo.levelIndex <= 2 ? '#FFF' : COLORS.warning }]}>{roleInfo.level}</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/settings')}>
            {profilePicture ? (
              <Image source={{ uri: profilePicture }} style={styles.profileCircle} />
            ) : (
              <View style={styles.profileCircle}>
                <Text style={styles.profileCircleText}>{fullName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { borderLeftColor: COLORS.primary }]}>
          <Text style={styles.statValue}>{stats?.total ?? 0}</Text>
          <Text style={styles.statLabel}>Total Seniors</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: COLORS.warning }]}>
          <Text style={styles.statValue}>{stats?.pending ?? 0}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: COLORS.success }]}>
          <Text style={styles.statValue}>{stats?.active ?? 0}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: COLORS.secondary }]}>
          <Text style={styles.statValue}>{stats?.endorsementCount ?? 0}</Text>
          <Text style={styles.statLabel}>Endorsements</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        <ActionCard icon="＋" label="Register Senior" onPress={() => router.push('/register')} />
        <ActionCard icon="👥" label="View Directory" onPress={() => router.push('/directory')} />
        <ActionCard icon="📤" label="Submit Endorsement" onPress={() => router.push('/endorsements')} />
        <ActionCard icon="📢" label="Programs" onPress={() => router.push('/programs')} />
      </View>

      <Text style={styles.sectionTitle}>Recent Endorsements</Text>
      {recentEndorsements.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No endorsements submitted yet.</Text>
        </View>
      ) : (
        <View style={styles.endorsementsList}>
          {recentEndorsements.map((e) => (
            <View key={e.id} style={styles.endorsementItem}>
              <Text style={styles.endorsementType}>{e.endorsement_type}</Text>
              <Text style={styles.endorsementDate}>
                {new Date(e.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          ))}
        </View>
      )}
      <TouchableOpacity style={styles.viewAllBtn} onPress={() => router.push('/(tabs)/endorsements')}>
        <Text style={styles.viewAllText}>View All Endorsements</Text>
      </TouchableOpacity>

    </ScrollView>
    </View>
  );
}

function ActionCard({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress}>
      <View style={styles.actionIconBox}>
        <Text style={styles.actionIcon}>{icon}</Text>
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerBar: {
    backgroundColor: COLORS.primary,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
  },
  headerContent: {
    flex: 1,
    paddingBottom: 4,
  },
  profileCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF33',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  profileCircleText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 32,
  },
  noBarangayTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  noBarangaySub: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  greeting: {
    fontSize: 16,
    color: '#FFFFFFCC',
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  barangayBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  barangayText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  roleBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  partnershipChain: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.outline,
  },
  chainTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  chainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  chainItem: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  chainDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  chainDotText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  chainLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  chainArrow: {
    position: 'absolute',
    right: -6,
    top: 6,
    fontSize: 18,
    color: COLORS.textSecondary,
    fontWeight: '300',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.outline,
  },
  actionIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionIcon: {
    fontSize: 24,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  viewAllBtn: {
    alignSelf: 'center',
    marginTop: 2,
    marginBottom: 4,
    paddingVertical: 6,
    paddingHorizontal: 20,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },

  endorsementsList: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.outline,
    overflow: 'hidden',
    marginBottom: 0,
  },
  endorsementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outline,
  },
  endorsementType: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  endorsementDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.outline,
    marginBottom: 32,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
