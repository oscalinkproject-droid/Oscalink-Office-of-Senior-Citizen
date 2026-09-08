import { useEffect, useState } from 'react';
import { Stack } from 'expo-router/stack';
import { Text, View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { StatusBar } from 'expo-status-bar';
import { Session } from '@supabase/supabase-js';
import { COLORS, ALLOWED_MOBILE_ROLES, ROLES } from '@/lib/constants';
import { syncPendingEndorsements } from '@/lib/sync';
import NetworkStatus from '@/components/NetworkStatus';
import ForcePasswordChangeScreen from './force-password-change';

function AuthGate({ session, onSignOut, children }: { session: Session | null; onSignOut: () => void; children: React.ReactNode }) {
  const role = session?.user?.user_metadata?.role as string;
  
  if (!session) {
    return <>{children}</>;
  }
  
  if (!ALLOWED_MOBILE_ROLES.includes(role as any)) {
    const roleInfo = ROLES[role as keyof typeof ROLES];
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorIcon}>
          <Text style={styles.errorIconText}>⚠️</Text>
        </View>
        <Text style={styles.errorTitle}>Access Denied</Text>
        <Text style={styles.errorText}>
          This app is for Barangay-level personnel only.{'\n'}
          {roleInfo ? `Your role (${roleInfo.label}) requires the OSCALink web app.` : 'Please log in with a barangay account.'}
        </Text>
        <TouchableOpacity style={styles.signOutBtn} onPress={onSignOut}>
          <Text style={styles.signOutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return <>{children}</>;
}

export default function RootLayout() {
  const insets = useSafeAreaInsets();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      try {
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_login')
            .eq('id', session.user.id)
            .single();
          if (profile?.first_login === true) {
            setNeedsPasswordChange(true);
          }
        }
      } catch {}
      setLoading(false);
    }).catch(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_login')
            .eq('id', session.user.id)
            .single();
          if (profile?.first_login === true) {
            setNeedsPasswordChange(true);
          }
        } catch {}
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      syncPendingEndorsements();
    }
  }, [session]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading || session === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <AuthGate session={session} onSignOut={handleSignOut}>
        {needsPasswordChange ? (
          <ForcePasswordChangeScreen onPasswordChanged={() => setNeedsPasswordChange(false)} />
        ) : (
          <>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="login" />
              <Stack.Screen name="senior-detail" />
              <Stack.Screen name="(tabs)" />
            </Stack>
            <View style={[styles.networkOverlay, { top: insets.top + 4, right: 12 }]}>
              <NetworkStatus />
            </View>
          </>
        )}
      </AuthGate>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 32,
  },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorIconText: {
    fontSize: 28,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.tertiary,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  networkOverlay: {
    position: 'absolute',
    zIndex: 999,
  },
  signOutBtn: {
    backgroundColor: COLORS.tertiary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  signOutBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
